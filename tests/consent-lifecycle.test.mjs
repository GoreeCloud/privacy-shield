import assert from "node:assert/strict";
import test from "node:test";

import { ConsentAuthority } from "../src/consent-authority.mjs";
import { MemoryPrivacyStateStore } from "../src/privacy-state-store.mjs";

function authority() {
  return new ConsentAuthority([], { store: new MemoryPrivacyStateStore() });
}

const base = Object.freeze({
  requester_id: "goreecloud-messenger",
  resource_id: "contact:example",
  purpose: "message-delivery",
});

test("purpose-bound grant remains effective only for its exact authority key", () => {
  const consent = authority();
  const record = consent.put(base);

  assert.equal(record.grant_type, "purpose_bound");
  assert.equal(record.decision, "granted");
  assert.equal(consent.isEffective(record), true);
  assert.equal(consent.get(base).consent_id, record.consent_id);
  assert.equal(consent.get({ ...base, purpose: "analytics" }), null);
});

test("one-time grant is atomically consumed and cannot be reused", () => {
  const consent = authority();
  const record = consent.put({ ...base, grant_type: "one_time" });

  assert.equal(consent.isEffective(record), true);
  const consumed = consent.consume(base);
  assert.equal(consumed.uses_remaining, 0);
  assert.ok(consumed.consumed_at);
  assert.equal(consent.isEffective(consent.get(base)), false);
  assert.throws(() => consent.consume(base), /CONSENT_NOT_EFFECTIVE/);
});

test("session grant requires the exact session context and can be explicitly ended", () => {
  const consent = authority();
  const record = consent.put({ ...base, grant_type: "session", session_id: "session-a" });

  assert.equal(consent.isEffective(record), false);
  assert.equal(consent.isEffective(record, { session_id: "session-b" }), false);
  assert.equal(consent.isEffective(record, { session_id: "session-a" }), true);

  const ended = consent.endSession({ ...base, session_id: "session-a" });
  assert.equal(ended.revoked, true);
  assert.equal(ended.revocation_reason, "SESSION_ENDED");
  assert.equal(consent.isEffective(ended, { session_id: "session-a" }), false);
});

test("expiring grant requires an expiry and fails closed after its deadline", () => {
  const consent = authority();
  assert.throws(
    () => consent.put({ ...base, grant_type: "expiring" }),
    /requires expires_at/,
  );

  const record = consent.put({
    ...base,
    grant_type: "expiring",
    expires_at: "2030-01-01T00:00:00.000Z",
  });
  assert.equal(consent.isEffective(record, Date.parse("2029-12-31T23:59:59.000Z")), true);
  assert.equal(consent.isEffective(record, Date.parse("2030-01-01T00:00:00.000Z")), false);
});

test("durable denial is never effective", () => {
  const consent = authority();
  const denied = consent.deny(base);

  assert.equal(denied.decision, "denied");
  assert.ok(denied.denied_at);
  assert.equal(consent.isEffective(denied), false);
  assert.equal(consent.get(base).decision, "denied");
});

test("revocation persists and cannot be silently overwritten by a new grant", () => {
  const consent = authority();
  const original = consent.put(base);
  const revoked = consent.revoke({ ...base, reason: "USER_REVOKED" });

  assert.equal(revoked.revoked, true);
  assert.equal(consent.isEffective(revoked), false);
  assert.throws(() => consent.put(base), /CONSENT_SUPERSESSION_REQUIRED/);

  const replacement = consent.put({
    ...base,
    supersedes_consent_id: original.consent_id,
  });
  assert.notEqual(replacement.consent_id, original.consent_id);
  assert.equal(replacement.supersedes_consent_id, original.consent_id);
  assert.equal(consent.isEffective(replacement), true);
});

test("existing denial also requires explicit supersession before authority can be granted", () => {
  const consent = authority();
  const denied = consent.deny(base);

  assert.throws(() => consent.put(base), /CONSENT_SUPERSESSION_REQUIRED/);
  const granted = consent.put({ ...base, supersedes_consent_id: denied.consent_id });
  assert.equal(granted.decision, "granted");
  assert.equal(consent.isEffective(granted), true);
});

test("new records cannot inject revoked or consumed authority state", () => {
  const consent = authority();
  assert.throws(() => consent.put({ ...base, revoked: true }), /cannot inject revocation state/);
  assert.throws(() => consent.put({ ...base, uses_remaining: 1 }), /cannot inject one-time consumption state/);
  assert.throws(
    () => consent.put({ ...base, grant_type: "purpose_bound", expires_at: "2030-01-01T00:00:00Z" }),
    /Only expiring consent/,
  );
});

test("authority-bearing consent identifiers fail closed instead of normalizing whitespace", () => {
  const consent = authority();
  for (const field of ["requester_id", "resource_id", "purpose"]) {
    assert.throws(
      () => consent.put({ ...base, [field]: ` ${base[field]}` }),
      new RegExp(`canonical ${field}`),
    );
  }
  assert.throws(
    () => consent.put({ ...base, grant_type: "session", session_id: " session-a" }),
    /canonical session_id/,
  );
  const session = consent.put({ ...base, grant_type: "session", session_id: "session-a" });
  assert.throws(
    () => consent.isEffective(session, { session_id: "session-a " }),
    /canonical session_id/,
  );
});

test("consent identifiers and supersession references are exact-bound", () => {
  const consent = authority();
  assert.throws(
    () => consent.put({ ...base, consent_id: " pscns-explicit" }),
    /canonical consent_id/,
  );
  const original = consent.put(base);
  assert.throws(
    () => consent.put({ ...base, supersedes_consent_id: `${original.consent_id} ` }),
    /canonical supersedes_consent_id/,
  );
});

test("consent timestamps require canonical timezone-qualified values", () => {
  const consent = authority();
  for (const expires_at of [
    " 2030-01-01T00:00:00.000Z",
    "2030-01-01T00:00:00",
  ]) {
    assert.throws(
      () => consent.put({ ...base, grant_type: "expiring", expires_at }),
      /invalid expires_at/,
    );
  }
  assert.throws(
    () => consent.put({ ...base, granted_at: "2030-01-01T00:00:00" }),
    /invalid granted_at/,
  );
});

test("authority tuple keying cannot collide on delimiter characters", () => {
  const consent = authority();
  const first = consent.put({
    requester_id: "service:a",
    resource_id: "resource",
    purpose: "purpose",
  });
  const second = consent.put({
    requester_id: "service",
    resource_id: "a:resource",
    purpose: "purpose",
  });

  assert.notEqual(first.consent_id, second.consent_id);
  assert.equal(
    consent.get({ requester_id: "service:a", resource_id: "resource", purpose: "purpose" }).consent_id,
    first.consent_id,
  );
  assert.equal(
    consent.get({ requester_id: "service", resource_id: "a:resource", purpose: "purpose" }).consent_id,
    second.consent_id,
  );
});

