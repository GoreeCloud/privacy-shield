import crypto from "node:crypto";
import { MemoryPrivacyStateStore } from "./privacy-state-store.mjs";

function id() {
  return `pspol_${crypto.randomUUID()}`;
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
    if (this.store.get("policy_version", key)) throw new Error("PRIVACY_POLICY_VERSION_EXISTS");
    const record = {
      policy_id,
      version,
      status,
      published_at: new Date().toISOString(),
      rules: structuredClone(rules),
      metadata: structuredClone(metadata)
    };
    this.store.set("policy_version", key, record);
    if (status === "active") this.activate(policy_id, version);
    return structuredClone(record);
  }

  activate(policy_id, version) {
    const key = `${policy_id}:${version}`;
    const record = this.store.get("policy_version", key);
    if (!record) throw new Error("PRIVACY_POLICY_VERSION_NOT_FOUND");
    for (const { key: existingKey, value } of this.store.list("policy_version")) {
      if (value.policy_id === policy_id && value.status === "active" && existingKey !== key) {
        this.store.set("policy_version", existingKey, { ...value, status: "retired", retired_at: new Date().toISOString() });
      }
    }
    const active = { ...record, status: "active", activated_at: new Date().toISOString() };
    this.store.set("policy_version", key, active);
    this.store.set("policy_active", policy_id, { policy_id, version });
    return structuredClone(active);
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
