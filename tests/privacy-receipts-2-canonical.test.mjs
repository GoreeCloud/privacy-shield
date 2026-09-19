import assert from "node:assert/strict";
import test from "node:test";
import { createPrivacyReceipt } from "../src/privacy-evidence.mjs";

function fixture() {
  const request = {
    request_id: "req-canonical-1",
    requester: { id: "app.notes", type: "application" },
    resource: { classification: "notes" },
    operation: "read",
    purpose: "summarize",
    processing_zone: "trusted_service",
    retention: { mode: "temporary", expires_at: "2026-09-12T04:30:00Z" },
  };
  const decision = {
    decision_id: "dec-canonical-1",
    request_id: request.request_id,
    outcome: "ALLOW_WITH_CONSTRAINTS",
    reason_code: "AUTHORIZED_WITH_CONSTRAINTS",
    processing_zone: "trusted_service",
    retention: request.retention,
    expires_at: "2026-09-12T04:20:00Z",
    obligations: ["record_privacy_evidence"],
    policy_references: ["core.consent"],
  };
  const evidence = {
    evidence_id: "pse-canonical-1",
    evidence_hash: "sha256-canonical-test",
    request_id: request.request_id,
    decision_id: decision.decision_id,
    recorded_at: "2026-09-12T04:00:00Z",
  };
  return { request, decision, evidence };
}

test("receipt rejects padded exact-bound request identity", () => {
  const data = fixture();
  const padded = " " + data.request.request_id;
  assert.throws(
    () => createPrivacyReceipt({
      ...data,
      request: { ...data.request, request_id: padded },
      decision: { ...data.decision, request_id: padded },
      evidence: { ...data.evidence, request_id: padded },
      now: "2026-09-12T04:10:00Z",
    }),
    /canonical decision.request_id/,
  );
});

test("receipt rejects padded requester and consent identifiers", () => {
  const data = fixture();
  assert.throws(
    () => createPrivacyReceipt({
      ...data,
      request: { ...data.request, requester: { ...data.request.requester, id: "app.notes " } },
      now: "2026-09-12T04:10:00Z",
    }),
    /canonical request.requester.id/,
  );
  assert.throws(
    () => createPrivacyReceipt({
      ...data,
      consent: {
        consent_id: " consent-1",
        decision: "granted",
        grant_type: "expiring",
        expires_at: "2026-09-12T04:20:00Z",
        scope: { contract: "goreecloud.privacy-shield.consent-scope.v1" },
      },
      now: "2026-09-12T04:10:00Z",
    }),
    /canonical consent_basis.consent_id/,
  );
});

test("receipt rejects timezone-ambiguous evidence and retention timestamps", () => {
  const data = fixture();
  assert.throws(
    () => createPrivacyReceipt({
      ...data,
      evidence: { ...data.evidence, recorded_at: "2026-09-12T04:00:00" },
      now: "2026-09-12T04:10:00Z",
    }),
    /invalid evidence.recorded_at/,
  );
  assert.throws(
    () => createPrivacyReceipt({
      ...data,
      decision: {
        ...data.decision,
        retention: { mode: "temporary", expires_at: "2026-09-12T04:30:00" },
      },
      now: "2026-09-12T04:10:00Z",
    }),
    /invalid retention.expires_at/,
  );
});
