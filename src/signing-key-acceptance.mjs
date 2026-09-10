export const PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT =
  "goreecloud.privacy-shield.signing-key-provider-acceptance.v1";

export const REQUIRED_SIGNING_KEY_QUALIFICATIONS = Object.freeze([
  "secure_key_generation",
  "non_exportability",
  "caller_authorization",
  "producer_identity_binding",
  "rotation",
  "retirement",
  "emergency_revocation",
  "stale_untrusted_rejection",
  "signing_audit",
  "outage_and_degraded_behavior",
  "recovery_and_continuity",
  "access_control_review",
  "exact_runtime_integration",
]);

const SHA40 = /^[0-9a-f]{40}$/;

function requireObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

function requireString(value, code) {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
  return value;
}

function requireFreshDate(value, now = Date.now()) {
  const text = requireString(value, "INVALID_SIGNING_KEY_ACCEPTANCE_EXPIRY");
  const expires = Date.parse(text);
  if (!Number.isFinite(expires)) throw new Error("INVALID_SIGNING_KEY_ACCEPTANCE_EXPIRY");
  if (expires <= now) throw new Error("SIGNING_KEY_ACCEPTANCE_EXPIRED");
  return text;
}

function requireEvidence(record) {
  if (!Array.isArray(record.evidence) || record.evidence.length === 0) {
    throw new Error("SIGNING_KEY_ACCEPTANCE_EVIDENCE_REQUIRED");
  }
  const passingCategories = new Set();
  for (const entry of record.evidence) {
    requireObject(entry, "INVALID_SIGNING_KEY_ACCEPTANCE_EVIDENCE");
    requireString(entry.id, "INVALID_SIGNING_KEY_ACCEPTANCE_EVIDENCE");
    const category = requireString(entry.category, "INVALID_SIGNING_KEY_ACCEPTANCE_EVIDENCE");
    requireString(entry.reference, "INVALID_SIGNING_KEY_ACCEPTANCE_EVIDENCE");
    if (!new Set(["passed", "failed", "informational"]).has(entry.result)) {
      throw new Error("INVALID_SIGNING_KEY_ACCEPTANCE_EVIDENCE");
    }
    if (entry.result === "passed") passingCategories.add(category);
  }
  return passingCategories;
}

export function requireSigningKeyProviderAcceptance(provider, {
  record,
  runtime_revision,
  deployment_id,
  now = Date.now(),
} = {}) {
  requireObject(provider, "PRODUCTION_SIGNING_KEY_PROVIDER_REQUIRED");
  const acceptanceRecord = requireObject(record, "PRODUCTION_SIGNING_KEY_ACCEPTANCE_REQUIRED");

  if (acceptanceRecord.schema_version !== 1) {
    throw new Error("SIGNING_KEY_ACCEPTANCE_SCHEMA_VERSION_MISMATCH");
  }
  if (acceptanceRecord.contract_id !== PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT) {
    throw new Error("SIGNING_KEY_ACCEPTANCE_CONTRACT_MISMATCH");
  }

  const acceptance = requireObject(
    acceptanceRecord.acceptance,
    "INVALID_SIGNING_KEY_ACCEPTANCE_STATE",
  );
  if (acceptance.status !== "passed" || acceptance.production_approved !== true) {
    throw new Error("SIGNING_KEY_PROVIDER_NOT_PRODUCTION_ACCEPTED");
  }
  if (acceptance.exact_revision_required !== true) {
    throw new Error("SIGNING_KEY_ACCEPTANCE_MUST_BE_EXACT_REVISION_BOUND");
  }
  const validUntil = requireFreshDate(acceptance.valid_until, now);

  const revision = requireString(runtime_revision, "PRODUCTION_RUNTIME_REVISION_REQUIRED");
  if (!SHA40.test(revision)) throw new Error("INVALID_PRODUCTION_RUNTIME_REVISION");
  if (acceptanceRecord.exact_source_revision !== revision) {
    throw new Error("SIGNING_KEY_ACCEPTANCE_SOURCE_REVISION_MISMATCH");
  }

  const deployment = requireObject(
    acceptanceRecord.deployment,
    "INVALID_SIGNING_KEY_ACCEPTANCE_DEPLOYMENT",
  );
  const requestedDeployment = requireString(
    deployment_id,
    "PRODUCTION_SIGNING_KEY_DEPLOYMENT_ID_REQUIRED",
  );
  if (deployment.deployment_id !== requestedDeployment) {
    throw new Error("SIGNING_KEY_ACCEPTANCE_DEPLOYMENT_MISMATCH");
  }

  if (typeof provider.activeKey !== "function") {
    throw new Error("PRODUCTION_SIGNING_KEY_PROVIDER_REQUIRED");
  }
  const key = requireObject(provider.activeKey(), "INVALID_PRODUCTION_SIGNING_KEY_METADATA");
  for (const field of [
    "provider_id",
    "provider_version",
    "producer_identity",
    "algorithm",
  ]) {
    requireString(key[field], "INVALID_PRODUCTION_SIGNING_KEY_METADATA");
  }

  if (acceptanceRecord.provider_id !== key.provider_id) {
    throw new Error("SIGNING_KEY_ACCEPTANCE_PROVIDER_MISMATCH");
  }
  if (acceptanceRecord.provider_version !== key.provider_version) {
    throw new Error("SIGNING_KEY_ACCEPTANCE_PROVIDER_VERSION_MISMATCH");
  }
  if (acceptanceRecord.producer_identity !== key.producer_identity) {
    throw new Error("SIGNING_KEY_ACCEPTANCE_PRODUCER_IDENTITY_MISMATCH");
  }
  if (!Array.isArray(acceptanceRecord.algorithms) || !acceptanceRecord.algorithms.includes(key.algorithm)) {
    throw new Error("SIGNING_KEY_ACCEPTANCE_ALGORITHM_MISMATCH");
  }

  const qualification = requireObject(
    acceptanceRecord.qualification,
    "INVALID_SIGNING_KEY_ACCEPTANCE_QUALIFICATION",
  );
  const passingEvidence = requireEvidence(acceptanceRecord);
  for (const requirement of REQUIRED_SIGNING_KEY_QUALIFICATIONS) {
    if (qualification[requirement] !== "passed") {
      throw new Error(`SIGNING_KEY_ACCEPTANCE_QUALIFICATION_REQUIRED:${requirement}`);
    }
    if (!passingEvidence.has(requirement)) {
      throw new Error(`SIGNING_KEY_ACCEPTANCE_EVIDENCE_REQUIRED:${requirement}`);
    }
  }

  const privacy = requireObject(
    acceptanceRecord.privacy,
    "INVALID_SIGNING_KEY_ACCEPTANCE_PRIVACY",
  );
  for (const field of [
    "raw_private_payloads_in_acceptance_evidence",
    "secret_material_in_acceptance_evidence",
    "full_capability_tokens_in_acceptance_evidence",
  ]) {
    if (privacy[field] !== false) {
      throw new Error(`SIGNING_KEY_ACCEPTANCE_PRIVACY_BOUNDARY:${field}`);
    }
  }

  return Object.freeze({
    contract_id: PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT,
    provider_id: key.provider_id,
    provider_version: key.provider_version,
    producer_identity: key.producer_identity,
    deployment_id: requestedDeployment,
    exact_source_revision: revision,
    valid_until: validUntil,
  });
}
