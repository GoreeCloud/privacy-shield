import { validatePrivacyMeshEvidenceRefreshIntent } from "./mesh-evidence.mjs";

const MESH_REFRESH_RESPONSE_VERSION = "goreecloud.evidence-refresh-response.v1";
const PRIVACY_SHIELD_REPOSITORY = "GoreeCloud/goreecloud-privacy-shield";
const REVISION = /^[0-9a-f]{40}$/;
const STATUSES = new Set(["received", "completed", "declined", "unavailable"]);

function date(value, field) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field} must be a valid timestamp`);
  return parsed;
}

function bounded(value, field, max, { required = false } = {}) {
  const normalized = String(value ?? "").trim();
  if (required && !normalized) throw new Error(`${field} is required`);
  if (normalized.length > max) throw new Error(`${field} must be at most ${max} characters`);
  return normalized;
}

/**
 * Create a minimized Privacy Shield response to a validated Mesh evidence
 * refresh intent. The response reports handling state only. Even when it points
 * to a newly produced evidence envelope, callers must validate that separate
 * envelope before treating any privacy evidence as current.
 */
export function createPrivacyMeshEvidenceRefreshResponse(intent, {
  response_id,
  revision,
  status,
  reason_code = "",
  respondedAt,
  evidence_envelope_id = "",
  now = new Date(),
} = {}) {
  const evaluatedAt = date(now, "now");
  const accepted = validatePrivacyMeshEvidenceRefreshIntent(intent, { now: evaluatedAt });
  const responseId = bounded(response_id, "response_id", 128, { required: true });
  if (!REVISION.test(revision ?? "")) throw new Error("revision must be an exact 40-character lowercase Git revision");
  if (!STATUSES.has(status)) throw new Error("invalid refresh response status");
  const reasonCode = bounded(reason_code, "reason_code", 64);
  const evidenceId = bounded(evidence_envelope_id, "evidence_envelope_id", 128);

  const responseTime = date(respondedAt ?? evaluatedAt, "respondedAt");
  const requestedAt = date(accepted.requested_at, "intent.requested_at");
  if (responseTime.getTime() < requestedAt.getTime() || responseTime.getTime() > evaluatedAt.getTime()) {
    throw new Error("respondedAt must be between requested_at and now");
  }
  if (evidenceId && status !== "completed") {
    throw new Error("only a completed refresh response may reference produced evidence");
  }

  const response = {
    version: MESH_REFRESH_RESPONSE_VERSION,
    id: responseId,
    intent: {
      id: accepted.id,
      coordinator_revision: accepted.coordinator.revision,
      reason: accepted.reason,
      requested_at: requestedAt.toISOString(),
    },
    producer: {
      system: "privacy-shield",
      repository: PRIVACY_SHIELD_REPOSITORY,
      revision,
    },
    authority_domain: accepted.authority_domain,
    subject: structuredClone(accepted.subject),
    assertion: accepted.assertion,
    status,
    responded_at: responseTime.toISOString(),
    evidence_produced: Boolean(evidenceId),
    contains_user_content: false,
    contains_secret_material: false,
    authority_transferred: false,
    execution_authorized: false,
  };
  if (reasonCode) response.reason_code = reasonCode;
  if (evidenceId) response.evidence_envelope_id = evidenceId;
  return response;
}
