import assert from "node:assert/strict";
import test from "node:test";

import {
  EVERKEEP_AUTHORITY,
  EVERKEEP_SOURCE_REVISION,
  createEverkeepLifecycleObligation,
  assessEverkeepLifecycleEvidence,
} from "../src/everkeep-lifecycle.mjs";

const issued = "2026-09-12T06:00:00.000Z";
const now = new Date("2026-09-12T07:00:00.000Z");

function obligation(overrides = {}) {
  return createEverkeepLifecycleObligation({
    obligation_id: "obl-1",
    subject_id: "subject-1",
    application_id: "goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    purpose: "user-requested-deletion",
    privacy_basis: "consent-revoked",
    execution_authority: "GoreeCloud/goreecloud-drive",
    issued_at: issued,
    parameters: {complete_by: "2026-09-13T06:00:00.000Z"},
    evidence_references: ["evidence+sha256:abc:privacy-decision"],
    ...overrides,
  });
}

function evidence(overrides = {}) {
  return {
    obligation_id: "obl-1",
    producer: EVERKEEP_AUTHORITY,
    execution_authority: "GoreeCloud/goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    state: "satisfied",
    observed_at: "2026-09-12T06:30:00.000Z",
    fresh_until: "2026-09-12T08:30:00.000Z",
    execution_verified: true,
    evidence_references: ["evidence+sha256:def:target-readback"],
    reason: "target-state-verified",
    ...overrides,
  };
}

test("builds a non-authorizing lifecycle obligation pinned to current Everkeep source", () => {
  const record = obligation();
  assert.equal(record.everkeep_authority, EVERKEEP_AUTHORITY);
  assert.equal(record.everkeep_source_revision, EVERKEEP_SOURCE_REVISION);
  assert.equal(record.authorization_effect, false);
  assert.equal(record.execution_authorization, false);
  assert.equal(record.authority_transfer, false);
});

test("Privacy Shield cannot name itself as lifecycle executor", () => {
  assert.throws(
    () => obligation({execution_authority: "GoreeCloud/goreecloud-privacy-shield"}),
    /cannot be lifecycle execution authority/,
  );
});

test("operation-specific required lifecycle parameters fail closed", () => {
  assert.throws(() => obligation({parameters: {}}), /delete requires complete_by/);
  assert.throws(
    () => obligation({operation: "export", parameters: {complete_by: "2026-09-13T06:00:00.000Z"}}),
    /export requires complete_by and export_format/,
  );
  assert.throws(() => obligation({operation: "recovery", parameters: {}}), /recovery requires recovery_scope/);
});

test("verified current Everkeep handoff evidence can satisfy the obligation", () => {
  const result = assessEverkeepLifecycleEvidence(obligation(), evidence(), {now});
  assert.equal(result.status, "satisfied");
  assert.equal(result.execution_verified, true);
  assert.equal(result.authorization_effect, false);
  assert.equal(result.authority_transfer, false);
});

test("assessment revalidates the complete obligation instead of trusting schema label alone", () => {
  const mutations = [
    (record) => { record.execution_authorization = true; },
    (record) => { record.authority_transfer = true; },
    (record) => { record.privacy_authority = "GoreeCloud/other"; },
    (record) => { record.everkeep_source_revision = "0".repeat(40); },
    (record) => { record.parameters.complete_by = "2026-09-12T05:59:00.000Z"; },
    (record) => { record.hidden_execution_override = true; },
  ];

  for (const mutate of mutations) {
    const record = structuredClone(obligation());
    mutate(record);
    assert.throws(() => assessEverkeepLifecycleEvidence(record, evidence(), {now}));
  }
});

test("assessment rejects noncanonical obligation issue timestamps", () => {
  const record = obligation();
  record.issued_at = "2026-09-12T01:00:00-05:00";
  assert.throws(
    () => assessEverkeepLifecycleEvidence(record, evidence(), {now}),
    /canonical UTC/,
  );
});

test("execution verification must be an explicit boolean", () => {
  assert.throws(
    () => assessEverkeepLifecycleEvidence(obligation(), evidence({execution_verified: "true"}), {now}),
    /must be boolean/,
  );
});

test("Everkeep acknowledgement alone cannot become execution success", () => {
  const result = assessEverkeepLifecycleEvidence(
    obligation(),
    evidence({state: "satisfied", execution_verified: false}),
    {now},
  );
  assert.equal(result.status, "unknown");
  assert.equal(result.reason, "satisfaction_not_currently_verified");
  assert.equal(result.execution_verified, false);
});

test("stale satisfaction evidence fails closed", () => {
  const result = assessEverkeepLifecycleEvidence(
    obligation(),
    evidence({fresh_until: "2026-09-12T06:45:00.000Z"}),
    {now},
  );
  assert.equal(result.status, "unknown");
  assert.equal(result.execution_verified, false);
});

test("missing or pending evidence becomes overdue after the lifecycle deadline", () => {
  const late = new Date("2026-09-14T00:00:00.000Z");
  assert.equal(assessEverkeepLifecycleEvidence(obligation(), null, {now: late}).status, "overdue");
  assert.equal(
    assessEverkeepLifecycleEvidence(obligation(), evidence({state: "pending", execution_verified: false}), {now: late}).status,
    "overdue",
  );
});

test("scope, operation, producer, and execution authority are exact-bound", () => {
  assert.throws(() => assessEverkeepLifecycleEvidence(obligation(), evidence({producer: "other"}), {now}), /producer/);
  assert.throws(() => assessEverkeepLifecycleEvidence(obligation(), evidence({resource_scope: "drive:file:other"}), {now}), /scope/);
  assert.throws(() => assessEverkeepLifecycleEvidence(obligation(), evidence({operation: "retain"}), {now}), /operation/);
  assert.throws(() => assessEverkeepLifecycleEvidence(obligation(), evidence({execution_authority: "GoreeCloud/other"}), {now}), /authority/);
});

test("future-dated evidence and unsupported fields are rejected", () => {
  assert.throws(
    () => assessEverkeepLifecycleEvidence(obligation(), evidence({observed_at: "2026-09-13T00:00:00.000Z"}), {now}),
    /future-dated/,
  );
  assert.throws(
    () => assessEverkeepLifecycleEvidence(obligation(), {...evidence(), raw_payload: "forbidden"}, {now}),
    /unsupported/,
  );
});
