import assert from "node:assert/strict";
import test from "node:test";
import { PrivacyDecisionPoint, PrivacyDecision } from "../src/privacy-decision-point.mjs";
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
  return { request, enforcementPoint, evidenceLedger, consentAuthority, consent, capabilityAuthority };
}

test("authorization pipeline issues and enforces an operation-bound capability", () => {
  const { request, enforcementPoint, evidenceLedger } = fixture();
  const result = enforcementPoint.authorize(request);
  assert.equal(result.decision.outcome, PrivacyDecision.ALLOW_WITH_CONSTRAINTS);
  assert.ok(result.capability_token);
  assert.ok(result.receipt);
  assert.equal(evidenceLedger.list({ request_id: request.request_id }).length, 1);
  const enforced = enforcementPoint.enforce(result.capability_token, {
    requester_id: request.requester.id,
    resource_id: request.resource.id,
    purpose: request.purpose,
    operation: request.operation,
    destination: request.destination
  });
  assert.equal(enforced.authorized, true);
});

test("capability cannot be replayed for another purpose", () => {
  const { request, enforcementPoint } = fixture();
  const result = enforcementPoint.authorize(request);
  assert.throws(() => enforcementPoint.enforce(result.capability_token, {
    purpose: "train-model"
  }), /CAPABILITY_PURPOSE_MISMATCH/);
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
  assert.equal(result.receipt, null);
});

test("capability revocation blocks subsequent enforcement", () => {
  const { request, enforcementPoint } = fixture();
  const result = enforcementPoint.authorize(request);
  enforcementPoint.revokeCapability(result.capability_token);
  assert.throws(() => enforcementPoint.enforce(result.capability_token, {
    requester_id: request.requester.id
  }), /CAPABILITY_REVOKED/);
});

test("single-use capability cannot be enforced twice", () => {
  const { request, enforcementPoint } = fixture();
  const result = enforcementPoint.authorize(request, { replay_policy: "single_use" });
  const first = enforcementPoint.enforceOnce(result.capability_token, {
    requester_id: request.requester.id,
    purpose: request.purpose
  });
  assert.equal(first.authorized, true);
  assert.throws(() => enforcementPoint.enforceOnce(result.capability_token, {
    requester_id: request.requester.id,
    purpose: request.purpose
  }), /CAPABILITY_ALREADY_CONSUMED/);
});

test("key rotation preserves verification with retained old keys", () => {
  const authority = new PrivacyCapabilityAuthority({
    active_key_id: "key-a",
    keys: {
      "key-a": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "key-b": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }
  });
  const { request, enforcementPoint } = fixture({ capabilityAuthority: authority });
  const oldToken = enforcementPoint.authorize(request).capability_token;
  authority.rotate("key-c", "cccccccccccccccccccccccccccccccc");
  const newToken = enforcementPoint.authorize({ ...request, request_id: "req-2" }).capability_token;
  assert.equal(authority.verify(oldToken).kid, "key-a");
  assert.equal(authority.verify(newToken).kid, "key-c");
});

test("retiring a non-active key invalidates capabilities signed by it", () => {
  const authority = new PrivacyCapabilityAuthority({
    active_key_id: "key-a",
    keys: {
      "key-a": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "key-b": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }
  });
  const { request, enforcementPoint } = fixture({ capabilityAuthority: authority });
  const token = enforcementPoint.authorize(request).capability_token;
  authority.rotate("key-b", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  authority.retire("key-a");
  assert.throws(() => authority.verify(token), /UNKNOWN_CAPABILITY_KEY/);
});
