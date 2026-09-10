import crypto from "node:crypto";

export const PRIVACY_SIGNING_KEY_PROVIDER_CONTRACT =
  "goreecloud.privacy-shield.signing-key-provider.v1";

export const PRODUCTION_SIGNING_KEY_CAPABILITIES = Object.freeze([
  "non_exportable_signing_material",
  "opaque_key_references",
  "digest_only_signing",
  "key_identifiers",
  "rotation",
  "retirement",
  "revocation",
  "producer_identity_binding",
  "auditable_signing",
  "fail_closed_on_untrusted_state",
]);

const VERIFYING_KEY_STATES = new Set(["active", "verifying"]);

function requireSecret(secret, label) {
  if (!secret || String(secret).length < 32) {
    throw new TypeError(`${label} requires a secret of at least 32 characters`);
  }
  return String(secret);
}

function requireKeyId(keyId) {
  const value = String(keyId ?? "").trim();
  if (!value) throw new TypeError("Capability key id is required");
  return value;
}

function requireDigest(digest) {
  const value = String(digest ?? "").trim();
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new TypeError("Capability signing digest must be lowercase SHA-256 hex");
  }
  return value;
}

function safeSignatureBuffer(signature) {
  try {
    return Buffer.from(String(signature ?? ""), "base64url");
  } catch {
    return Buffer.alloc(0);
  }
}

/**
 * Development/test provider for the signing-provider interface.
 *
 * This provider deliberately keeps raw secret material in process memory and is
 * therefore never production eligible. Its public methods expose only opaque key
 * metadata and digest-signing operations so consumers can exercise the same
 * interface expected from a production KMS/HSM-backed provider without receiving
 * private signing material through the authority API.
 */
export class InMemoryPrivacySigningKeyProvider {
  constructor(configuration, {
    provider_id = "in-memory-development",
    producer_identity = "goreecloud-privacy-shield-development",
  } = {}) {
    this.providerId = String(provider_id);
    this.producerIdentity = String(producer_identity);
    this.keys = new Map();

    if (typeof configuration === "string") {
      this.activeKeyIdValue = "development-v1";
      this.keys.set(this.activeKeyIdValue, {
        secret: requireSecret(configuration, "Capability authority"),
        status: "active",
        algorithm: "HS256",
      });
      return;
    }

    if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
      throw new TypeError("Capability authority requires a secret or key configuration");
    }

    const { active_key_id: activeKeyId, keys = {} } = configuration;
    if (!activeKeyId || typeof activeKeyId !== "string") {
      throw new TypeError("Capability authority requires active_key_id");
    }

    for (const [keyId, secret] of Object.entries(keys)) {
      this.keys.set(keyId, {
        secret: requireSecret(secret, `Capability key ${keyId}`),
        status: keyId === activeKeyId ? "active" : "verifying",
        algorithm: "HS256",
      });
    }
    if (!this.keys.has(activeKeyId)) {
      throw new TypeError("Capability active_key_id must reference a configured key");
    }
    this.activeKeyIdValue = activeKeyId;
  }

  keyProviderCapabilities() {
    return Object.freeze({
      contract: PRIVACY_SIGNING_KEY_PROVIDER_CONTRACT,
      production_eligible: false,
      non_exportable_signing_material: false,
      opaque_key_references: true,
      digest_only_signing: true,
      key_identifiers: true,
      rotation: true,
      retirement: true,
      revocation: true,
      producer_identity_binding: true,
      auditable_signing: false,
      fail_closed_on_untrusted_state: true,
      scope: "development-and-tests-only",
    });
  }

  activeKey() {
    return this.describeKey(this.activeKeyIdValue);
  }

  describeKey(keyId) {
    const id = String(keyId ?? "");
    const record = this.keys.get(id);
    if (!record) return null;
    return Object.freeze({
      key_id: id,
      provider_id: this.providerId,
      producer_identity: this.producerIdentity,
      algorithm: record.algorithm,
      status: record.status,
    });
  }

  signDigest({ key_id, digest }) {
    const keyId = requireKeyId(key_id);
    const record = this.keys.get(keyId);
    if (!record) throw new Error("UNKNOWN_CAPABILITY_KEY");
    if (keyId !== this.activeKeyIdValue || record.status !== "active") {
      throw new Error("CAPABILITY_SIGNING_KEY_NOT_ACTIVE");
    }
    const bytes = Buffer.from(requireDigest(digest), "hex");
    return crypto.createHmac("sha256", record.secret).update(bytes).digest("base64url");
  }

  verifyDigest({ key_id, digest, signature }) {
    const keyId = requireKeyId(key_id);
    const record = this.keys.get(keyId);
    if (!record) throw new Error("UNKNOWN_CAPABILITY_KEY");
    if (!VERIFYING_KEY_STATES.has(record.status)) {
      throw new Error(`CAPABILITY_SIGNING_KEY_${record.status.toUpperCase()}`);
    }

    const expected = crypto
      .createHmac("sha256", record.secret)
      .update(Buffer.from(requireDigest(digest), "hex"))
      .digest();
    const supplied = safeSignatureBuffer(signature);
    return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
  }

  rotate(keyId, secret) {
    const id = requireKeyId(keyId);
    const previous = this.keys.get(this.activeKeyIdValue);
    if (previous) previous.status = "verifying";
    this.keys.set(id, {
      secret: requireSecret(secret, `Capability key ${id}`),
      status: "active",
      algorithm: "HS256",
    });
    this.activeKeyIdValue = id;
    return this.describeKey(id);
  }

  retire(keyId) {
    const id = requireKeyId(keyId);
    if (id === this.activeKeyIdValue) {
      throw new Error("CANNOT_RETIRE_ACTIVE_CAPABILITY_KEY");
    }
    return this.keys.delete(id);
  }

  revoke(keyId) {
    const id = requireKeyId(keyId);
    const record = this.keys.get(id);
    if (!record) return false;
    record.status = "revoked";
    return true;
  }
}

export function isSigningKeyProvider(provider) {
  return Boolean(
    provider &&
    typeof provider === "object" &&
    typeof provider.activeKey === "function" &&
    typeof provider.describeKey === "function" &&
    typeof provider.signDigest === "function" &&
    typeof provider.verifyDigest === "function" &&
    typeof provider.keyProviderCapabilities === "function"
  );
}

export function requireProductionSigningKeyProvider(provider) {
  if (!isSigningKeyProvider(provider)) {
    throw new TypeError("Production Privacy Shield requires an injected signing key provider");
  }

  const capabilities = provider.keyProviderCapabilities();
  if (!capabilities || typeof capabilities !== "object" || Array.isArray(capabilities)) {
    throw new TypeError("Production signing key provider capabilities must be an object");
  }
  if (capabilities.contract !== PRIVACY_SIGNING_KEY_PROVIDER_CONTRACT) {
    throw new Error("PRIVACY_SIGNING_KEY_PROVIDER_CONTRACT_MISMATCH");
  }
  if (capabilities.production_eligible !== true) {
    throw new Error("PRIVACY_SIGNING_KEY_PROVIDER_NOT_PRODUCTION_ELIGIBLE");
  }
  for (const capability of PRODUCTION_SIGNING_KEY_CAPABILITIES) {
    if (capabilities[capability] !== true) {
      throw new Error(`PRIVACY_SIGNING_KEY_PROVIDER_CAPABILITY_REQUIRED:${capability}`);
    }
  }
  if (Object.hasOwn(capabilities, "private_material_export") && capabilities.private_material_export !== false) {
    throw new Error("PRIVACY_SIGNING_KEY_PROVIDER_PRIVATE_MATERIAL_EXPORT_FORBIDDEN");
  }
  return provider;
}
