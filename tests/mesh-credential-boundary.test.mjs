import test from "node:test";
import assert from "node:assert/strict";
import { createPrivacyMeshEvidenceEnvelope } from "../src/mesh-evidence.mjs";
import { deliverPrivacyMeshEvidence } from "../src/mesh-delivery.mjs";

const now = new Date();
const envelope = createPrivacyMeshEvidenceEnvelope({
  evidence: {
    evidence_id: "pse_identity_delivery_001",
    recorded_at: new Date(now.getTime() - 60_000).toISOString(),
    requester_id: "goreecloud-ai",
    resource_id: "document-identity-boundary",
    outcome: "DENY",
    reason_code: "destination_not_authorized",
    evidence_hash: "d".repeat(64),
    metadata: { secret: "must-not-survive-minimization" },
  },
  revision: "c".repeat(40),
  valid_until: new Date(now.getTime() + 3_600_000).toISOString(),
  assertion: "privacy-decision",
  subject_kind: "document",
  subject_scope: "ai-rag",
  now,
});

function acceptedResponse() {
  return {
    ok: true,
    status: 201,
    async json() {
      return {
        envelope: { ...envelope, fresh: true },
        replayed: false,
        accepted_at: now.toISOString(),
        producer_service_id: "privacy-shield",
      };
    },
  };
}

test("acquires a fresh narrowly requested Identity credential for each delivery", async () => {
  const calls = [];
  let captured;
  const credentialProvider = async (request) => {
    calls.push(request);
    return "identity-mesh-token";
  };
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return acceptedResponse();
  };

  const receipt = await deliverPrivacyMeshEvidence({
    envelope,
    meshBaseUrl: "https://mesh.goreecloud.test",
    credentialProvider,
    fetchImpl,
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    service_id: "privacy-shield",
    audience: "goreecloud-mesh",
    scopes: ["mesh.evidence.write"],
  });
  assert.equal(Object.isFrozen(calls[0].scopes), true);
  assert.equal(captured.init.headers.Authorization, "Bearer identity-mesh-token");
  assert.equal(JSON.stringify(receipt).includes("identity-mesh-token"), false);
});

test("rejects ambiguous credential ownership and malformed bearer material", async () => {
  await assert.rejects(
    deliverPrivacyMeshEvidence({
      envelope,
      meshBaseUrl: "https://mesh.goreecloud.test",
      bearerToken: "direct-token",
      credentialProvider: async () => "provider-token",
      fetchImpl: async () => acceptedResponse(),
    }),
    /either bearerToken or credentialProvider/,
  );

  await assert.rejects(
    deliverPrivacyMeshEvidence({
      envelope,
      meshBaseUrl: "https://mesh.goreecloud.test",
      credentialProvider: async () => "bad\r\ntoken",
      fetchImpl: async () => acceptedResponse(),
    }),
    /malformed/,
  );

  await assert.rejects(
    deliverPrivacyMeshEvidence({
      envelope,
      meshBaseUrl: "https://mesh.goreecloud.test",
      credentialProvider: async () => "x".repeat(16_385),
      fetchImpl: async () => acceptedResponse(),
    }),
    /oversized/,
  );
});

test("credential acquisition failures cannot leak provider secret material", async () => {
  let fetchCalled = false;
  await assert.rejects(
    deliverPrivacyMeshEvidence({
      envelope,
      meshBaseUrl: "https://mesh.goreecloud.test",
      credentialProvider: async () => {
        throw new Error("credential=identity-secret-that-must-not-be-logged");
      },
      fetchImpl: async () => {
        fetchCalled = true;
        return acceptedResponse();
      },
    }),
    (error) => {
      assert.equal(error.message, "GoreeCloud Identity credential acquisition failed");
      assert.equal(String(error).includes("identity-secret-that-must-not-be-logged"), false);
      return true;
    },
  );
  assert.equal(fetchCalled, false);
});

test("Mesh rejection text cannot reflect bearer credentials into local errors", async () => {
  await assert.rejects(
    deliverPrivacyMeshEvidence({
      envelope,
      meshBaseUrl: "https://mesh.goreecloud.test",
      credentialProvider: async () => "identity-reflection-secret",
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        async json() {
          return {
            error: "Authorization: Bearer identity-reflection-secret",
            error_code: "scope_denied",
          };
        },
      }),
    }),
    (error) => {
      assert.equal(error.message, "Mesh evidence delivery failed with HTTP 403 (scope_denied)");
      assert.equal(String(error).includes("identity-reflection-secret"), false);
      return true;
    },
  );
});

test("transport wrapper errors cannot reflect bearer credentials into local errors", async () => {
  await assert.rejects(
    deliverPrivacyMeshEvidence({
      envelope,
      meshBaseUrl: "https://mesh.goreecloud.test",
      credentialProvider: async () => "identity-transport-secret",
      fetchImpl: async (_url, init) => {
        throw new Error(`request failed with ${init.headers.Authorization}`);
      },
    }),
    (error) => {
      assert.equal(error.message, "Mesh evidence delivery failed before acceptance");
      assert.equal(String(error).includes("identity-transport-secret"), false);
      return true;
    },
  );
});
