import crypto from "node:crypto";
import {
  MemoryPrivacyStateStore,
  mutatePrivacyState,
} from "./privacy-state-store.mjs";

const GRANT_TYPES = new Set(["one_time", "session", "expiring", "purpose_bound"]);
const DECISIONS = new Set(["granted", "denied"]);

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function requiredString(value, field) {
  if (
    typeof value !== "string"
    || !value
    || value !== value.trim()
    || value.length > 256
    || /[\u0000-\u001F\u007F-\u009F]/.test(value)
  ) {
    throw new TypeError(`Consent record requires canonical ${field}`);
  }
  return value;
}

function optionalTimestamp(value, field) {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== "string"
    || !value
    || value !== value.trim()
    || !/(?:Z|[+-]\\d{2}:\\d{2})$/.test(value)
    || !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError(`Consent record has invalid ${field}`);
  }
  return value;
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("Consent record must be an object");
  }

  const requester_id = requiredString(record.requester_id, "requester_id");
  const resource_id = requiredString(record.resource_id, "resource_id");
  const purpose = requiredString(record.purpose, "purpose");
  const decision = record.decision ?? "granted";
  const grant_type = record.grant_type ?? "purpose_bound";

  if (!DECISIONS.has(decision)) {
    throw new TypeError("Consent decision must be granted or denied");
  }
  if (!GRANT_TYPES.has(grant_type)) {
    throw new TypeError("Consent grant_type is unsupported");
  }
  if (record.revoked === true || record.revoked_at || record.revocation_reason) {
    throw new TypeError("New consent records cannot inject revocation state");
  }
  if (record.consumed_at || record.uses_remaining !== undefined) {
    throw new TypeError("New consent records cannot inject one-time consumption state");
  }

  const not_before = optionalTimestamp(record.not_before, "not_before");
  const expires_at = optionalTimestamp(record.expires_at, "expires_at");
  const consent_id = record.consent_id === undefined
    ? id("pscns")
    : requiredString(record.consent_id, "consent_id");
  const supersedes_consent_id = record.supersedes_consent_id === undefined
    ? undefined
    : requiredString(record.supersedes_consent_id, "supersedes_consent_id");
  const now = Date.now();
  const granted_at = decision === "granted"
    ? (optionalTimestamp(record.granted_at, "granted_at") ?? new Date(now).toISOString())
    : undefined;
  const denied_at = decision === "denied"
    ? (optionalTimestamp(record.denied_at, "denied_at") ?? new Date(now).toISOString())
    : undefined;

  if (not_before && expires_at && Date.parse(expires_at) <= Date.parse(not_before)) {
    throw new TypeError("Consent expires_at must be later than not_before");
  }
  if (grant_type === "expiring" && !expires_at) {
    throw new TypeError("Expiring consent requires expires_at");
  }
  if (grant_type !== "expiring" && expires_at !== undefined) {
    throw new TypeError("Only expiring consent may declare expires_at");
  }

  const session_id = record.session_id === undefined
    ? undefined
    : requiredString(record.session_id, "session_id");
  if (grant_type === "session" && !session_id) {
    throw new TypeError("Session consent requires session_id");
  }
  if (grant_type !== "session" && session_id !== undefined) {
    throw new TypeError("Only session consent may declare session_id");
  }

  if (decision === "denied" && grant_type === "one_time") {
    throw new TypeError("Denied consent cannot be represented as a one-time grant");
  }

  return {
    ...record,
    requester_id,
    resource_id,
    purpose,
    decision,
    grant_type,
    not_before,
    expires_at,
    session_id,
    consent_id,
    supersedes_consent_id,
    granted_at,
    denied_at,
    revoked: false,
    uses_remaining: grant_type === "one_time" && decision === "granted" ? 1 : undefined,
  };
}

function lifecycleContext(context) {
  if (typeof context === "number") {
    return { now: context, session_id: undefined };
  }
  if (context === undefined || context === null) {
    return { now: Date.now(), session_id: undefined };
  }
  if (typeof context !== "object" || Array.isArray(context)) {
    throw new TypeError("Consent lifecycle context must be a timestamp or object");
  }
  const now = context.now ?? Date.now();
  if (!Number.isFinite(now)) {
    throw new TypeError("Consent lifecycle context has invalid now");
  }
  return {
    now,
    session_id: context.session_id === undefined
      ? undefined
      : requiredString(context.session_id, "session_id"),
  };
}

export class ConsentAuthority {
  constructor(initial = [], { store = new MemoryPrivacyStateStore() } = {}) {
    this.store = store;
    for (const record of initial) this.put(record);
  }

  key({ requester_id, resource_id, purpose }) {
    return JSON.stringify([
      requiredString(requester_id, "requester_id"),
      requiredString(resource_id, "resource_id"),
      requiredString(purpose, "purpose"),
    ]);
  }

  put(record) {
    const stored = normalizeRecord(record);
    const key = this.key(stored);

    return mutatePrivacyState(this.store, store => {
      const existing = store.get("consent", key);
      if (existing) {
        if (!stored.supersedes_consent_id || stored.supersedes_consent_id !== existing.consent_id) {
          throw new Error("CONSENT_SUPERSESSION_REQUIRED");
        }
        if (stored.consent_id === existing.consent_id) {
          throw new Error("CONSENT_ID_REUSE_FORBIDDEN");
        }
      } else if (stored.supersedes_consent_id) {
        throw new Error("CONSENT_SUPERSESSION_TARGET_MISSING");
      }

      store.set("consent", key, stored);
      return structuredClone(stored);
    });
  }

  deny(record) {
    return this.put({
      ...record,
      decision: "denied",
      grant_type: record?.grant_type ?? "purpose_bound",
    });
  }

  get({ requester_id, resource_id, purpose }) {
    return this.store.get("consent", this.key({ requester_id, resource_id, purpose }));
  }

  revoke({ requester_id, resource_id, purpose, reason = "USER_REVOKED" }) {
    const key = this.key({ requester_id, resource_id, purpose });
    return mutatePrivacyState(this.store, store => {
      const existing = store.get("consent", key);
      if (!existing) return null;
      if (existing.revoked) return structuredClone(existing);
      const updated = {
        ...existing,
        revoked: true,
        revoked_at: new Date().toISOString(),
        revocation_reason: requiredString(reason, "revocation reason"),
      };
      store.set("consent", key, updated);
      return structuredClone(updated);
    });
  }

  endSession({ requester_id, resource_id, purpose, session_id }) {
    const key = this.key({ requester_id, resource_id, purpose });
    const canonical_session_id = requiredString(session_id, "session_id");
    return mutatePrivacyState(this.store, store => {
      const existing = store.get("consent", key);
      if (!existing) return null;
      if (existing.grant_type !== "session" || existing.session_id !== canonical_session_id) {
        throw new Error("CONSENT_SESSION_MISMATCH");
      }
      if (existing.revoked) return structuredClone(existing);
      const updated = {
        ...existing,
        revoked: true,
        revoked_at: new Date().toISOString(),
        revocation_reason: "SESSION_ENDED",
      };
      store.set("consent", key, updated);
      return structuredClone(updated);
    });
  }

  consume({ requester_id, resource_id, purpose }, context = undefined) {
    const key = this.key({ requester_id, resource_id, purpose });
    return mutatePrivacyState(this.store, store => {
      const existing = store.get("consent", key);
      if (!existing || existing.grant_type !== "one_time") {
        throw new Error("ONE_TIME_CONSENT_REQUIRED");
      }
      if (!this.isEffective(existing, context)) {
        throw new Error("CONSENT_NOT_EFFECTIVE");
      }
      const updated = {
        ...existing,
        uses_remaining: 0,
        consumed_at: new Date().toISOString(),
      };
      store.set("consent", key, updated);
      return structuredClone(updated);
    });
  }

  isEffective(record, context = undefined) {
    if (!record || record.revoked || record.decision !== "granted") return false;
    const { now, session_id } = lifecycleContext(context);
    if (record.not_before && Date.parse(record.not_before) > now) return false;
    if (record.expires_at && Date.parse(record.expires_at) <= now) return false;
    if (record.grant_type === "one_time" && record.uses_remaining !== 1) return false;
    if (record.grant_type === "session" && (!session_id || session_id !== record.session_id)) return false;
    return true;
  }
}
