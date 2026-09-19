import assert from "node:assert/strict";
import test from "node:test";
import { PrivacyLockAuthority } from "../src/privacy-lock.mjs";

const NOW = new Date("2026-09-12T04:00:00Z");
const EXPIRES = "2026-09-12T06:00:00Z";

function base(overrides = {}) {
  return {
    subject_id: "user-1",
    actor: { id: "user-1", type: "user" },
    mode: "strict_optional",
    reason_code: "USER_ENABLED_PRIVACY_LOCK",
    expires_at: EXPIRES,
    now: NOW,
    ...overrides,
  };
}

test("Privacy Lock rejects padded exact-bound identifiers", () => {
  const authority = new PrivacyLockAuthority();
  assert.throws(
    () => authority.create(base({ subject_id: " user-1" })),
    /canonical subject_id/,
  );
  assert.throws(
    () => authority.create(base({ actor: { id: "user-1 ", type: "user" } })),
    /canonical actor.id/,
  );
  assert.throws(
    () => authority.create(base({ application_ids: ["goreecloud-search "] })),
    /canonical application_ids/,
  );
});

test("Privacy Lock rejects timezone-ambiguous string timestamps", () => {
  const authority = new PrivacyLockAuthority();
  assert.throws(
    () => authority.create(base({ expires_at: "2026-09-12T06:00:00" })),
    /valid expires_at/,
  );
  assert.throws(
    () => authority.create(base({ now: "2026-09-12T04:00:00" })),
    /valid now/,
  );
});
