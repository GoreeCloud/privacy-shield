import assert from "node:assert/strict";
import test from "node:test";
import { PrivacyPolicyEngine, policyConstraintViolation } from "../src/privacy-policy-engine.mjs";
import { PrivacyDecisionPoint, PrivacyDecision } from "../src/privacy-decision-point.mjs";
import { PrivacyCapabilityAuthority } from "../src/capability-token.mjs";
import { PrivacyEvidenceLedger } from "../src/privacy-evidence.mjs";
import { PrivacyEnforcementPoint } from "../src/privacy-enforcement-point.mjs";

function request(overrides = {}) {
  return {
    request_id: "req-policy-1",
    requester: { id: "goreecloud-ai", type: "ai" },
    resource: { id: "drive:alpha", classification: "documents", scope: { items: ["doc-1"] } },
    operation: "read",
    purpose: "answer-current-conversation",
    processing_zone: "private_goreecloud",
    destination: "goreecloud-ai",
    retention: { mode: "none" },
    external_disclosure: false,
    consent_reference: "consent-1",
    ...overrides
  };
}

function decisionPoint(policies) {
  const manifests = new Map([["goreecloud-ai", {
    resources: [{
      resource: "drive:alpha",
      purposes: ["answer-current-conversation"],
      operations: ["read"],
      processing_zones: ["local", "private_goreecloud", "trusted_service"],
      destinations: ["goreecloud-ai", "approved-processor"]
    }]
  }]]);
  const consents = new Map([["consent-1", {
    purpose: "answer-current-conversation",
    processing_zones: ["local", "private_goreecloud", "trusted_service"],
    destinations: ["goreecloud-ai", "approved-processor"],
    revoked: false
  }]]);
  return new PrivacyDecisionPoint({ manifests, consents, policies });
}

test("policy engine deny rule overrides otherwise valid manifest and consent", () => {
  const pdp = decisionPoint([{
    id: "policy.no-external-ai",
    priority: 10,
    effect: "DENY",
    when: { destinations: ["approved-processor"] },
    reason_code: "EXTERNAL_AI_PROHIBITED"
  }]);
  const result = pdp.evaluate(request({ processing_zone: "trusted_service", destination: "approved-processor", external_disclosure: true }));
  assert.equal(result.outcome, PrivacyDecision.DENY);
  assert.equal(result.reason_code, "EXTERNAL_AI_PROHIBITED");
  assert.ok(result.policy_references.includes("policy.no-external-ai"));
});

test("policy can require a fresh user decision before existing consent is used", () => {
  const pdp = decisionPoint([{
    id: "policy.confirm-sensitive-read",
    effect: "REQUIRE_USER_DECISION",
    when: { resource_classifications: ["documents"], requester_types: ["ai"] },
    reason_code: "FRESH_CONFIRMATION_REQUIRED"
  }]);
  const result = pdp.evaluate(request());
  assert.equal(result.outcome, PrivacyDecision.REQUIRE_USER_DECISION);
  assert.equal(result.reason_code, "FRESH_CONFIRMATION_REQUIRED");
});

test("constraint rules intersect rather than broaden allowed destinations", () => {
  const engine = new PrivacyPolicyEngine([
    { id: "p1", effect: "CONSTRAIN", constraints: { allowed_destinations: ["goreecloud-ai", "approved-processor"] } },
    { id: "p2", effect: "CONSTRAIN", constraints: { allowed_destinations: ["goreecloud-ai"] } }
  ]);
  const result = engine.evaluate(request());
  assert.deepEqual(result.constraints.allowed_destinations, ["goreecloud-ai"]);
  assert.equal(policyConstraintViolation(result, request()), null);
  assert.equal(policyConstraintViolation(result, request({ destination: "approved-processor" })), "POLICY_DESTINATION_RESTRICTED");
});

test("policy can prohibit retention and external disclosure", () => {
  const pdp = decisionPoint([{
    id: "policy.ephemeral-private",
    effect: "CONSTRAIN",
    constraints: {
      allowed_retention_modes: ["none"],
      require_no_external_disclosure: true
    }
  }]);
  assert.equal(pdp.evaluate(request({ retention: { mode: "session" } })).reason_code, "POLICY_RETENTION_RESTRICTED");
  assert.equal(pdp.evaluate(request({ external_disclosure: true, processing_zone: "trusted_service" })).reason_code, "POLICY_EXTERNAL_DISCLOSURE_PROHIBITED");
});

test("policy obligations and capability TTL limits flow through enforcement", () => {
  const pdp = decisionPoint([{
    id: "policy.short-ai-capability",
    effect: "CONSTRAIN",
    when: { requester_types: ["ai"] },
    constraints: {
      max_capability_ttl_seconds: 60,
      obligations: ["minimize_ai_context", "delete_temporary_context"]
    }
  }]);
  const authority = new PrivacyCapabilityAuthority("0123456789abcdef0123456789abcdef");
  const pep = new PrivacyEnforcementPoint({
    decisionPoint: pdp,
    capabilityAuthority: authority,
    evidenceLedger: new PrivacyEvidenceLedger()
  });
  const result = pep.authorize(request(), { capability_ttl_seconds: 300 });
  assert.equal(result.decision.outcome, PrivacyDecision.ALLOW_WITH_CONSTRAINTS);
  assert.ok(result.decision.obligations.includes("minimize_ai_context"));
  assert.ok(result.decision.obligations.includes("delete_temporary_context"));
  assert.equal(result.decision.max_capability_ttl_seconds, 60);
  const claims = authority.verify(result.capability_token);
  assert.equal(claims.exp - claims.iat, 60);
});

test("malformed policy fails closed at construction", () => {
  assert.throws(() => new PrivacyPolicyEngine([{ id: "broken", effect: "ALLOW" }]), /unsupported effect/);
  assert.throws(() => new PrivacyPolicyEngine([{ id: "broken", effect: "CONSTRAIN" }]), /requires constraints/);
});
