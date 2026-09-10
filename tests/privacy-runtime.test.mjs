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

class ContractTestProductionStore extends MemoryPrivacyStateStore {
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
}

class ContractTestProductionKeyProvider {
  #inner = new InMemoryPrivacySigningKeyProvider(
    capabilityKeys,
    {
      provider_id: "test-kms",
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
  runtime.consent.put({
    requester_id: "app.notes",
    resource_id: "note:2",
    purpose: "summarize",
  });
  assert.equal(store.list("consent").length, 1);
});

test("production runtime requires state and signing provider contracts", () => {
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
      production: true,
    }),
    /PRODUCTION_CAPABILITY_KEY_PROVIDER_REQUIRED/,
  );

  const runtime = createPrivacyRuntime({
    store,
    capability_key_provider: new ContractTestProductionKeyProvider(),
    production: true,
  });
  assert.equal(runtime.production, true);
  assert.equal(runtime.store, store);
  const token = runtime.capabilities.issue({ requester_id: "app.notes" });
  assert.equal(runtime.capabilities.verify(token).key_provider_id, "test-kms");
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
