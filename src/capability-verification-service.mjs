const CAPABILITY_VERIFICATION_CONTRACT_VERSION = 1;

const REQUIRED_EXPECTED_CLAIMS = Object.freeze([
  "requester_id",
  "resource_id",
  "purpose",
  "operation",
  "processing_zone",
  "destination",
  "retention_mode",
]);

function requireExactNonEmptyString(value, label) {
  if (typeof value !== "string" || !value) {
    throw new TypeError(`${label} is required`);
  }
  if (value !== value.trim()) {
    throw new TypeError(`${label} must not contain leading or trailing whitespace`);
  }
  return value;
}

function requireContractVersion(value) {
  if (value !== CAPABILITY_VERIFICATION_CONTRACT_VERSION) {
    throw new Error("CAPABILITY_VERIFICATION_CONTRACT_VERSION_UNSUPPORTED");
  }
  return value;
}

function requireExpectedClaims(expected) {
  if (!expected || typeof expected !== "object" || Array.isArray(expected)) {
    throw new TypeError("Capability verification expected claims are required");
  }
  const keys = Object.keys(expected);
  const unexpected = keys.filter(key => !REQUIRED_EXPECTED_CLAIMS.includes(key));
  if (unexpected.length > 0) {
    throw new TypeError(`Capability verification expected claims contain unsupported fields: ${unexpected.join(", ")}`);
  }
  const normalized = {};
  for (const key of REQUIRED_EXPECTED_CLAIMS) {
    normalized[key] = requireExactNonEmptyString(expected[key], `Capability expected claim ${key}`);
  }
  return normalized;
}

function requireConsumeFlag(value) {
  if (typeof value !== "boolean") {
    throw new TypeError("Capability verification consume must be boolean");
  }
  return value;
}

/**
 * Authority-owned verification boundary for first-party runtimes that carry an
 * opaque Privacy Shield capability reference rather than a signed bearer token.
 *
 * Authentication of the caller is intentionally injected as consumer_id plus an
 * allowlist. A concrete IPC/network adapter must derive consumer_id from its
 * authenticated transport identity rather than trusting arbitrary request data.
 * This service never returns the signed token or signing keys.
 *
 * The envelope is versioned independently from capability-token format so IPC
 * clients can fail closed when the verification protocol itself changes.
 */
export class PrivacyCapabilityVerificationService {
  constructor({ enforcementPoint, allowedConsumers = [] } = {}) {
    if (!enforcementPoint || typeof enforcementPoint.enforceReference !== "function" ||
        typeof enforcementPoint.enforceReferenceOnce !== "function") {
      throw new TypeError("Capability verification service requires a Privacy Enforcement Point");
    }
    this.enforcementPoint = enforcementPoint;
    this.allowedConsumers = new Set(
      [...allowedConsumers].map(value => requireExactNonEmptyString(value, "Allowed capability consumer")),
    );
  }

  verify({
    contract_version,
    consumer_id,
    capability_reference,
    expected,
    consume = false,
  } = {}) {
    requireContractVersion(contract_version);

    const consumerId = requireExactNonEmptyString(consumer_id, "Capability verification consumer_id");
    if (!this.allowedConsumers.has(consumerId)) {
      throw new Error("CAPABILITY_VERIFICATION_CONSUMER_NOT_ALLOWED");
    }

    const reference = requireExactNonEmptyString(
      capability_reference,
      "Capability verification capability_reference",
    );
    if (!reference.startsWith("psc_")) {
      throw new Error("INVALID_CAPABILITY_ID");
    }

    const normalizedExpected = requireExpectedClaims(expected);
    const consumeFlag = requireConsumeFlag(consume);
    const result = consumeFlag
      ? this.enforcementPoint.enforceReferenceOnce(reference, normalizedExpected)
      : this.enforcementPoint.enforceReference(reference, normalizedExpected);

    return Object.freeze({
      contract_version: CAPABILITY_VERIFICATION_CONTRACT_VERSION,
      authorized: result.authorized === true,
      capability_reference: reference,
      constraints: Object.freeze({ ...result.constraints }),
    });
  }
}

export {
  CAPABILITY_VERIFICATION_CONTRACT_VERSION,
  REQUIRED_EXPECTED_CLAIMS,
};
