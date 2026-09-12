import assert from "node:assert/strict";
import test from "node:test";

import {
  EVERKEEP_AUTHORITY,
  EVERKEEP_SOURCE_REVISION,
  EVERKEEP_STATUS_SCHEMA,
  createEverkeepLifecycleObligation,
  assessEverkeepLifecycleEvidence,
} from "../src/everkeep-lifecycle.mjs";

const issued = "2026-09-12T08:00:00.000Z";
const now = new Date("2026-09-12T08:30:00.000Z");

function obligation(overrides = {}) {
  return createEverkeepLifecycleObligation({
    obligation_id: "obl-canonical-1",
    subject_id: "subject-1",
    application_id: "goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    purpose: "user-requested-deletion",
    privacy_basis: "consent-revoked",
    execution_authority: "GoreeCloud/goreecloud-drive",
    issued_at: issued,
    parameters: {complete_by: "2026-09-13T08:00:00.000Z"},
    evidence_references: ["evidence+sha256:privacy-decision"],
    ...overrides,
  });
}

function evidence(overrides = {}) {
  return {
    obligation_id: "obl-canonical-1",
    producer: EVERKEEP_AUTHORITY,
    producer_revision: EVERKEEP_SOURCE_REVISION,
    status_schema: EVERKEEP_STATUS_SCHEMA,
    execution_authority: "GoreeCloud/goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    state: "satisfied",
    observed_at: "2026-09-12T08:10:00.000Z",
    fresh_until: "2026-09-12T09:10:00.000Z",
    execution_verified: true,
    evidence_references: ["evidence+sha256:target-readback"],
    reason: "target-state-verified",
    ...overrides,
  };
}

test("obligation text is not silently whitespace-normalized", () => {
  assert.throws(
    () => obligation({execution_authority: " GoreeCloud/goreecloud-drive"}),
    /noncanonical/,
  );
  assert.throws(
    () => obligation({evidence_references: ["evidence+sha256:privacy-decision "]}),
    /noncanonical/,
  );
  assert.throws(
    () => obligation({issued_at: " 2026-09-12T08:00:00.000Z"}),
    /noncanonical/,
  );
});

test("Everkeep evidence rejects whitespace and control-bearing text", () => {
  const record = obligation();
  assert.throws(
    () => assessEverkeepLifecycleEvidence(record, evidence({reason: "target-state-verified\n"}), {now}),
    /noncanonical/,
  );
  assert.throws(
    () => assessEverkeepLifecycleEvidence(record, evidence({evidence_references: [" evidence+sha256:target-readback"]}), {now}),
    /noncanonical/,
  );
  assert.throws(
    () => assessEverkeepLifecycleEvidence(record, evidence({observed_at: " 2026-09-12T08:10:00.000Z"}), {now}),
    /noncanonical/,
  );
});
