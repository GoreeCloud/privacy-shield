import assert from "node:assert/strict";
import test from "node:test";
import { PrivacyDecisionPoint, PrivacyDecision } from "../src/privacy-decision-point.mjs";

const manifest = {
  manifest_version: 1,
  application_id: "goreecloud-weather",
  purposes: [{ id: "local-weather", description: "Provide local weather forecasts" }],
  resources: [{
    resource: "location",
    purposes: ["local-weather"],
    operations: ["read"],
    processing_zones: ["local", "private_goreecloud"],
    destinations: ["goreecloud-weather"],
    retention: { mode: "none" }
  }]
};

function request(overrides = {}) {
  return {
    request_id: "req-1",
    requester: { id: "goreecloud-weather", type: "application" },
    resource: { id: "location", classification: "location", scope: { precision: "approximate" } },
    operation: "read",
    purpose: "local-weather",
    processing_zone: "local",
    destination: "goreecloud-weather",
    retention: { mode: "none" },
    external_disclosure: false,
    ...overrides
  };
}

function point(consentOverrides = {}) {
  return new PrivacyDecisionPoint({
    manifests: new Map([["goreecloud-weather", manifest]]),
    consents: new Map([["goreecloud-weather:location:local-weather", {
      purpose: "local-weather",
      processing_zones: ["local", "private_goreecloud"],
      destinations: ["goreecloud-weather"],
      revoked: false,
      ...consentOverrides
    }]])
  });
}

test("allows a declared local no-retention operation", () => {
  const result = point().evaluate(request());
  assert.equal(result.outcome, PrivacyDecision.ALLOW);
  assert.equal(result.reason_code, "AUTHORIZED");
});

test("requires user decision when consent is absent", () => {
  const pdp = new PrivacyDecisionPoint({ manifests: new Map([["goreecloud-weather", manifest]]) });
  const result = pdp.evaluate(request());
  assert.equal(result.outcome, PrivacyDecision.REQUIRE_USER_DECISION);
  assert.equal(result.reason_code, "CONSENT_REQUIRED");
});

test("denies a purpose not declared by the application", () => {
  const result = point().evaluate(request({ purpose: "advertising" }));
  assert.equal(result.outcome, PrivacyDecision.DENY);
  assert.equal(result.reason_code, "PURPOSE_NOT_DECLARED");
});

test("denies revoked consent", () => {
  const result = point({ revoked: true }).evaluate(request());
  assert.equal(result.outcome, PrivacyDecision.DENY);
  assert.equal(result.reason_code, "CONSENT_REVOKED");
});

test("denies an undeclared destination", () => {
  const result = point().evaluate(request({ destination: "external-weather-provider" }));
  assert.equal(result.outcome, PrivacyDecision.DENY);
  assert.equal(result.reason_code, "DESTINATION_NOT_PERMITTED");
});

test("denies an undeclared processing zone", () => {
  const result = point().evaluate(request({ processing_zone: "external" }));
  assert.equal(result.outcome, PrivacyDecision.DENY);
  assert.equal(result.reason_code, "PROCESSING_ZONE_NOT_PERMITTED");
});

test("returns constrained allow for retained private processing", () => {
  const result = point().evaluate(request({
    processing_zone: "private_goreecloud",
    retention: { mode: "session" }
  }));
  assert.equal(result.outcome, PrivacyDecision.ALLOW_WITH_CONSTRAINTS);
  assert.ok(result.obligations.includes("enforce_retention"));
  assert.ok(result.obligations.includes("enforce_processing_zone"));
});
