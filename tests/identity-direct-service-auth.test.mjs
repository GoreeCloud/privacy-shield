import assert from "node:assert/strict";
import test from "node:test";

import {
  IDENTITY_DIRECT_SERVICE_AUDIENCE,
  IDENTITY_DIRECT_SERVICE_CONSUME_SCOPE,
  IDENTITY_DIRECT_SERVICE_SEARCH_ID,
  IDENTITY_DIRECT_SERVICE_VERIFY_SCOPE,
  createIdentityAuthenticatedCapabilityVerificationHTTPHandler,
} from "../src/identity-direct-service-auth.mjs";

function verificationPayload({ consume = true, consumerId = "goreecloud-search" } = {}) {
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
    consume,
  };
}

function requestFor(payload, authorization = "Bearer identity-direct-token") {
  return new Request("https://privacy.goreecloud.test/v1/capabilities/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization === null ? {} : { Authorization: authorization }),
    },
    body: JSON.stringify(payload),
  });
}

function successfulVerificationService(onVerify = () => {}) {
  return {
    verify(payload) {
      onVerify(payload);
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
  };
}

function identityVerifier({
  serviceId = IDENTITY_DIRECT_SERVICE_SEARCH_ID,
  audience = IDENTITY_DIRECT_SERVICE_AUDIENCE,
  scopes,
  onVerify = () => {},
} = {}) {
  return {
    async verifyDirectServiceToken(token, request) {
      onVerify(token, request);
      return {
        service_id: serviceId,
        audience,
        scopes: scopes ?? request.requiredScopes,
      };
    },
  };
}

test("Identity-authenticated capability consume requires exact consume scope", async () => {
  let identityCall;
  let observedPayload;
  const handler = createIdentityAuthenticatedCapabilityVerificationHTTPHandler({
    verificationService: successfulVerificationService((payload) => {
      observedPayload = payload;
    }),
    identityTokenVerifier: identityVerifier({
      onVerify(token, request) {
        identityCall = { token, request };
      },
    }),
  });

  const response = await handler(requestFor(verificationPayload({ consume: true })));
  assert.equal(response.status, 200);
  assert.deepEqual(identityCall, {
    token: "identity-direct-token",
    request: {
      audience: IDENTITY_DIRECT_SERVICE_AUDIENCE,
      requiredScopes: [IDENTITY_DIRECT_SERVICE_CONSUME_SCOPE],
    },
  });
  assert.equal(observedPayload.consumer_id, IDENTITY_DIRECT_SERVICE_SEARCH_ID);
  assert.equal(observedPayload.expected.requester_id, "goreecloud-browser");
});

test("verify-only capability request requires verify scope instead of consume scope", async () => {
  let requiredScopes;
  const handler = createIdentityAuthenticatedCapabilityVerificationHTTPHandler({
    verificationService: successfulVerificationService(),
    identityTokenVerifier: identityVerifier({
      onVerify(_token, request) {
        requiredScopes = request.requiredScopes;
      },
    }),
  });

  const response = await handler(requestFor(verificationPayload({ consume: false })));
  assert.equal(response.status, 200);
  assert.deepEqual(requiredScopes, [IDENTITY_DIRECT_SERVICE_VERIFY_SCOPE]);
});

test("missing or malformed bearer credential fails before capability authority", async () => {
  let identityCalls = 0;
  let capabilityCalls = 0;
  const handler = createIdentityAuthenticatedCapabilityVerificationHTTPHandler({
    verificationService: successfulVerificationService(() => {
      capabilityCalls += 1;
    }),
    identityTokenVerifier: identityVerifier({
      onVerify() {
        identityCalls += 1;
      },
    }),
  });

  for (const authorization of [null, "identity-direct-token", "Bearer two tokens", "Basic abc"] ) {
    const response = await handler(requestFor(verificationPayload(), authorization));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(identityCalls, 0);
  assert.equal(capabilityCalls, 0);
});

test("Identity verifier failure stays opaque and never reaches capability authority", async () => {
  let capabilityCalls = 0;
  const secretDetail = "IDENTITY_SIGNING_KEY_PRIVATE_DETAIL";
  const handler = createIdentityAuthenticatedCapabilityVerificationHTTPHandler({
    verificationService: successfulVerificationService(() => {
      capabilityCalls += 1;
    }),
    identityTokenVerifier: {
      async verifyDirectServiceToken() {
        throw new Error(secretDetail);
      },
    },
  });

  const response = await handler(requestFor(verificationPayload()));
  assert.equal(response.status, 401);
  const body = await response.text();
  assert.equal(body.includes(secretDetail), false);
  assert.deepEqual(JSON.parse(body), { error: "service_authentication_denied" });
  assert.equal(capabilityCalls, 0);
});

test("verified Identity metadata must exactly bind Search and Privacy Shield", async () => {
  const cases = [
    { name: "wrong service", serviceId: "goreecloud-browser", audience: IDENTITY_DIRECT_SERVICE_AUDIENCE },
    { name: "service whitespace", serviceId: " goreecloud-search ", audience: IDENTITY_DIRECT_SERVICE_AUDIENCE },
    { name: "wrong audience", serviceId: IDENTITY_DIRECT_SERVICE_SEARCH_ID, audience: "goreecloud-mesh" },
    { name: "audience whitespace", serviceId: IDENTITY_DIRECT_SERVICE_SEARCH_ID, audience: " goreecloud-privacy-shield " },
  ];

  for (const item of cases) {
    await test(item.name, async () => {
      let capabilityCalls = 0;
      const handler = createIdentityAuthenticatedCapabilityVerificationHTTPHandler({
        verificationService: successfulVerificationService(() => {
          capabilityCalls += 1;
        }),
        identityTokenVerifier: identityVerifier({
          serviceId: item.serviceId,
          audience: item.audience,
          scopes: [IDENTITY_DIRECT_SERVICE_CONSUME_SCOPE],
        }),
      });
      const response = await handler(requestFor(verificationPayload()));
      assert.equal(response.status, 401);
      assert.equal(capabilityCalls, 0);
    });
  }
});

test("verified Identity metadata must contain the operation-required scope", async () => {
  let capabilityCalls = 0;
  const handler = createIdentityAuthenticatedCapabilityVerificationHTTPHandler({
    verificationService: successfulVerificationService(() => {
      capabilityCalls += 1;
    }),
    identityTokenVerifier: identityVerifier({
      scopes: [IDENTITY_DIRECT_SERVICE_VERIFY_SCOPE],
    }),
  });

  const response = await handler(requestFor(verificationPayload({ consume: true })));
  assert.equal(response.status, 401);
  assert.equal(capabilityCalls, 0);
});

test("request-body consumer identity still cannot override verified service identity", async () => {
  let capabilityCalls = 0;
  const handler = createIdentityAuthenticatedCapabilityVerificationHTTPHandler({
    verificationService: successfulVerificationService(() => {
      capabilityCalls += 1;
    }),
    identityTokenVerifier: identityVerifier(),
  });

  const response = await handler(
    requestFor(verificationPayload({ consumerId: "goreecloud-index" })),
  );
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "consumer_identity_mismatch" });
  assert.equal(capabilityCalls, 0);
});

test("service identity never replaces independent requester identity", async () => {
  let observed;
  const handler = createIdentityAuthenticatedCapabilityVerificationHTTPHandler({
    verificationService: successfulVerificationService((payload) => {
      observed = payload;
    }),
    identityTokenVerifier: identityVerifier(),
  });

  const response = await handler(requestFor(verificationPayload()));
  assert.equal(response.status, 200);
  assert.equal(observed.consumer_id, "goreecloud-search");
  assert.equal(observed.expected.requester_id, "goreecloud-browser");
  assert.notEqual(observed.consumer_id, observed.expected.requester_id);
});
