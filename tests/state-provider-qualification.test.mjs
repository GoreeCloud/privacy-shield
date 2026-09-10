import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTOMATED_STATE_PROVIDER_QUALIFICATIONS,
  EXTERNAL_STATE_PROVIDER_QUALIFICATIONS,
  PRIVACY_STATE_PROVIDER_CONTRACT,
  PRIVACY_STATE_PROVIDER_QUALIFICATION_CONTRACT,
  PRIVACY_STATE_PROVIDER_QUALIFICATION_CONTROLLER_CONTRACT,
  runStateProviderOperationalQualification,
} from "../src/state-provider-qualification.mjs";

const TARGET = Object.freeze({
  provider_id: "distributed-qualification-test-provider",
  provider_version: "1.0.0-test",
  provider_implementation: "DistributedQualificationTestProvider",
  provider_authority: "GoreeCloud/goreecloud-privacy-shield",
  environment: "qualification-test",
  deployment_id: "qualification-test-deployment",
  topology_id: "qualification-test-topology",
  exact_source_revision: "1234567890abcdef1234567890abcdef12345678",
  source_tree_sha: "abcdef1234567890abcdef1234567890abcdef12",
  distributed: true,
  multi_writer: true,
  replica_count: 3,
});

function clone(value) {
  return value == null ? value : structuredClone(value);
}

class OperationalStateProvider {
  constructor() {
    this.state = new Map();
  }

  stateProviderCapabilities() {
    return {
      contract: PRIVACY_STATE_PROVIDER_CONTRACT,
      durable: true,
      restart_recovery: true,
      atomic_transactions: true,
      multi_writer_serializable: true,
      distributed: true,
      fail_closed_on_conflict: true,
    };
  }

  get(namespace, key) {
    return clone(this.state.get(`${namespace}:${key}`) ?? null);
  }

  set(namespace, key, value) {
    this.state.set(`${namespace}:${key}`, clone(value));
    return clone(value);
  }

  delete(namespace, key) {
    return this.state.delete(`${namespace}:${key}`);
  }

  list(namespace) {
    const prefix = `${namespace}:`;
    return [...this.state.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key: key.slice(prefix.length), value: clone(value) }));
  }

  transaction(mutation) {
    const staged = new OperationalStateProvider();
    staged.state = new Map([...this.state.entries()].map(([key, value]) => [key, clone(value)]));
    const result = mutation(staged);
    if (result && typeof result.then === "function") throw new TypeError("test transactions are synchronous");
    this.state = staged.state;
    return result;
  }
}

class BrokenRollbackStateProvider extends OperationalStateProvider {
  transaction(mutation) {
    return mutation(this);
  }
}

class StateQualificationController {
  constructor({ disruptive = true, forbiddenAuditField = false, mismatchRuntimeTopology = false } = {}) {
    this.disruptive = disruptive;
    this.forbiddenAuditField = forbiddenAuditField;
    this.mismatchRuntimeTopology = mismatchRuntimeTopology;
    this.events = [];
  }

  qualificationCapabilities() {
    return {
      contract: PRIVACY_STATE_PROVIDER_QUALIFICATION_CONTROLLER_CONTRACT,
      controlled_environment: true,
      disruptive_operations_authorized: this.disruptive,
      evidence_minimized: true,
      acceptance_authority: false,
    };
  }

  probe(category) {
    this.events.push({ category, operation: "synthetic-operational-probe", outcome: "passed" });
    return {
      passed: true,
      provider_id: TARGET.provider_id,
      provider_version: TARGET.provider_version,
      deployment_id: TARGET.deployment_id,
      topology_id: TARGET.topology_id,
      exact_source_revision: TARGET.exact_source_revision,
    };
  }

  concurrentWriterProbe() { return this.probe("concurrent_writer_serialization"); }
  partitionConflictProbe() { return this.probe("partition_and_conflict_behavior"); }
  restartRecoveryProbe() { return this.probe("restart_recovery"); }
  corruptStateRecoveryProbe() { return this.probe("corrupt_state_recovery"); }
  backupRestoreProbe() { return this.probe("backup_and_restore"); }
  migrationRollbackProbe() { return this.probe("migration_and_rollback"); }

  readAuditEvents() {
    const events = [
      ...this.events,
      { category: "atomic_commit_and_rollback", operation: "synthetic-transaction", outcome: "passed" },
    ];
    if (this.forbiddenAuditField) events.push({ category: "operational_observability", payload: "forbidden" });
    return {
      complete: true,
      minimized: true,
      categories: [
        "concurrent_writer_serialization",
        "atomic_commit_and_rollback",
        "partition_and_conflict_behavior",
        "restart_recovery",
        "corrupt_state_recovery",
        "backup_and_restore",
        "migration_and_rollback",
      ],
      events,
    };
  }

  runtimeIntegrationProbe() {
    return {
      passed: true,
      provider_id: TARGET.provider_id,
      provider_version: TARGET.provider_version,
      deployment_id: TARGET.deployment_id,
      topology_id: this.mismatchRuntimeTopology ? "wrong-topology" : TARGET.topology_id,
      exact_source_revision: TARGET.exact_source_revision,
    };
  }
}

function run(options = {}) {
  return runStateProviderOperationalQualification({
    provider: options.provider ?? new OperationalStateProvider(),
    controller: options.controller ?? new StateQualificationController(options.controllerOptions),
    target: options.target ?? TARGET,
    exercise_id: options.exercise_id ?? "state-qualification-test-run",
    authorization_reference: "test-only-controlled-state-qualification",
    now: new Date("2026-09-10T18:30:00Z"),
  });
}

test("state qualification harness produces non-authorizing minimized operational evidence", () => {
  const result = run();
  assert.equal(result.contract_id, PRIVACY_STATE_PROVIDER_QUALIFICATION_CONTRACT);
  assert.equal(result.authorizing, false);
  assert.deepEqual(result.target, TARGET);
  assert.equal(result.privacy.raw_private_payloads_in_qualification_evidence, false);
  assert.equal(result.privacy.secret_material_in_qualification_evidence, false);
  assert.equal(result.privacy.credentials_in_qualification_evidence, false);
  assert.equal(result.privacy.user_content_in_qualification_evidence, false);

  for (const name of AUTOMATED_STATE_PROVIDER_QUALIFICATIONS) {
    assert.equal(result.qualification[name], "passed", name);
    assert.equal(result.evidence.find(item => item.reference.endsWith(`#${name}`)).result, "passed", name);
  }
  for (const name of EXTERNAL_STATE_PROVIDER_QUALIFICATIONS) {
    assert.equal(result.qualification[name], "requires_external_evidence", name);
    assert.equal(result.evidence.find(item => item.reference.endsWith(`#${name}`)).result, "informational", name);
  }
});

test("state qualification controller must explicitly authorize disruptive exercises", () => {
  assert.throws(
    () => run({ controllerOptions: { disruptive: false } }),
    /STATE_PROVIDER_QUALIFICATION_CONTROLLER_CAPABILITY_REQUIRED:disruptive_operations_authorized/,
  );
});

test("atomic rollback failure is recorded as a failed qualification", () => {
  const result = run({ provider: new BrokenRollbackStateProvider() });
  assert.equal(result.authorizing, false);
  assert.equal(result.qualification.atomic_commit_and_rollback, "failed");
  assert.equal(
    result.observations.find(item => item.qualification === "atomic_commit_and_rollback").code,
    "STATE_PROVIDER_QUALIFICATION_ROLLBACK_STATE_CHANGED",
  );
});

test("observability evidence with forbidden private payload fields fails", () => {
  const result = run({ controllerOptions: { forbiddenAuditField: true } });
  assert.equal(result.qualification.operational_observability, "failed");
  assert.equal(
    result.observations.find(item => item.qualification === "operational_observability").code,
    "STATE_PROVIDER_QUALIFICATION_AUDIT_PRIVACY_BOUNDARY",
  );
});

test("provider capability drift fails before disruptive exercises begin", () => {
  const provider = new OperationalStateProvider();
  provider.stateProviderCapabilities = () => ({
    contract: PRIVACY_STATE_PROVIDER_CONTRACT,
    durable: true,
    restart_recovery: true,
    atomic_transactions: true,
    multi_writer_serializable: false,
    distributed: true,
    fail_closed_on_conflict: true,
  });
  assert.throws(
    () => run({ provider }),
    /STATE_PROVIDER_QUALIFICATION_CAPABILITY_REQUIRED:multi_writer_serializable/,
  );
});

test("runtime integration probe is exact-revision and exact-topology bound", () => {
  assert.throws(
    () => run({ controllerOptions: { mismatchRuntimeTopology: true } }),
    /STATE_PROVIDER_QUALIFICATION_PROBE_MISMATCH:exact_runtime_integration:topology_id/,
  );
});
