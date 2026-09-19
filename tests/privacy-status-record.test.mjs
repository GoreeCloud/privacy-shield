import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  evaluatePrivacyShieldStatusRecord,
  validatePrivacyShieldStatusRecord,
} from "../src/privacy-status-record.mjs";

const vectors = JSON.parse(
  await readFile(
    new URL("../contracts/privacy-shield.status.conformance-vectors.json", import.meta.url),
    "utf8",
  ),
);

test("status conformance vectors exercise the canonical consumer boundary", () => {
  assert.equal(vectors.contract_version, 1);
  assert.equal(vectors.status_schema_version, 1);
  assert.ok(Array.isArray(vectors.vectors));
  assert.ok(vectors.vectors.length >= 6);

  for (const vector of vectors.vectors) {
    if (vector.expected_valid) {
      assert.equal(validatePrivacyShieldStatusRecord(vector.record), vector.record, vector.name);
      const evaluation = evaluatePrivacyShieldStatusRecord(vector.record, {
        observedAt: vector.observed_at,
      });
      assert.equal(evaluation.valid, true, vector.name);
      assert.equal(evaluation.expired, vector.expected_expired, vector.name);
    } else {
      assert.throws(
        () => validatePrivacyShieldStatusRecord(vector.record),
        TypeError,
        vector.name,
      );
    }
  }
});

test("status validation rejects silent normalization and unknown properties", () => {
  const base = structuredClone(vectors.vectors[0].record);

  const spacedAuthority = structuredClone(base);
  spacedAuthority.producer.runtime_authority = " GoreeCloud/goreecloud-browser ";
  assert.throws(() => validatePrivacyShieldStatusRecord(spacedAuthority), /runtime_authority/);

  const extra = structuredClone(base);
  extra.privacy.debug_payload = false;
  assert.throws(() => validatePrivacyShieldStatusRecord(extra), /unsupported property/);

  const invertedLifetime = structuredClone(base);
  invertedLifetime.valid_until = invertedLifetime.generated_at;
  assert.throws(() => validatePrivacyShieldStatusRecord(invertedLifetime), /later than generated_at/);
});

test("status evaluation identifies future-generated records without rewriting them", () => {
  const record = structuredClone(vectors.vectors[0].record);
  const evaluation = evaluatePrivacyShieldStatusRecord(record, {
    observedAt: "2026-09-19T20:59:59Z",
  });
  assert.equal(evaluation.generated_in_future, true);
  assert.equal(record.generated_at, "2026-09-19T21:00:00Z");
});
