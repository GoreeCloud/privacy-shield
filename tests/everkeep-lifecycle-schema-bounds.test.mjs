import assert from "node:assert/strict";
import test from "node:test";

import {createEverkeepLifecycleObligation} from "../src/everkeep-lifecycle.mjs";

const issuedAt = "2026-09-12T06:00:00.000Z";
const completeBy = "2026-09-13T06:00:00.000Z";

function obligation(overrides = {}) {
  return createEverkeepLifecycleObligation({
    obligation_id: "obl-schema-bounds",
    subject_id: "subject-1",
    application_id: "goreecloud-drive",
    resource_scope: "drive:file:opaque-1",
    operation: "delete",
    purpose: "user-requested-deletion",
    privacy_basis: "consent-revoked",
    execution_authority: "GoreeCloud/goreecloud-drive",
    issued_at: issuedAt,
    parameters: {complete_by: completeBy},
    evidence_references: [],
    ...overrides,
  });
}

test("execution authority follows the published 240-character obligation bound", () => {
  const accepted = obligation({execution_authority: "a".repeat(240)});
  assert.equal(accepted.execution_authority.length, 240);
  assert.throws(
    () => obligation({execution_authority: "a".repeat(241)}),
    /noncanonical/,
  );
});

test("export format follows the published 120-character parameter bound", () => {
  const accepted = obligation({
    operation: "export",
    parameters: {complete_by: completeBy, export_format: "a".repeat(120)},
  });
  assert.equal(accepted.parameters.export_format.length, 120);
  assert.throws(
    () => obligation({
      operation: "export",
      parameters: {complete_by: completeBy, export_format: "a".repeat(121)},
    }),
    /noncanonical/,
  );
});
