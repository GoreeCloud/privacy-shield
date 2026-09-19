export const PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT =
  "goreecloud.privacy-shield.state-provider-acceptance.v1";

export const REQUIRED_STATE_PROVIDER_QUALIFICATIONS = Object.freeze({
  concurrent_writer_serialization: "concurrency",
  atomic_commit_and_rollback: "atomicity",
  partition_and_conflict_behavior: "partition-conflict",
  restart_recovery: "restart-recovery",
  corrupt_state_recovery: "corrupt-state-recovery",
  backup_and_restore: "backup-restore",
  migration_and_rollback: "migration-rollback",
  access_control_isolation: "access-control",
  operational_observability: "observability",
});

const REQUIRED_PRODUCTION_CAPABILITIES = Object.freeze([
  "durable",
  "restart_recovery",
  "atomic_transactions",
  "multi_writer_serializable",
  "distributed",
  "fail_closed_on_conflict",
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

function requireSha(value, code) {
  const text = requireString(value, code);
  if (!SHA40.test(text)) throw new Error(code);
  return text;
}

function requireFreshDate(value, now = Date.now()) {
  const text = requireString(value, "INVALID_STATE_PROVIDER_ACCEPTANCE_EXPIRY");
  const expires = Date.parse(text);
  if (!Number.isFinite(expires)) throw new Error("INVALID_STATE_PROVIDER_ACCEPTANCE_EXPIRY");
  if (expires <= now) throw new Error("STATE_PROVIDER_ACCEPTANCE_EXPIRED");
  return text;
}

function requireEvidence(record) {
  if (!Array.isArray(record.evidence) || record.evidence.length === 0) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_EVIDENCE_REQUIRED");
  }
  const passingCategories = new Set();
  for (const entry of record.evidence) {
    requireObject(entry, "INVALID_STATE_PROVIDER_ACCEPTANCE_EVIDENCE");
    requireString(entry.id, "INVALID_STATE_PROVIDER_ACCEPTANCE_EVIDENCE");
    const category = requireString(entry.category, "INVALID_STATE_PROVIDER_ACCEPTANCE_EVIDENCE");
    requireString(entry.reference, "INVALID_STATE_PROVIDER_ACCEPTANCE_EVIDENCE");
    if (!new Set(["passed", "failed", "informational"]).has(entry.result)) {
      throw new Error("INVALID_STATE_PROVIDER_ACCEPTANCE_EVIDENCE");
    }
    if (entry.result === "passed") passingCategories.add(category);
  }
  return passingCategories;
}

export function requireStateProviderAcceptance(provider, {
  record,
  runtime_revision,
  runtime_tree_sha,
  environment,
  topology_id,
  now = Date.now(),
} = {}) {
  requireObject(provider, "PRODUCTION_STATE_PROVIDER_REQUIRED");
  if (typeof provider.stateProviderCapabilities !== "function") {
    throw new Error("PRODUCTION_STATE_PROVIDER_REQUIRED");
  }

  const acceptanceRecord = requireObject(
    record,
    "PRODUCTION_STATE_PROVIDER_ACCEPTANCE_REQUIRED",
  );
  if (acceptanceRecord.schema_version !== 1) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_SCHEMA_VERSION_MISMATCH");
  }
  if (acceptanceRecord.contract_id !== PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_CONTRACT_MISMATCH");
  }

  const acceptance = requireObject(
    acceptanceRecord.acceptance,
    "INVALID_STATE_PROVIDER_ACCEPTANCE_STATE",
  );
  if (acceptance.status !== "passed" || acceptance.production_approved !== true) {
    throw new Error("STATE_PROVIDER_NOT_PRODUCTION_ACCEPTED");
  }
  if (acceptance.exact_revision_required !== true) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_MUST_BE_EXACT_REVISION_BOUND");
  }
  const validUntil = requireFreshDate(acceptance.valid_until, now);

  const revision = requireSha(runtime_revision, "PRODUCTION_RUNTIME_REVISION_REQUIRED");
  const treeSha = requireSha(runtime_tree_sha, "PRODUCTION_RUNTIME_TREE_SHA_REQUIRED");
  if (acceptanceRecord.exact_source_revision !== revision) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_SOURCE_REVISION_MISMATCH");
  }
  if (acceptanceRecord.source_tree_sha !== treeSha) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_SOURCE_TREE_MISMATCH");
  }

  const deployment = requireObject(
    acceptanceRecord.deployment,
    "INVALID_STATE_PROVIDER_ACCEPTANCE_DEPLOYMENT",
  );
  const requestedEnvironment = requireString(
    environment,
    "PRODUCTION_STATE_PROVIDER_ENVIRONMENT_REQUIRED",
  );
  const requestedTopology = requireString(
    topology_id,
    "PRODUCTION_STATE_PROVIDER_TOPOLOGY_ID_REQUIRED",
  );
  if (deployment.environment !== requestedEnvironment) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_ENVIRONMENT_MISMATCH");
  }
  if (deployment.topology_id !== requestedTopology) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_TOPOLOGY_MISMATCH");
  }
  if (
    deployment.distributed !== true ||
    deployment.multi_writer !== true ||
    !Number.isInteger(deployment.replica_count) ||
    deployment.replica_count < 2
  ) {
    throw new Error("INVALID_STATE_PROVIDER_ACCEPTANCE_DEPLOYMENT");
  }

  const capabilities = requireObject(
    provider.stateProviderCapabilities(),
    "INVALID_PRODUCTION_STATE_PROVIDER_CAPABILITIES",
  );
  for (const field of [
    "provider_id",
    "provider_version",
    "provider_implementation",
    "provider_authority",
  ]) {
    requireString(capabilities[field], "INVALID_PRODUCTION_STATE_PROVIDER_IDENTITY");
  }
  if (acceptanceRecord.provider_id !== capabilities.provider_id) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_PROVIDER_MISMATCH");
  }
  if (acceptanceRecord.provider_version !== capabilities.provider_version) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_PROVIDER_VERSION_MISMATCH");
  }
  if (acceptanceRecord.provider_implementation !== capabilities.provider_implementation) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_IMPLEMENTATION_MISMATCH");
  }
  if (acceptanceRecord.provider_authority !== capabilities.provider_authority) {
    throw new Error("STATE_PROVIDER_ACCEPTANCE_AUTHORITY_MISMATCH");
  }

  const acceptedCapabilities = requireObject(
    acceptanceRecord.capabilities,
    "INVALID_STATE_PROVIDER_ACCEPTANCE_CAPABILITIES",
  );
  for (const capability of REQUIRED_PRODUCTION_CAPABILITIES) {
    if (capabilities[capability] !== true || acceptedCapabilities[capability] !== true) {
      throw new Error(`STATE_PROVIDER_ACCEPTANCE_CAPABILITY_REQUIRED:${capability}`);
    }
  }

  const qualification = requireObject(
    acceptanceRecord.qualification,
    "INVALID_STATE_PROVIDER_ACCEPTANCE_QUALIFICATION",
  );
  const passingEvidence = requireEvidence(acceptanceRecord);
  for (const [requirement, category] of Object.entries(
    REQUIRED_STATE_PROVIDER_QUALIFICATIONS,
  )) {
    if (qualification[requirement] !== "passed") {
      throw new Error(`STATE_PROVIDER_ACCEPTANCE_QUALIFICATION_REQUIRED:${requirement}`);
    }
    if (!passingEvidence.has(category)) {
      throw new Error(`STATE_PROVIDER_ACCEPTANCE_EVIDENCE_REQUIRED:${category}`);
    }
  }

  const privacy = requireObject(
    acceptanceRecord.privacy,
    "INVALID_STATE_PROVIDER_ACCEPTANCE_PRIVACY",
  );
  for (const field of [
    "raw_private_payloads_in_acceptance_evidence",
    "secret_material_in_acceptance_evidence",
  ]) {
    if (privacy[field] !== false) {
      throw new Error(`STATE_PROVIDER_ACCEPTANCE_PRIVACY_BOUNDARY:${field}`);
    }
  }

  return Object.freeze({
    contract_id: PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT,
    provider_id: capabilities.provider_id,
    provider_version: capabilities.provider_version,
    provider_implementation: capabilities.provider_implementation,
    provider_authority: capabilities.provider_authority,
    environment: requestedEnvironment,
    topology_id: requestedTopology,
    exact_source_revision: revision,
    source_tree_sha: treeSha,
    valid_until: validUntil,
  });
}
