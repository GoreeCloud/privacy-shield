import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { BROWSER_RUNTIME_ACCEPTANCE_DIMENSIONS } from "../src/browser-runtime-acceptance.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(here, "..", "contracts", "privacy-shield.browser-runtime-acceptance.v1.schema.json"), "utf8"));

test("FR-013 schema remains closed, exact-artifact-oriented, and non-promoting", () => {
  assert.equal(schema.$id, "urn:goreecloud:privacy-shield:browser-runtime-acceptance:v1");
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.browser_repository.const, "GoreeCloud/browser");
  assert.equal(schema.properties.privacy_shield_repository.const, "GoreeCloud/privacy-shield");
  assert.equal(schema.properties.artifact.properties.sha256.pattern, "^[0-9a-f]{64}$");
  assert.equal(schema.properties.artifact.properties.size_bytes.minimum, 1);
  assert.equal(schema.properties.authorization_effect.const, false);
  assert.equal(schema.properties.authority_transfer.const, false);
  assert.equal(schema.properties.production_approved.const, false);
});

test("FR-013 schema and evaluator require the same complete Browser privacy dimension set", () => {
  const schemaDimensions = schema.properties.dimensions.items.properties.id.enum;
  assert.deepEqual(schemaDimensions, [...BROWSER_RUNTIME_ACCEPTANCE_DIMENSIONS]);
  assert.equal(schema.properties.dimensions.minItems, BROWSER_RUNTIME_ACCEPTANCE_DIMENSIONS.length);
  assert.equal(schema.properties.dimensions.maxItems, BROWSER_RUNTIME_ACCEPTANCE_DIMENSIONS.length);
});

test("FR-013 evidence surfaces require content-addressed credential-safe logical references", () => {
  const expected = "^evidence\\\\+sha256:[0-9a-f]{64}:(?:[A-Za-z0-9._-][A-Za-z0-9._/-]*|[A-Za-z0-9._-]+:[A-Za-z0-9._-][A-Za-z0-9._/-]*)$";
  assert.equal(schema.properties.artifact.properties.build_provenance_reference.pattern, expected);
  assert.equal(schema.properties.dimensions.items.properties.evidence_references.items.pattern, expected);
  assert.equal(schema.properties.review.properties.evidence_reference.pattern, expected);
});
