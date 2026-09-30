import assert from "node:assert/strict";
import test from "node:test";

import {
  PRIVACY_CAPABILITY_VERIFICATION_PATH,
  PRIVACY_RUNTIME_HEALTH_PATH,
  PRIVACY_RUNTIME_READINESS_PATH,
  createPrivacyShieldHTTPHandler,
} from "../src/runtime-http.mjs";
import {
  PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT,
} from "../src/state-provider-acceptance.mjs";
import {
  PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT,
} from "../src/signing-key-acceptance.mjs";

const NOW = Date.parse("2026-09-29T23:00:00Z");

function acceptance(contractId) {
  return {
    contract_id: contractId,
    valid_until: "2026-09-30T01:00:00Z",
  };
}

function productionRuntime(overrides = {}) {
  return {
    production: true,
    state_acceptance: acceptance(PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT),
    signing_acceptance: acceptance(PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT),
    ...overrides,
  };
}

function handler(options = {}) {
  return createPrivacyShieldHTTPHandler({
    runtime: productionRuntime(),
    readinessProbe: async () => true,
    verificationService: {
      verify(payload) {
        return { contract_version: 1, authorized: false, capability_reference: payload.capability_reference };
      },
    },
    now: () => NOW,
    ...options,
  });
}

test("health is liveness-only, privacy-safe, and non-cacheable", async () => {
  const response = await handler()(new Request(`https://privacy.test${PRIVACY_RUNTIME_HEALTH_PATH}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    service: "goreecloud-privacy-shield",
    status: "alive",
    authority: "privacy",
  });
});

test("readiness requires production mode, both fresh accepted providers, and a live runtime probe", async () => {
  const response = await handler()(new Request(`https://privacy.test${PRIVACY_RUNTIME_READINESS_PATH}`));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: "goreecloud-privacy-shield",
    status: "ready",
    dependencies: {
      production_mode: "accepted",
      state_provider: "accepted",
      signing_provider: "accepted",
      runtime_probe: "passed",
    },
  });
});

test("development runtime cannot report ready", async () => {
  const response = await handler({
    runtime: {
      production: false,
      state_acceptance: acceptance(PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT),
      signing_acceptance: acceptance(PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT),
    },
  })(new Request(`https://privacy.test${PRIVACY_RUNTIME_READINESS_PATH}`));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).dependencies.production_mode, "unaccepted");
});

test("expired or wrong-contract provider acceptance fails readiness closed", async () => {
  for (const runtime of [
    productionRuntime({
      state_acceptance: {
        contract_id: PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT,
        valid_until: "2026-09-29T22:59:59Z",
      },
    }),
    productionRuntime({
      signing_acceptance: {
        contract_id: "wrong-contract",
        valid_until: "2026-09-30T01:00:00Z",
      },
    }),
  ]) {
    const response = await handler({ runtime })(
      new Request(`https://privacy.test${PRIVACY_RUNTIME_READINESS_PATH}`),
    );
    assert.equal(response.status, 503);
    assert.equal((await response.json()).status, "not_ready");
  }
});

test("missing, false, or failing runtime probe fails readiness closed", async () => {
  for (const readinessProbe of [undefined, async () => false, async () => { throw new Error("synthetic"); }]) {
    const response = await handler({ readinessProbe })(
      new Request(`https://privacy.test${PRIVACY_RUNTIME_READINESS_PATH}`),
    );
    assert.equal(response.status, 503);
    assert.equal((await response.json()).dependencies.runtime_probe, "unavailable");
  }
});

test("capability verification remains independently authenticated", async () => {
  const request = new Request(`https://privacy.test${PRIVACY_CAPABILITY_VERIFICATION_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contract_version: 1,
      consumer_id: "goreecloud-search",
      capability_reference: "psc-test",
      expected: {},
      consume: false,
    }),
  });

  const unauthenticated = await handler()(request.clone());
  assert.equal(unauthenticated.status, 401);

  const authenticated = await handler()(request, {
    authenticatedConsumerId: "goreecloud-search",
  });
  assert.equal(authenticated.status, 200);
});

test("unknown routes are bounded 404 JSON", async () => {
  const response = await handler()(new Request("https://privacy.test/not-a-route"));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not_found" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});
