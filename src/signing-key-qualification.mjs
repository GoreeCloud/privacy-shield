import crypto from "node:crypto";

import { REQUIRED_SIGNING_KEY_QUALIFICATIONS } from "./signing-key-acceptance.mjs";

export const PRIVACY_SIGNING_KEY_QUALIFICATION_CONTRACT =
  "goreecloud.privacy-shield.signing-key-qualification.v1";
export const PRIVACY_SIGNING_KEY_QUALIFICATION_CONTROLLER_CONTRACT =
  "goreecloud.privacy-shield.signing-key-qualification-controller.v1";

export const AUTOMATED_SIGNING_KEY_QUALIFICATIONS = Object.freeze([
  "caller_authorization",
  "producer_identity_binding",
  "rotation",
  "retirement",
  "emergency_revocation",
  "stale_untrusted_rejection",
  "signing_audit",
  "outage_and_degraded_behavior",
  "recovery_and_continuity",
  "exact_runtime_integration",
]);

export const EXTERNAL_SIGNING_KEY_QUALIFICATIONS = Object.freeze([
  "secure_key_generation",
  "non_exportability",
  "access_control_review",
]);

const REQUIRED_CONTROLLER_METHODS = Object.freeze([
  "qualificationCapabilities",
  "attemptUnauthorizedSign",
  "rotate",
  "retire",
  "revoke",
  "setAvailability",
  "recover",
  "readAuditEvents",
  "runtimeIntegrationProbe",
]);

const SHA40 = /^[0-9a-f]{40}$/;
const FORBIDDEN_EVIDENCE_FIELD = /(?:secret|private[_-]?key|token|payload|claims|content|request[_-]?body)/i;

function requireObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

function requireString(value, code) {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
  return value;
}

function requireProvider(provider) {
  requireObject(provider, "SIGNING_KEY_QUALIFICATION_PROVIDER_REQUIRED");
  for (const method of ["activeKey", "describeKey", "signDigest", "verifyDigest"]) {
    if (typeof provider[method] !== "function") {
      throw new Error(`SIGNING_KEY_QUALIFICATION_PROVIDER_METHOD_REQUIRED:${method}`);
    }
  }
  return provider;
}

function requireController(controller) {
  requireObject(controller, "SIGNING_KEY_QUALIFICATION_CONTROLLER_REQUIRED");
  for (const method of REQUIRED_CONTROLLER_METHODS) {
    if (typeof controller[method] !== "function") {
      throw new Error(`SIGNING_KEY_QUALIFICATION_CONTROLLER_METHOD_REQUIRED:${method}`);
    }
  }
  const capabilities = requireObject(
    controller.qualificationCapabilities(),
    "INVALID_SIGNING_KEY_QUALIFICATION_CONTROLLER_CAPABILITIES",
  );
  if (capabilities.contract !== PRIVACY_SIGNING_KEY_QUALIFICATION_CONTROLLER_CONTRACT) {
    throw new Error("SIGNING_KEY_QUALIFICATION_CONTROLLER_CONTRACT_MISMATCH");
  }
  for (const capability of [
    "controlled_environment",
    "disruptive_operations_authorized",
    "evidence_minimized",
  ]) {
    if (capabilities[capability] !== true) {
      throw new Error(`SIGNING_KEY_QUALIFICATION_CONTROLLER_CAPABILITY_REQUIRED:${capability}`);
    }
  }
  if (capabilities.acceptance_authority !== false) {
    throw new Error("SIGNING_KEY_QUALIFICATION_CONTROLLER_CANNOT_AUTHORIZE_PRODUCTION");
  }
  return controller;
}

function requireTarget(target) {
  const value = requireObject(target, "SIGNING_KEY_QUALIFICATION_TARGET_REQUIRED");
  for (const field of [
    "provider_id",
    "provider_version",
    "producer_identity",
    "algorithm",
    "deployment_id",
    "exact_source_revision",
  ]) {
    requireString(value[field], `SIGNING_KEY_QUALIFICATION_TARGET_REQUIRED:${field}`);
  }
  if (!SHA40.test(value.exact_source_revision)) {
    throw new Error("INVALID_SIGNING_KEY_QUALIFICATION_SOURCE_REVISION");
  }
  return Object.freeze({ ...value });
}

function requireKeyMetadata(key, target, { active = false } = {}) {
  const metadata = requireObject(key, "INVALID_SIGNING_KEY_QUALIFICATION_KEY_METADATA");
  for (const field of [
    "key_id",
    "provider_id",
    "provider_version",
    "producer_identity",
    "algorithm",
    "status",
  ]) {
    requireString(metadata[field], "INVALID_SIGNING_KEY_QUALIFICATION_KEY_METADATA");
  }
  for (const field of ["provider_id", "provider_version", "producer_identity", "algorithm"]) {
    if (metadata[field] !== target[field]) {
      throw new Error(`SIGNING_KEY_QUALIFICATION_TARGET_MISMATCH:${field}`);
    }
  }
  if (active && metadata.status !== "active") {
    throw new Error(`SIGNING_KEY_QUALIFICATION_ACTIVE_KEY_TRUST_STATE:${metadata.status.toUpperCase()}`);
  }
  return metadata;
}

function digestFor(exerciseId, label) {
  return crypto
    .createHash("sha256")
    .update(`privacy-shield-signing-key-qualification:${exerciseId}:${label}`)
    .digest("hex");
}

function verificationFailsClosed(provider, input) {
  try {
    return provider.verifyDigest(input) !== true;
  } catch {
    return true;
  }
}

function signingFailsClosed(provider, input) {
  try {
    provider.signDigest(input);
    return false;
  } catch {
    return true;
  }
}

function containsForbiddenEvidenceField(value, seen = new Set()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some(item => containsForbiddenEvidenceField(item, seen));
  }
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_EVIDENCE_FIELD.test(key)) return true;
    if (containsForbiddenEvidenceField(item, seen)) return true;
  }
  return false;
}

function requireAuditSummary(summary) {
  const value = requireObject(summary, "INVALID_SIGNING_KEY_QUALIFICATION_AUDIT");
  if (value.complete !== true || value.minimized !== true) {
    throw new Error("SIGNING_KEY_QUALIFICATION_AUDIT_INCOMPLETE_OR_UNMINIMIZED");
  }
  if (!Array.isArray(value.categories) || !Array.isArray(value.events) || value.events.length === 0) {
    throw new Error("INVALID_SIGNING_KEY_QUALIFICATION_AUDIT");
  }
  for (const category of [
    "caller_authorization",
    "rotation",
    "retirement",
    "emergency_revocation",
    "outage_and_degraded_behavior",
    "recovery_and_continuity",
  ]) {
    if (!value.categories.includes(category)) {
      throw new Error(`SIGNING_KEY_QUALIFICATION_AUDIT_CATEGORY_REQUIRED:${category}`);
    }
  }
  if (containsForbiddenEvidenceField(value.events)) {
    throw new Error("SIGNING_KEY_QUALIFICATION_AUDIT_PRIVACY_BOUNDARY");
  }
  return value;
}

function requireRuntimeProbe(probe, target) {
  const value = requireObject(probe, "INVALID_SIGNING_KEY_RUNTIME_INTEGRATION_PROBE");
  if (value.passed !== true) throw new Error("SIGNING_KEY_RUNTIME_INTEGRATION_NOT_PASSED");
  for (const field of [
    "provider_id",
    "provider_version",
    "deployment_id",
    "exact_source_revision",
  ]) {
    if (value[field] !== target[field]) {
      throw new Error(`SIGNING_KEY_RUNTIME_INTEGRATION_MISMATCH:${field}`);
    }
  }
  return value;
}

function resultEntry(exerciseId, category, state, code) {
  const evidenceResult = state === "passed" ? "passed" : state === "failed" ? "failed" : "informational";
  return Object.freeze({
    qualification: category,
    state,
    code,
    evidence: Object.freeze({
      id: `qualification-${category.replaceAll("_", "-")}`,
      category,
      result: evidenceResult,
      reference: `qualification-run:${exerciseId}#${category}`,
    }),
  });
}

/**
 * Run controlled operational signing-key exercises against an injected provider.
 *
 * This harness is intentionally non-authorizing. It may produce minimized passing
 * evidence for operational behavior, but it cannot prove secure generation,
 * hardware/provider non-exportability, access-control review, or production
 * acceptance. Those remain separate external evidence and acceptance gates.
 */
export function runSigningKeyOperationalQualification({
  provider,
  controller,
  target,
  exercise_id,
  authorization_reference,
  now = new Date(),
} = {}) {
  const signingProvider = requireProvider(provider);
  const qualificationController = requireController(controller);
  const expected = requireTarget(target);
  const exerciseId = requireString(exercise_id, "SIGNING_KEY_QUALIFICATION_EXERCISE_ID_REQUIRED");
  const authorizationReference = requireString(
    authorization_reference,
    "SIGNING_KEY_QUALIFICATION_AUTHORIZATION_REFERENCE_REQUIRED",
  );
  const startedAt = new Date(now);
  if (!Number.isFinite(startedAt.getTime())) throw new Error("INVALID_SIGNING_KEY_QUALIFICATION_TIME");

  const results = new Map();
  const pass = (name, code = "PASSED") => results.set(name, resultEntry(exerciseId, name, "passed", code));
  const fail = (name, error) => results.set(
    name,
    resultEntry(exerciseId, name, "failed", error instanceof Error ? error.message : String(error)),
  );

  for (const name of EXTERNAL_SIGNING_KEY_QUALIFICATIONS) {
    results.set(
      name,
      resultEntry(exerciseId, name, "requires_external_evidence", "EXTERNAL_EVIDENCE_REQUIRED"),
    );
  }

  const original = requireKeyMetadata(signingProvider.activeKey(), expected, { active: true });
  const originalDigest = digestFor(exerciseId, "pre-rotation");
  const originalSignature = signingProvider.signDigest({
    key_id: original.key_id,
    digest: originalDigest,
  });
  if (typeof originalSignature !== "string" || !originalSignature) {
    throw new Error("SIGNING_KEY_QUALIFICATION_BASELINE_SIGNATURE_REQUIRED");
  }
  if (signingProvider.verifyDigest({
    key_id: original.key_id,
    digest: originalDigest,
    signature: originalSignature,
  }) !== true) {
    throw new Error("SIGNING_KEY_QUALIFICATION_BASELINE_VERIFICATION_FAILED");
  }

  try {
    if (original.producer_identity !== expected.producer_identity) {
      throw new Error("SIGNING_KEY_QUALIFICATION_PRODUCER_IDENTITY_MISMATCH");
    }
    pass("producer_identity_binding");
  } catch (error) {
    fail("producer_identity_binding", error);
  }

  try {
    const unauthorized = qualificationController.attemptUnauthorizedSign({
      key_id: original.key_id,
      digest: digestFor(exerciseId, "unauthorized-caller"),
    });
    if (unauthorized === true || unauthorized?.allowed === true) {
      throw new Error("SIGNING_KEY_QUALIFICATION_UNAUTHORIZED_SIGN_ALLOWED");
    }
    if (!(unauthorized === false || unauthorized?.allowed === false || unauthorized?.denied === true)) {
      throw new Error("SIGNING_KEY_QUALIFICATION_UNAUTHORIZED_SIGN_RESULT_REQUIRED");
    }
    pass("caller_authorization");
  } catch (error) {
    if (error?.qualification_denied === true) pass("caller_authorization", "UNAUTHORIZED_SIGN_DENIED");
    else fail("caller_authorization", error);
  }

  let rotated;
  try {
    qualificationController.rotate({
      exercise_id: exerciseId,
      previous_key_id: original.key_id,
    });
    rotated = requireKeyMetadata(signingProvider.activeKey(), expected, { active: true });
    if (rotated.key_id === original.key_id) {
      throw new Error("SIGNING_KEY_QUALIFICATION_ROTATION_DID_NOT_CHANGE_KEY");
    }
    const oldMetadata = requireKeyMetadata(signingProvider.describeKey(original.key_id), expected);
    if (oldMetadata.status !== "verifying") {
      throw new Error(`SIGNING_KEY_QUALIFICATION_ROTATION_OVERLAP_STATE:${oldMetadata.status.toUpperCase()}`);
    }
    if (signingProvider.verifyDigest({
      key_id: original.key_id,
      digest: originalDigest,
      signature: originalSignature,
    }) !== true) {
      throw new Error("SIGNING_KEY_QUALIFICATION_ROTATION_OVERLAP_VERIFY_FAILED");
    }
    pass("rotation");
  } catch (error) {
    fail("rotation", error);
  }

  try {
    if (!rotated) throw new Error("SIGNING_KEY_QUALIFICATION_RETIREMENT_BLOCKED_BY_ROTATION_FAILURE");
    qualificationController.retire({ exercise_id: exerciseId, key_id: original.key_id });
    const retired = signingProvider.describeKey(original.key_id);
    if (retired !== null && retired?.status !== "retired") {
      throw new Error("SIGNING_KEY_QUALIFICATION_RETIRED_KEY_STILL_TRUSTED");
    }
    if (!verificationFailsClosed(signingProvider, {
      key_id: original.key_id,
      digest: originalDigest,
      signature: originalSignature,
    })) {
      throw new Error("SIGNING_KEY_QUALIFICATION_RETIRED_KEY_VERIFIED");
    }
    pass("retirement");
  } catch (error) {
    fail("retirement", error);
  }

  let revokedKeyId = null;
  let revokedInput = null;
  try {
    const active = requireKeyMetadata(signingProvider.activeKey(), expected, { active: true });
    revokedKeyId = active.key_id;
    const digest = digestFor(exerciseId, "emergency-revocation");
    const signature = signingProvider.signDigest({ key_id: active.key_id, digest });
    revokedInput = { key_id: active.key_id, digest, signature };
    qualificationController.revoke({ exercise_id: exerciseId, key_id: active.key_id });
    const revoked = signingProvider.describeKey(active.key_id);
    if (!revoked || revoked.status !== "revoked") {
      throw new Error("SIGNING_KEY_QUALIFICATION_REVOCATION_STATE_NOT_OBSERVED");
    }
    pass("emergency_revocation");
  } catch (error) {
    fail("emergency_revocation", error);
  }

  try {
    if (!revokedInput || !revokedKeyId) {
      throw new Error("SIGNING_KEY_QUALIFICATION_STALE_REJECTION_BLOCKED_BY_REVOCATION_FAILURE");
    }
    if (!verificationFailsClosed(signingProvider, revokedInput)) {
      throw new Error("SIGNING_KEY_QUALIFICATION_REVOKED_KEY_VERIFIED");
    }
    pass("stale_untrusted_rejection");
  } catch (error) {
    fail("stale_untrusted_rejection", error);
  }

  try {
    qualificationController.recover({
      exercise_id: exerciseId,
      reason: "post-emergency-revocation",
    });
    const recovered = requireKeyMetadata(signingProvider.activeKey(), expected, { active: true });
    const digest = digestFor(exerciseId, "post-revocation-recovery");
    const signature = signingProvider.signDigest({ key_id: recovered.key_id, digest });
    if (signingProvider.verifyDigest({ key_id: recovered.key_id, digest, signature }) !== true) {
      throw new Error("SIGNING_KEY_QUALIFICATION_RECOVERY_VERIFY_FAILED");
    }
    pass("recovery_and_continuity");
  } catch (error) {
    fail("recovery_and_continuity", error);
  }

  try {
    const active = requireKeyMetadata(signingProvider.activeKey(), expected, { active: true });
    qualificationController.setAvailability({ exercise_id: exerciseId, available: false });
    const unavailableInput = {
      key_id: active.key_id,
      digest: digestFor(exerciseId, "provider-outage"),
    };
    if (!signingFailsClosed(signingProvider, unavailableInput)) {
      throw new Error("SIGNING_KEY_QUALIFICATION_OUTAGE_DID_NOT_FAIL_CLOSED");
    }
    qualificationController.setAvailability({ exercise_id: exerciseId, available: true });
    qualificationController.recover({ exercise_id: exerciseId, reason: "provider-availability-restored" });
    const restored = requireKeyMetadata(signingProvider.activeKey(), expected, { active: true });
    const digest = digestFor(exerciseId, "provider-restored");
    const signature = signingProvider.signDigest({ key_id: restored.key_id, digest });
    if (signingProvider.verifyDigest({ key_id: restored.key_id, digest, signature }) !== true) {
      throw new Error("SIGNING_KEY_QUALIFICATION_OUTAGE_RECOVERY_VERIFY_FAILED");
    }
    pass("outage_and_degraded_behavior");
    if (results.get("recovery_and_continuity")?.state !== "passed") {
      pass("recovery_and_continuity", "RECOVERED_AFTER_PROVIDER_OUTAGE");
    }
  } catch (error) {
    fail("outage_and_degraded_behavior", error);
  } finally {
    try {
      qualificationController.setAvailability({ exercise_id: exerciseId, available: true });
    } catch {
      // The result remains non-authorizing; cleanup failure cannot be hidden by a pass.
      if (results.get("outage_and_degraded_behavior")?.state === "passed") {
        fail("outage_and_degraded_behavior", new Error("SIGNING_KEY_QUALIFICATION_AVAILABILITY_CLEANUP_FAILED"));
      }
    }
  }

  try {
    requireAuditSummary(qualificationController.readAuditEvents({ exercise_id: exerciseId }));
    pass("signing_audit");
  } catch (error) {
    fail("signing_audit", error);
  }

  try {
    requireRuntimeProbe(
      qualificationController.runtimeIntegrationProbe({
        exercise_id: exerciseId,
        target: expected,
      }),
      expected,
    );
    pass("exact_runtime_integration");
  } catch (error) {
    fail("exact_runtime_integration", error);
  }

  for (const name of AUTOMATED_SIGNING_KEY_QUALIFICATIONS) {
    if (!results.has(name)) {
      results.set(name, resultEntry(exerciseId, name, "not_run", "QUALIFICATION_NOT_RUN"));
    }
  }
  for (const name of REQUIRED_SIGNING_KEY_QUALIFICATIONS) {
    if (!results.has(name)) {
      results.set(name, resultEntry(exerciseId, name, "not_run", "QUALIFICATION_NOT_RUN"));
    }
  }

  const ordered = REQUIRED_SIGNING_KEY_QUALIFICATIONS.map(name => results.get(name));
  return Object.freeze({
    schema_version: 1,
    contract_id: PRIVACY_SIGNING_KEY_QUALIFICATION_CONTRACT,
    authorizing: false,
    exercise_id: exerciseId,
    authorization_reference: authorizationReference,
    started_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    target: expected,
    privacy: Object.freeze({
      raw_private_payloads_in_qualification_evidence: false,
      secret_material_in_qualification_evidence: false,
      full_capability_tokens_in_qualification_evidence: false,
      raw_capability_claims_in_qualification_evidence: false,
    }),
    qualification: Object.freeze(Object.fromEntries(ordered.map(item => [item.qualification, item.state]))),
    evidence: Object.freeze(ordered.map(item => item.evidence)),
    observations: Object.freeze(ordered.map(item => Object.freeze({
      qualification: item.qualification,
      state: item.state,
      code: item.code,
    }))),
    limitations: Object.freeze([
      "This qualification run is non-authorizing and cannot grant production acceptance.",
      "Secure key-generation evidence must come from the exact custody provider/deployment.",
      "Non-exportability evidence must come from the exact custody provider/deployment.",
      "Formal access-control review remains external evidence.",
      "A fresh exact-provider acceptance record is still required for production runtime construction.",
    ]),
  });
}
