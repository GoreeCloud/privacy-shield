import test from "node:test";
import assert from "node:assert/strict";
import { createPrivacyMeshEvidenceEnvelope } from "../src/mesh-evidence.mjs";
import { deliverPrivacyMeshEvidence } from "../src/mesh-delivery.mjs";

const now = new Date();
const evidence = {
  evidence_id: "pse_delivery_001",
  recorded_at: new Date(now.getTime() - 60_000).toISOString(),
  requester_id: "goreecloud-ai",
  resource_id: "document-42",
  outcome: "DENY",
  reason_code: "destination_not_authorized",
  evidence_hash: "b".repeat(64),
  metadata: { prompt: "private prompt", credentials: "secret" },
};
const envelope = createPrivacyMeshEvidenceEnvelope({
  evidence,
  revision: "a".repeat(40),
  valid_until: new Date(now.getTime() + 3_600_000).toISOString(),
  assertion: "privacy-decision",
  subject_kind: "document",
  subject_scope: "ai-rag",
  now,
});

test("delivers Privacy Shield evidence with Identity bearer authorization", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
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
  };

  const receipt = await deliverPrivacyMeshEvidence({
    envelope,
    meshBaseUrl: "https://mesh.goreecloud.test",
    bearerToken: "test-identity-credential",
    fetchImpl,
  });

  assert.equal(captured.url, "https://mesh.goreecloud.test/v1/evidence/envelopes");
  assert.equal(captured.init.headers.Authorization, "Bearer test-identity-credential");
  assert.deepEqual(JSON.parse(captured.init.body), envelope);
  assert.equal(captured.init.body.includes("private prompt"), false);
  assert.equal(captured.init.body.includes("credentials"), false);
  assert.equal(receipt.evidence_id, envelope.id);
  assert.equal(receipt.producer_service_id, "privacy-shield");
  assert.equal(JSON.stringify(receipt).includes("test-identity-credential"), false);
});

test("rejects cross-producer envelopes and non-loopback plaintext HTTP", async () => {
  await assert.rejects(
    deliverPrivacyMeshEvidence({
      envelope: { ...envelope, producer: { ...envelope.producer, system: "wardveil-security" } },
      meshBaseUrl: "https://mesh.goreecloud.test",
      bearerToken: "secret",
      fetchImpl: async () => { throw new Error("must not run"); },
    }),
    /only accepts privacy-shield envelopes/,
  );

  await assert.rejects(
    deliverPrivacyMeshEvidence({
      envelope,
      meshBaseUrl: "http://mesh.goreecloud.test",
      bearerToken: "secret",
      fetchImpl: async () => { throw new Error("must not run"); },
    }),
    /requires HTTPS/,
  );
});

test("accepts exact Mesh replay without treating it as a new producer outcome", async () => {
  const receipt = await deliverPrivacyMeshEvidence({
    envelope,
    meshBaseUrl: "http://127.0.0.1:8787",
    bearerToken: "test-identity-credential",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          envelope: { ...envelope, fresh: true },
          replayed: true,
          accepted_at: now.toISOString(),
          producer_service_id: "privacy-shield",
        };
      },
    }),
  });
  assert.equal(receipt.replayed, true);
});
