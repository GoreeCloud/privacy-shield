import test from "node:test";
import assert from "node:assert/strict";
import {
  createPrivacyMeshEvidenceEnvelope,
  validatePrivacyMeshEvidenceRefreshIntent,
} from "../src/mesh-evidence.mjs";

const now = new Date("2026-08-26T23:30:00.000Z");
const evidence = {
  evidence_id: "pse_001",
  recorded_at: "2026-08-26T23:29:00.000Z",
  requester_id: "goreecloud-ai",
  resource_id: "document-42",
  outcome: "DENY",
  reason_code: "destination_not_authorized",
  evidence_hash: "b".repeat(64),
  metadata: {
    prompt: "private prompt must never be transported",
    retrieved_content: "private retrieved content must never be transported",
    credentials: "secret",
  },
};

test("creates minimized producer-authoritative Mesh evidence", () => {
  const envelope = createPrivacyMeshEvidenceEnvelope({
    evidence,
    revision: "a".repeat(40),
    valid_until: "2026-08-27T00:30:00.000Z",
    assertion: "privacy-decision",
    subject_kind: "document",
    subject_scope: "ai-rag",
    now,
  });

  assert.equal(envelope.version, "goreecloud.evidence-envelope.v1");
  assert.equal(envelope.producer.system, "privacy-shield");
  assert.equal(envelope.authority_domain, "privacy");
  assert.equal(envelope.outcome, "DENY");
  assert.equal(envelope.subject.id, "document-42");
  assert.equal(envelope.payload_digest, `sha256:${"b".repeat(64)}`);
  assert.equal(envelope.contains_user_content, false);
  assert.equal(envelope.contains_secret_material, false);

  const serialized = JSON.stringify(envelope);
  assert.equal(serialized.includes("private prompt"), false);
  assert.equal(serialized.includes("private retrieved content"), false);
  assert.equal(serialized.includes("credentials"), false);
  assert.equal(serialized.includes("requester_id"), false);
  assert.equal(serialized.includes("metadata"), false);
});

test("rejects cross-producer contract and expired evidence", () => {
  assert.throws(() => createPrivacyMeshEvidenceEnvelope({
    evidence,
    revision: "a".repeat(40),
    valid_until: "2026-08-27T00:30:00.000Z",
    contract: "contracts/wardveil.status.schema.json",
    now,
  }));

  assert.throws(() => createPrivacyMeshEvidenceEnvelope({
    evidence,
    revision: "a".repeat(40),
    valid_until: "2026-08-26T23:29:30.000Z",
    now,
  }));
});

function refreshIntent(overrides = {}) {
  return {
    version: "goreecloud.evidence-refresh-intent.v1",
    id: "refresh-privacy-document-42",
    coordinator: {
      system: "goreecloud-mesh",
      repository: "GoreeCloud/goreecloud-mesh",
      revision: "c".repeat(40),
      contract: "contracts/mesh.evidence-refresh-intent.schema.json",
    },
    producer: "privacy-shield",
    authority_domain: "privacy",
    subject: { kind: "document", id: "document-42", scope: "ai-rag" },
    assertion: "privacy-decision",
    reason: "stale",
    requested_at: now.toISOString(),
    latest_observed_at: "2026-08-26T21:30:00.000Z",
    contains_user_content: false,
    contains_secret_material: false,
    authority_transferred: false,
    execution_authorized: false,
    ...overrides,
  };
}

test("accepts bounded Mesh refresh coordination without creating privacy truth", () => {
  const intent = validatePrivacyMeshEvidenceRefreshIntent(refreshIntent(), { now });
  assert.equal(intent.producer, "privacy-shield");
  assert.equal(intent.authority_domain, "privacy");
  assert.equal(intent.execution_authorized, false);
  assert.equal(intent.authority_transferred, false);
  assert.equal("outcome" in intent, false);
  assert.equal("privacy_decision" in intent, false);
});

test("rejects cross-authority and effect-authorizing refresh intents", () => {
  assert.throws(() => validatePrivacyMeshEvidenceRefreshIntent(refreshIntent({ authority_domain: "security" }), { now }));
  assert.throws(() => validatePrivacyMeshEvidenceRefreshIntent(refreshIntent({ execution_authorized: true }), { now }));
  assert.throws(() => validatePrivacyMeshEvidenceRefreshIntent(refreshIntent({ authority_transferred: true }), { now }));
});

test("enforces stale and empty lifecycle semantics on refresh requests", () => {
  assert.throws(() => validatePrivacyMeshEvidenceRefreshIntent(refreshIntent({ latest_observed_at: undefined }), { now }));
  const empty = refreshIntent({ reason: "empty" });
  delete empty.latest_observed_at;
  assert.equal(validatePrivacyMeshEvidenceRefreshIntent(empty, { now }).reason, "empty");
  assert.throws(() => validatePrivacyMeshEvidenceRefreshIntent(refreshIntent({ reason: "empty" }), { now }));
});
