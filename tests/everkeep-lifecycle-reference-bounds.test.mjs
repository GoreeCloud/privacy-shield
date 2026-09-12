import assert from "node:assert/strict";
import test from "node:test";

import {
  EVERKEEP_AUTHORITY,
  EVERKEEP_SOURCE_REVISION,
  EVERKEEP_STATUS_SCHEMA,
  createEverkeepLifecycleObligation,
  assessEverkeepLifecycleEvidence,
} from "../src/everkeep-lifecycle.mjs";

const issuedAt = "2026-09-12T06:00:00.000Z";
const now = new Date("2026-09-12T07:00:00.000Z");
const maxEvidenceAgeMs = 2 * 60 * 60 * 1000;
const assessment = {now, maxEvidenceAgeMs};

function baseObligation(evidenceReferences = []) {
  return createEverkeepLifecycleObligation({
    obligation_id: "obl-bounded-refs",
    subject_id: "subject-1",
    application_id: "goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    purpose: "user-requested-deletion",
    privacy_basis: "consent-revoked",
    execution_authority: "GoreeCloud/goreecloud-drive",
    issued_at: issuedAt,
    parameters: {complete_by: "2026-09-13T06:00:00.000Z"},
    evidence_references: evidenceReferences,
  });
}

function baseEvidence(evidenceReferences) {
  return {
    obligation_id: "obl-bounded-refs",
    producer: EVERKEEP_AUTHORITY,
    producer_revision: EVERKEEP_SOURCE_REVISION,
    status_schema: EVERKEEP_STATUS_SCHEMA,
    execution_authority: "GoreeCloud/goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    state: "satisfied",
    observed_at: "2026-09-12T06:30:00.000Z",
    fresh_until: "2026-09-12T08:30:00.000Z",
    execution_verified: true,
    evidence_references: evidenceReferences,
    reason: "target-state-verified",
  };
}

function references(count) {
  return Array.from({length: count}, (_, index) => `evidence+sha256:ref-${index}`);
}

test("lifecycle obligation rejects a manifest beyond the schema ceiling", () => {
  assert.throws(
    () => baseObligation(references(51)),
    /evidence_references is invalid/,
  );
});

test("lifecycle evidence rejects a manifest beyond the assessment schema ceiling", () => {
  const obligation = baseObligation(["evidence+sha256:privacy-decision"]);
  assert.throws(
    () => assessEverkeepLifecycleEvidence(obligation, baseEvidence(references(51)), assessment),
    /evidence\.evidence_references is invalid/,
  );
});

test("the published 50-reference schema ceiling remains accepted", () => {
  const obligation = baseObligation(references(50));
  const result = assessEverkeepLifecycleEvidence(obligation, baseEvidence(references(50)), assessment);
  assert.equal(result.status, "satisfied");
  assert.equal(result.evidence_references.length, 50);
});
