import assert from "node:assert/strict";
import test from "node:test";

import {
  CAPABILITY_VERIFICATION_CONTRACT_VERSION,
  PrivacyCapabilityVerificationService,
} from "../src/capability-verification-service.mjs";

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

function verificationRequest(overrides = {}) {
  return {
    contract_version: CAPABILITY_VERIFICATION_CONTRACT_VERSION,
    consumer_id: "goreecloud-search",
    capability_reference: "psc_search-operation",
    expected: expectedSearchClaims,
    ...overrides,
  };
}

test("verification service validates a versioned opaque reference without exposing authority token state", () => {
  const { service, calls } = fixture();
  const result = service.verify(verificationRequest());

  assert.equal(result.contract_version, CAPABILITY_VERIFICATION_CONTRACT_VERSION);
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

test("verification service rejects unsupported verification contract versions before authority work", () => {
  const { service, calls } = fixture();
  assert.throws(
    () => service.verify(verificationRequest({ contract_version: 2 })),
    /CAPABILITY_VERIFICATION_CONTRACT_VERSION_UNSUPPORTED/,
  );
  assert.equal(calls.length, 0);
});

test("verification service rejects consumers outside the authenticated allowlist", () => {
  const { service, calls } = fixture();
  assert.throws(
    () => service.verify(verificationRequest({ consumer_id: "untrusted-service" })),
    /CAPABILITY_VERIFICATION_CONSUMER_NOT_ALLOWED/,
  );
  assert.equal(calls.length, 0);
});

test("verification service requires the complete operation-bound claim set", () => {
  const { service, calls } = fixture();
  const { destination: _destination, ...incomplete } = expectedSearchClaims;
  assert.throws(
    () => service.verify(verificationRequest({ expected: incomplete })),
    /Capability expected claim destination is required/,
  );
  assert.equal(calls.length, 0);
});

test("verification service can consume a single-use reference through the authority boundary", () => {
  const { service, calls } = fixture();
  service.verify(verificationRequest({
    capability_reference: "psc_single-use-search",
    consume: true,
  }));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].mode, "consume");
});

test("verification service rejects non-Privacy-Shield capability identifiers", () => {
  const { service, calls } = fixture();
  assert.throws(
    () => service.verify(verificationRequest({
      capability_reference: "other_search-operation",
    })),
    /INVALID_CAPABILITY_ID/,
  );
  assert.equal(calls.length, 0);
});
