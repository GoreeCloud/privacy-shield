import test from "node:test";
import assert from "node:assert/strict";
import { createPrivacyMeshEvidenceRefreshResponse } from "../src/mesh-refresh-response.mjs";

const requestedAt = new Date("2026-08-27T20:00:00.000Z");
const now = new Date("2026-08-27T20:05:00.000Z");

function intent(overrides = {}) {
  return {
    version: "goreecloud.evidence-refresh-intent.v1",
    id: "refresh-privacy-document-42",
    coordinator: {
      system: "goreecloud-mesh",
      repository: "GoreeCloud/goreecloud-mesh",
      revision: "a".repeat(40),
      contract: "contracts/mesh.evidence-refresh-intent.schema.json",
    },
    producer: "privacy-shield",
    authority_domain: "privacy",
    subject: { kind: "document", id: "document-42", scope: "ai-rag" },
    assertion: "privacy-decision",
    reason: "stale",
    requested_at: requestedAt.toISOString(),
    latest_observed_at: "2026-08-27T18:00:00.000Z",
    contains_user_content: false,
    contains_secret_material: false,
    authority_transferred: false,
    execution_authorized: false,
    ...overrides,
  };
}

test("creates a bounded completed receipt that points to separate evidence", () => {
  const response = createPrivacyMeshEvidenceRefreshResponse(intent(), {
    response_id: "privacy-refresh-response-42",
    revision: "b".repeat(40),
    status: "completed",
    reason_code: "evidence-issued",
    respondedAt: "2026-08-27T20:04:00.000Z",
    evidence_envelope_id: "privacy-shield-pse-002",
    now,
  });
  assert.equal(response.version, "goreecloud.evidence-refresh-response.v1");
  assert.equal(response.intent.id, "refresh-privacy-document-42");
  assert.equal(response.intent.coordinator_revision, "a".repeat(40));
  assert.equal(response.producer.system, "privacy-shield");
  assert.equal(response.authority_domain, "privacy");
  assert.equal(response.status, "completed");
  assert.equal(response.evidence_produced, true);
  assert.equal(response.evidence_envelope_id, "privacy-shield-pse-002");
  assert.equal(response.contains_user_content, false);
  assert.equal(response.contains_secret_material, false);
  assert.equal(response.authority_transferred, false);
  assert.equal(response.execution_authorized, false);
  assert.equal("outcome" in response, false);
  assert.equal("fresh" in response, false);
  assert.equal("privacy_decision" in response, false);
});

test("allows handling completion without pretending evidence was produced", () => {
  const response = createPrivacyMeshEvidenceRefreshResponse(intent(), {
    response_id: "privacy-refresh-response-43",
    revision: "b".repeat(40),
    status: "completed",
    reason_code: "no-new-evidence",
    now,
  });
  assert.equal(response.evidence_produced, false);
  assert.equal("evidence_envelope_id" in response, false);
});

test("rejects evidence claims before completed handling and invalid provenance", () => {
  assert.throws(() => createPrivacyMeshEvidenceRefreshResponse(intent(), {
    response_id: "privacy-refresh-response-44",
    revision: "b".repeat(40),
    status: "received",
    evidence_envelope_id: "privacy-shield-pse-003",
    now,
  }));
  assert.throws(() => createPrivacyMeshEvidenceRefreshResponse(intent(), {
    response_id: "privacy-refresh-response-45",
    revision: "not-a-revision",
    status: "completed",
    now,
  }));
  assert.throws(() => createPrivacyMeshEvidenceRefreshResponse(intent(), {
    response_id: "privacy-refresh-response-46",
    revision: "b".repeat(40),
    status: "completed",
    respondedAt: "2026-08-27T20:06:00.000Z",
    now,
  }));
});
