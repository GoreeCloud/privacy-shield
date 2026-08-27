const MESH_EVIDENCE_VERSION = "goreecloud.evidence-envelope.v1";
const MESH_REFRESH_INTENT_VERSION = "goreecloud.evidence-refresh-intent.v1";
const MESH_REFRESH_CONTRACT = "contracts/mesh.evidence-refresh-intent.schema.json";
const MESH_REPOSITORY = "GoreeCloud/goreecloud-mesh";
const PRIVACY_SHIELD_REPOSITORY = "GoreeCloud/goreecloud-privacy-shield";
const REVISION = /^[0-9a-f]{40}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const REFRESH_REASONS = new Set(["stale", "empty", "manual"]);
const REFRESH_FIELDS = new Set([
  "version", "id", "coordinator", "producer", "authority_domain", "subject",
  "assertion", "reason", "requested_at", "latest_observed_at",
  "contains_user_content", "contains_secret_material", "authority_transferred",
  "execution_authorized",
]);

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
 * Validate a non-authoritative GoreeCloud Mesh request for refreshed Privacy
 * Shield evidence. This does not evaluate privacy policy, change consent,
 * produce evidence, or authorize any privacy operation.
 */
export function validatePrivacyMeshEvidenceRefreshIntent(intent, { now = new Date() } = {}) {
  if (!intent || typeof intent !== "object" || Array.isArray(intent)) throw new Error("refresh intent must be an object");
  for (const key of Object.keys(intent)) {
    if (!REFRESH_FIELDS.has(key)) throw new Error(`unexpected refresh intent field: ${key}`);
  }
  if (intent.version !== MESH_REFRESH_INTENT_VERSION) throw new Error("unsupported refresh intent version");

  const coordinator = intent.coordinator;
  if (!coordinator || typeof coordinator !== "object" || Array.isArray(coordinator)) throw new Error("Mesh coordinator identity is required");
  const coordinatorKeys = Object.keys(coordinator).sort().join(",");
  if (coordinatorKeys !== "contract,repository,revision,system") throw new Error("Mesh coordinator identity is invalid");
  if (coordinator.system !== "goreecloud-mesh" || coordinator.repository !== MESH_REPOSITORY) throw new Error("refresh intent must be coordinated by GoreeCloud Mesh");
  if (!REVISION.test(coordinator.revision ?? "")) throw new Error("Mesh coordinator revision must be exact");
  if (coordinator.contract !== MESH_REFRESH_CONTRACT) throw new Error("refresh intent must use the canonical Mesh contract");

  if (intent.producer !== "privacy-shield" || intent.authority_domain !== "privacy") throw new Error("refresh intent is not targeted to Privacy Shield authority");
  const subject = intent.subject;
  if (!subject || typeof subject !== "object" || Array.isArray(subject)) throw new Error("refresh intent subject is required");
  for (const key of Object.keys(subject)) {
    if (!["kind", "id", "scope"].includes(key)) throw new Error(`unexpected refresh subject field: ${key}`);
  }
  if (!text(subject.kind, 64) || !text(subject.id, 256)) throw new Error("refresh subject kind and id are required");
  if (!text(intent.id, 128) || !text(intent.assertion, 128)) throw new Error("refresh intent id and assertion are required");
  if (!REFRESH_REASONS.has(intent.reason)) throw new Error("invalid refresh reason");

  const evaluatedAt = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(evaluatedAt.getTime())) throw new Error("now must be a valid timestamp");
  const requestedAt = parseTime(intent.requested_at, "requested_at");
  if (requestedAt.getTime() > evaluatedAt.getTime()) throw new Error("requested_at cannot be in the future");
  const latest = intent.latest_observed_at == null ? null : parseTime(intent.latest_observed_at, "latest_observed_at");
  if (latest && latest.getTime() > requestedAt.getTime()) throw new Error("latest_observed_at cannot be after requested_at");
  if (intent.reason === "stale" && !latest) throw new Error("stale refresh requires latest_observed_at");
  if (intent.reason === "empty" && latest) throw new Error("empty refresh cannot claim an existing observation");

  if (intent.contains_user_content !== false || intent.contains_secret_material !== false) throw new Error("refresh intent must not contain user content or secret material");
  if (intent.authority_transferred !== false || intent.execution_authorized !== false) throw new Error("refresh intent cannot transfer Privacy Shield authority or authorize execution");
  return structuredClone(intent);
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
