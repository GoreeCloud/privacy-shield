import crypto from "node:crypto";
import { MemoryPrivacyStateStore } from "./privacy-state-store.mjs";

function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value) { return crypto.createHash("sha256").update(canonical(value)).digest("hex"); }
function sign(value, secret) { return crypto.createHmac("sha256", secret).update(canonical(value)).digest("base64url"); }

export class PrivacyEvidenceLedger {
  constructor({ store = new MemoryPrivacyStateStore() } = {}) { this.store = store; }
  head() { return this.store.get("evidence_meta", "head"); }

  record({ request, decision, capability = null, metadata = {} }) {
    const previous = this.head();
    const event = {
      evidence_id: decision?.evidence_reference ?? id("pse"), recorded_at: new Date().toISOString(),
      request_id: request?.request_id ?? null, decision_id: decision?.decision_id ?? null,
      requester_id: request?.requester?.id ?? null, resource_id: request?.resource?.id ?? null,
      purpose: request?.purpose ?? null, operation: request?.operation ?? null,
      processing_zone: decision?.processing_zone ?? request?.processing_zone ?? null,
      destination: request?.destination ?? null, outcome: decision?.outcome ?? null,
      reason_code: decision?.reason_code ?? null, policy_references: decision?.policy_references ?? [],
      obligations: decision?.obligations ?? [], capability_jti: capability?.jti ?? null, metadata,
      previous_evidence_hash: previous?.hash ?? null
    };
    event.evidence_hash = digest(event);
    this.store.set("evidence", event.evidence_id, event);
    this.store.set("evidence_meta", "head", { evidence_id: event.evidence_id, hash: event.evidence_hash, recorded_at: event.recorded_at });
    return structuredClone(event);
  }

  list({ request_id, requester_id, resource_id } = {}) {
    return this.store.list("evidence").map(({ value }) => value).filter(event => (!request_id || event.request_id===request_id)&&(!requester_id||event.requester_id===requester_id)&&(!resource_id||event.resource_id===resource_id)).map(event => structuredClone(event));
  }

  verifyIntegrity() {
    const events=this.list().sort((a,b)=>a.recorded_at.localeCompare(b.recorded_at)); let previous=null;
    for (const event of events) {
      const claimed=event.evidence_hash; const unsigned={...event}; delete unsigned.evidence_hash;
      if (digest(unsigned)!==claimed) return { valid:false, evidence_id:event.evidence_id, reason:"EVIDENCE_HASH_MISMATCH" };
      if (event.previous_evidence_hash!==(previous?.evidence_hash??null)) return { valid:false, evidence_id:event.evidence_id, reason:"EVIDENCE_CHAIN_BROKEN" };
      previous=event;
    }
    const head=this.head();
    if ((head?.hash??null)!==(previous?.evidence_hash??null)) return { valid:false, evidence_id:head?.evidence_id??null, reason:"EVIDENCE_HEAD_MISMATCH" };
    return { valid:true, count:events.length, head_hash:head?.hash??null };
  }

  checkpoint() { const integrity=this.verifyIntegrity(); if(!integrity.valid) throw new Error(integrity.reason); return { checkpoint_id:id("pscp"), created_at:new Date().toISOString(), event_count:integrity.count, head_hash:integrity.head_hash }; }
}

export function createPrivacyReceipt({ request, decision, evidence, signing_secret = null }) {
  const receipt={ receipt_id:id("psr"), schema_version:2, created_at:new Date().toISOString(), request_id:request.request_id, decision_id:decision.decision_id, evidence_id:evidence.evidence_id, evidence_hash:evidence.evidence_hash, requester:request.requester.id, resource:request.resource.id, purpose:request.purpose, operation:request.operation, outcome:decision.outcome, processing_zone:decision.processing_zone, destination:request.destination, retention:decision.retention, external_disclosure:Boolean(request.external_disclosure), policy_references:decision.policy_references, explanation:decision.reason_code };
  if (signing_secret) receipt.signature={ algorithm:"HMAC-SHA256", value:sign(receipt,signing_secret) };
  return receipt;
}

export function verifyPrivacyReceipt(receipt, signing_secret) {
  if (!receipt?.signature?.value) return { valid:false, reason:"RECEIPT_SIGNATURE_MISSING" };
  const unsigned=structuredClone(receipt); const supplied=unsigned.signature.value; delete unsigned.signature;
  const expected=sign(unsigned,signing_secret);
  const a=Buffer.from(expected), b=Buffer.from(supplied);
  return a.length===b.length&&crypto.timingSafeEqual(a,b) ? { valid:true } : { valid:false, reason:"RECEIPT_SIGNATURE_INVALID" };
}
