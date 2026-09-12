import assert from "node:assert/strict";
import test from "node:test";

import {
  EVERKEEP_AUTHORITY,
  EVERKEEP_SOURCE_REVISION,
  EVERKEEP_STATUS_SCHEMA,
  createEverkeepLifecycleObligation,
  assessEverkeepLifecycleEvidence,
} from "../src/everkeep-lifecycle.mjs";

function obligation() {
  return createEverkeepLifecycleObligation({
    obligation_id: "obl-anti-replay-1",
    subject_id: "subject-1",
    application_id: "goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    purpose: "user-requested-deletion",
    privacy_basis: "consent-revoked",
    execution_authority: "GoreeCloud/goreecloud-drive",
    issued_at: "2026-09-12T06:00:00.000Z",
    parameters: {complete_by: "2026-09-13T06:00:00.000Z"},
    evidence_references: [],
  });
}

function evidence(observed_at) {
  return {
    obligation_id: "obl-anti-replay-1",
    producer: EVERKEEP_AUTHORITY,
    producer_revision: EVERKEEP_SOURCE_REVISION,
    status_schema: EVERKEEP_STATUS_SCHEMA,
    execution_authority: "GoreeCloud/goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    state: "satisfied",
    observed_at,
    fresh_until: "2026-09-12T08:30:00.000Z",
    execution_verified: true,
    evidence_references: ["evidence+sha256:def:target-readback"],
    reason: "target-state-verified",
  };
}

const now = new Date("2026-09-12T07:00:00.000Z");

test("Everkeep evidence observed before the obligation cannot be replayed into satisfaction", () => {
  assert.throws(
    () => assessEverkeepLifecycleEvidence(
      obligation(),
      evidence("2026-09-12T05:59:59.999Z"),
      {now},
    ),
    /predate the lifecycle obligation/,
  );
});

test("evidence observed at obligation issuance remains eligible for normal freshness checks", () => {
  const result = assessEverkeepLifecycleEvidence(
    obligation(),
    evidence("2026-09-12T06:00:00.000Z"),
    {now},
  );
  assert.equal(result.status, "satisfied");
  assert.equal(result.execution_verified, true);
  assert.equal(result.authorization_effect, false);
  assert.equal(result.execution_authorization, false);
  assert.equal(result.authority_transfer, false);
});
