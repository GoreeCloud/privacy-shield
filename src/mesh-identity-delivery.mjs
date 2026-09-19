import { deliverPrivacyMeshEvidence } from "./mesh-delivery.mjs";

const RECEIPT_SCHEMA = "goreecloud.privacy-shield.mesh-identity-delivery.v1";
const IDENTITY_AUTHORITY = "goreecloud-identity";
const SERVICE_ID = "privacy-shield";
const AUDIENCE = "goreecloud-mesh";
const REQUIRED_SCOPE = "mesh.evidence.write";
const CREDENTIAL_FIELDS = new Set([
  "access_token",
  "credential_id",
  "service_id",
  "audience",
  "scopes",
  "issued_at",
  "expires_at",
  "rotation_state",
  "revocation_state",
  "trust",
]);
const TRUST_FIELDS = new Set(["authority", "status", "verified_at", "valid_until"]);
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,239}$/;

function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

function closed(value, allowed, name) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${name}.${key} is unsupported`);
  }
}

function text(value, name, maximum = 240, pattern = null) {
  if (
    typeof value !== "string" ||
    !value ||
    value !== value.trim() ||
    value.length > maximum ||
    CONTROL.test(value) ||
    (pattern && !pattern.test(value))
  ) {
    throw new Error(`${name} is invalid or noncanonical`);
  }
  return value;
}

function timestamp(value, name) {
  text(value, name, 40);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error(`${name} must include an explicit timezone`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} is invalid`);
  return parsed;
}

function duration(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer duration in milliseconds`);
  }
  return value;
}

function exactScopes(value) {
  if (!Array.isArray(value) || value.length !== 1 || value[0] !== REQUIRED_SCOPE) {
    throw new Error(`Identity credential scopes must be exactly ${REQUIRED_SCOPE}`);
  }
  return Object.freeze([...value]);
}

function bearer(value) {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) throw new Error("Identity access token is required");
  if (token.length > 16_384) throw new Error("Identity access token is oversized");
  if (/\r|\n/.test(token)) throw new Error("Identity access token is malformed");
  return token;
}

/**
 * Acquire and validate one fresh GoreeCloud Identity credential attestation.
 *
 * This stays module-private so callers cannot accidentally receive the bearer
 * token as an application-visible credential object. The token only flows into
 * the immediately following Mesh transport call.
 */
async function acquireVerifiedMeshIdentityCredential(
  credentialProvider,
  {
    now = new Date(),
    maxCredentialAgeMs,
    minRemainingValidityMs,
  } = {},
) {
  if (typeof credentialProvider !== "function") {
    throw new Error("GoreeCloud Identity credential provider must be a function");
  }
  const nowMs = now instanceof Date ? now.getTime() : timestamp(now, "now");
  if (!Number.isFinite(nowMs)) throw new Error("now must be a valid timestamp");
  const maxAge = duration(maxCredentialAgeMs, "maxCredentialAgeMs");
  const minRemaining = duration(minRemainingValidityMs, "minRemainingValidityMs");

  let credential;
  try {
    credential = await credentialProvider({
      service_id: SERVICE_ID,
      audience: AUDIENCE,
      scopes: Object.freeze([REQUIRED_SCOPE]),
      max_credential_age_ms: maxAge,
      min_remaining_validity_ms: minRemaining,
    });
  } catch {
    throw new Error("GoreeCloud Identity credential acquisition failed");
  }

  credential = object(credential, "Identity credential attestation");
  closed(credential, CREDENTIAL_FIELDS, "Identity credential attestation");
  if (Object.keys(credential).length !== CREDENTIAL_FIELDS.size) {
    throw new Error("Identity credential attestation is incomplete");
  }

  const accessToken = bearer(credential.access_token);
  const credentialId = text(credential.credential_id, "credential_id", 240, IDENTIFIER);
  if (credential.service_id !== SERVICE_ID) throw new Error("Identity credential service identity mismatch");
  if (credential.audience !== AUDIENCE) throw new Error("Identity credential audience mismatch");
  const scopes = exactScopes(credential.scopes);

  const issuedAt = timestamp(credential.issued_at, "issued_at");
  const expiresAt = timestamp(credential.expires_at, "expires_at");
  if (issuedAt > nowMs) throw new Error("Identity credential cannot be future-issued");
  if (expiresAt <= issuedAt) throw new Error("Identity credential expiry must follow issuance");
  if (nowMs - issuedAt > maxAge) throw new Error("Identity credential exceeds caller freshness policy");
  if (expiresAt - nowMs < minRemaining) throw new Error("Identity credential has insufficient remaining validity");

  if (credential.rotation_state !== "current") {
    throw new Error("Identity credential is not current under rotation policy");
  }
  if (credential.revocation_state !== "active") {
    throw new Error("Identity credential is revoked or not active");
  }

  const trust = object(credential.trust, "Identity trust verification");
  closed(trust, TRUST_FIELDS, "Identity trust verification");
  if (Object.keys(trust).length !== TRUST_FIELDS.size) {
    throw new Error("Identity trust verification is incomplete");
  }
  if (trust.authority !== IDENTITY_AUTHORITY) throw new Error("Identity trust authority mismatch");
  if (trust.status !== "verified") throw new Error("Identity credential trust is not verified");
  const verifiedAt = timestamp(trust.verified_at, "trust.verified_at");
  const trustValidUntil = timestamp(trust.valid_until, "trust.valid_until");
  if (verifiedAt > nowMs) throw new Error("Identity trust verification cannot be future-dated");
  if (verifiedAt < issuedAt) throw new Error("Identity trust verification predates credential issuance");
  if (trustValidUntil <= nowMs) throw new Error("Identity trust verification is expired");
  if (trustValidUntil - nowMs < minRemaining) {
    throw new Error("Identity trust verification has insufficient remaining validity");
  }
  if (trustValidUntil > expiresAt) {
    throw new Error("Identity trust validity cannot outlive the credential");
  }

  return {
    accessToken,
    identity: Object.freeze({
      authority: IDENTITY_AUTHORITY,
      credential_id: credentialId,
      service_id: SERVICE_ID,
      audience: AUDIENCE,
      scopes,
      issued_at: new Date(issuedAt).toISOString(),
      expires_at: new Date(expiresAt).toISOString(),
      rotation_state: "current",
      revocation_state: "active",
      trust_status: "verified",
      trust_verified_at: new Date(verifiedAt).toISOString(),
      trust_valid_until: new Date(trustValidUntil).toISOString(),
    }),
  };
}

/**
 * Deliver Privacy Shield evidence through the FR-012 identity-authenticated
 * path. The returned record is a handling receipt only: it cannot create,
 * extend, transfer, or upgrade Privacy Shield data-use authority.
 */
export async function deliverIdentityAuthenticatedPrivacyMeshEvidence({
  envelope,
  meshBaseUrl,
  credentialProvider,
  maxCredentialAgeMs,
  minRemainingValidityMs,
  fetchImpl = globalThis.fetch,
  signal,
  now = new Date(),
} = {}) {
  const acquired = await acquireVerifiedMeshIdentityCredential(credentialProvider, {
    now,
    maxCredentialAgeMs,
    minRemainingValidityMs,
  });

  const receipt = await deliverPrivacyMeshEvidence({
    envelope,
    meshBaseUrl,
    bearerToken: acquired.accessToken,
    fetchImpl,
    signal,
    identityReceiptExpectation: {
      credential_id: acquired.identity.credential_id,
      service_id: SERVICE_ID,
      audience: AUDIENCE,
      scopes: [REQUIRED_SCOPE],
    },
  });

  const acceptedAt = timestamp(receipt.accepted_at, "Mesh accepted_at");
  const credentialIssuedAt = Date.parse(acquired.identity.issued_at);
  const credentialExpiresAt = Date.parse(acquired.identity.expires_at);
  const trustVerifiedAt = Date.parse(acquired.identity.trust_verified_at);
  const trustValidUntil = Date.parse(acquired.identity.trust_valid_until);
  if (acceptedAt < credentialIssuedAt) {
    throw new Error("Mesh accepted_at predates credential issuance");
  }
  if (acceptedAt < trustVerifiedAt) {
    throw new Error("Mesh accepted_at predates Identity trust verification");
  }
  if (acceptedAt >= credentialExpiresAt) {
    throw new Error("Mesh accepted_at is outside credential validity");
  }
  if (acceptedAt >= trustValidUntil) {
    throw new Error("Mesh accepted_at is outside Identity trust validity");
  }

  return {
    schema_version: RECEIPT_SCHEMA,
    evidence_id: receipt.evidence_id,
    replayed: receipt.replayed,
    accepted_at: new Date(acceptedAt).toISOString(),
    producer_service_id: receipt.producer_service_id,
    identity: acquired.identity,
    mesh_identity_verified: true,
    authorization_effect: false,
    authority_transfer: false,
  };
}

export const MESH_IDENTITY_REQUIREMENTS = Object.freeze({
  identity_authority: IDENTITY_AUTHORITY,
  service_id: SERVICE_ID,
  audience: AUDIENCE,
  scopes: Object.freeze([REQUIRED_SCOPE]),
  authorization_effect: false,
  authority_transfer: false,
});