import assert from "node:assert/strict";
import test from "node:test";

import { PrivacyCapabilityVerificationService } from "../src/capability-verification-service.mjs";

const expectedSearchClaims = Object.freeze({
  requester_id: "goreecloud-browser",
  resource_id: "goreecloud.search.query",
  purpose: "internet_search",
  operation: "search.query",
  processing_zone: "private_goreecloud",
  destination: "https://search.goreecloud.com",
  retention_mode: "none",
});

function fixture() {
  const calls = [];
  const enforcementPoint = {
    enforceReference(reference, expected) {
      calls.push({ mode: "verify", reference, expected });
      return {
        authorized: true,
        claims: { jti: reference, secret_internal_claim: "not-for-consumers" },
        constraints: {
          processing_zone: expected.processing_zone,
          destination: expected.destination,
          retention_mode: expected.retention_mode,
        },
      };
    },
    enforceReferenceOnce(reference, expected) {
      calls.push({ mode: "consume", reference, expected });
      return {
        authorized: true,
        claims: { jti: reference, secret_internal_claim: "not-for-consumers" },
        constraints: {
          processing_zone: expected.processing_zone,
          destination: expected.destination,
          retention_mode: expected.retention_mode,
        },
      };
    },
  };
  const service = new PrivacyCapabilityVerificationService({
    enforcementPoint,
    allowedConsumers: ["goreecloud-search"],
  });
  return { service, calls };
}

test("verification service validates an opaque reference without exposing authority token state", () => {
  const { service, calls } = fixture();
  const result = service.verify({
    consumer_id: "goreecloud-search",
    capability_reference: "psc_search-operation",
    expected: expectedSearchClaims,
  });

  assert.equal(result.authorized, true);
  assert.equal(result.capability_reference, "psc_search-operation");
  assert.deepEqual(result.constraints, {
    processing_zone: "private_goreecloud",
    destination: "https://search.goreecloud.com",
    retention_mode: "none",
  });
  assert.equal("claims" in result, false);
  assert.equal("token" in result, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].mode, "verify");
  assert.deepEqual(calls[0].expected, expectedSearchClaims);
});

test("verification service rejects consumers outside the authenticated allowlist", () => {
  const { service, calls } = fixture();
  assert.throws(
    () => service.verify({
      consumer_id: "untrusted-service",
      capability_reference: "psc_search-operation",
      expected: expectedSearchClaims,
    }),
    /CAPABILITY_VERIFICATION_CONSUMER_NOT_ALLOWED/,
  );
  assert.equal(calls.length, 0);
});

test("verification service requires the complete operation-bound claim set", () => {
  const { service, calls } = fixture();
  const { destination: _destination, ...incomplete } = expectedSearchClaims;
  assert.throws(
    () => service.verify({
      consumer_id: "goreecloud-search",
      capability_reference: "psc_search-operation",
      expected: incomplete,
    }),
    /Capability expected claim destination is required/,
  );
  assert.equal(calls.length, 0);
});

test("verification service can consume a single-use reference through the authority boundary", () => {
  const { service, calls } = fixture();
  service.verify({
    consumer_id: "goreecloud-search",
    capability_reference: "psc_single-use-search",
    expected: expectedSearchClaims,
    consume: true,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].mode, "consume");
});

test("verification service rejects non-Privacy-Shield capability identifiers", () => {
  const { service, calls } = fixture();
  assert.throws(
    () => service.verify({
      consumer_id: "goreecloud-search",
      capability_reference: "other_search-operation",
      expected: expectedSearchClaims,
    }),
    /INVALID_CAPABILITY_ID/,
  );
  assert.equal(calls.length, 0);
});
