export const PRIVACY_STATE_PROVIDER_QUALIFICATION_CONTRACT =
  "goreecloud.privacy-shield.state-provider-qualification.v1";
export const PRIVACY_STATE_PROVIDER_QUALIFICATION_CONTROLLER_CONTRACT =
  "goreecloud.privacy-shield.state-provider-qualification-controller.v1";
export const PRIVACY_STATE_PROVIDER_CONTRACT = "goreecloud.privacy-shield.state-provider.v1";

export const AUTOMATED_STATE_PROVIDER_QUALIFICATIONS = Object.freeze([
  "concurrent_writer_serialization",
  "atomic_commit_and_rollback",
  "partition_and_conflict_behavior",
  "restart_recovery",
  "corrupt_state_recovery",
  "backup_and_restore",
  "migration_and_rollback",
  "operational_observability",
]);

export const EXTERNAL_STATE_PROVIDER_QUALIFICATIONS = Object.freeze([
  "access_control_isolation",
]);

const REQUIRED_PROVIDER_METHODS = Object.freeze([
  "get",
  "set",
  "delete",
  "list",
  "transaction",
  "stateProviderCapabilities",
]);
const REQUIRED_CONTROLLER_METHODS = Object.freeze([
  "qualificationCapabilities",
  "concurrentWriterProbe",
  "partitionConflictProbe",
  "restartRecoveryProbe",
  "corruptStateRecoveryProbe",
  "backupRestoreProbe",
  "migrationRollbackProbe",
  "readAuditEvents",
  "runtimeIntegrationProbe",
]);
const REQUIRED_PRODUCTION_CAPABILITIES = Object.freeze([
  "durable",
  "restart_recovery",
  "atomic_transactions",
  "multi_writer_serializable",
  "distributed",
  "fail_closed_on_conflict",
]);
const SHA40 = /^[0-9a-f]{40}$/;
const REPO = /^GoreeCloud\/[A-Za-z0-9._-]+$/;
const FORBIDDEN_EVIDENCE_FIELD = /(?:secret|credential|password|private[_-]?key|token|payload|claims|user[_-]?content|request[_-]?body|state[_-]?value)/i;

function requireObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

function requireString(value, code) {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
  return value;
}

function requireProvider(provider) {
  requireObject(provider, "STATE_PROVIDER_QUALIFICATION_PROVIDER_REQUIRED");
  for (const method of REQUIRED_PROVIDER_METHODS) {
    if (typeof provider[method] !== "function") {
      throw new Error(`STATE_PROVIDER_QUALIFICATION_PROVIDER_METHOD_REQUIRED:${method}`);
    }
  }
  const capabilities = requireObject(
    provider.stateProviderCapabilities(),
    "INVALID_STATE_PROVIDER_QUALIFICATION_CAPABILITIES",
  );
  if (capabilities.contract !== PRIVACY_STATE_PROVIDER_CONTRACT) {
    throw new Error("STATE_PROVIDER_QUALIFICATION_CONTRACT_MISMATCH");
  }
  for (const capability of REQUIRED_PRODUCTION_CAPABILITIES) {
    if (capabilities[capability] !== true) {
      throw new Error(`STATE_PROVIDER_QUALIFICATION_CAPABILITY_REQUIRED:${capability}`);
    }
  }
  return provider;
}

function requireController(controller) {
  requireObject(controller, "STATE_PROVIDER_QUALIFICATION_CONTROLLER_REQUIRED");
  for (const method of REQUIRED_CONTROLLER_METHODS) {
    if (typeof controller[method] !== "function") {
      throw new Error(`STATE_PROVIDER_QUALIFICATION_CONTROLLER_METHOD_REQUIRED:${method}`);
    }
  }
  const capabilities = requireObject(
    controller.qualificationCapabilities(),
    "INVALID_STATE_PROVIDER_QUALIFICATION_CONTROLLER_CAPABILITIES",
  );
  if (capabilities.contract !== PRIVACY_STATE_PROVIDER_QUALIFICATION_CONTROLLER_CONTRACT) {
    throw new Error("STATE_PROVIDER_QUALIFICATION_CONTROLLER_CONTRACT_MISMATCH");
  }
  for (const capability of [
    "controlled_environment",
    "disruptive_operations_authorized",
    "evidence_minimized",
  ]) {
    if (capabilities[capability] !== true) {
      throw new Error(`STATE_PROVIDER_QUALIFICATION_CONTROLLER_CAPABILITY_REQUIRED:${capability}`);
    }
  }
  if (capabilities.acceptance_authority !== false) {
    throw new Error("STATE_PROVIDER_QUALIFICATION_CONTROLLER_CANNOT_AUTHORIZE_PRODUCTION");
  }
  return controller;
}

function requireTarget(target) {
  const value = requireObject(target, "STATE_PROVIDER_QUALIFICATION_TARGET_REQUIRED");
  for (const field of [
    "provider_id",
    "provider_version",
    "provider_implementation",
    "provider_authority",
    "environment",
    "deployment_id",
    "topology_id",
    "exact_source_revision",
    "source_tree_sha",
  ]) {
    requireString(value[field], `STATE_PROVIDER_QUALIFICATION_TARGET_REQUIRED:${field}`);
  }
  if (!REPO.test(value.provider_authority)) {
    throw new Error("INVALID_STATE_PROVIDER_QUALIFICATION_PROVIDER_AUTHORITY");
  }
  if (!SHA40.test(value.exact_source_revision) || !SHA40.test(value.source_tree_sha)) {
    throw new Error("INVALID_STATE_PROVIDER_QUALIFICATION_SOURCE_REVISION");
  }
  if (value.distributed !== true || value.multi_writer !== true) {
    throw new Error("STATE_PROVIDER_QUALIFICATION_DISTRIBUTED_MULTI_WRITER_TARGET_REQUIRED");
  }
  if (!Number.isInteger(value.replica_count) || value.replica_count < 2) {
    throw new Error("STATE_PROVIDER_QUALIFICATION_REPLICA_COUNT_REQUIRED");
  }
  return Object.freeze({ ...value });
}

function requireProbe(probe, expected, category) {
  const value = requireObject(probe, `INVALID_STATE_PROVIDER_QUALIFICATION_PROBE:${category}`);
  if (value.passed !== true) throw new Error(`STATE_PROVIDER_QUALIFICATION_PROBE_NOT_PASSED:${category}`);
  for (const field of [
    "provider_id",
    "provider_version",
    "deployment_id",
    "topology_id",
    "exact_source_revision",
  ]) {
    if (value[field] !== expected[field]) {
      throw new Error(`STATE_PROVIDER_QUALIFICATION_PROBE_MISMATCH:${category}:${field}`);
    }
  }
  return value;
}

function containsForbiddenEvidenceField(value, seen = new Set()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some(item => containsForbiddenEvidenceField(item, seen));
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_EVIDENCE_FIELD.test(key)) return true;
    if (containsForbiddenEvidenceField(item, seen)) return true;
  }
  return false;
}

function requireAuditSummary(summary) {
  const value = requireObject(summary, "INVALID_STATE_PROVIDER_QUALIFICATION_AUDIT");
  if (value.complete !== true || value.minimized !== true) {
    throw new Error("STATE_PROVIDER_QUALIFICATION_AUDIT_INCOMPLETE_OR_UNMINIMIZED");
  }
  if (!Array.isArray(value.categories) || !Array.isArray(value.events) || value.events.length === 0) {
    throw new Error("INVALID_STATE_PROVIDER_QUALIFICATION_AUDIT");
  }
  for (const category of [
    "concurrent_writer_serialization",
    "atomic_commit_and_rollback",
    "partition_and_conflict_behavior",
    "restart_recovery",
    "corrupt_state_recovery",
    "backup_and_restore",
    "migration_and_rollback",
  ]) {
    if (!value.categories.includes(category)) {
      throw new Error(`STATE_PROVIDER_QUALIFICATION_AUDIT_CATEGORY_REQUIRED:${category}`);
    }
  }
  if (containsForbiddenEvidenceField(value.events)) {
    throw new Error("STATE_PROVIDER_QUALIFICATION_AUDIT_PRIVACY_BOUNDARY");
  }
  return value;
}

function resultEntry(exerciseId, category, state, code) {
  const evidenceResult = state === "passed" ? "passed" : state === "failed" ? "failed" : "informational";
  const evidenceCategory = {
    concurrent_writer_serialization: "concurrency",
    atomic_commit_and_rollback: "atomicity",
    partition_and_conflict_behavior: "partition-conflict",
    restart_recovery: "restart-recovery",
    corrupt_state_recovery: "corrupt-state-recovery",
    backup_and_restore: "backup-restore",
    migration_and_rollback: "migration-rollback",
    access_control_isolation: "access-control",
    operational_observability: "observability",
  }[category];
  return Object.freeze({
    qualification: category,
    state,
    code,
    evidence: Object.freeze({
      id: `qualification-${category.replaceAll("_", "-")}`,
      category: evidenceCategory,
      result: evidenceResult,
      reference: `qualification-run:${exerciseId}#${category}`,
    }),
  });
}

function runProbe(results, exerciseId, category, probe) {
  try {
    probe();
    results.set(category, resultEntry(exerciseId, category, "passed", "PASSED"));
  } catch (error) {
    results.set(
      category,
      resultEntry(exerciseId, category, "failed", error instanceof Error ? error.message : String(error)),
    );
  }
}

/**
 * Run controlled operational exercises against an injected distributed state provider.
 *
 * This harness is intentionally non-authorizing. It can produce minimized operational
 * evidence for a later candidate evaluation or production acceptance process, but it
 * cannot itself evaluate, select, accept, or promote a provider.
 */
export function runStateProviderOperationalQualification({
  provider,
  controller,
  target,
  exercise_id,
  authorization_reference,
  now = new Date(),
} = {}) {
  const stateProvider = requireProvider(provider);
  const qualificationController = requireController(controller);
  const expected = requireTarget(target);
  const exerciseId = requireString(exercise_id, "STATE_PROVIDER_QUALIFICATION_EXERCISE_ID_REQUIRED");
  const authorizationReference = requireString(
    authorization_reference,
    "STATE_PROVIDER_QUALIFICATION_AUTHORIZATION_REFERENCE_REQUIRED",
  );
  const startedAt = new Date(now);
  if (!Number.isFinite(startedAt.getTime())) throw new Error("INVALID_STATE_PROVIDER_QUALIFICATION_TIME");

  requireProbe(
    qualificationController.runtimeIntegrationProbe({ exercise_id: exerciseId, target: expected }),
    expected,
    "exact_runtime_integration",
  );

  const results = new Map();
  for (const name of EXTERNAL_STATE_PROVIDER_QUALIFICATIONS) {
    results.set(
      name,
      resultEntry(exerciseId, name, "requires_external_evidence", "EXTERNAL_EVIDENCE_REQUIRED"),
    );
  }

  const namespace = `qualification-${exerciseId}`;
  const key = "atomic-transaction";
  const baseline = Object.freeze({ marker: "baseline" });
  const committed = Object.freeze({ marker: "committed" });

  runProbe(results, exerciseId, "atomic_commit_and_rollback", () => {
    stateProvider.set(namespace, key, baseline);
    let rollbackObserved = false;
    try {
      stateProvider.transaction(store => {
        store.set(namespace, key, { marker: "must-rollback" });
        throw new Error("STATE_PROVIDER_QUALIFICATION_INJECTED_ROLLBACK");
      });
    } catch (error) {
      if (error?.message !== "STATE_PROVIDER_QUALIFICATION_INJECTED_ROLLBACK") throw error;
      rollbackObserved = true;
    }
    if (!rollbackObserved) throw new Error("STATE_PROVIDER_QUALIFICATION_ROLLBACK_NOT_OBSERVED");
    if (stateProvider.get(namespace, key)?.marker !== baseline.marker) {
      throw new Error("STATE_PROVIDER_QUALIFICATION_ROLLBACK_STATE_CHANGED");
    }
    stateProvider.transaction(store => store.set(namespace, key, committed));
    if (stateProvider.get(namespace, key)?.marker !== committed.marker) {
      throw new Error("STATE_PROVIDER_QUALIFICATION_COMMIT_NOT_OBSERVED");
    }
  });

  const controllerProbes = [
    ["concurrent_writer_serialization", "concurrentWriterProbe"],
    ["partition_and_conflict_behavior", "partitionConflictProbe"],
    ["restart_recovery", "restartRecoveryProbe"],
    ["corrupt_state_recovery", "corruptStateRecoveryProbe"],
    ["backup_and_restore", "backupRestoreProbe"],
    ["migration_and_rollback", "migrationRollbackProbe"],
  ];
  for (const [category, method] of controllerProbes) {
    runProbe(results, exerciseId, category, () => {
      requireProbe(
        qualificationController[method]({
          exercise_id: exerciseId,
          target: expected,
          synthetic_namespace: namespace,
        }),
        expected,
        category,
      );
    });
  }

  runProbe(results, exerciseId, "operational_observability", () => {
    requireAuditSummary(qualificationController.readAuditEvents({ exercise_id: exerciseId }));
  });

  try {
    stateProvider.delete(namespace, key);
  } catch {
    // Cleanup does not change the non-authorizing nature of the run. A provider/controller
    // should perform environment cleanup as part of its controlled exercise procedure.
  }

  for (const name of AUTOMATED_STATE_PROVIDER_QUALIFICATIONS) {
    if (!results.has(name)) results.set(name, resultEntry(exerciseId, name, "not_run", "QUALIFICATION_NOT_RUN"));
  }
  const required = [...AUTOMATED_STATE_PROVIDER_QUALIFICATIONS, ...EXTERNAL_STATE_PROVIDER_QUALIFICATIONS];
  const ordered = required.map(name => results.get(name));

  return Object.freeze({
    schema_version: 1,
    contract_id: PRIVACY_STATE_PROVIDER_QUALIFICATION_CONTRACT,
    authorizing: false,
    exercise_id: exerciseId,
    authorization_reference: authorizationReference,
    started_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    target: expected,
    privacy: Object.freeze({
      raw_private_payloads_in_qualification_evidence: false,
      secret_material_in_qualification_evidence: false,
      credentials_in_qualification_evidence: false,
      user_content_in_qualification_evidence: false,
    }),
    qualification: Object.freeze(Object.fromEntries(ordered.map(item => [item.qualification, item.state]))),
    evidence: Object.freeze(ordered.map(item => item.evidence)),
    observations: Object.freeze(ordered.map(item => Object.freeze({
      qualification: item.qualification,
      state: item.state,
      code: item.code,
    }))),
    limitations: Object.freeze([
      "This qualification run is non-authorizing and cannot create candidate evaluation, provider selection, or production acceptance.",
      "Access-control isolation requires external evidence from the exact provider/deployment.",
      "Operational ownership, performance, topology/replication/failover review, and production procedures remain separately governed evidence.",
      "A complete current candidate evaluation is still required before provider selection.",
      "A governed provider selection is still required before provider-specific production integration.",
      "A fresh exact-provider/exact-deployment acceptance record is still required for production runtime use.",
    ]),
  });
}
