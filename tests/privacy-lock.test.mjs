import assert from "node:assert/strict";
import test from "node:test";
import { PrivacyLockAuthority } from "../src/privacy-lock.mjs";
import { MemoryPrivacyStateStore } from "../src/privacy-state-store.mjs";

const NOW = new Date("2026-09-12T04:00:00.000Z");
const EXPIRES = "2026-09-12T06:00:00.000Z";

function allowDecision(overrides = {}) {
  return {
    decision_id: "dec-lock-1",
    request_id: "req-lock-1",
    outcome: "ALLOW",
    reason_code: "AUTHORIZED",
    obligations: ["record_privacy_evidence"],
    capability_token_reference: "psc-capability-reference",
    ...overrides,
  };
}

function createStrict(authority, overrides = {}) {
  return authority.create({
    subject_id: "user-1",
    actor: { id: "user-1", type: "user" },
    mode: "strict_optional",
    reason_code: "USER_ENABLED_PRIVACY_LOCK",
    expires_at: EXPIRES,
    now: NOW,
    ...overrides,
  });
}

test("strict Privacy Lock denies optional authority without widening it", () => {
  const authority = new PrivacyLockAuthority();
  const lock = createStrict(authority);
  const result = authority.assess({
    subject_id: "user-1",
    application_id: "goreecloud-search",
    participating: true,
    category: "optional_ai_context",
    decision: allowDecision(),
    now: NOW,
  });

  assert.equal(result.assessment.lock_id, lock.lock_id);
  assert.equal(result.assessment.authorization_effect, "restriction_only");
  assert.equal(result.assessment.may_widen_authority, false);
  assert.equal(result.assessment.effect, "deny");
  assert.equal(result.decision.outcome, "DENY");
  assert.equal(result.decision.reason_code, "PRIVACY_LOCK_ACTIVE_DENY");
  assert.equal("capability_token_reference" in result.decision, false);
});

test("custom constrain mode can only narrow an allow decision", () => {
  const authority = new PrivacyLockAuthority();
  authority.create({
    subject_id: "user-1",
    actor: { id: "user-1", type: "user" },
    mode: "custom",
    reason_code: "USER_ENABLED_CUSTOM_PRIVACY_LOCK",
    rules: [
      {
        category: "optional_external_processing",
        effect: "constrain",
        constraints: ["local_processing_only", "no_persistent_retention"],
      },
    ],
    expires_at: EXPIRES,
    now: NOW,
  });

  const narrowed = authority.assess({
    subject_id: "user-1",
    application_id: "goreecloud-memos",
    participating: true,
    category: "optional_external_processing",
    decision: allowDecision(),
    now: NOW,
  });
  assert.equal(narrowed.decision.outcome, "ALLOW_WITH_CONSTRAINTS");
  assert.deepEqual(narrowed.assessment.constraints, [
    "local_processing_only",
    "no_persistent_retention",
  ]);
  assert.ok(narrowed.decision.obligations.includes("respect_privacy_lock"));

  const alreadyDenied = authority.assess({
    subject_id: "user-1",
    application_id: "goreecloud-memos",
    participating: true,
    category: "optional_external_processing",
    decision: allowDecision({ outcome: "DENY", reason_code: "CONSENT_REVOKED" }),
    now: NOW,
  });
  assert.equal(alreadyDenied.decision.outcome, "DENY");
  assert.equal(alreadyDenied.decision.reason_code, "CONSENT_REVOKED");
});

test("essential operations fail closed until independent authority is verified", () => {
  const authority = new PrivacyLockAuthority();
  createStrict(authority);

  const blocked = authority.assess({
    subject_id: "user-1",
    application_id: "goreecloud-identity",
    participating: true,
    category: "account_recovery",
    decision: allowDecision(),
    independent_authority_reference: "recovery-evidence-1",
    now: NOW,
  });
  assert.equal(blocked.assessment.independent_authority_required, true);
  assert.equal(blocked.decision.outcome, "DENY");
  assert.equal(
    blocked.decision.reason_code,
    "PRIVACY_LOCK_INDEPENDENT_AUTHORITY_REQUIRED",
  );

  const verified = authority.assess({
    subject_id: "user-1",
    application_id: "goreecloud-identity",
    participating: true,
    category: "account_recovery",
    decision: allowDecision(),
    independent_authority_reference: "recovery-evidence-1",
    independent_authority: {
      verify(context) {
        assert.equal(context.authority_reference, "recovery-evidence-1");
        return {
          accepted: true,
          authority: "goreecloud.identity.recovery",
          evidence_reference: "recovery-evidence-accepted-1",
        };
      },
    },
    now: NOW,
  });
  assert.equal(verified.assessment.effect, "none");
  assert.equal(
    verified.assessment.reason_code,
    "PRIVACY_LOCK_INDEPENDENT_AUTHORITY_VERIFIED",
  );
  assert.equal(verified.decision.outcome, "ALLOW");
  assert.equal(
    verified.assessment.independent_authority_reference.authority,
    "goreecloud.identity.recovery",
  );
});

test("nonparticipating and out-of-scope applications never gain a coverage claim", () => {
  const authority = new PrivacyLockAuthority();
  createStrict(authority, { application_ids: ["goreecloud-search"] });

  const nonparticipating = authority.assess({
    subject_id: "user-1",
    application_id: "goreecloud-search",
    participating: false,
    category: "optional_diagnostics",
    decision: allowDecision(),
    now: NOW,
  });
  assert.equal(
    nonparticipating.assessment.reason_code,
    "PRIVACY_LOCK_RUNTIME_NOT_PARTICIPATING",
  );
  assert.equal(nonparticipating.decision.outcome, "ALLOW");

  const outOfScope = authority.assess({
    subject_id: "user-1",
    application_id: "goreecloud-browser",
    participating: true,
    category: "optional_diagnostics",
    decision: allowDecision(),
    now: NOW,
  });
  assert.equal(
    outOfScope.assessment.reason_code,
    "PRIVACY_LOCK_APPLICATION_OUT_OF_SCOPE",
  );
  assert.equal(outOfScope.decision.outcome, "ALLOW");
});

test("participating runtimes fail closed on missing or unsupported categories", () => {
  const authority = new PrivacyLockAuthority();
  createStrict(authority);

  const missing = authority.assess({
    subject_id: "user-1",
    application_id: "goreecloud-search",
    participating: true,
    category: null,
    decision: allowDecision(),
    now: NOW,
  });
  assert.equal(missing.decision.outcome, "DENY");
  assert.equal(missing.decision.reason_code, "PRIVACY_LOCK_CATEGORY_REQUIRED");

  const unsupported = authority.assess({
    subject_id: "user-1",
    application_id: "goreecloud-search",
    participating: true,
    category: "optional_unknown_use",
    decision: allowDecision(),
    now: NOW,
  });
  assert.equal(unsupported.decision.outcome, "DENY");
  assert.equal(unsupported.decision.reason_code, "PRIVACY_LOCK_CATEGORY_UNSUPPORTED");
});

test("Privacy Lock is temporary, reversible, and singular per subject", () => {
  const store = new MemoryPrivacyStateStore();
  const authority = new PrivacyLockAuthority({ store });
  const lock = createStrict(authority);

  assert.throws(() => createStrict(authority), /PRIVACY_LOCK_ALREADY_ACTIVE/);
  const released = authority.release(lock.lock_id, {
    actor: { id: "user-1", type: "user" },
    reason_code: "USER_DISABLED_PRIVACY_LOCK",
    now: new Date("2026-09-12T04:30:00.000Z"),
  });
  assert.equal(released.released_at, "2026-09-12T04:30:00.000Z");
  assert.equal(
    authority.activeFor("user-1", new Date("2026-09-12T04:31:00.000Z")),
    null,
  );

  createStrict(authority, {
    now: new Date("2026-09-12T05:00:00.000Z"),
    expires_at: "2026-09-12T05:30:00.000Z",
  });
  assert.equal(
    authority.activeFor("user-1", new Date("2026-09-12T05:31:00.000Z")),
    null,
  );
});

test("custom Privacy Lock rejects attempts to target independently governed categories", () => {
  const authority = new PrivacyLockAuthority();
  assert.throws(
    () =>
      authority.create({
        subject_id: "user-1",
        actor: { id: "user-1", type: "user" },
        mode: "custom",
        reason_code: "INVALID_LOCK",
        rules: [{ category: "essential_security", effect: "deny" }],
        expires_at: EXPIRES,
        now: NOW,
      }),
    /optional categories only/,
  );
});
