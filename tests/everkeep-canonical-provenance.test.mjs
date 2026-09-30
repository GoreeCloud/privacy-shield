import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EVERKEEP_AUTHORITY,
  EVERKEEP_SOURCE_REVISION,
  EVERKEEP_STATUS_SCHEMA,
  PRIVACY_AUTHORITY,
} from "../src/everkeep-lifecycle.mjs";

const obligationSchema = JSON.parse(
  readFileSync(new URL("../contracts/privacy-shield.everkeep-lifecycle-obligation.v1.schema.json", import.meta.url), "utf8"),
);

test("Everkeep lifecycle handoff uses canonical repository identities and current compatible source", () => {
  assert.equal(PRIVACY_AUTHORITY, "GoreeCloud/privacy-shield");
  assert.equal(EVERKEEP_AUTHORITY, "GoreeCloud/everkeep");
  assert.equal(EVERKEEP_SOURCE_REVISION, "f69e369e4d8627280fac728b7f7bcb02c43b5edd");
  assert.equal(EVERKEEP_STATUS_SCHEMA, "contracts/continuity.status.schema.json");

  assert.equal(obligationSchema.properties.privacy_authority.const, PRIVACY_AUTHORITY);
  assert.equal(obligationSchema.properties.execution_authority.not.const, PRIVACY_AUTHORITY);
  assert.equal(obligationSchema.properties.everkeep_authority.const, EVERKEEP_AUTHORITY);
  assert.equal(obligationSchema.properties.everkeep_source_revision.const, EVERKEEP_SOURCE_REVISION);
  assert.equal(obligationSchema.properties.everkeep_status_schema.const, EVERKEEP_STATUS_SCHEMA);
});

test("canonical Everkeep re-pin preserves the non-authorizing lifecycle boundary", () => {
  assert.equal(obligationSchema.properties.authorization_effect.const, false);
  assert.equal(obligationSchema.properties.execution_authorization.const, false);
  assert.equal(obligationSchema.properties.authority_transfer.const, false);
});
