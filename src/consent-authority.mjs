import crypto from "node:crypto";

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export class ConsentAuthority {
  constructor(initial = []) {
    this.records = new Map();
    for (const record of initial) this.put(record);
  }

  key({ requester_id, resource_id, purpose }) {
    return `${requester_id}:${resource_id}:${purpose}`;
  }

  put(record) {
    if (!record?.requester_id || !record?.resource_id || !record?.purpose) {
      throw new TypeError("Consent record requires requester_id, resource_id, and purpose");
    }
    const stored = {
      consent_id: record.consent_id ?? id("pscns"),
      granted_at: record.granted_at ?? new Date().toISOString(),
      revoked: false,
      ...record
    };
    this.records.set(this.key(stored), stored);
    return structuredClone(stored);
  }

  get({ requester_id, resource_id, purpose }) {
    const value = this.records.get(this.key({ requester_id, resource_id, purpose }));
    return value ? structuredClone(value) : null;
  }

  revoke({ requester_id, resource_id, purpose, reason = "USER_REVOKED" }) {
    const key = this.key({ requester_id, resource_id, purpose });
    const existing = this.records.get(key);
    if (!existing) return null;
    const updated = {
      ...existing,
      revoked: true,
      revoked_at: new Date().toISOString(),
      revocation_reason: reason
    };
    this.records.set(key, updated);
    return structuredClone(updated);
  }

  isEffective(record, now = Date.now()) {
    if (!record || record.revoked) return false;
    if (record.not_before && Date.parse(record.not_before) > now) return false;
    if (record.expires_at && Date.parse(record.expires_at) <= now) return false;
    return true;
  }
}
