import crypto from "node:crypto";
import {
  MemoryPrivacyStateStore,
  mutatePrivacyState,
} from "./privacy-state-store.mjs";

export const PRIVACY_RECEIPT_CONTRACT = "goreecloud.privacy-shield.privacy-receipt.v2";
export const PRIVACY_PREVIEW_CONTRACT = "goreecloud.privacy-shield.decision-preview.v1";

const DECISION_OUTCOMES = new Set([
  "ALLOW",
  "DENY",
  "ALLOW_WITH_CONSTRAINTS",
  "REQUIRE_USER_DECISION",
]);
const DESTINATION_CLASS_BY_ZONE = Object.freeze({
  local: "local",
  private_goreecloud: "goreecloud_private",
  trusted_service: "trusted_service",
  external: "external",
});
const REASON_MESSAGES = Object.freeze({
  AUTHORIZED: "Allowed because the evaluated operation is within current Privacy Shield authority.",
  AUTHORIZED_WITH_CONSTRAINTS: "Allowed with constraints established by the evaluated Privacy Shield decision.",
  CONSENT_REQUIRED: "User decision required because applicable consent is not established for this operation.",
  CONSENT_EXPIRED: "Denied because the applicable consent has expired.",
  CONSENT_REVOKED: "Denied because the applicable consent was revoked.",
  CONSENT_PURPOSE_MISMATCH: "Denied because the requested purpose is not covered by the applicable consent.",
  CONSENT_PURPOSE_DRIFT: "Denied because the requested purpose expands beyond the applicable consent.",
  CONSENT_DESTINATION_MISMATCH: "Denied because the requested destination is not covered by the applicable consent.",
  CONSENT_ZONE_MISMATCH: "Denied because the requested processing zone is not covered by the applicable consent.",
  CONSENT_SCOPE_DRIFT: "Denied because the requested privacy scope expands beyond the applicable consent.",
  PURPOSE_NOT_DECLARED: "Denied because the declared purpose is not authorized by the application manifest.",
  DESTINATION_NOT_PERMITTED: "Denied because the requested destination is not permitted.",
  PROCESSING_ZONE_NOT_PERMITTED: "Denied because the requested processing zone is not permitted.",
  OPERATION_NOT_DECLARED: "Denied because the requested operation is not declared.",
  RESOURCE_NOT_DECLARED: "Denied because the requested resource is not declared.",
  MANIFEST_NOT_FOUND: "Denied because the requesting application or service has no accepted privacy manifest.",
});

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sign(value, secret) {
  if (typeof secret !== "string" || !secret) throw new TypeError("Privacy receipt signing secret must be a non-empty string");
  return crypto.createHmac("sha256", secret).update(canonical(value)).digest("base64url");
}

function requiredString(value, field) {
  if (
    typeof value !== "string"
    || !value
    || value !== value.trim()
    || value.length > 256
    || /[\u0000-\u001F\u007F-\u009F]/.test(value)
  ) {
    throw new TypeError(`Privacy receipt requires canonical ${field}`);
  }
  return value;
}

function optionalTimestamp(value, field) {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== "string"
    || !value
    || value !== value.trim()
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError(`Privacy receipt has invalid ${field}`);
  }
  return value;
}

function stringCodes(value, field) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError(`Privacy receipt ${field} must be an array`);
  const normalized = value.map(item => requiredString(item, field));
  return [...new Set(normalized)].sort();
}

function retentionSummary(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Privacy receipt requires a retention object");
  }
  const mode = requiredString(value.mode, "retention.mode");
  return {
    mode,
    expires_at: optionalTimestamp(value.expires_at, "retention.expires_at"),
  };
}

function destinationClassification(processingZone) {
  const classification = DESTINATION_CLASS_BY_ZONE[processingZone];
  if (!classification) throw new TypeError("Privacy receipt processing zone is unsupported");
  return classification;
}

function normalizeConsentBasis(consent) {
  if (consent === undefined || consent === null) return null;
  if (!consent || typeof consent !== "object" || Array.isArray(consent)) {
    throw new TypeError("Privacy receipt consent basis must be an object");
  }
  return {
    consent_id: requiredString(consent.consent_id, "consent_basis.consent_id"),
    decision: consent.decision === undefined ? null : requiredString(consent.decision, "consent_basis.decision"),
    grant_type: consent.grant_type === undefined ? null : requiredString(consent.grant_type, "consent_basis.grant_type"),
    expires_at: optionalTimestamp(consent.expires_at, "consent_basis.expires_at"),
    scope_contract: consent.scope?.contract === undefined
      ? null
      : requiredString(consent.scope.contract, "consent_basis.scope_contract"),
  };
}

function validateDecision(decision) {
  if (!decision || typeof decision !== "object" || Array.isArray(decision)) {
    throw new TypeError("Privacy receipt requires a decision object");
  }
  requiredString(decision.decision_id, "decision.decision_id");
  requiredString(decision.request_id, "decision.request_id");
  if (!DECISION_OUTCOMES.has(decision.outcome)) throw new TypeError("Privacy receipt decision outcome is unsupported");
  requiredString(decision.reason_code, "decision.reason_code");
}

function validateEvidenceBinding(request, decision, evidence, nowMs) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new TypeError("Privacy Receipt 2.0 requires recorded privacy evidence");
  }
  if (evidence.request_id !== request.request_id || evidence.decision_id !== decision.decision_id) {
    throw new Error("PRIVACY_RECEIPT_EVIDENCE_BINDING_MISMATCH");
  }
  const evidence_id = requiredString(evidence.evidence_id, "evidence.evidence_id");
  const evidence_hash = requiredString(evidence.evidence_hash, "evidence.evidence_hash");
  const recorded_at = optionalTimestamp(evidence.recorded_at, "evidence.recorded_at");
  if (!recorded_at) throw new TypeError("Privacy Receipt 2.0 requires evidence.recorded_at");
  const ageMs = nowMs - Date.parse(recorded_at);
  if (ageMs < 0) throw new Error("PRIVACY_RECEIPT_EVIDENCE_FUTURE_DATED");
  return {
    evidence_id,
    evidence_hash,
    recorded_at,
    age_seconds: Math.floor(ageMs / 1000),
  };
}

function explanationMessage(decision) {
  return REASON_MESSAGES[decision.reason_code]
    ?? (decision.outcome === "ALLOW"
      ? "Allowed by the evaluated Privacy Shield decision."
      : decision.outcome === "ALLOW_WITH_CONSTRAINTS"
        ? "Allowed with constraints by the evaluated Privacy Shield decision."
        : decision.outcome === "REQUIRE_USER_DECISION"
          ? "A user privacy decision is required before runtime authorization may proceed."
          : "Denied by the evaluated Privacy Shield decision.");
}

export function buildPrivacyExplanation({ request, decision, evidence = null, preview = false }) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("Privacy explanation requires a request object");
  }
  validateDecision(decision);
  if (decision.request_id !== request.request_id) throw new Error("PRIVACY_EXPLANATION_REQUEST_MISMATCH");

  let evidence_reference = null;
  if (!preview) {
    const binding = validateEvidenceBinding(request, decision, evidence, Date.now());
    evidence_reference = {
      evidence_id: binding.evidence_id,
      evidence_hash: binding.evidence_hash,
      recorded_at: binding.recorded_at,
    };
  }

  const processing_zone = decision.processing_zone ?? request.processing_zone;
  const retention = retentionSummary(decision.retention ?? request.retention);
  return {
    summary_code: decision.outcome === "ALLOW"
      ? "privacy.allowed"
      : decision.outcome === "ALLOW_WITH_CONSTRAINTS"
        ? "privacy.allowed_with_constraints"
        : decision.outcome === "REQUIRE_USER_DECISION"
          ? "privacy.user_decision_required"
          : "privacy.denied",
    message: explanationMessage(decision),
    outcome: decision.outcome,
    reason_codes: [decision.reason_code],
    purpose: requiredString(request.purpose, "request.purpose"),
    processing_zone,
    destination_classification: destinationClassification(processing_zone),
    retention,
    obligations: stringCodes(decision.obligations, "decision.obligations"),
    policy_references: stringCodes(decision.policy_references, "decision.policy_references"),
    evidence_reference,
    preview_only: Boolean(preview),
  };
}

export function createPrivacyReceipt({
  request,
  decision,
  evidence,
  consent = null,
  lifecycle_obligations = [],
  signing_secret = null,
  now = new Date(),
}) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("Privacy Receipt 2.0 requires a request object");
  }
  validateDecision(decision);
  if (decision.request_id !== request.request_id) throw new Error("PRIVACY_RECEIPT_REQUEST_MISMATCH");
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new TypeError("Privacy Receipt 2.0 requires a valid creation time");
  const created_at = new Date(nowMs).toISOString();
  const evidenceBinding = validateEvidenceBinding(request, decision, evidence, nowMs);
  const processing_zone = decision.processing_zone ?? request.processing_zone;
  const retention = retentionSummary(decision.retention ?? request.retention);
  const consent_basis = normalizeConsentBasis(consent);

  const receipt = {
    receipt_id: id("psr"),
    contract: PRIVACY_RECEIPT_CONTRACT,
    schema_version: 2,
    created_at,
    authority: "goreecloud.privacy-shield",
    authorization_effect: false,
    request_id: requiredString(request.request_id, "request.request_id"),
    decision_id: decision.decision_id,
    evidence: evidenceBinding,
    requester_id: requiredString(request.requester?.id, "request.requester.id"),
    data_category: request.resource?.classification ?? null,
    purpose: requiredString(request.purpose, "request.purpose"),
    operation: requiredString(request.operation, "request.operation"),
    outcome: decision.outcome,
    constraints: {
      processing_zone,
      destination_classification: destinationClassification(processing_zone),
      retention,
      obligations: stringCodes(decision.obligations, "decision.obligations"),
    },
    consent_basis,
    lifecycle_obligations: stringCodes(lifecycle_obligations, "lifecycle_obligations"),
    reason_codes: [decision.reason_code],
    policy_references: stringCodes(decision.policy_references, "decision.policy_references"),
    expires_at: optionalTimestamp(decision.expires_at ?? consent_basis?.expires_at, "expires_at"),
    explanation: buildPrivacyExplanation({ request, decision, evidence }),
  };
  if (signing_secret !== null) {
    receipt.signature = {
      algorithm: "HMAC-SHA256",
      profile: "development-only",
      value: sign(receipt, signing_secret),
    };
  }
  return receipt;
}

export function verifyPrivacyReceipt(receipt, signing_secret) {
  if (!receipt?.signature?.value) return { valid: false, reason: "RECEIPT_SIGNATURE_MISSING" };
  if (receipt.contract !== PRIVACY_RECEIPT_CONTRACT || receipt.schema_version !== 2) {
    return { valid: false, reason: "RECEIPT_CONTRACT_UNSUPPORTED" };
  }
  const unsigned = structuredClone(receipt);
  const supplied = unsigned.signature.value;
  delete unsigned.signature;
  const expected = sign(unsigned, signing_secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a, b)
    ? { valid: true }
    : { valid: false, reason: "RECEIPT_SIGNATURE_INVALID" };
}

export class PrivacyReceiptLedger {
  constructor({ store = new MemoryPrivacyStateStore() } = {}) {
    this.store = store;
  }

  record(input) {
    return mutatePrivacyState(this.store, store => {
      const receipt = createPrivacyReceipt(input);
      if (store.get("privacy_receipt", receipt.receipt_id)) throw new Error("PRIVACY_RECEIPT_ID_EXISTS");
      store.set("privacy_receipt", receipt.receipt_id, receipt);
      return structuredClone(receipt);
    });
  }

  get(receipt_id) {
    if (typeof receipt_id !== "string" || !receipt_id) return null;
    return this.store.get("privacy_receipt", receipt_id);
  }

  list({ requester_id, outcome } = {}) {
    return this.store.list("privacy_receipt")
      .map(({ value }) => value)
      .filter(receipt => (!requester_id || receipt.requester_id === requester_id)
        && (!outcome || receipt.outcome === outcome))
      .map(receipt => structuredClone(receipt));
  }
}

export function previewPrivacyDecision({ decision_point, request }) {
  if (!decision_point || typeof decision_point.evaluate !== "function") {
    throw new TypeError("Privacy decision preview requires a decision point with evaluate()");
  }
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("Privacy decision preview requires a request object");
  }
  const evaluated = decision_point.evaluate(structuredClone(request));
  validateDecision(evaluated);
  const processing_zone = evaluated.processing_zone ?? request.processing_zone;
  return {
    preview_id: id("pspv"),
    contract: PRIVACY_PREVIEW_CONTRACT,
    created_at: new Date().toISOString(),
    authorization_effect: false,
    records_evidence: false,
    creates_capability: false,
    consumes_consent: false,
    requires_runtime_re_evaluation: true,
    request: {
      request_id: request.request_id,
      requester_id: request.requester?.id ?? null,
      data_category: request.resource?.classification ?? null,
      purpose: request.purpose ?? null,
      operation: request.operation ?? null,
      processing_zone,
      destination_classification: destinationClassification(processing_zone),
      retention: retentionSummary(evaluated.retention ?? request.retention),
    },
    decision: {
      outcome: evaluated.outcome,
      reason_code: evaluated.reason_code,
      obligations: stringCodes(evaluated.obligations, "decision.obligations"),
      policy_references: stringCodes(evaluated.policy_references, "decision.policy_references"),
      expires_at: optionalTimestamp(evaluated.expires_at, "decision.expires_at"),
    },
    explanation: buildPrivacyExplanation({ request, decision: evaluated, preview: true }),
  };
}
