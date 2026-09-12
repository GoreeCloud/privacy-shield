import assert from "node:assert/strict";
import test from "node:test";

import {
  EVERKEEP_AUTHORITY,
  EVERKEEP_SOURCE_REVISION,
  EVERKEEP_STATUS_SCHEMA,
  assessEverkeepLifecycleEvidence,
  createEverkeepLifecycleObligation,
} from "../src/everkeep-lifecycle.mjs";

function obligation(overrides = {}) {
  return createEverkeepLifecycleObligation({
    obligation_id: "obl-timezone",
    subject_id: "subject-1",
    application_id: "goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    purpose: "user-requested-deletion",
    privacy_basis: "consent-revoked",
    execution_authority: "GoreeCloud/goreecloud-drive",
    issued_at: "2026-09-12T06:00:00Z",
    parameters: {complete_by: "2026-09-13T06:00:00Z"},
    evidence_references: [],
    ...overrides,
  });
}

function evidence(overrides = {}) {
  return {
    obligation_id: "obl-timezone",
    producer: EVERKEEP_AUTHORITY,
    producer_revision: EVERKEEP_SOURCE_REVISION,
    status_schema: EVERKEEP_STATUS_SCHEMA,
    execution_authority: "GoreeCloud/goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    state: "satisfied",
    observed_at: "2026-09-12T06:30:00Z",
    fresh_until: "2026-09-12T08:30:00Z",
    execution_verified: true,
    evidence_references: ["evidence+sha256:def:target-readback"],
    reason: "target-state-verified",
    ...overrides,
  };
}

test("obligation timestamps require an explicit timezone", () => {
  assert.throws(
    () => obligation({issued_at: "2026-09-12T06:00:00"}),
    /explicit timezone/,
  );
  assert.throws(
    () => obligation({parameters: {complete_by: "2026-09-13T06:00:00"}}),
    /explicit timezone/,
  );
});

test("Everkeep evidence timestamps require an explicit timezone", () => {
  assert.throws(
    () => assessEverkeepLifecycleEvidence(obligation(), evidence({observed_at: "2026-09-12T06:30:00"}), {now: "2026-09-12T07:00:00Z"}),
    /explicit timezone/,
  );
  assert.throws(
    () => assessEverkeepLifecycleEvidence(obligation(), evidence({fresh_until: "2026-09-12T08:30:00"}), {now: "2026-09-12T07:00:00Z"}),
    /explicit timezone/,
  );
});

test("string evaluation time also requires an explicit timezone", () => {
  assert.throws(
    () => assessEverkeepLifecycleEvidence(obligation(), evidence(), {now: "2026-09-12T07:00:00"}),
    /explicit timezone/,
  );
});
