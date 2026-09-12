import crypto from "node:crypto";
import {
  MemoryPrivacyStateStore,
  mutatePrivacyState,
} from "./privacy-state-store.mjs";

const GRANT_TYPES = new Set(["one_time", "session", "expiring", "purpose_bound"]);
const DECISIONS = new Set(["granted", "denied"]);
const SCOPE_FIELDS = new Set([
  "contract",
  "data_categories",
  "destinations",
  "zones",
  "capabilities",
  "retention_seconds",
  "export",
  "ai",
  "background",
  "sharing",
]);
const SET_SCOPE_FIELDS = ["data_categories", "destinations", "zones", "capabilities"];
const BOOLEAN_SCOPE_FIELDS = ["export", "ai", "background", "sharing"];

export const CONSENT_SCOPE_CONTRACT = "goreecloud.privacy-shield.consent-scope.v1";

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function requiredString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`Consent record requires ${field}`);
  }
  return value.trim();
}

function optionalTimestamp(value, field) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`Consent record has invalid ${field}`);
  }
  return value;
}

function scopeStrings(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new TypeError(`Consent scope ${field} must be an array`);
  const values = value.map(item => requiredString(item, `scope.${field}`));
  if (new Set(values).size !== values.length) {
    throw new TypeError(`Consent scope ${field} must not contain duplicates`);
  }
  return values.sort();
}

function scopeBoolean(value, field) {
  if (value === undefined) return false;
  if (typeof value !== "boolean") throw new TypeError(`Consent scope ${field} must be boolean`);
  return value;
}

function normalizeScope(scope = {}) {
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) {
    throw new TypeError("Consent scope must be an object");
  }
  for (const field of Object.keys(scope)) {
    if (!SCOPE_FIELDS.has(field)) throw new TypeError(`Consent scope has unsupported field: ${field}`);
  }
  if (scope.contract !== undefined && scope.contract !== CONSENT_SCOPE_CONTRACT) {
    throw new TypeError("Consent scope contract is unsupported");
  }

  const retention_seconds = scope.retention_seconds ?? 0;
  if (!Number.isSafeInteger(retention_seconds) || retention_seconds < 0) {
    throw new TypeError("Consent scope retention_seconds must be a non-negative safe integer");
  }

  return {
    contract: CONSENT_SCOPE_CONTRACT,
    data_categories: scopeStrings(scope.data_categories, "data_categories"),
    destinations: scopeStrings(scope.destinations, "destinations"),
    zones: scopeStrings(scope.zones, "zones"),
    capabilities: scopeStrings(scope.capabilities, "capabilities"),
    retention_seconds,
    export: scopeBoolean(scope.export, "export"),
    ai: scopeBoolean(scope.ai, "ai"),
    background: scopeBoolean(scope.background, "background"),
    sharing: scopeBoolean(scope.sharing, "sharing"),
  };
}

function scopeDrift(grantedScope, requestedScope) {
  const drift = [];
  for (const field of SET_SCOPE_FIELDS) {
    const allowed = new Set(grantedScope[field]);
    if (requestedScope[field].some(value => !allowed.has(value))) drift.push(field);
  }
  if (requestedScope.retention_seconds > grantedScope.retention_seconds) {
    drift.push("retention_seconds");
  }
  for (const field of BOOLEAN_SCOPE_FIELDS) {
    if (requestedScope[field] && !grantedScope[field]) drift.push(field);
  }
  return drift;
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
  const now = Date.now();

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
    scope: normalizeScope(record.scope),
    not_before,
    expires_at,
    session_id,
    consent_id: record.consent_id ?? id("pscns"),
    granted_at: decision === "granted"
      ? (record.granted_at ?? new Date(now).toISOString())
      : undefined,
    denied_at: decision === "denied"
      ? (record.denied_at ?? new Date(now).toISOString())
      : undefined,
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
  return { now, session_id: context.session_id };
}

function lifecycleEvaluation(record, context = undefined) {
  if (!record) return { effective: false, reason: "CONSENT_NOT_FOUND" };
  if (record.revoked) return { effective: false, reason: "CONSENT_REVOKED" };
  if (record.decision !== "granted") return { effective: false, reason: "CONSENT_DENIED" };
  const { now, session_id } = lifecycleContext(context);
  if (record.not_before && Date.parse(record.not_before) > now) {
    return { effective: false, reason: "CONSENT_NOT_YET_EFFECTIVE" };
  }
  if (record.expires_at && Date.parse(record.expires_at) <= now) {
    return { effective: false, reason: "CONSENT_EXPIRED" };
  }
  if (record.grant_type === "one_time" && record.uses_remaining !== 1) {
    return { effective: false, reason: "CONSENT_CONSUMED" };
  }
  if (record.grant_type === "session" && (!session_id || session_id !== record.session_id)) {
    return { effective: false, reason: "CONSENT_SESSION_MISMATCH" };
  }
  return { effective: true, reason: "CONSENT_EFFECTIVE" };
}

export class ConsentAuthority {
  constructor(initial = [], { store = new MemoryPrivacyStateStore() } = {}) {
    this.store = store;
    for (const record of initial) this.put(record);
  }

  key({ requester_id, resource_id, purpose }) {
    return `${requester_id}:${resource_id}:${purpose}`;
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
    return mutatePrivacyState(this.store, store => {
      const existing = store.get("consent", key);
      if (!existing) return null;
      if (existing.grant_type !== "session" || existing.session_id !== session_id) {
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
    return lifecycleEvaluation(record, context).effective;
  }

  assessOperation(request, context = undefined) {
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      throw new TypeError("Consent operation request must be an object");
    }
    const requester_id = requiredString(request.requester_id, "requester_id");
    const resource_id = requiredString(request.resource_id, "resource_id");
    const purpose = requiredString(request.purpose, "purpose");
    if (request.scope === undefined) {
      return {
        authorized: false,
        reason: "CONSENT_REQUEST_SCOPE_REQUIRED",
        drift: ["scope"],
      };
    }

    let requestedScope;
    try {
      requestedScope = normalizeScope(request.scope);
    } catch {
      return {
        authorized: false,
        reason: "CONSENT_REQUEST_SCOPE_INVALID",
        drift: ["scope"],
      };
    }

    const record = this.get({ requester_id, resource_id, purpose });
    if (!record) {
      const otherPurposeGrant = this.store.list("consent").some(({ value }) => (
        value?.requester_id === requester_id
        && value?.resource_id === resource_id
        && value?.purpose !== purpose
        && lifecycleEvaluation(value, context).effective
      ));
      return {
        authorized: false,
        reason: otherPurposeGrant ? "CONSENT_PURPOSE_DRIFT" : "CONSENT_NOT_FOUND",
        drift: otherPurposeGrant ? ["purpose"] : [],
      };
    }

    const lifecycle = lifecycleEvaluation(record, context);
    if (!lifecycle.effective) {
      return {
        authorized: false,
        reason: lifecycle.reason,
        drift: [],
        consent_id: record.consent_id,
      };
    }

    let grantedScope;
    try {
      grantedScope = normalizeScope(record.scope);
    } catch {
      return {
        authorized: false,
        reason: "CONSENT_GRANT_SCOPE_INVALID",
        drift: ["scope"],
        consent_id: record.consent_id,
      };
    }
    const drift = scopeDrift(grantedScope, requestedScope);
    if (drift.length) {
      return {
        authorized: false,
        reason: "CONSENT_SCOPE_DRIFT",
        drift,
        consent_id: record.consent_id,
        scope_contract: CONSENT_SCOPE_CONTRACT,
      };
    }

    return {
      authorized: true,
      reason: "CONSENT_AUTHORIZED",
      drift: [],
      consent_id: record.consent_id,
      scope_contract: CONSENT_SCOPE_CONTRACT,
    };
  }
}
