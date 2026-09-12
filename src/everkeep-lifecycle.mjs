const OBLIGATION_SCHEMA = "goreecloud.privacy-shield.everkeep-lifecycle-obligation.v1";
const ASSESSMENT_SCHEMA = "goreecloud.privacy-shield.everkeep-lifecycle-assessment.v1";
const PRIVACY_AUTHORITY = "GoreeCloud/goreecloud-privacy-shield";
const EVERKEEP_AUTHORITY = "GoreeCloud/goreecloud-everkeep";
const EVERKEEP_SOURCE_REVISION = "37f77a2c330a60c116aca107661a852bb8b5f031";
const EVERKEEP_STATUS_SCHEMA = "contracts/continuity.status.schema.json";
const MAX_EVIDENCE_REFERENCES = 50;
const OPERATIONS = new Set(["retain", "delete", "export", "recovery", "succession", "preservation"]);
const EVIDENCE_STATES = new Set(["pending", "satisfied", "failed", "unknown"]);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,239}$/;
const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/;
const OBLIGATION_FIELDS = new Set([
  "schema_version",
  "obligation_id",
  "subject_id",
  "application_id",
  "resource_scope",
  "operation",
  "purpose",
  "privacy_basis",
  "privacy_authority",
  "execution_authority",
  "everkeep_authority",
  "everkeep_source_revision",
  "everkeep_status_schema",
  "issued_at",
  "parameters",
  "evidence_references",
  "authorization_effect",
  "execution_authorization",
  "authority_transfer",
]);
const EVIDENCE_FIELDS = new Set([
  "obligation_id",
  "producer",
  "producer_revision",
  "status_schema",
  "execution_authority",
  "resource_scope",
  "operation",
  "state",
  "observed_at",
  "fresh_until",
  "execution_verified",
  "evidence_references",
  "reason",
]);

function text(value, name, pattern = null, maximum = 1000) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value !== value.trim() ||
    CONTROL_CHARACTERS.test(value) ||
    (pattern && !pattern.test(value))
  ) {
    throw new TypeError(`${name} is invalid or noncanonical`);
  }
  return value;
}

function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function closed(value, allowed, name) {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new TypeError(`${name}.${key} is unsupported`);
}

function time(value, name) {
  text(value, name);
  if (!TIMEZONE_SUFFIX.test(value)) {
    throw new TypeError(`${name} must be an ISO date-time with explicit timezone`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${name} must be an ISO date-time with explicit timezone`);
  return parsed;
}

function refs(value, name, minimum = 0, maximum = MAX_EVIDENCE_REFERENCES) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) throw new TypeError(`${name} is invalid`);
  const normalized = value.map((item, index) => text(item, `${name}[${index}]`));
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${name} contains duplicates`);
  return normalized;
}

function parameters(operation, value) {
  object(value, "parameters");
  closed(value, new Set(["retention_until", "complete_by", "preservation_until", "export_format", "destination_class", "recovery_scope", "custodian_reference"]), "parameters");
  const result = {};
  for (const key of ["retention_until", "complete_by", "preservation_until"]) {
    if (value[key] !== undefined) result[key] = new Date(time(value[key], `parameters.${key}`)).toISOString();
  }
  for (const key of ["export_format", "destination_class"]) {
    if (value[key] !== undefined) result[key] = text(value[key], `parameters.${key}`, ID, 120);
  }
  for (const key of ["recovery_scope", "custodian_reference"]) {
    if (value[key] !== undefined) result[key] = text(value[key], `parameters.${key}`, ID, 240);
  }
  if (operation === "retain" && !result.retention_until) throw new TypeError("retain requires retention_until");
  if (operation === "delete" && !result.complete_by) throw new TypeError("delete requires complete_by");
  if (operation === "export" && (!result.complete_by || !result.export_format)) throw new TypeError("export requires complete_by and export_format");
  if (operation === "recovery" && !result.recovery_scope) throw new TypeError("recovery requires recovery_scope");
  if (operation === "succession" && !result.custodian_reference) throw new TypeError("succession requires custodian_reference");
  if (operation === "preservation" && !result.preservation_until) throw new TypeError("preservation requires preservation_until");
  return result;
}

function deadline(operation, value) {
  if (value.complete_by) return Date.parse(value.complete_by);
  if (operation === "retain") return Date.parse(value.retention_until);
  if (operation === "preservation") return Date.parse(value.preservation_until);
  return null;
}

function requiresCompletedHorizon(operation) {
  return operation === "retain" || operation === "preservation";
}

function validateObligationForAssessment(obligation) {
  object(obligation, "obligation");
  closed(obligation, OBLIGATION_FIELDS, "obligation");
  if (obligation.schema_version !== OBLIGATION_SCHEMA) throw new TypeError("obligation schema is invalid");

  for (const key of ["obligation_id", "subject_id", "application_id", "resource_scope", "purpose", "privacy_basis"]) {
    text(obligation[key], `obligation.${key}`, ID);
  }
  const operation = text(obligation.operation, "obligation.operation", ID);
  if (!OPERATIONS.has(operation)) throw new TypeError("obligation operation is unsupported");
  if (obligation.privacy_authority !== PRIVACY_AUTHORITY) throw new TypeError("obligation privacy authority is invalid");
  const executionAuthority = text(obligation.execution_authority, "obligation.execution_authority", null, 240);
  if (executionAuthority === PRIVACY_AUTHORITY) throw new TypeError("Privacy Shield cannot be lifecycle execution authority");
  if (obligation.everkeep_authority !== EVERKEEP_AUTHORITY) throw new TypeError("obligation Everkeep authority is invalid");
  if (obligation.everkeep_source_revision !== EVERKEEP_SOURCE_REVISION) throw new TypeError("obligation Everkeep source revision is invalid");
  if (obligation.everkeep_status_schema !== EVERKEEP_STATUS_SCHEMA) throw new TypeError("obligation Everkeep status schema is invalid");
  if (obligation.authorization_effect !== false || obligation.execution_authorization !== false || obligation.authority_transfer !== false) {
    throw new TypeError("obligation must remain non-authorizing and non-transferring");
  }

  const issuedAt = time(obligation.issued_at, "obligation.issued_at");
  if (new Date(issuedAt).toISOString() !== obligation.issued_at) throw new TypeError("obligation issued_at must remain canonical UTC");
  const normalizedParameters = parameters(operation, obligation.parameters);
  const due = deadline(operation, normalizedParameters);
  if (due !== null && due <= issuedAt) throw new TypeError("lifecycle deadline must follow issued_at");
  refs(obligation.evidence_references, "obligation.evidence_references");
  return {operation, parameters: normalizedParameters, due, issuedAt};
}

export function createEverkeepLifecycleObligation(input) {
  object(input, "obligation");
  closed(input, new Set(["obligation_id", "subject_id", "application_id", "resource_scope", "operation", "purpose", "privacy_basis", "execution_authority", "issued_at", "parameters", "evidence_references"]), "obligation");
  const operation = text(input.operation, "operation", ID);
  if (!OPERATIONS.has(operation)) throw new TypeError("operation is unsupported");
  const executionAuthority = text(input.execution_authority, "execution_authority", null, 240);
  if (executionAuthority === PRIVACY_AUTHORITY) throw new TypeError("Privacy Shield cannot be lifecycle execution authority");
  const issuedAt = time(input.issued_at, "issued_at");
  const normalizedParameters = parameters(operation, input.parameters);
  const due = deadline(operation, normalizedParameters);
  if (due !== null && due <= issuedAt) throw new TypeError("lifecycle deadline must follow issued_at");

  return {
    schema_version: OBLIGATION_SCHEMA,
    obligation_id: text(input.obligation_id, "obligation_id", ID),
    subject_id: text(input.subject_id, "subject_id", ID),
    application_id: text(input.application_id, "application_id", ID),
    resource_scope: text(input.resource_scope, "resource_scope", ID),
    operation,
    purpose: text(input.purpose, "purpose", ID),
    privacy_basis: text(input.privacy_basis, "privacy_basis", ID),
    privacy_authority: PRIVACY_AUTHORITY,
    execution_authority: executionAuthority,
    everkeep_authority: EVERKEEP_AUTHORITY,
    everkeep_source_revision: EVERKEEP_SOURCE_REVISION,
    everkeep_status_schema: EVERKEEP_STATUS_SCHEMA,
    issued_at: new Date(issuedAt).toISOString(),
    parameters: normalizedParameters,
    evidence_references: refs(input.evidence_references ?? [], "evidence_references"),
    authorization_effect: false,
    execution_authorization: false,
    authority_transfer: false,
  };
}

export function assessEverkeepLifecycleEvidence(
  obligation,
  evidence,
  {now = new Date(), maxEvidenceAgeMs = null} = {},
) {
  const validatedObligation = validateObligationForAssessment(obligation);
  const nowMs = now instanceof Date ? now.getTime() : time(now, "now");
  if (!Number.isFinite(nowMs)) throw new TypeError("now must be a valid date-time");
  if (maxEvidenceAgeMs !== null && (!Number.isSafeInteger(maxEvidenceAgeMs) || maxEvidenceAgeMs <= 0)) {
    throw new TypeError("maxEvidenceAgeMs must be a positive safe integer duration in milliseconds");
  }
  const due = validatedObligation.due;
  const base = {
    schema_version: ASSESSMENT_SCHEMA,
    obligation_id: obligation.obligation_id,
    authorization_effect: false,
    execution_authorization: false,
    authority_transfer: false,
  };

  if (evidence === null || evidence === undefined) {
    return {...base, status: due !== null && nowMs > due ? "overdue" : "unknown", reason: "everkeep_evidence_missing", observed_at: null, fresh_until: null, evidence_references: [], execution_verified: false};
  }

  object(evidence, "evidence");
  closed(evidence, EVIDENCE_FIELDS, "evidence");
  if (evidence.obligation_id !== obligation.obligation_id) throw new TypeError("evidence obligation binding mismatch");
  if (evidence.producer !== EVERKEEP_AUTHORITY) throw new TypeError("evidence producer must be Everkeep");
  if (evidence.producer_revision !== obligation.everkeep_source_revision) throw new TypeError("evidence Everkeep source revision binding mismatch");
  if (evidence.status_schema !== obligation.everkeep_status_schema) throw new TypeError("evidence Everkeep status schema binding mismatch");
  if (evidence.execution_authority !== obligation.execution_authority) throw new TypeError("execution authority binding mismatch");
  if (evidence.resource_scope !== obligation.resource_scope) throw new TypeError("resource scope binding mismatch");
  if (evidence.operation !== validatedObligation.operation) throw new TypeError("operation binding mismatch");
  if (!EVIDENCE_STATES.has(evidence.state)) throw new TypeError("evidence state is invalid");
  if (typeof evidence.execution_verified !== "boolean") throw new TypeError("evidence.execution_verified must be boolean");
  if (evidence.execution_verified && evidence.state !== "satisfied") {
    throw new TypeError("verified execution requires satisfied evidence state");
  }

  const observed = time(evidence.observed_at, "evidence.observed_at");
  if (observed < validatedObligation.issuedAt) throw new TypeError("evidence cannot predate the lifecycle obligation");
  if (observed > nowMs) throw new TypeError("evidence cannot be future-dated");
  let freshUntil = null;
  let producerFresh = false;
  if (evidence.fresh_until !== null && evidence.fresh_until !== undefined) {
    const parsed = time(evidence.fresh_until, "evidence.fresh_until");
    if (parsed <= observed) throw new TypeError("fresh_until must follow observed_at");
    freshUntil = new Date(parsed).toISOString();
    producerFresh = parsed > nowMs;
  }
  const consumerFresh = maxEvidenceAgeMs !== null && nowMs - observed <= maxEvidenceAgeMs;
  const fresh = producerFresh && consumerFresh;
  const evidenceReferences = refs(evidence.evidence_references ?? [], "evidence.evidence_references");
  const verified = evidence.execution_verified;
  const completionHorizonIncomplete =
    requiresCompletedHorizon(validatedObligation.operation) &&
    due !== null &&
    observed < due;
  let status = evidence.state;
  let reason = `everkeep_${evidence.state}`;
  if (Object.prototype.hasOwnProperty.call(evidence, "reason")) {
    reason = text(evidence.reason, "evidence.reason", null, 500);
  }

  if (
    evidence.state === "satisfied" &&
    verified &&
    evidenceReferences.length > 0 &&
    fresh &&
    completionHorizonIncomplete
  ) {
    status = nowMs > due ? "overdue" : "pending";
    reason = nowMs > due
      ? `${validatedObligation.operation}_horizon_unverified`
      : `${validatedObligation.operation}_horizon_incomplete`;
  } else if (evidence.state === "satisfied" && verified && evidenceReferences.length > 0 && producerFresh && maxEvidenceAgeMs === null) {
    status = due !== null && nowMs > due ? "overdue" : "unknown";
    reason = "consumer_freshness_policy_missing";
  } else if (evidence.state === "satisfied" && (!verified || evidenceReferences.length === 0 || !fresh)) {
    status = due !== null && nowMs > due ? "overdue" : "unknown";
    reason = "satisfaction_not_currently_verified";
  } else if (evidence.state === "pending" && due !== null && nowMs > due) {
    status = "overdue";
    reason = "lifecycle_obligation_overdue";
  } else if (!fresh && evidence.state !== "failed") {
    status = due !== null && nowMs > due ? "overdue" : "unknown";
    reason = "everkeep_evidence_stale_or_unbounded";
  }

  return {
    ...base,
    status,
    reason,
    observed_at: new Date(observed).toISOString(),
    fresh_until: freshUntil,
    evidence_references: evidenceReferences,
    execution_verified: status === "satisfied" && verified,
  };
}

export { ASSESSMENT_SCHEMA, EVERKEEP_AUTHORITY, EVERKEEP_SOURCE_REVISION, EVERKEEP_STATUS_SCHEMA, OBLIGATION_SCHEMA, PRIVACY_AUTHORITY };
