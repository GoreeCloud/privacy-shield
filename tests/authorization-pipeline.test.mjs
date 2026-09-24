import crypto from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { PrivacyDecisionPoint, PrivacyDecision, validateRequest } from "../src/privacy-decision-point.mjs";
import { ConsentAuthority } from "../src/consent-authority.mjs";
import { PrivacyCapabilityAuthority } from "../src/capability-token.mjs";
import { PrivacyEvidenceLedger } from "../src/privacy-evidence.mjs";
import { PrivacyEnforcementPoint } from "../src/privacy-enforcement-point.mjs";

function fixture({ capabilityAuthority } = {}) {
  const requester = "goreecloud-ai";
  const resource = "drive:project-alpha";
  const purpose = "answer-current-conversation";
  const consentAuthority = new ConsentAuthority();
  const consent = consentAuthority.put({
    requester_id: requester,
    resource_id: resource,
    purpose,
    processing_zones: ["private_goreecloud"],
    destinations: ["goreecloud-ai"]
  });
  const manifests = new Map([[requester, {
    resources: [{
      resource,
      purposes: [purpose],
      operations: ["read"],
      processing_zones: ["private_goreecloud"],
      destinations: ["goreecloud-ai"]
    }]
  }]]);
  const consents = new Map([[consent.consent_id, consent]]);
  const decisionPoint = new PrivacyDecisionPoint({ manifests, consents });
  capabilityAuthority ??= new PrivacyCapabilityAuthority("0123456789abcdef0123456789abcdef");
  const evidenceLedger = new PrivacyEvidenceLedger();
  const enforcementPoint = new PrivacyEnforcementPoint({ decisionPoint, capabilityAuthority, evidenceLedger });
  const request = {
    request_id: "req-1",
    requester: { id: requester, type: "ai" },
    resource: { id: resource, classification: "documents", scope: { items: ["doc-1"] } },
    operation: "read",
    purpose,
    processing_zone: "private_goreecloud",
    destination: "goreecloud-ai",
    retention: { mode: "none" },
    external_disclosure: false,
    consent_reference: consent.consent_id
  };
  return { request, decisionPoint, enforcementPoint, evidenceLedger, consentAuthority, consent, capabilityAuthority };
}


test("processing-zone validation rejects inherited object property names and non-string values", () => {
  const { request } = fixture();
  for (const validZone of ["local", "private_goreecloud", "trusted_service", "external"]) {
    assert.doesNotThrow(() => validateRequest({ ...request, processing_zone: validZone }));
  }

  for (const invalidZone of ["constructor", "toString", "__proto__", "valueOf", "", "local ", 0, null, {}]) {
    assert.throws(
      () => validateRequest({ ...request, processing_zone: invalidZone }),
      /Unknown Privacy Shield processing zone|missing processing_zone/,
      `expected fail-closed rejection of ${String(invalidZone)}`,
    );
  }
});

test("raw decision point does not invent an executable capability reference", () => {
  const { request, decisionPoint } = fixture();
  const decision = decisionPoint.evaluate(request);
  assert.equal(decision.outcome, PrivacyDecision.ALLOW_WITH_CONSTRAINTS);
  assert.equal(decision.capability_token_reference, null);
});

test("authorization pipeline issues and enforces an operation-bound capability reference", () => {
  const { request, enforcementPoint, evidenceLedger } = fixture();
  const result = enforcementPoint.authorize(request);
  assert.equal(result.decision.outcome, PrivacyDecision.ALLOW_WITH_CONSTRAINTS);
  assert.ok(result.capability_token);
  assert.match(result.decision.capability_token_reference, /^psc_/);
  assert.ok(result.receipt);
  assert.equal(evidenceLedger.list({ request_id: request.request_id }).length, 1);
  const enforced = enforcementPoint.enforceReference(result.decision.capability_token_reference, {
    requester_id: request.requester.id,
    resource_id: request.resource.id,
    purpose: request.purpose,
    operation: request.operation,
    processing_zone: request.processing_zone,
    destination: request.destination,
    retention_mode: request.retention.mode
  });
  assert.equal(enforced.authorized, true);
  assert.equal(enforced.claims.jti, result.decision.capability_token_reference);
});

test("capability reference cannot be replayed for another purpose", () => {
  const { request, enforcementPoint } = fixture();
  const result = enforcementPoint.authorize(request);
  assert.throws(() => enforcementPoint.enforceReference(result.decision.capability_token_reference, {
    purpose: "train-model"
  }), /CAPABILITY_PURPOSE_MISMATCH/);
});

test("capability reference rejects surrounding whitespace instead of normalizing it", () => {
  const { request, enforcementPoint } = fixture();
  const result = enforcementPoint.authorize(request);
  const reference = result.decision.capability_token_reference;
  for (const padded of [` ${reference}`, `${reference} `, `\t${reference}`]) {
    assert.throws(
      () => enforcementPoint.enforceReference(padded, { requester_id: request.requester.id }),
      /INVALID_CAPABILITY_ID/,
    );
  }
});

test("revoked consent is denied after PDP state is refreshed", () => {
  const { request, enforcementPoint, consentAuthority, consent } = fixture();
  const revoked = consentAuthority.revoke({
    requester_id: request.requester.id,
    resource_id: request.resource.id,
    purpose: request.purpose
  });
  enforcementPoint.decisionPoint.consents.set(consent.consent_id, revoked);
  const result = enforcementPoint.authorize(request);
  assert.equal(result.decision.outcome, PrivacyDecision.DENY);
  assert.equal(result.capability_token, null);
  assert.equal(result.decision.capability_token_reference, null);
  assert.equal(result.receipt, null);
});

test("capability revocation blocks subsequent reference enforcement", () => {
  const { request, enforcementPoint } = fixture();
  const result = enforcementPoint.authorize(request);
  const reference = result.decision.capability_token_reference;
  enforcementPoint.revokeCapability(reference);
  assert.throws(() => enforcementPoint.enforceReference(reference, {
    requester_id: request.requester.id
  }), /CAPABILITY_REVOKED/);
});

test("single-use capability reference cannot be enforced twice", () => {
  const { request, enforcementPoint } = fixture();
  const result = enforcementPoint.authorize(request, { replay_policy: "single_use" });
  const reference = result.decision.capability_token_reference;
  const first = enforcementPoint.enforceReferenceOnce(reference, {
    requester_id: request.requester.id,
    purpose: request.purpose
  });
  assert.equal(first.authorized, true);
  assert.throws(() => enforcementPoint.enforceReferenceOnce(reference, {
    requester_id: request.requester.id,
    purpose: request.purpose
  }), /CAPABILITY_ALREADY_CONSUMED/);
});

test("unknown capability reference fails closed", () => {
  const { enforcementPoint } = fixture();
  assert.throws(() => enforcementPoint.enforceReference(`psc_${crypto.randomUUID()}`, {}), /CAPABILITY_REFERENCE_NOT_FOUND/);
});

test("key rotation preserves reference verification with retained old keys", () => {
  const authority = new PrivacyCapabilityAuthority({
    active_key_id: "key-a",
    keys: {
      "key-a": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "key-b": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }
  });
  const { request, enforcementPoint } = fixture({ capabilityAuthority: authority });
  const oldResult = enforcementPoint.authorize(request);
  authority.rotate("key-c", "cccccccccccccccccccccccccccccccc");
  const newResult = enforcementPoint.authorize({ ...request, request_id: "req-2" });
  assert.equal(enforcementPoint.enforceReference(oldResult.decision.capability_token_reference, {}).claims.kid, "key-a");
  assert.equal(enforcementPoint.enforceReference(newResult.decision.capability_token_reference, {}).claims.kid, "key-c");
});

test("retiring a non-active key invalidates capability references signed by it", () => {
  const authority = new PrivacyCapabilityAuthority({
    active_key_id: "key-a",
    keys: {
      "key-a": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "key-b": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }
  });
  const { request, enforcementPoint } = fixture({ capabilityAuthority: authority });
  const result = enforcementPoint.authorize(request);
  authority.rotate("key-b", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  authority.retire("key-a");
  assert.throws(() => enforcementPoint.enforceReference(result.decision.capability_token_reference, {}), /UNKNOWN_CAPABILITY_KEY/);
});
