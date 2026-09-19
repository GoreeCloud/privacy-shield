import crypto from "node:crypto";
import {
  MemoryPrivacyStateStore,
  mutatePrivacyState,
} from "./privacy-state-store.mjs";

function id() {
  return `pspol_${crypto.randomUUID()}`;
}

function activateInStore(store, policy_id, version) {
  const key = `${policy_id}:${version}`;
  const record = store.get("policy_version", key);
  if (!record) throw new Error("PRIVACY_POLICY_VERSION_NOT_FOUND");
  for (const { key: existingKey, value } of store.list("policy_version")) {
    if (value.policy_id === policy_id && value.status === "active" && existingKey !== key) {
      store.set("policy_version", existingKey, {
        ...value,
        status: "retired",
        retired_at: new Date().toISOString(),
      });
    }
  }
  const active = { ...record, status: "active", activated_at: new Date().toISOString() };
  store.set("policy_version", key, active);
  store.set("policy_active", policy_id, { policy_id, version });
  return active;
}

export class PrivacyPolicyStore {
  constructor({ store = new MemoryPrivacyStateStore() } = {}) {
    this.store = store;
  }

  publish({ policy_id = id(), version, rules, status = "active", metadata = {} }) {
    if (!version || typeof version !== "string") throw new TypeError("Privacy policy version is required");
    if (!Array.isArray(rules)) throw new TypeError("Privacy policy rules must be an array");
    if (!new Set(["draft", "active", "retired"]).has(status)) throw new TypeError("Unsupported privacy policy status");
    const key = `${policy_id}:${version}`;
    const record = {
      policy_id,
      version,
      status,
      published_at: new Date().toISOString(),
      rules: structuredClone(rules),
      metadata: structuredClone(metadata)
    };

    mutatePrivacyState(this.store, store => {
      if (store.get("policy_version", key)) throw new Error("PRIVACY_POLICY_VERSION_EXISTS");
      store.set("policy_version", key, record);
      if (status === "active") activateInStore(store, policy_id, version);
    });
    return structuredClone(record);
  }

  activate(policy_id, version) {
    return mutatePrivacyState(this.store, store => structuredClone(
      activateInStore(store, policy_id, version),
    ));
  }

  get(policy_id, version) {
    return this.store.get("policy_version", `${policy_id}:${version}`);
  }

  active(policy_id) {
    const pointer = this.store.get("policy_active", policy_id);
    return pointer ? this.get(policy_id, pointer.version) : null;
  }

  activeRules() {
    return this.store.list("policy_active")
      .map(({ value }) => this.active(value.policy_id))
      .filter(Boolean)
      .flatMap(policy => policy.rules);
  }

  list(policy_id = null) {
    return this.store.list("policy_version").map(({ value }) => value)
      .filter(policy => !policy_id || policy.policy_id === policy_id)
      .map(policy => structuredClone(policy));
  }
}
