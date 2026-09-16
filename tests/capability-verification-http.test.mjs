import assert from "node:assert/strict";
import test from "node:test";

import {
  CAPABILITY_VERIFICATION_HTTP_MAX_REQUEST_BYTES,
  createCapabilityVerificationHTTPHandler,
} from "../src/capability-verification-http.mjs";

function verificationPayload(consumerId = "goreecloud-search") {
  return {
    contract_version: 1,
    consumer_id: consumerId,
    capability_reference: "psc_test",
    expected: {
      requester_id: "goreecloud-browser",
      resource_id: "goreecloud.search.query",
      purpose: "internet_search",
      operation: "search.query",
      processing_zone: "private_goreecloud",
      destination: "https://search.goreecloud.com",
      retention_mode: "none",
    },
    consume: true,
  };
}

function requestFor(payload, headers = {}) {
  return new Request("https://privacy.goreecloud.test/v1/capabilities/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

test("HTTP verification requires independently authenticated consumer identity", async () => {
  let calls = 0;
  const handler = createCapabilityVerificationHTTPHandler({
    verificationService: {
      verify() {
        calls += 1;
        return {};
      },
    },
  });

  const response = await handler(requestFor(verificationPayload()));
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("body consumer cannot override authenticated transport identity", async () => {
  let calls = 0;
  const handler = createCapabilityVerificationHTTPHandler({
    verificationService: {
      verify() {
        calls += 1;
        return {};
      },
    },
  });

  const response = await handler(
    requestFor(verificationPayload("goreecloud-index")),
    { authenticatedConsumerId: "goreecloud-search" },
  );
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
  assert.deepEqual(await response.json(), { error: "consumer_identity_mismatch" });
});

test("consumer identities require exact strings without whitespace normalization", async () => {
  let calls = 0;
  const handler = createCapabilityVerificationHTTPHandler({
    verificationService: {
      verify() {
        calls += 1;
        return {};
      },
    },
  });

  const paddedTransport = await handler(
    requestFor(verificationPayload()),
    { authenticatedConsumerId: " goreecloud-search " },
  );
  assert.equal(paddedTransport.status, 401);
  assert.equal(calls, 0);

  const paddedBody = await handler(
    requestFor(verificationPayload("goreecloud-search ")),
    { authenticatedConsumerId: "goreecloud-search" },
  );
  assert.equal(paddedBody.status, 403);
  assert.equal(calls, 0);
  assert.deepEqual(await paddedBody.json(), { error: "consumer_identity_mismatch" });
});

test("authenticated consumer identity is injected into verification service", async () => {
  let observed;
  const handler = createCapabilityVerificationHTTPHandler({
    verificationService: {
      verify(payload) {
        observed = payload;
        return {
          contract_version: 1,
          authorized: true,
          capability_reference: payload.capability_reference,
          constraints: {
            processing_zone: payload.expected.processing_zone,
            destination: payload.expected.destination,
            retention_mode: payload.expected.retention_mode,
          },
        };
      },
    },
  });

  const response = await handler(
    requestFor(verificationPayload()),
    { authenticatedConsumerId: "goreecloud-search" },
  );
  assert.equal(response.status, 200);
  assert.equal(observed.consumer_id, "goreecloud-search");
  assert.equal(observed.consume, true);
  assert.deepEqual(await response.json(), {
    contract_version: 1,
    authorized: true,
    capability_reference: "psc_test",
    constraints: {
      processing_zone: "private_goreecloud",
      destination: "https://search.goreecloud.com",
      retention_mode: "none",
    },
  });
});

test("HTTP verification rejects oversized request bodies", async () => {
  let calls = 0;
  const handler = createCapabilityVerificationHTTPHandler({
    verificationService: {
      verify() {
        calls += 1;
        return {};
      },
    },
  });
  const oversized = "x".repeat(CAPABILITY_VERIFICATION_HTTP_MAX_REQUEST_BYTES + 1);

  const response = await handler(
    requestFor(oversized),
    { authenticatedConsumerId: "goreecloud-search" },
  );
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test("HTTP verification keeps internal authority failures opaque", async () => {
  const internalDetail = "CAPABILITY_TOKEN_SIGNATURE_PRIVATE_DETAIL";
  const handler = createCapabilityVerificationHTTPHandler({
    verificationService: {
      verify() {
        throw new Error(internalDetail);
      },
    },
  });

  const response = await handler(
    requestFor(verificationPayload()),
    { authenticatedConsumerId: "goreecloud-search" },
  );
  assert.equal(response.status, 403);
  const body = await response.text();
  assert.equal(body.includes(internalDetail), false);
  assert.deepEqual(JSON.parse(body), { error: "capability_verification_denied" });
});

test("HTTP verification requires POST JSON", async () => {
  const handler = createCapabilityVerificationHTTPHandler({
    verificationService: {
      verify() {
        throw new Error("must not be called");
      },
    },
  });

  const getResponse = await handler(
    new Request("https://privacy.goreecloud.test/v1/capabilities/verify"),
    { authenticatedConsumerId: "goreecloud-search" },
  );
  assert.equal(getResponse.status, 405);
  assert.equal(getResponse.headers.get("allow"), "POST");

  const wrongMediaResponse = await handler(
    new Request("https://privacy.goreecloud.test/v1/capabilities/verify", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}",
    }),
    { authenticatedConsumerId: "goreecloud-search" },
  );
  assert.equal(wrongMediaResponse.status, 415);
});
