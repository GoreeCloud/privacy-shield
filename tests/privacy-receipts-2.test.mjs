import assert from "node:assert/strict";
import test from "node:test";
import { MemoryPrivacyStateStore } from "../src/privacy-state-store.mjs";
import {
  PrivacyEvidenceLedger,
  PrivacyReceiptLedger,
  PRIVACY_PREVIEW_CONTRACT,
  PRIVACY_RECEIPT_CONTRACT,
  buildPrivacyExplanation,
  createPrivacyReceipt,
  previewPrivacyDecision,
  verifyPrivacyReceipt,
} from "../src/privacy-evidence.mjs";

function fixture() {
  const request = {
    request_id: "req-receipt-1",
    requester: { id: "app.notes", type: "application" },
    resource: {
      id: "note:private-123",
      classification: "notes",
      scope: { document: "private-123" },
      content: "PRIVATE-NOTE-CONTENT",
    },
    operation: "read",
    purpose: "summarize",
    processing_zone: "trusted_service",
    destination: "https://secret.example/tenant/123",
    retention: { mode: "temporary", expires_at: "2026-09-12T04:30:00.000Z" },
    context: { prompt: "PRIVATE-PROMPT", token: "PRIVATE-TOKEN" },
    external_disclosure: true,
  };
  const decision = {
    decision_id: "dec-receipt-1",
    request_id: request.request_id,
    outcome: "ALLOW_WITH_CONSTRAINTS",
    reason_code: "AUTHORIZED_WITH_CONSTRAINTS",
    processing_zone: "trusted_service",
    permitted_destinations: [request.destination],
    retention: request.retention,
    expires_at: "2026-09-12T04:20:00.000Z",
    obligations: ["record_privacy_evidence", "enforce_retention", "generate_privacy_receipt"],
    policy_references: ["core.consent", "core.purpose-limitation"],
    capability_token_reference: "psc-secret-capability-reference",
    evidence_reference: "pse-receipt-1",
  };
  const consent = {
    consent_id: "pscns-1",
    decision: "granted",
    grant_type: "expiring",
    expires_at: "2026-09-12T04:20:00.000Z",
    scope: {
      contract: "goreecloud.privacy-shield.consent-scope.v1",
      destinations: [request.destination],
    },
  };
  return { request, decision, consent };
}

function recordedFixture() {
  const data = fixture();
  const evidence = new PrivacyEvidenceLedger().record(data);
  return { ...data, evidence };
}

test("Privacy Receipt 2.0 is minimized, evidence-bound, and non-authorizing", () => {
  const data = recordedFixture();
  const receipt = createPrivacyReceipt({
    ...data,
    lifecycle_obligations: ["delete_at_expiration"],
    signing_secret: "0123456789abcdef0123456789abcdef",
  });
  assert.equal(receipt.contract, PRIVACY_RECEIPT_CONTRACT);
  assert.equal(receipt.schema_version, 2);
  assert.equal(receipt.authorization_effect, false);
  assert.equal(receipt.data_category, "notes");
  assert.equal(receipt.constraints.destination_classification, "trusted_service");
  assert.equal(receipt.evidence.evidence_id, data.evidence.evidence_id);
  assert.equal(receipt.evidence.evidence_hash, data.evidence.evidence_hash);
  assert.equal(receipt.consent_basis.consent_id, data.consent.consent_id);
  assert.deepEqual(receipt.lifecycle_obligations, ["delete_at_expiration"]);
  assert.equal(receipt.explanation.outcome, "ALLOW_WITH_CONSTRAINTS");

  const serialized = JSON.stringify(receipt);
  for (const forbidden of [
    "PRIVATE-NOTE-CONTENT",
    "PRIVATE-PROMPT",
    "PRIVATE-TOKEN",
    "https://secret.example/tenant/123",
    "note:private-123",
    "psc-secret-capability-reference",
  ]) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("receipt explanation is derived from the bound decision and evidence", () => {
  const data = recordedFixture();
  const explanation = buildPrivacyExplanation(data);
  assert.equal(explanation.summary_code, "privacy.allowed_with_constraints");
  assert.deepEqual(explanation.reason_codes, ["AUTHORIZED_WITH_CONSTRAINTS"]);
  assert.equal(explanation.evidence_reference.evidence_id, data.evidence.evidence_id);
  assert.equal(explanation.preview_only, false);
});

test("receipt creation fails closed when decision and evidence do not bind", () => {
  const data = recordedFixture();
  assert.throws(
    () => createPrivacyReceipt({
      ...data,
      evidence: { ...data.evidence, decision_id: "different-decision" },
    }),
    /PRIVACY_RECEIPT_EVIDENCE_BINDING_MISMATCH/,
  );
});

test("receipt ledger persists only the minimized receipt through the state-provider boundary", () => {
  const data = recordedFixture();
  const store = new MemoryPrivacyStateStore();
  const ledger = new PrivacyReceiptLedger({ store });
  const receipt = ledger.record(data);
  assert.equal(ledger.get(receipt.receipt_id).receipt_id, receipt.receipt_id);
  assert.equal(ledger.list({ requester_id: "app.notes" }).length, 1);
  const serialized = JSON.stringify(store.list("privacy_receipt"));
  assert.equal(serialized.includes("PRIVATE-NOTE-CONTENT"), false);
  assert.equal(serialized.includes("PRIVATE-PROMPT"), false);
  assert.equal(serialized.includes("https://secret.example/tenant/123"), false);
});

test("signed receipt verifies and material tampering fails", () => {
  const secret = "0123456789abcdef0123456789abcdef";
  const data = recordedFixture();
  const receipt = createPrivacyReceipt({ ...data, signing_secret: secret });
  assert.equal(verifyPrivacyReceipt(receipt, secret).valid, true);
  const changed = { ...receipt, purpose: "train-model" };
  assert.equal(verifyPrivacyReceipt(changed, secret).valid, false);
});

test("privacy decision preview cannot be mistaken for runtime authorization", () => {
  const { request, decision } = fixture();
  const preview = previewPrivacyDecision({
    request,
    decision_point: { evaluate: () => structuredClone(decision) },
  });
  assert.equal(preview.contract, PRIVACY_PREVIEW_CONTRACT);
  assert.equal(preview.authorization_effect, false);
  assert.equal(preview.records_evidence, false);
  assert.equal(preview.creates_capability, false);
  assert.equal(preview.consumes_consent, false);
  assert.equal(preview.requires_runtime_re_evaluation, true);
  assert.equal(preview.decision.outcome, "ALLOW_WITH_CONSTRAINTS");
  assert.equal("decision_id" in preview.decision, false);
  assert.equal("capability_token_reference" in preview.decision, false);
  assert.equal("evidence_reference" in preview.decision, false);
  assert.equal(preview.explanation.preview_only, true);

  const serialized = JSON.stringify(preview);
  assert.equal(serialized.includes("PRIVATE-NOTE-CONTENT"), false);
  assert.equal(serialized.includes("PRIVATE-PROMPT"), false);
  assert.equal(serialized.includes("https://secret.example/tenant/123"), false);
  assert.equal(serialized.includes("psc-secret-capability-reference"), false);
});
