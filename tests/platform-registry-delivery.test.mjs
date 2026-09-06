import test from "node:test";
import assert from "node:assert/strict";
import { publishPrivacyShieldPlatformRecord } from "../src/platform-registry-delivery.mjs";

const revision = "a".repeat(40);
const record = {
  schema: "goreecloud.mesh.platform-record.v1",
  source: {
    repository: "GoreeCloud/goreecloud-privacy-shield",
    revision,
    contract_schema_version: "0.2",
    authority_transfer: false,
  },
  component: {
    id: "goreecloud-privacy-shield",
    product_name: "Privacy Shield",
    kind: "service",
    repository: "GoreeCloud/goreecloud-privacy-shield",
    lifecycle: "development",
    version: "0.2.0",
    supported_platforms: ["server"],
  },
};

function acceptedResponse() {
  return {
    ok: true,
    status: 201,
    async json() {
      return {
        record,
        accepted_at: "2026-09-04T01:00:00Z",
        producer_service_id: "goreecloud-privacy-shield",
        authority_transfer: false,
      };
    },
  };
}

test("publishes with the exact producer-bound Platform Registry scope", async () => {
  const requests = [];
  let captured;
  const receipt = await publishPrivacyShieldPlatformRecord({
    record,
    meshBaseUrl: "https://mesh.goreecloud.test",
    credentialProvider: async (request) => {
      requests.push(request);
      return "registry-token";
    },
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return acceptedResponse();
    },
  });

  assert.deepEqual(requests, [{
    service_id: "goreecloud-privacy-shield",
    audience: "goreecloud-mesh",
    scopes: ["mesh.platform-registry.write"],
  }]);
  assert.equal(Object.isFrozen(requests[0].scopes), true);
  assert.equal(captured.url, "https://mesh.goreecloud.test/v1/platform-registry");
  assert.equal(captured.init.headers.Authorization, "Bearer registry-token");
  assert.equal(JSON.parse(captured.init.body).component.id, "goreecloud-privacy-shield");
  assert.deepEqual(receipt, {
    component_id: "goreecloud-privacy-shield",
    accepted_at: "2026-09-04T01:00:00Z",
    producer_service_id: "goreecloud-privacy-shield",
    authority_transfer: false,
  });
  assert.equal(JSON.stringify(receipt).includes("registry-token"), false);
});

test("rejects cross-producer records and authority transfer before transport", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return acceptedResponse();
  };

  await assert.rejects(
    publishPrivacyShieldPlatformRecord({
      record: { ...record, component: { ...record.component, id: "goreecloud-everkeep" } },
      meshBaseUrl: "https://mesh.goreecloud.test",
      bearerToken: "token",
      fetchImpl,
    }),
    /only its own platform record/,
  );

  await assert.rejects(
    publishPrivacyShieldPlatformRecord({
      record: { ...record, source: { ...record.source, authority_transfer: true } },
      meshBaseUrl: "https://mesh.goreecloud.test",
      bearerToken: "token",
      fetchImpl,
    }),
    /authority_transfer must remain false/,
  );

  assert.equal(calls, 0);
});

test("credential and remote-error material cannot leak through failures", async () => {
  await assert.rejects(
    publishPrivacyShieldPlatformRecord({
      record,
      meshBaseUrl: "https://mesh.goreecloud.test",
      credentialProvider: async () => {
        throw new Error("private registry credential=do-not-log");
      },
      fetchImpl: async () => acceptedResponse(),
    }),
    (error) => {
      assert.equal(error.message, "GoreeCloud Identity credential acquisition failed");
      assert.equal(String(error).includes("do-not-log"), false);
      return true;
    },
  );

  await assert.rejects(
    publishPrivacyShieldPlatformRecord({
      record,
      meshBaseUrl: "https://mesh.goreecloud.test",
      credentialProvider: async () => "registry-reflection-secret",
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        async json() {
          return {
            error: "Authorization: Bearer registry-reflection-secret",
            error_code: "scope_denied",
          };
        },
      }),
    }),
    (error) => {
      assert.equal(error.message, "Mesh Platform Registry publication failed with HTTP 403 (scope_denied)");
      assert.equal(String(error).includes("registry-reflection-secret"), false);
      return true;
    },
  );
});

test("receipt must preserve producer identity and no-authority-transfer boundary", async () => {
  await assert.rejects(
    publishPrivacyShieldPlatformRecord({
      record,
      meshBaseUrl: "https://mesh.goreecloud.test",
      bearerToken: "token",
      fetchImpl: async () => ({
        ok: true,
        status: 201,
        async json() {
          return {
            record,
            producer_service_id: "goreecloud-manager",
            authority_transfer: false,
          };
        },
      }),
    }),
    /did not bind to Privacy Shield service identity/,
  );

  await assert.rejects(
    publishPrivacyShieldPlatformRecord({
      record,
      meshBaseUrl: "https://mesh.goreecloud.test",
      bearerToken: "token",
      fetchImpl: async () => ({
        ok: true,
        status: 201,
        async json() {
          return {
            record,
            producer_service_id: "goreecloud-privacy-shield",
            authority_transfer: true,
          };
        },
      }),
    }),
    /no-authority-transfer boundary/,
  );
});
