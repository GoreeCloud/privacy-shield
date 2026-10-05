import {
  PRIVACY_STATE_PROVIDER_CONTRACT,
  MemoryPrivacyStateStore,
} from "./privacy-state-store.mjs";

export const PRIVACY_ETCD_TRANSPORT_CONTRACT =
  "goreecloud.privacy-shield.etcd-transport.v1";
export const ETCD_STATE_PROVIDER_SELECTION_DECISION =
  "etcd-self-hosted-multimember-production-selection";
export const ETCD_STATE_PROVIDER_ID = "etcd-self-hosted-multimember";
export const ETCD_STATE_PROVIDER_VERSION = "3.7.2";
export const ETCD_STATE_PROVIDER_IMPLEMENTATION =
  "etcd v3.7.2 self-hosted multi-member cluster";
export const ETCD_STATE_PROVIDER_AUTHORITY = "GoreeCloud/privacy-shield";

const DEFAULT_PREFIX = "/goreecloud/privacy-shield/state/v1/";
const GENERATION = /^(?:0|[1-9][0-9]*)$/;

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function requireObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

function requireString(value, code) {
  if (typeof value !== "string" || !value || value !== value.trim()) throw new Error(code);
  return value;
}

function sync(value) {
  if (value && (typeof value === "object" || typeof value === "function") && typeof value.then === "function") {
    throw new Error("ETCD_STATE_PROVIDER_SYNCHRONOUS_TRANSPORT_REQUIRED");
  }
  return value;
}

function segment(value, code) {
  const text = requireString(value, code);
  return Buffer.from(text, "utf8").toString("base64url");
}

function decodeSegment(value) {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    if (!decoded || Buffer.from(decoded, "utf8").toString("base64url") !== value) {
      throw new Error("invalid");
    }
    return decoded;
  } catch {
    throw new Error("ETCD_STATE_PROVIDER_INVALID_STORAGE_KEY");
  }
}

function storageKey(prefix, namespace, key) {
  return `${prefix}n/${segment(namespace, "ETCD_STATE_NAMESPACE_REQUIRED")}/k/${segment(key, "ETCD_STATE_KEY_REQUIRED")}`;
}

function logicalKey(prefix, key) {
  if (typeof key !== "string" || !key.startsWith(`${prefix}n/`)) {
    throw new Error("ETCD_STATE_PROVIDER_INVALID_STORAGE_KEY");
  }
  const rest = key.slice(`${prefix}n/`.length);
  const marker = rest.indexOf("/k/");
  if (marker <= 0 || marker === rest.length - 3 || rest.indexOf("/k/", marker + 3) !== -1) {
    throw new Error("ETCD_STATE_PROVIDER_INVALID_STORAGE_KEY");
  }
  return {
    namespace: decodeSegment(rest.slice(0, marker)),
    key: decodeSegment(rest.slice(marker + 3)),
  };
}

function encodeValue(value) {
  if (value === undefined) throw new Error("ETCD_STATE_PROVIDER_VALUE_NOT_JSON_SERIALIZABLE");
  let encoded;
  try {
    encoded = JSON.stringify({ schema_version: 1, value });
  } catch {
    throw new Error("ETCD_STATE_PROVIDER_VALUE_NOT_JSON_SERIALIZABLE");
  }
  if (encoded === undefined) throw new Error("ETCD_STATE_PROVIDER_VALUE_NOT_JSON_SERIALIZABLE");
  return encoded;
}

function decodeValue(value) {
  if (typeof value !== "string") throw new Error("ETCD_STATE_PROVIDER_INVALID_VALUE");
  let decoded;
  try {
    decoded = JSON.parse(value);
  } catch {
    throw new Error("ETCD_STATE_PROVIDER_INVALID_VALUE");
  }
  if (
    !decoded ||
    typeof decoded !== "object" ||
    Array.isArray(decoded) ||
    decoded.schema_version !== 1 ||
    !Object.prototype.hasOwnProperty.call(decoded, "value")
  ) {
    throw new Error("ETCD_STATE_PROVIDER_INVALID_VALUE");
  }
  return decoded.value;
}

function requireTransport(transport) {
  const value = requireObject(transport, "ETCD_STATE_PROVIDER_TRANSPORT_REQUIRED");
  for (const method of ["etcdTransportCapabilities", "readSnapshot", "compareAndSwap"]) {
    if (typeof value[method] !== "function") {
      throw new Error(`ETCD_STATE_PROVIDER_TRANSPORT_METHOD_REQUIRED:${method}`);
    }
  }
  const capabilities = requireObject(
    sync(value.etcdTransportCapabilities()),
    "ETCD_STATE_PROVIDER_INVALID_TRANSPORT_CAPABILITIES",
  );
  const exact = {
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
  for (const [field, expected] of Object.entries(exact)) {
    if (capabilities[field] !== expected) {
      throw new Error(`ETCD_STATE_PROVIDER_TRANSPORT_CAPABILITY_REQUIRED:${field}`);
    }
  }
  return value;
}

function normalizePrefix(prefix) {
  const value = requireString(prefix, "ETCD_STATE_PROVIDER_PREFIX_REQUIRED");
  if (!value.startsWith("/") || !value.endsWith("/") || value.includes("//")) {
    throw new Error("ETCD_STATE_PROVIDER_INVALID_PREFIX");
  }
  return value;
}

function readState(transport, prefix) {
  const snapshot = requireObject(
    sync(transport.readSnapshot({ prefix })),
    "ETCD_STATE_PROVIDER_INVALID_SNAPSHOT",
  );
  if (typeof snapshot.generation !== "string" || !GENERATION.test(snapshot.generation)) {
    throw new Error("ETCD_STATE_PROVIDER_INVALID_GENERATION");
  }
  if (!Array.isArray(snapshot.entries)) throw new Error("ETCD_STATE_PROVIDER_INVALID_SNAPSHOT");

  const state = new MemoryPrivacyStateStore();
  const seen = new Set();
  for (const entry of snapshot.entries) {
    requireObject(entry, "ETCD_STATE_PROVIDER_INVALID_SNAPSHOT_ENTRY");
    const rawKey = requireString(entry.key, "ETCD_STATE_PROVIDER_INVALID_SNAPSHOT_ENTRY");
    if (seen.has(rawKey)) throw new Error("ETCD_STATE_PROVIDER_DUPLICATE_SNAPSHOT_KEY");
    seen.add(rawKey);
    const logical = logicalKey(prefix, rawKey);
    state.set(logical.namespace, logical.key, decodeValue(entry.value));
  }
  return { generation: snapshot.generation, state };
}

function transactionView(base) {
  const changes = new Map();
  return {
    get(namespace, key) {
      return base.get(namespace, key);
    },
    set(namespace, key, value) {
      if (value === undefined) throw new Error("ETCD_STATE_PROVIDER_VALUE_NOT_JSON_SERIALIZABLE");
      const result = base.set(namespace, key, value);
      changes.set(JSON.stringify([namespace, key]), {
        operation: "set",
        namespace,
        key,
        value: clone(result),
      });
      return result;
    },
    delete(namespace, key) {
      const existed = base.delete(namespace, key);
      if (existed) {
        changes.set(JSON.stringify([namespace, key]), {
          operation: "delete",
          namespace,
          key,
        });
      }
      return existed;
    },
    list(namespace) {
      return base.list(namespace);
    },
    _changes: changes,
  };
}

export class EtcdPrivacyStateStore {
  constructor({ transport, prefix = DEFAULT_PREFIX } = {}) {
    this.transport = requireTransport(transport);
    this.prefix = normalizePrefix(prefix);
  }

  _snapshot() {
    return readState(this.transport, this.prefix);
  }

  get(namespace, key) {
    return this._snapshot().state.get(namespace, key);
  }

  list(namespace) {
    return this._snapshot().state.list(namespace);
  }

  set(namespace, key, value) {
    return this.transaction(store => store.set(namespace, key, value));
  }

  delete(namespace, key) {
    let deleted = false;
    this.transaction(store => {
      deleted = store.delete(namespace, key);
    });
    return deleted;
  }

  transaction(callback) {
    if (typeof callback !== "function") throw new TypeError("Privacy state transaction requires a callback");
    const { generation, state } = this._snapshot();
    const view = transactionView(state);
    const result = callback(view);
    if (result && (typeof result === "object" || typeof result === "function") && typeof result.then === "function") {
      throw new TypeError("PRIVACY_STATE_TRANSACTION_CALLBACK_MUST_BE_SYNCHRONOUS");
    }

    const mutations = [...view._changes.values()].map(change => {
      const key = storageKey(this.prefix, change.namespace, change.key);
      if (change.operation === "delete") return { operation: "delete", key };
      return { operation: "set", key, value: encodeValue(change.value) };
    });
    if (!mutations.length) return result;

    const response = requireObject(
      sync(this.transport.compareAndSwap({
        prefix: this.prefix,
        expected_generation: generation,
        mutations,
      })),
      "ETCD_STATE_PROVIDER_INVALID_COMMIT_RESPONSE",
    );
    if (response.committed !== true) throw new Error("ETCD_STATE_PROVIDER_CONFLICT");
    if (typeof response.generation !== "string" || !GENERATION.test(response.generation)) {
      throw new Error("ETCD_STATE_PROVIDER_INVALID_GENERATION");
    }
    if (BigInt(response.generation) <= BigInt(generation)) {
      throw new Error("ETCD_STATE_PROVIDER_NON_ADVANCING_GENERATION");
    }
    return result;
  }

  stateProviderCapabilities() {
    return Object.freeze({
      contract: PRIVACY_STATE_PROVIDER_CONTRACT,
      provider_id: ETCD_STATE_PROVIDER_ID,
      provider_version: ETCD_STATE_PROVIDER_VERSION,
      provider_implementation: ETCD_STATE_PROVIDER_IMPLEMENTATION,
      provider_authority: ETCD_STATE_PROVIDER_AUTHORITY,
      selection_decision_id: ETCD_STATE_PROVIDER_SELECTION_DECISION,
      durable: true,
      restart_recovery: true,
      atomic_transactions: true,
      multi_writer_serializable: true,
      distributed: true,
      fail_closed_on_conflict: true,
      production_acceptance_authority: false,
      transport_contract: PRIVACY_ETCD_TRANSPORT_CONTRACT,
    });
  }
}
