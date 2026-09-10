import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  AUTOMATED_SIGNING_KEY_QUALIFICATIONS,
  EXTERNAL_SIGNING_KEY_QUALIFICATIONS,
  PRIVACY_SIGNING_KEY_QUALIFICATION_CONTRACT,
  PRIVACY_SIGNING_KEY_QUALIFICATION_CONTROLLER_CONTRACT,
  runSigningKeyOperationalQualification,
} from "../src/signing-key-qualification.mjs";

const TARGET = Object.freeze({
  provider_id: "qualification-test-provider",
  provider_version: "1.0.0-test",
  producer_identity: "goreecloud-privacy-shield:qualification-test",
  algorithm: "HS256",
  deployment_id: "qualification-test-deployment",
  exact_source_revision: "1234567890abcdef1234567890abcdef12345678",
});

function secretFor(keyId) {
  return crypto.createHash("sha256").update(`qualification-secret:${keyId}`).digest("hex");
}

class OperationalTestProvider {
  constructor() {
    this.keys = new Map([["test-key-1", {
      secret: secretFor("test-key-1"),
      status: "active",
    }]]);
    this.activeKeyId = "test-key-1";
    this.available = true;
    this.counter = 1;
  }

  activeKey() {
    return this.describeKey(this.activeKeyId);
  }

  describeKey(keyId) {
    const record = this.keys.get(keyId);
    if (!record) return null;
    return Object.freeze({
      key_id: keyId,
      provider_id: TARGET.provider_id,
      provider_version: TARGET.provider_version,
      producer_identity: TARGET.producer_identity,
      algorithm: TARGET.algorithm,
      status: record.status,
    });
  }

  signDigest({ key_id, digest }) {
    if (!this.available) throw new Error("TEST_PROVIDER_UNAVAILABLE");
    const record = this.keys.get(key_id);
    if (!record || key_id !== this.activeKeyId || record.status !== "active") {
      throw new Error("TEST_PROVIDER_KEY_NOT_ACTIVE");
    }
    return crypto.createHmac("sha256", record.secret).update(Buffer.from(digest, "hex")).digest("base64url");
  }

  verifyDigest({ key_id, digest, signature }) {
    if (!this.available) throw new Error("TEST_PROVIDER_UNAVAILABLE");
    const record = this.keys.get(key_id);
    if (!record || !new Set(["active", "verifying"]).has(record.status)) {
      throw new Error("TEST_PROVIDER_KEY_UNTRUSTED");
    }
    const expected = crypto.createHmac("sha256", record.secret).update(Buffer.from(digest, "hex")).digest();
    const supplied = Buffer.from(signature, "base64url");
    return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
  }

  rotate() {
    const previous = this.keys.get(this.activeKeyId);
    if (previous && previous.status === "active") previous.status = "verifying";
    this.counter += 1;
    const keyId = `test-key-${this.counter}`;
    this.keys.set(keyId, { secret: secretFor(keyId), status: "active" });
    this.activeKeyId = keyId;
    return this.describeKey(keyId);
  }

  retire(keyId) {
    if (keyId === this.activeKeyId) throw new Error("TEST_CANNOT_RETIRE_ACTIVE_KEY");
    const record = this.keys.get(keyId);
    if (!record) return false;
    record.status = "retired";
    return true;
  }

  revoke(keyId) {
    const record = this.keys.get(keyId);
    if (!record) return false;
    record.status = "revoked";
    return true;
  }

  recover() {
    const current = this.keys.get(this.activeKeyId);
    if (!current || current.status !== "active") this.rotate();
    return this.activeKey();
  }
}

class QualificationController {
  constructor(provider, {
    allowUnauthorized = false,
    forbiddenAuditField = false,
    disruptive = true,
  } = {}) {
    this.provider = provider;
    this.allowUnauthorized = allowUnauthorized;
    this.forbiddenAuditField = forbiddenAuditField;
    this.disruptive = disruptive;
    this.events = [];
  }

  qualificationCapabilities() {
    return {
      contract: PRIVACY_SIGNING_KEY_QUALIFICATION_CONTROLLER_CONTRACT,
      controlled_environment: true,
      disruptive_operations_authorized: this.disruptive,
      evidence_minimized: true,
      acceptance_authority: false,
    };
  }

  log(category, operation, outcome = "passed") {
    this.events.push({ category, operation, outcome, key_id: this.provider.activeKeyId });
  }

  attemptUnauthorizedSign() {
    this.log("caller_authorization", "unauthorized-sign", this.allowUnauthorized ? "allowed" : "denied");
    return { allowed: this.allowUnauthorized, denied: !this.allowUnauthorized };
  }

  rotate() {
    const result = this.provider.rotate();
    this.log("rotation", "rotate");
    return result;
  }

  retire({ key_id }) {
    const result = this.provider.retire(key_id);
    this.log("retirement", "retire");
    return result;
  }

  revoke({ key_id }) {
    const result = this.provider.revoke(key_id);
    this.log("emergency_revocation", "revoke");
    return result;
  }

  setAvailability({ available }) {
    this.provider.available = available;
    this.events.push({
      category: "outage_and_degraded_behavior",
      operation: available ? "availability-restored" : "availability-disabled",
      outcome: "passed",
      key_id: this.provider.activeKeyId,
    });
  }

  recover() {
    this.provider.available = true;
    const result = this.provider.recover();
    this.log("recovery_and_continuity", "recover");
    return result;
  }

  readAuditEvents() {
    const events = this.events.map(event => ({ ...event }));
    if (this.forbiddenAuditField) events.push({ category: "signing_audit", payload: "forbidden" });
    return {
      complete: true,
      minimized: true,
      categories: [
        "caller_authorization",
        "rotation",
        "retirement",
        "emergency_revocation",
        "outage_and_degraded_behavior",
        "recovery_and_continuity",
      ],
      events,
    };
  }

  runtimeIntegrationProbe() {
    return {
      passed: true,
      provider_id: TARGET.provider_id,
      provider_version: TARGET.provider_version,
      deployment_id: TARGET.deployment_id,
      exact_source_revision: TARGET.exact_source_revision,
    };
  }
}

function run(options = {}) {
  const provider = options.provider ?? new OperationalTestProvider();
  const controller = options.controller ?? new QualificationController(provider, options.controllerOptions);
  return runSigningKeyOperationalQualification({
    provider,
    controller,
    target: options.target ?? TARGET,
    exercise_id: options.exercise_id ?? "qualification-test-run",
    authorization_reference: "test-only-controlled-qualification",
    now: new Date("2026-09-10T05:00:00Z"),
  });
}

test("qualification harness produces non-authorizing minimized operational evidence", () => {
  const result = run();

  assert.equal(result.contract_id, PRIVACY_SIGNING_KEY_QUALIFICATION_CONTRACT);
  assert.equal(result.authorizing, false);
  assert.deepEqual(result.target, TARGET);
  assert.equal(result.privacy.raw_private_payloads_in_qualification_evidence, false);
  assert.equal(result.privacy.secret_material_in_qualification_evidence, false);
  assert.equal(result.privacy.full_capability_tokens_in_qualification_evidence, false);
  assert.equal(result.privacy.raw_capability_claims_in_qualification_evidence, false);

  for (const name of AUTOMATED_SIGNING_KEY_QUALIFICATIONS) {
    assert.equal(result.qualification[name], "passed", name);
    const evidence = result.evidence.find(item => item.category === name);
    assert.equal(evidence.result, "passed", name);
  }

  for (const name of EXTERNAL_SIGNING_KEY_QUALIFICATIONS) {
    assert.equal(result.qualification[name], "requires_external_evidence", name);
    const evidence = result.evidence.find(item => item.category === name);
    assert.equal(evidence.result, "informational", name);
  }
});

test("qualification controller must explicitly authorize disruptive exercises", () => {
  const provider = new OperationalTestProvider();
  const controller = new QualificationController(provider, { disruptive: false });
  assert.throws(
    () => run({ provider, controller }),
    /SIGNING_KEY_QUALIFICATION_CONTROLLER_CAPABILITY_REQUIRED:disruptive_operations_authorized/,
  );
});

test("unauthorized signing acceptance is recorded as a failed qualification", () => {
  const result = run({ controllerOptions: { allowUnauthorized: true } });
  assert.equal(result.authorizing, false);
  assert.equal(result.qualification.caller_authorization, "failed");
  assert.equal(
    result.observations.find(item => item.qualification === "caller_authorization").code,
    "SIGNING_KEY_QUALIFICATION_UNAUTHORIZED_SIGN_ALLOWED",
  );
});

test("audit evidence with forbidden private payload fields fails the signing-audit qualification", () => {
  const result = run({ controllerOptions: { forbiddenAuditField: true } });
  assert.equal(result.qualification.signing_audit, "failed");
  assert.equal(
    result.observations.find(item => item.qualification === "signing_audit").code,
    "SIGNING_KEY_QUALIFICATION_AUDIT_PRIVACY_BOUNDARY",
  );
});

test("provider identity drift fails before operational exercises begin", () => {
  const provider = new OperationalTestProvider();
  assert.throws(
    () => run({
      provider,
      controller: new QualificationController(provider),
      target: { ...TARGET, provider_version: "unexpected-version" },
    }),
    /SIGNING_KEY_QUALIFICATION_TARGET_MISMATCH:provider_version/,
  );
});

test("runtime integration probe is exact-revision and exact-deployment bound", () => {
  const provider = new OperationalTestProvider();
  const controller = new QualificationController(provider);
  controller.runtimeIntegrationProbe = () => ({
    passed: true,
    provider_id: TARGET.provider_id,
    provider_version: TARGET.provider_version,
    deployment_id: "wrong-deployment",
    exact_source_revision: TARGET.exact_source_revision,
  });
  const result = run({ provider, controller });
  assert.equal(result.qualification.exact_runtime_integration, "failed");
  assert.equal(
    result.observations.find(item => item.qualification === "exact_runtime_integration").code,
    "SIGNING_KEY_RUNTIME_INTEGRATION_MISMATCH:deployment_id",
  );
});
