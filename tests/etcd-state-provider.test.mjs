import assert from "node:assert/strict";
import test from "node:test";

import {
  EtcdPrivacyStateStore,
  ETCD_STATE_PROVIDER_AUTHORITY,
  ETCD_STATE_PROVIDER_ID,
  ETCD_STATE_PROVIDER_IMPLEMENTATION,
  ETCD_STATE_PROVIDER_SELECTION_DECISION,
  ETCD_STATE_PROVIDER_VERSION,
  PRIVACY_ETCD_TRANSPORT_CONTRACT,
} from "../src/etcd-state-provider.mjs";
import { PRIVACY_STATE_PROVIDER_CONTRACT } from "../src/privacy-state-store.mjs";

class FakeTransport {
  constructor() {
    this.generation = 0n;
    this.entries = new Map();
    this.forceConflict = false;
    this.asyncSnapshot = false;
  }
  etcdTransportCapabilities() {
    return {
      contract: PRIVACY_ETCD_TRANSPORT_CONTRACT,
      provider_id: ETCD_STATE_PROVIDER_ID,
      provider_version: ETCD_STATE_PROVIDER_VERSION,
      provider_implementation: ETCD_STATE_PROVIDER_IMPLEMENTATION,
      provider_authority: ETCD_STATE_PROVIDER_AUTHORITY,
      selection_decision_id: ETCD_STATE_PROVIDER_SELECTION_DECISION,
      synchronous: true,
      linearizable_snapshot: true,
      atomic_compare_and_swap: true,
      namespace_generation_serialization: true,
      distributed: true,
      multi_writer_serializable: true,
      fail_closed_on_conflict: true,
      acceptance_authority: false,
    };
  }
  readSnapshot({ prefix }) {
    const result = {
      generation: String(this.generation),
      entries: [...this.entries.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => ({ key, value })),
    };
    return this.asyncSnapshot ? Promise.resolve(result) : result;
  }
  compareAndSwap({ expected_generation, mutations }) {
    if (this.forceConflict || expected_generation !== String(this.generation)) {
      return { committed: false, generation: String(this.generation) };
    }
    for (const mutation of mutations) {
      if (mutation.operation === "set") this.entries.set(mutation.key, mutation.value);
      else if (mutation.operation === "delete") this.entries.delete(mutation.key);
      else throw new Error("bad mutation");
    }
    this.generation += 1n;
    return { committed: true, generation: String(this.generation) };
  }
}

test("selected etcd adapter reports exact provider identity without production authority", () => {
  const store = new EtcdPrivacyStateStore({ transport: new FakeTransport() });
  assert.deepEqual(store.stateProviderCapabilities(), {
    contract: PRIVACY_STATE_PROVIDER_CONTRACT,
    provider_id: ETCD_STATE_PROVIDER_ID,
    provider_version: "3.7.2",
    provider_implementation: "etcd v3.7.2 self-hosted multi-member cluster",
    provider_authority: "GoreeCloud/privacy-shield",
    selection_decision_id: "etcd-self-hosted-multimember-production-selection",
    durable: true,
    restart_recovery: true,
    atomic_transactions: true,
    multi_writer_serializable: true,
    distributed: true,
    fail_closed_on_conflict: true,
    production_acceptance_authority: false,
    transport_contract: PRIVACY_ETCD_TRANSPORT_CONTRACT,
  });
});

test("get set list and delete preserve namespaces and clone values", () => {
  const store = new EtcdPrivacyStateStore({ transport: new FakeTransport() });
  const input = { state: "granted", nested: { count: 1 } };
  store.set("consent", "a/b", input);
  input.nested.count = 99;
  store.set("consent", "second", { state: "denied" });
  store.set("policy", "a/b", { version: 1 });

  assert.deepEqual(store.get("consent", "a/b"), { state: "granted", nested: { count: 1 } });
  assert.deepEqual(store.list("consent").sort((a,b)=>a.key.localeCompare(b.key)), [
    { key: "a/b", value: { state: "granted", nested: { count: 1 } } },
    { key: "second", value: { state: "denied" } },
  ]);
  assert.deepEqual(store.get("policy", "a/b"), { version: 1 });
  assert.equal(store.delete("consent", "a/b"), true);
  assert.equal(store.get("consent", "a/b"), null);
  assert.equal(store.delete("consent", "missing"), false);
});

test("set returns its committed value without a second snapshot read", () => {
  const transport = new FakeTransport();
  const store = new EtcdPrivacyStateStore({ transport });
  let reads = 0;
  const original = transport.readSnapshot.bind(transport);
  transport.readSnapshot = args => {
    reads += 1;
    return original(args);
  };
  assert.deepEqual(store.set("state", "x", { n: 1 }), { n: 1 });
  assert.equal(reads, 1);
});

test("undefined durable values fail closed before commit", () => {
  const transport = new FakeTransport();
  const store = new EtcdPrivacyStateStore({ transport });
  const before = transport.generation;
  assert.throws(
    () => store.set("state", "x", undefined),
    /ETCD_STATE_PROVIDER_VALUE_NOT_JSON_SERIALIZABLE/,
  );
  assert.equal(transport.generation, before);
});

test("missing delete is a true no-op and does not advance generation", () => {
  const transport = new FakeTransport();
  const store = new EtcdPrivacyStateStore({ transport });
  const before = transport.generation;
  assert.equal(store.delete("state", "missing"), false);
  assert.equal(transport.generation, before);
});

test("transaction commits atomically and returns callback result", () => {
  const transport = new FakeTransport();
  const store = new EtcdPrivacyStateStore({ transport });
  store.set("evidence", "head", { n: 1 });
  const generation = transport.generation;

  const result = store.transaction(tx => {
    tx.set("evidence", "head", { n: 2 });
    tx.set("evidence", "event-2", { ok: true });
    return "done";
  });

  assert.equal(result, "done");
  assert.equal(transport.generation, generation + 1n);
  assert.deepEqual(store.get("evidence", "head"), { n: 2 });
  assert.deepEqual(store.get("evidence", "event-2"), { ok: true });
});

test("transaction callback failure rolls back without transport commit", () => {
  const transport = new FakeTransport();
  const store = new EtcdPrivacyStateStore({ transport });
  store.set("state", "x", { n: 1 });
  const before = transport.generation;

  assert.throws(() => store.transaction(tx => {
    tx.set("state", "x", { n: 2 });
    throw new Error("injected");
  }), /injected/);

  assert.equal(transport.generation, before);
  assert.deepEqual(store.get("state", "x"), { n: 1 });
});

test("compare-and-swap conflict fails closed", () => {
  const transport = new FakeTransport();
  const store = new EtcdPrivacyStateStore({ transport });
  transport.forceConflict = true;
  assert.throws(() => store.set("state", "x", { n: 1 }), /ETCD_STATE_PROVIDER_CONFLICT/);
  assert.equal(store.get("state", "x"), null);
});

test("asynchronous transport responses are rejected", () => {
  const transport = new FakeTransport();
  const store = new EtcdPrivacyStateStore({ transport });
  transport.asyncSnapshot = true;
  assert.throws(() => store.get("state", "x"), /ETCD_STATE_PROVIDER_SYNCHRONOUS_TRANSPORT_REQUIRED/);
});

test("asynchronous transaction callbacks are rejected before commit", () => {
  const transport = new FakeTransport();
  const store = new EtcdPrivacyStateStore({ transport });
  const before = transport.generation;
  assert.throws(
    () => store.transaction(async tx => {
      tx.set("state", "x", { n: 1 });
      return "async";
    }),
    /PRIVACY_STATE_TRANSACTION_CALLBACK_MUST_BE_SYNCHRONOUS/,
  );
  assert.equal(transport.generation, before);
});

test("transport capability drift is rejected", () => {
  const transport = new FakeTransport();
  const original = transport.etcdTransportCapabilities.bind(transport);
  transport.etcdTransportCapabilities = () => ({
    ...original(),
    acceptance_authority: true,
  });
  assert.throws(
    () => new EtcdPrivacyStateStore({ transport }),
    /ETCD_STATE_PROVIDER_TRANSPORT_CAPABILITY_REQUIRED:acceptance_authority/,
  );
});

test("malformed snapshot entries fail closed", () => {
  const transport = new FakeTransport();
  transport.entries.set("/wrong/prefix", "{}");
  const store = new EtcdPrivacyStateStore({ transport });
  assert.deepEqual(store.list("state"), []);

  transport.entries.set("/goreecloud/privacy-shield/state/v1/n/not*base64/k/a", "{}");
  assert.throws(() => store.list("state"), /ETCD_STATE_PROVIDER_INVALID_STORAGE_KEY/);
});
