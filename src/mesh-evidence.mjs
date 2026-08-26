const MESH_EVIDENCE_VERSION = "goreecloud.evidence-envelope.v1";
const PRIVACY_SHIELD_REPOSITORY = "GoreeCloud/goreecloud-privacy-shield";
const REVISION = /^[0-9a-f]{40}$/;
const DIGEST = /^[0-9a-f]{64}$/;

function parseTime(value, field) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid timestamp`);
  return date;
}

function text(value, max = 256) {
  const normalized = String(value ?? "").trim();
  return normalized.length > max ? normalized.slice(0, max) : normalized;
}

/**
 * Convert minimized Privacy Shield evidence into GoreeCloud Mesh Evidence
 * Envelope v1. Raw prompts, retrieved content, message/file bodies, browsing
 * history, DNS/network history, credentials, and arbitrary evidence metadata are
 * intentionally not copied into the transport envelope.
 */
export function createPrivacyMeshEvidenceEnvelope({
  evidence,
  revision,
  valid_until,
  assertion = "privacy-status",
  contract = "contracts/privacy-shield.status.schema.json",
  subject_kind = "resource",
  subject_scope = "",
  now = new Date(),
} = {}) {
  if (!evidence || typeof evidence !== "object") throw new Error("evidence is required");
  if (!REVISION.test(revision ?? "")) throw new Error("revision must be an exact 40-character lowercase Git revision");
  if (!String(contract ?? "").startsWith("contracts/privacy-shield.")) throw new Error("contract must be a Privacy Shield contract");

  const evidenceId = text(evidence.evidence_id, 128);
  const resourceId = text(evidence.resource_id, 256);
  const outcome = text(evidence.outcome, 128);
  const reasonCode = text(evidence.reason_code, 256);
  if (!evidenceId || !resourceId || !outcome || !assertion) throw new Error("evidence id, resource id, outcome, and assertion are required");

  const observedAt = parseTime(evidence.recorded_at, "evidence.recorded_at");
  const validUntil = parseTime(valid_until, "valid_until");
  const evaluatedAt = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(evaluatedAt.getTime())) throw new Error("now must be a valid timestamp");
  if (observedAt.getTime() > evaluatedAt.getTime()) throw new Error("evidence observation cannot be in the future");
  if (validUntil.getTime() <= observedAt.getTime()) throw new Error("valid_until must be after evidence observation");
  if (validUntil.getTime() < evaluatedAt.getTime()) throw new Error("cannot emit expired Privacy Shield evidence");

  const envelope = {
    version: MESH_EVIDENCE_VERSION,
    id: `privacy-shield-${evidenceId}`,
    producer: {
      system: "privacy-shield",
      repository: PRIVACY_SHIELD_REPOSITORY,
      revision,
      contract,
    },
    authority_domain: "privacy",
    subject: {
      kind: text(subject_kind, 64) || "resource",
      id: resourceId,
      scope: text(subject_scope, 256),
    },
    assertion: text(assertion, 128),
    outcome,
    source: `privacy-shield://evidence/${evidenceId}`,
    observed_at: observedAt.toISOString(),
    valid_until: validUntil.toISOString(),
    data_class: "derived",
    summary: reasonCode ? `Privacy Shield ${assertion}: ${reasonCode}` : `Privacy Shield ${assertion} evidence.`,
    contains_user_content: false,
    contains_secret_material: false,
  };

  if (DIGEST.test(evidence.evidence_hash ?? "")) envelope.payload_digest = `sha256:${evidence.evidence_hash}`;
  return envelope;
}
