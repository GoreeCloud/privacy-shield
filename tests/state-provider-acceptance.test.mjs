import assert from "node:assert/strict";
import test from "node:test";

import {
  PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT,
  REQUIRED_STATE_PROVIDER_QUALIFICATIONS,
  requireStateProviderAcceptance,
} from "../src/state-provider-acceptance.mjs";

const runtimeRevision = "a".repeat(40);
const runtimeTreeSha = "b".repeat(40);
const environment = "production-test";
const topologyId = "topology-a";

class AcceptedStateProvider {
  stateProviderCapabilities() {
    return {
      provider_id: "distributed-test-provider",
      provider_version: "1.0.0",
      provider_implementation: "AcceptedStateProvider",
      provider_authority: "GoreeCloud/goreecloud-privacy-shield",
      durable: true,
      restart_recovery: true,
      atomic_transactions: true,
      multi_writer_serializable: true,
      distributed: true,
      fail_closed_on_conflict: true,
    };
  }
}

function record() {
  return {
    schema_version: 1,
    contract_id: PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT,
    provider_id: "distributed-test-provider",
    provider_implementation: "AcceptedStateProvider",
    provider_authority: "GoreeCloud/goreecloud-privacy-shield",
    exact_source_revision: runtimeRevision,
    source_tree_sha: runtimeTreeSha,
    provider_version: "1.0.0",
    deployment: {
      environment,
      topology_id: topologyId,
      distributed: true,
      multi_writer: true,
      replica_count: 3,
    },
    capabilities: {
      durable: true,
      restart_recovery: true,
      atomic_transactions: true,
      multi_writer_serializable: true,
      distributed: true,
      fail_closed_on_conflict: true,
    },
    qualification: Object.fromEntries(
      Object.keys(REQUIRED_STATE_PROVIDER_QUALIFICATIONS).map(name => [name, "passed"]),
    ),
    privacy: {
      raw_private_payloads_in_acceptance_evidence: false,
      secret_material_in_acceptance_evidence: false,
    },
    acceptance: {
      status: "passed",
      production_approved: true,
      exact_revision_required: true,
      observed_date: "2026-09-19",
      valid_until: "2099-01-01T00:00:00Z",
    },
    evidence: Object.entries(REQUIRED_STATE_PROVIDER_QUALIFICATIONS).map(
      ([name, category]) => ({
        id: `evidence-${name.replaceAll("_", "-")}`,
        category,
        result: "passed",
        reference: `test://state/${category}`,
      }),
    ),
    limitations: [],
  };
}

function requireAccepted(overrides = {}) {
  return requireStateProviderAcceptance(new AcceptedStateProvider(), {
    record: overrides.record ?? record(),
    runtime_revision: overrides.runtime_revision ?? runtimeRevision,
    runtime_tree_sha: overrides.runtime_tree_sha ?? runtimeTreeSha,
    environment: overrides.environment ?? environment,
    topology_id: overrides.topology_id ?? topologyId,
    now: overrides.now ?? Date.parse("2026-09-19T12:00:00Z"),
  });
}

test("accepted state provider is bound to exact provider, source, environment, and topology", () => {
  const accepted = requireAccepted();
  assert.equal(accepted.provider_id, "distributed-test-provider");
  assert.equal(accepted.provider_version, "1.0.0");
  assert.equal(accepted.environment, environment);
  assert.equal(accepted.topology_id, topologyId);
  assert.equal(accepted.exact_source_revision, runtimeRevision);
  assert.equal(accepted.source_tree_sha, runtimeTreeSha);
});

test("missing or non-approved acceptance fails closed", () => {
  assert.throws(
    () => requireStateProviderAcceptance(new AcceptedStateProvider(), {
      runtime_revision: runtimeRevision,
      runtime_tree_sha: runtimeTreeSha,
      environment,
      topology_id: topologyId,
    }),
    /PRODUCTION_STATE_PROVIDER_ACCEPTANCE_REQUIRED/,
  );

  const pending = record();
  pending.acceptance.production_approved = false;
  pending.acceptance.status = "pending";
  assert.throws(() => requireAccepted({ record: pending }), /STATE_PROVIDER_NOT_PRODUCTION_ACCEPTED/);
});

test("stale or wrong source identity fails closed", () => {
  const stale = record();
  stale.acceptance.valid_until = "2026-01-01T00:00:00Z";
  assert.throws(() => requireAccepted({ record: stale }), /STATE_PROVIDER_ACCEPTANCE_EXPIRED/);

  assert.throws(
    () => requireAccepted({ runtime_revision: "c".repeat(40) }),
    /STATE_PROVIDER_ACCEPTANCE_SOURCE_REVISION_MISMATCH/,
  );
  assert.throws(
    () => requireAccepted({ runtime_tree_sha: "d".repeat(40) }),
    /STATE_PROVIDER_ACCEPTANCE_SOURCE_TREE_MISMATCH/,
  );
});

test("deployment and provider identity mismatches fail closed", () => {
  assert.throws(
    () => requireAccepted({ environment: "other" }),
    /STATE_PROVIDER_ACCEPTANCE_ENVIRONMENT_MISMATCH/,
  );
  assert.throws(
    () => requireAccepted({ topology_id: "topology-b" }),
    /STATE_PROVIDER_ACCEPTANCE_TOPOLOGY_MISMATCH/,
  );

  const mismatched = record();
  mismatched.provider_version = "2.0.0";
  assert.throws(
    () => requireAccepted({ record: mismatched }),
    /STATE_PROVIDER_ACCEPTANCE_PROVIDER_VERSION_MISMATCH/,
  );
});

test("incomplete qualification or privacy evidence fails closed", () => {
  const pending = record();
  pending.qualification.backup_and_restore = "pending";
  assert.throws(
    () => requireAccepted({ record: pending }),
    /STATE_PROVIDER_ACCEPTANCE_QUALIFICATION_REQUIRED:backup_and_restore/,
  );

  const unsafe = record();
  unsafe.privacy.secret_material_in_acceptance_evidence = true;
  assert.throws(
    () => requireAccepted({ record: unsafe }),
    /STATE_PROVIDER_ACCEPTANCE_PRIVACY_BOUNDARY:secret_material_in_acceptance_evidence/,
  );
});
