import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createDurablePrivacyRuntime,
  createPrivacyRuntime,
} from "../src/privacy-runtime.mjs";
import {
  FilePrivacyStateStore,
  MemoryPrivacyStateStore,
  PRIVACY_STATE_PROVIDER_CONTRACT,
} from "../src/privacy-state-store.mjs";
import {
  InMemoryPrivacySigningKeyProvider,
  PRIVACY_SIGNING_KEY_PROVIDER_CONTRACT,
} from "../src/privacy-signing-key-provider.mjs";
import {
  PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT,
  REQUIRED_SIGNING_KEY_QUALIFICATIONS,
} from "../src/signing-key-acceptance.mjs";
import {
  PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT,
  REQUIRED_STATE_PROVIDER_QUALIFICATIONS,
} from "../src/state-provider-acceptance.mjs";

function stateFile() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "privacy-runtime-"));
  return path.join(directory, "privacy-state.json");
}

const capabilityKeys = {
  active_key_id: "runtime-key-v1",
  keys: {
    "runtime-key-v1": "0123456789abcdef0123456789abcdef",
  },
};
const runtimeRevision = "a".repeat(40);
const runtimeTreeSha = "b".repeat(40);
const deploymentId = "privacy-signing-test-prod";
const stateEnvironment = "test";
const stateTopologyId = "topology-a";

class ContractTestProductionStore extends MemoryPrivacyStateStore {
  stateProviderCapabilities() {
    return {
      contract: PRIVACY_STATE_PROVIDER_CONTRACT,
      provider_id: "distributed-test-provider",
      provider_version: "1.0.0",
      provider_implementation: "ContractTestProductionStore",
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

class ContractTestProductionKeyProvider {
  #inner = new InMemoryPrivacySigningKeyProvider(
    capabilityKeys,
    {
      provider_id: "test-kms",
      provider_version: "test-kms-v1",
      producer_identity: "goreecloud-privacy-shield:test-runtime",
    },
  );

  keyProviderCapabilities() {
    return {
      contract: PRIVACY_SIGNING_KEY_PROVIDER_CONTRACT,
      production_eligible: true,
      non_exportable_signing_material: true,
      opaque_key_references: true,
      digest_only_signing: true,
      key_identifiers: true,
      rotation: true,
      retirement: true,
      revocation: true,
      producer_identity_binding: true,
      auditable_signing: true,
      fail_closed_on_untrusted_state: true,
      private_material_export: false,
    };
  }

  activeKey() { return this.#inner.activeKey(); }
  describeKey(keyId) { return this.#inner.describeKey(keyId); }
  signDigest(input) { return this.#inner.signDigest(input); }
  verifyDigest(input) { return this.#inner.verifyDigest(input); }
}

function stateAcceptance() {
  const qualification = Object.fromEntries(
    Object.keys(REQUIRED_STATE_PROVIDER_QUALIFICATIONS).map(name => [name, "passed"]),
  );
  const evidence = Object.entries(REQUIRED_STATE_PROVIDER_QUALIFICATIONS).map(
    ([name, category]) => ({
      id: `test-state-${name.replaceAll("_", "-")}`,
      category,
      result: "passed",
      reference: `test://state/${category}`,
    }),
  );
  return {
    schema_version: 1,
    contract_id: PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT,
    provider_id: "distributed-test-provider",
    provider_implementation: "ContractTestProductionStore",
    provider_authority: "GoreeCloud/goreecloud-privacy-shield",
    exact_source_revision: runtimeRevision,
    source_tree_sha: runtimeTreeSha,
    provider_version: "1.0.0",
    deployment: {
      environment: stateEnvironment,
      topology_id: stateTopologyId,
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
    qualification,
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
    evidence,
    limitations: ["Test-only structural provider."],
  };
}

function signingAcceptance() {
  const qualification = Object.fromEntries(
    REQUIRED_SIGNING_KEY_QUALIFICATIONS.map(name => [name, "passed"]),
  );
  const evidence = REQUIRED_SIGNING_KEY_QUALIFICATIONS.map(name => ({
    id: `test-${name.replaceAll("_", "-")}`,
    category: name,
    result: "passed",
    reference: `test://${name}`,
  }));
  return {
    schema_version: 1,
    contract_id: PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT,
    provider_id: "test-kms",
    provider_implementation: "ContractTestProductionKeyProvider",
    provider_authority: "GoreeCloud/test",
    provider_version: "test-kms-v1",
    exact_source_revision: runtimeRevision,
    deployment: {
      environment: "test",
      deployment_id: deploymentId,
    },
    producer_identity: "goreecloud-privacy-shield:test-runtime",
    algorithms: ["HS256"],
    qualification,
    privacy: {
      raw_private_payloads_in_acceptance_evidence: false,
      secret_material_in_acceptance_evidence: false,
      full_capability_tokens_in_acceptance_evidence: false,
    },
    acceptance: {
      status: "passed",
      production_approved: true,
      exact_revision_required: true,
      valid_until: "2099-01-01T00:00:00Z",
    },
    evidence,
    limitations: ["Test-only structural provider."],
  };
}

test("durable runtime shares consent, capability, evidence, and policy state across restart", () => {
  const file = stateFile();
  let runtime = createDurablePrivacyRuntime({
    state_file: file,
    capability_keys: capabilityKeys,
  });

  runtime.consent.put({
    requester_id: "app.notes",
    resource_id: "note:1",
    purpose: "summarize",
  });
  runtime.policies.publish({
    policy_id: "notes-summary",
    version: "1",
    rules: [{ effect: "allow", purpose: "summarize" }],
  });
  runtime.evidence.record({
    request: {
      request_id: "req-runtime-1",
      requester: { id: "app.notes" },
      resource: { id: "note:1" },
      purpose: "summarize",
      operation: "read",
      destination: "local",
    },
    decision: {
      decision_id: "dec-runtime-1",
      outcome: "ALLOW",
      reason_code: "AUTHORIZED",
      processing_zone: "local",
      policy_references: ["notes-summary:1"],
      obligations: [],
    },
  });
  const token = runtime.capabilities.issue(
    {
      requester_id: "app.notes",
      resource_id: "note:1",
      purpose: "summarize",
    },
    { replay_policy: "single_use" },
  );
  runtime.capabilities.consume(token, { requester_id: "app.notes" });

  assert.equal(fs.statSync(file).mode & 0o777, 0o600);

  runtime = createDurablePrivacyRuntime({
    state_file: file,
    capability_keys: capabilityKeys,
  });

  const consent = runtime.consent.get({
    requester_id: "app.notes",
    resource_id: "note:1",
    purpose: "summarize",
  });
  assert.equal(runtime.consent.isEffective(consent), true);
  assert.equal(runtime.policies.active("notes-summary")?.version, "1");
  assert.equal(runtime.evidence.list({ request_id: "req-runtime-1" }).length, 1);
  assert.equal(runtime.evidence.verifyIntegrity().valid, true);
  assert.throws(
    () => runtime.capabilities.verify(token, { requester_id: "app.notes" }),
    /CAPABILITY_ALREADY_CONSUMED/,
  );
});

test("generic runtime uses exactly the injected state provider", () => {
  const store = new MemoryPrivacyStateStore();
  const runtime = createPrivacyRuntime({
    store,
    capability_keys: capabilityKeys,
  });

  assert.equal(runtime.store, store);
  assert.equal(runtime.production, false);
  assert.equal(runtime.signing_acceptance, null);
  runtime.consent.put({
    requester_id: "app.notes",
    resource_id: "note:2",
    purpose: "summarize",
  });
  assert.equal(store.list("consent").length, 1);
});

test("production runtime requires state, signing provider, and fresh acceptance contracts", () => {
  assert.throws(
    () => createPrivacyRuntime({
      store: new MemoryPrivacyStateStore(),
      capability_keys: capabilityKeys,
      production: true,
    }),
    /PRIVACY_STATE_PROVIDER_CAPABILITY_REQUIRED:durable/,
  );

  assert.throws(
    () => createPrivacyRuntime({
      store: new FilePrivacyStateStore(stateFile()),
      capability_keys: capabilityKeys,
      production: true,
    }),
    /PRIVACY_STATE_PROVIDER_CAPABILITY_REQUIRED:multi_writer_serializable/,
  );

  const store = new ContractTestProductionStore();
  assert.throws(
    () => createPrivacyRuntime({
      store,
      capability_keys: capabilityKeys,
      runtime_revision: runtimeRevision,
      runtime_tree_sha: runtimeTreeSha,
      state_provider_environment: stateEnvironment,
      state_provider_topology_id: stateTopologyId,
      production: true,
    }),
    /PRODUCTION_STATE_PROVIDER_ACCEPTANCE_REQUIRED/,
  );

  const mismatchedState = stateAcceptance();
  mismatchedState.deployment.topology_id = "topology-b";
  assert.throws(
    () => createPrivacyRuntime({
      store,
      state_provider_acceptance: mismatchedState,
      state_provider_environment: stateEnvironment,
      state_provider_topology_id: stateTopologyId,
      runtime_revision: runtimeRevision,
      runtime_tree_sha: runtimeTreeSha,
      capability_keys: capabilityKeys,
      production: true,
    }),
    /STATE_PROVIDER_ACCEPTANCE_TOPOLOGY_MISMATCH/,
  );

  const acceptedState = stateAcceptance();
  assert.throws(
    () => createPrivacyRuntime({
      store,
      state_provider_acceptance: acceptedState,
      state_provider_environment: stateEnvironment,
      state_provider_topology_id: stateTopologyId,
      runtime_revision: runtimeRevision,
      runtime_tree_sha: runtimeTreeSha,
      capability_keys: capabilityKeys,
      production: true,
    }),
    /PRODUCTION_CAPABILITY_KEY_PROVIDER_REQUIRED/,
  );

  const provider = new ContractTestProductionKeyProvider();
  assert.throws(
    () => createPrivacyRuntime({
      store,
      state_provider_acceptance: acceptedState,
      state_provider_environment: stateEnvironment,
      state_provider_topology_id: stateTopologyId,
      runtime_tree_sha: runtimeTreeSha,
      capability_key_provider: provider,
      runtime_revision: runtimeRevision,
      capability_key_deployment_id: deploymentId,
      production: true,
    }),
    /PRODUCTION_SIGNING_KEY_ACCEPTANCE_REQUIRED/,
  );

  const runtime = createPrivacyRuntime({
    store,
    state_provider_acceptance: acceptedState,
    state_provider_environment: stateEnvironment,
    state_provider_topology_id: stateTopologyId,
    runtime_tree_sha: runtimeTreeSha,
    capability_key_provider: provider,
    capability_key_acceptance: signingAcceptance(),
    capability_key_deployment_id: deploymentId,
    runtime_revision: runtimeRevision,
    production: true,
  });
  assert.equal(runtime.production, true);
  assert.equal(runtime.store, store);
  assert.equal(runtime.state_acceptance.provider_id, "distributed-test-provider");
  assert.equal(runtime.state_acceptance.provider_version, "1.0.0");
  assert.equal(runtime.state_acceptance.environment, stateEnvironment);
  assert.equal(runtime.state_acceptance.topology_id, stateTopologyId);
  assert.equal(runtime.signing_acceptance.provider_id, "test-kms");
  assert.equal(runtime.signing_acceptance.provider_version, "test-kms-v1");
  assert.equal(runtime.signing_acceptance.deployment_id, deploymentId);
  const token = runtime.capabilities.issue({ requester_id: "app.notes" });
  const claims = runtime.capabilities.verify(token);
  assert.equal(claims.key_provider_id, "test-kms");
  assert.equal(claims.key_provider_version, "test-kms-v1");
});

test("runtime factories fail closed on missing or unsafe providers", () => {
  assert.throws(
    () => createDurablePrivacyRuntime({ capability_keys: capabilityKeys }),
    /requires state_file/,
  );
  assert.throws(
    () => createDurablePrivacyRuntime({ state_file: stateFile() }),
    /Capability authority requires/,
  );
  assert.throws(
    () => createPrivacyRuntime({ capability_keys: capabilityKeys }),
    /requires an injected state store/,
  );
  assert.throws(
    () =>
      createPrivacyRuntime({
        store: { get() {}, set() {} },
        capability_keys: capabilityKeys,
      }),
    /must implement delete\(\)/,
  );
  assert.throws(
    () =>
      createPrivacyRuntime({
        store: new MemoryPrivacyStateStore(),
        capability_keys: capabilityKeys,
        capability_key_provider: new InMemoryPrivacySigningKeyProvider(capabilityKeys),
      }),
    /Configure capability_keys or capability_key_provider, not both/,
  );
  assert.throws(
    () =>
      createDurablePrivacyRuntime({
        state_file: stateFile(),
        capability_keys: capabilityKeys,
        production: true,
      }),
    /single-host only/,
  );
});
