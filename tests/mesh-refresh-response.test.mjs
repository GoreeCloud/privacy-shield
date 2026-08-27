import test from "node:test";
import assert from "node:assert/strict";
import { createPrivacyMeshEvidenceEnvelope } from "../src/mesh-evidence.mjs";
import { createPrivacyMeshEvidenceRefreshResponse } from "../src/mesh-refresh-response.mjs";
import { createPrivacyMeshEvidenceRefreshResponseForEvidence } from "../src/mesh-refresh-handoff.mjs";

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

function producedEnvelope() {
  return createPrivacyMeshEvidenceEnvelope({
    evidence: {
      evidence_id: "pse-002",
      resource_id: "document-42",
      outcome: "allow",
      reason_code: "policy-satisfied",
      recorded_at: "2026-08-27T20:02:00.000Z",
      evidence_hash: "f".repeat(64),
    },
    revision: "b".repeat(40),
    valid_until: "2026-08-27T21:00:00.000Z",
    assertion: "privacy-decision",
    subject_kind: "document",
    subject_scope: "ai-rag",
    now,
  });
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

test("creates a completed receipt only from a current envelope bound to the exact refresh", () => {
  const envelope = producedEnvelope();
  const response = createPrivacyMeshEvidenceRefreshResponseForEvidence(intent(), {
    response_id: "privacy-refresh-handoff-42",
    revision: "b".repeat(40),
    evidence_envelope: envelope,
    respondedAt: "2026-08-27T20:04:00.000Z",
    now,
  });
  assert.equal(response.status, "completed");
  assert.equal(response.evidence_produced, true);
  assert.equal(response.evidence_envelope_id, envelope.id);
  assert.equal("outcome" in response, false);
  assert.equal(response.authority_transferred, false);
  assert.equal(response.execution_authorized, false);
});

test("fails closed when produced evidence is stale or not exactly bound to the refresh", () => {
  const oldEvidence = structuredClone(producedEnvelope());
  oldEvidence.observed_at = "2026-08-27T19:59:59.000Z";
  assert.throws(() => createPrivacyMeshEvidenceRefreshResponseForEvidence(intent(), {
    response_id: "privacy-refresh-handoff-old",
    revision: "b".repeat(40),
    evidence_envelope: oldEvidence,
    respondedAt: "2026-08-27T20:04:00.000Z",
    now,
  }));

  const wrongRevision = structuredClone(producedEnvelope());
  wrongRevision.producer.revision = "c".repeat(40);
  assert.throws(() => createPrivacyMeshEvidenceRefreshResponseForEvidence(intent(), {
    response_id: "privacy-refresh-handoff-revision",
    revision: "b".repeat(40),
    evidence_envelope: wrongRevision,
    respondedAt: "2026-08-27T20:04:00.000Z",
    now,
  }));

  const wrongSubject = structuredClone(producedEnvelope());
  wrongSubject.subject.id = "document-99";
  assert.throws(() => createPrivacyMeshEvidenceRefreshResponseForEvidence(intent(), {
    response_id: "privacy-refresh-handoff-subject",
    revision: "b".repeat(40),
    evidence_envelope: wrongSubject,
    respondedAt: "2026-08-27T20:04:00.000Z",
    now,
  }));

  const postResponse = structuredClone(producedEnvelope());
  postResponse.observed_at = "2026-08-27T20:04:01.000Z";
  assert.throws(() => createPrivacyMeshEvidenceRefreshResponseForEvidence(intent(), {
    response_id: "privacy-refresh-handoff-future-evidence",
    revision: "b".repeat(40),
    evidence_envelope: postResponse,
    respondedAt: "2026-08-27T20:04:00.000Z",
    now,
  }));
});
