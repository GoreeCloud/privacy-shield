import { validatePrivacyMeshEvidenceRefreshIntent } from "./mesh-evidence.mjs";
import { createPrivacyMeshEvidenceRefreshResponse } from "./mesh-refresh-response.mjs";

const EVIDENCE_VERSION = "goreecloud.evidence-envelope.v1";
const PRIVACY_SHIELD_REPOSITORY = "GoreeCloud/goreecloud-privacy-shield";
const PRIVACY_CONTRACT_PREFIX = "contracts/privacy-shield.";
const DATA_CLASSES = new Set(["public", "operational", "derived"]);
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const EVIDENCE_FIELDS = new Set([
  "version", "id", "producer", "authority_domain", "subject", "assertion", "outcome",
  "source", "observed_at", "valid_until", "data_class", "summary", "payload_digest",
  "contains_user_content", "contains_secret_material",
]);

function timestamp(value, field) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error(`${field} must be a valid timestamp`);
  return parsed;
}

function bounded(value, field, maximum, { required = false } = {}) {
  const normalized = String(value ?? "").trim();
  if (required && !normalized) throw new Error(`${field} is required`);
  if (normalized.length > maximum) throw new Error(`${field} must be at most ${maximum} characters`);
  return normalized;
}

function sameSubject(left, right) {
  return bounded(left?.kind, "evidence.subject.kind", 64, { required: true }) === bounded(right?.kind, "intent.subject.kind", 64, { required: true }) &&
    bounded(left?.id, "evidence.subject.id", 256, { required: true }) === bounded(right?.id, "intent.subject.id", 256, { required: true }) &&
    bounded(left?.scope, "evidence.subject.scope", 256) === bounded(right?.scope, "intent.subject.scope", 256);
}

function validateProducedPrivacyEvidence(accepted, envelope, revision, responseTime, evaluatedAt) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) throw new Error("evidence_envelope must be an object");
  for (const key of Object.keys(envelope)) {
    if (!EVIDENCE_FIELDS.has(key)) throw new Error(`unexpected evidence envelope field: ${key}`);
  }
  if (envelope.version !== EVIDENCE_VERSION) throw new Error("unsupported evidence envelope version");
  const envelopeId = bounded(envelope.id, "evidence_envelope.id", 128, { required: true });

  const producer = envelope.producer;
  if (!producer || typeof producer !== "object" || Array.isArray(producer)) throw new Error("evidence producer is required");
  if (Object.keys(producer).sort().join(",") !== "contract,repository,revision,system") throw new Error("evidence producer identity is invalid");
  if (producer.system !== "privacy-shield" || producer.repository !== PRIVACY_SHIELD_REPOSITORY || producer.revision !== revision) {
    throw new Error("evidence producer provenance must match the Privacy Shield refresh response");
  }
  const contract = bounded(producer.contract, "evidence producer contract", 512, { required: true });
  if (!contract.startsWith(PRIVACY_CONTRACT_PREFIX)) throw new Error("evidence producer contract must belong to Privacy Shield");

  if (envelope.authority_domain !== accepted.authority_domain) throw new Error("evidence authority domain does not match the refresh intent");
  const subject = envelope.subject;
  if (!subject || typeof subject !== "object" || Array.isArray(subject)) throw new Error("evidence subject is required");
  for (const key of Object.keys(subject)) {
    if (!["kind", "id", "scope"].includes(key)) throw new Error(`unexpected evidence subject field: ${key}`);
  }
  if (!sameSubject(subject, accepted.subject)) throw new Error("evidence subject does not match the refresh intent");
  if (bounded(envelope.assertion, "evidence assertion", 128, { required: true }) !== bounded(accepted.assertion, "intent assertion", 128, { required: true })) {
    throw new Error("evidence assertion does not match the refresh intent");
  }
  bounded(envelope.outcome, "evidence outcome", 128, { required: true });
  bounded(envelope.source, "evidence source", 512, { required: true });
  bounded(envelope.summary, "evidence summary", 512);
  if (!DATA_CLASSES.has(envelope.data_class)) throw new Error("invalid evidence data class");
  if (envelope.payload_digest != null && envelope.payload_digest !== "" && !DIGEST.test(String(envelope.payload_digest))) {
    throw new Error("evidence payload_digest must use sha256:<64 lowercase hex characters>");
  }
  if (envelope.contains_user_content !== false || envelope.contains_secret_material !== false) {
    throw new Error("evidence envelope must exclude user content and secret material");
  }

  const requestedAt = timestamp(accepted.requested_at, "intent.requested_at");
  const observedAt = timestamp(envelope.observed_at, "evidence.observed_at");
  const validUntil = timestamp(envelope.valid_until, "evidence.valid_until");
  if (observedAt.getTime() < requestedAt.getTime()) throw new Error("refresh evidence observation predates the refresh request");
  if (observedAt.getTime() > responseTime.getTime()) throw new Error("refresh response cannot reference evidence observed after the response");
  if (validUntil.getTime() <= observedAt.getTime()) throw new Error("evidence valid_until must be after observed_at");
  if (validUntil.getTime() < evaluatedAt.getTime()) throw new Error("refresh response cannot reference expired evidence");
  return envelopeId;
}

/**
 * Create a Privacy Shield refresh response from an actual produced evidence
 * envelope. Unlike the lower-level receipt helper, this path fail-closes unless
 * the envelope is current and exactly bound to the original Mesh intent,
 * Privacy Shield producer revision, authority domain, subject, and assertion.
 * The returned object is still only a handling receipt; the evidence envelope
 * remains the separate producer-authoritative domain record.
 */
export function createPrivacyMeshEvidenceRefreshResponseForEvidence(intent, {
  response_id,
  revision,
  evidence_envelope,
  reason_code = "evidence-issued",
  respondedAt,
  now = new Date(),
} = {}) {
  const evaluatedAt = timestamp(now, "now");
  const accepted = validatePrivacyMeshEvidenceRefreshIntent(intent, { now: evaluatedAt });
  const responseTime = timestamp(respondedAt ?? evaluatedAt, "respondedAt");
  const evidenceId = validateProducedPrivacyEvidence(accepted, evidence_envelope, revision, responseTime, evaluatedAt);
  return createPrivacyMeshEvidenceRefreshResponse(accepted, {
    response_id,
    revision,
    status: "completed",
    reason_code,
    respondedAt: responseTime,
    evidence_envelope_id: evidenceId,
    now: evaluatedAt,
  });
}
