import test from "node:test";
import assert from "node:assert/strict";
import { createPrivacyMeshEvidenceEnvelope } from "../src/mesh-evidence.mjs";
import { deliverIdentityAuthenticatedPrivacyMeshEvidence } from "../src/mesh-identity-delivery.mjs";

const now = new Date("2026-09-12T23:00:00.000Z");
const envelope = createPrivacyMeshEvidenceEnvelope({
  evidence: {
    evidence_id: "pse_mesh_identity_v2_001",
    recorded_at: "2026-09-12T22:59:00.000Z",
    requester_id: "goreecloud-ai",
    resource_id: "opaque-resource-1",
    outcome: "DENY",
    reason_code: "purpose_not_authorized",
    evidence_hash: "e".repeat(64),
  },
  revision: "f".repeat(40),
  valid_until: "2026-09-13T00:00:00.000Z",
  assertion: "privacy-decision",
  subject_kind: "document",
  subject_scope: "ai-rag",
  now,
});

function credential(overrides = {}) {
  return {
    access_token: "identity-fr012-secret-token",
    credential_id: "identity-credential-42",
    service_id: "privacy-shield",
    audience: "goreecloud-mesh",
    scopes: ["mesh.evidence.write"],
    issued_at: "2026-09-12T22:59:30.000Z",
    expires_at: "2026-09-12T23:10:00.000Z",
    rotation_state: "current",
    revocation_state: "active",
    trust: {
      authority: "goreecloud-identity",
      status: "verified",
      verified_at: "2026-09-12T22:59:35.000Z",
      valid_until: "2026-09-12T23:09:00.000Z",
    },
    ...overrides,
  };
}

const policy = {
  maxCredentialAgeMs: 120_000,
  minRemainingValidityMs: 120_000,
};

function acceptedResponse(credentialId = "identity-credential-42", overrides = {}) {
  return {
    ok: true,
    status: 201,
    async json() {
      return {
        envelope: { ...envelope, fresh: true },
        replayed: false,
        accepted_at: now.toISOString(),
        producer_service_id: "privacy-shield",
        authenticated_identity: {
          credential_id: credentialId,
          service_id: "privacy-shield",
          audience: "goreecloud-mesh",
          scopes: ["mesh.evidence.write"],
          trust_verified: true,
        },
        authority_transfer: false,
        ...overrides,
      };
    },
  };
}

test("FR-012 validates exact Identity metadata and Mesh acceptance without transferring authority", async () => {
  const calls = [];
  let authorization;
  const receipt = await deliverIdentityAuthenticatedPrivacyMeshEvidence({
    envelope,
    meshBaseUrl: "https://mesh.goreecloud.test",
    credentialProvider: async (request) => {
      calls.push(request);
      return credential();
    },
    ...policy,
    now,
    fetchImpl: async (_url, init) => {
      authorization = init.headers.Authorization;
      return acceptedResponse();
    },
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    service_id: "privacy-shield",
    audience: "goreecloud-mesh",
    scopes: ["mesh.evidence.write"],
    max_credential_age_ms: 120_000,
    min_remaining_validity_ms: 120_000,
  });
  assert.equal(Object.isFrozen(calls[0].scopes), true);
  assert.equal(authorization, "Bearer identity-fr012-secret-token");
  assert.equal(receipt.schema_version, "goreecloud.privacy-shield.mesh-identity-delivery.v1");
  assert.equal(receipt.identity.service_id, "privacy-shield");
  assert.equal(receipt.identity.trust_status, "verified");
  assert.equal(receipt.mesh_identity_verified, true);
  assert.equal(receipt.authorization_effect, false);
  assert.equal(receipt.authority_transfer, false);
  assert.equal(JSON.stringify(receipt).includes("identity-fr012-secret-token"), false);
});

test("FR-012 fails closed on identity, audience, scope, rotation, revocation, freshness, and trust drift", async () => {
  const cases = [
    [credential({ service_id: "other-service" }), /service identity mismatch/],
    [credential({ audience: "other-audience" }), /audience mismatch/],
    [credential({ scopes: ["mesh.evidence.write", "mesh.evidence.read"] }), /scopes must be exactly/],
    [credential({ rotation_state: "retiring" }), /not current under rotation/],
    [credential({ revocation_state: "revoked" }), /revoked or not active/],
    [credential({ issued_at: "2026-09-12T22:40:00.000Z" }), /exceeds caller freshness policy/],
    [credential({ expires_at: "2026-09-12T23:01:00.000Z", trust: { ...credential().trust, valid_until: "2026-09-12T23:00:30.000Z" } }), /insufficient remaining validity/],
    [credential({ trust: { ...credential().trust, status: "unverified" } }), /trust is not verified/],
    [credential({ trust: { ...credential().trust, valid_until: "2026-09-12T22:59:59.000Z" } }), /trust verification is expired/],
  ];

  for (const [value, expected] of cases) {
    let fetchCalled = false;
    await assert.rejects(
      deliverIdentityAuthenticatedPrivacyMeshEvidence({
        envelope,
        meshBaseUrl: "https://mesh.goreecloud.test",
        credentialProvider: async () => value,
        ...policy,
        now,
        fetchImpl: async () => {
          fetchCalled = true;
          return acceptedResponse();
        },
      }),
      expected,
    );
    assert.equal(fetchCalled, false);
  }
});

test("FR-012 requires caller-selected freshness policies instead of inventing global credential lifetimes", async () => {
  let fetchCalled = false;
  const invoke = (extra = {}) => deliverIdentityAuthenticatedPrivacyMeshEvidence({
    envelope,
    meshBaseUrl: "https://mesh.goreecloud.test",
    credentialProvider: async () => credential(),
    now,
    fetchImpl: async () => {
      fetchCalled = true;
      return acceptedResponse();
    },
    ...extra,
  });
  await assert.rejects(invoke(), /maxCredentialAgeMs must be a positive safe integer/);
  await assert.rejects(invoke({ maxCredentialAgeMs: 120_000 }), /minRemainingValidityMs must be a positive safe integer/);
  assert.equal(fetchCalled, false);
});

test("FR-012 requires Mesh to echo the exact authenticated identity and preserve authority_transfer false", async () => {
  for (const [response, expected] of [
    [acceptedResponse("other-credential"), /credential identity mismatch/],
    [acceptedResponse("identity-credential-42", { authenticated_identity: {
      credential_id: "identity-credential-42",
      service_id: "other-service",
      audience: "goreecloud-mesh",
      scopes: ["mesh.evidence.write"],
      trust_verified: true,
    } }), /service identity mismatch/],
    [acceptedResponse("identity-credential-42", { authority_transfer: true }), /authority_transfer false/],
  ]) {
    await assert.rejects(
      deliverIdentityAuthenticatedPrivacyMeshEvidence({
        envelope,
        meshBaseUrl: "https://mesh.goreecloud.test",
        credentialProvider: async () => credential(),
        ...policy,
        now,
        fetchImpl: async () => response,
      }),
      expected,
    );
  }
});

test("FR-012 sanitizes credential provider failures and never leaks token material", async () => {
  await assert.rejects(
    deliverIdentityAuthenticatedPrivacyMeshEvidence({
      envelope,
      meshBaseUrl: "https://mesh.goreecloud.test",
      credentialProvider: async () => {
        throw new Error("access_token=should-never-escape");
      },
      ...policy,
      now,
      fetchImpl: async () => acceptedResponse(),
    }),
    (error) => {
      assert.equal(error.message, "GoreeCloud Identity credential acquisition failed");
      assert.equal(String(error).includes("should-never-escape"), false);
      return true;
    },
  );
});
