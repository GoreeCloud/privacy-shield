import assert from "node:assert/strict";
import test from "node:test";

import {
  EVERKEEP_AUTHORITY,
  EVERKEEP_SOURCE_REVISION,
  EVERKEEP_STATUS_SCHEMA,
  assessEverkeepLifecycleEvidence,
  createEverkeepLifecycleObligation,
} from "../src/everkeep-lifecycle.mjs";

const issuedAt = "2026-09-12T06:00:00.000Z";
const horizon = "2026-09-12T08:00:00.000Z";
const maxEvidenceAgeMs = 2 * 60 * 60 * 1000;

function obligation(operation) {
  const parameters = operation === "retain"
    ? {retention_until: horizon}
    : {preservation_until: horizon};
  return createEverkeepLifecycleObligation({
    obligation_id: `obl-${operation}-horizon`,
    subject_id: "subject-1",
    application_id: "goreecloud-drive",
    resource_scope: "drive:file:opaque-horizon",
    operation,
    purpose: "privacy-lifecycle-duty",
    privacy_basis: "user-lifecycle-policy",
    execution_authority: "GoreeCloud/goreecloud-drive",
    issued_at: issuedAt,
    parameters,
    evidence_references: [],
  });
}

function evidence(operation, observedAt, freshUntil) {
  return {
    obligation_id: `obl-${operation}-horizon`,
    producer: EVERKEEP_AUTHORITY,
    producer_revision: EVERKEEP_SOURCE_REVISION,
    status_schema: EVERKEEP_STATUS_SCHEMA,
    execution_authority: "GoreeCloud/goreecloud-drive",
    resource_scope: "drive:file:opaque-horizon",
    operation,
    state: "satisfied",
    observed_at: observedAt,
    fresh_until: freshUntil,
    execution_verified: true,
    evidence_references: [`evidence+sha256:${operation}:target-readback`],
    reason: "target-state-verified",
  };
}

for (const operation of ["retain", "preservation"]) {
  test(`${operation} cannot be completed before its required horizon`, () => {
    const result = assessEverkeepLifecycleEvidence(
      obligation(operation),
      evidence(operation, "2026-09-12T06:30:00.000Z", "2026-09-12T08:30:00.000Z"),
      {now: new Date("2026-09-12T07:00:00.000Z"), maxEvidenceAgeMs},
    );
    assert.equal(result.status, "pending");
    assert.equal(result.reason, `${operation}_horizon_incomplete`);
    assert.equal(result.execution_verified, false);
    assert.equal(result.authorization_effect, false);
    assert.equal(result.execution_authorization, false);
    assert.equal(result.authority_transfer, false);
  });

  test(`${operation} requires post-horizon evidence after the horizon passes`, () => {
    const result = assessEverkeepLifecycleEvidence(
      obligation(operation),
      evidence(operation, "2026-09-12T06:30:00.000Z", "2026-09-12T09:00:00.000Z"),
      {now: new Date("2026-09-12T08:15:00.000Z"), maxEvidenceAgeMs},
    );
    assert.equal(result.status, "overdue");
    assert.equal(result.reason, `${operation}_horizon_unverified`);
    assert.equal(result.execution_verified, false);
  });

  test(`${operation} can be satisfied by current verified evidence observed at or after its horizon`, () => {
    const result = assessEverkeepLifecycleEvidence(
      obligation(operation),
      evidence(operation, "2026-09-12T08:05:00.000Z", "2026-09-12T09:00:00.000Z"),
      {now: new Date("2026-09-12T08:15:00.000Z"), maxEvidenceAgeMs},
    );
    assert.equal(result.status, "satisfied");
    assert.equal(result.reason, "target-state-verified");
    assert.equal(result.execution_verified, true);
  });
}
