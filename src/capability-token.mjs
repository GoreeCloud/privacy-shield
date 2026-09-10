import crypto from "node:crypto";
import {
  MemoryPrivacyStateStore,
  mutatePrivacyState,
} from "./privacy-state-store.mjs";
import {
  InMemoryPrivacySigningKeyProvider,
  isSigningKeyProvider,
  requireProductionSigningKeyProvider,
} from "./privacy-signing-key-provider.mjs";

const VERIFYING_KEY_STATES = new Set(["active", "verifying"]);

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function signingDigest(body) {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function requireExpectedClaims(claims, expected = {}) {
  for (const [key, value] of Object.entries(expected)) {
    if (value !== undefined && claims[key] !== value) {
      throw new Error(`CAPABILITY_${key.toUpperCase()}_MISMATCH`);
    }
  }
  return claims;
}

function requireKeyMetadata(metadata, { production = false } = {}) {
  if (!metadata || typeof metadata !== "object") throw new Error("UNKNOWN_CAPABILITY_KEY");
  if (!metadata.key_id || !metadata.algorithm || !metadata.status) {
    throw new Error("INVALID_CAPABILITY_KEY_METADATA");
  }
  if (production && (!metadata.provider_id || !metadata.producer_identity)) {
    throw new Error("INCOMPLETE_PRODUCTION_CAPABILITY_KEY_METADATA");
  }
  return metadata;
}

function requireVerifyingTrustState(key) {
  if (!VERIFYING_KEY_STATES.has(key.status)) {
    throw new Error(`CAPABILITY_SIGNING_KEY_TRUST_STATE:${String(key.status).toUpperCase()}`);
  }
  return key;
}

/**
 * Issues and verifies operation-bound Privacy Shield capabilities.
 *
 * Development callers may continue to provide legacy raw secret/key configuration;
 * it is wrapped in InMemoryPrivacySigningKeyProvider. Production callers must
 * inject a production-eligible signing provider so private signing material never
 * enters PrivacyCapabilityAuthority or ordinary runtime consumers.
 */
export class PrivacyCapabilityAuthority {
  constructor(configuration, {
    store = new MemoryPrivacyStateStore(),
    production = false,
  } = {}) {
    this.store = store;
    this.production = production === true;

    if (isSigningKeyProvider(configuration)) {
      this.keyProvider = configuration;
    } else {
      if (this.production) {
        throw new Error("PRODUCTION_CAPABILITY_KEY_PROVIDER_REQUIRED");
      }
      this.keyProvider = new InMemoryPrivacySigningKeyProvider(configuration);
    }

    if (this.production) requireProductionSigningKeyProvider(this.keyProvider);
  }

  rotate(keyId, secret) {
    if (typeof this.keyProvider.rotate !== "function") {
      throw new Error("CAPABILITY_KEY_LIFECYCLE_MANAGED_EXTERNALLY");
    }
    return this.keyProvider.rotate(keyId, secret);
  }

  retire(keyId) {
    if (typeof this.keyProvider.retire !== "function") {
      throw new Error("CAPABILITY_KEY_LIFECYCLE_MANAGED_EXTERNALLY");
    }
    return this.keyProvider.retire(keyId);
  }

  revokeKey(keyId) {
    if (typeof this.keyProvider.revoke !== "function") {
      throw new Error("CAPABILITY_KEY_LIFECYCLE_MANAGED_EXTERNALLY");
    }
    return this.keyProvider.revoke(keyId);
  }

  issue(claims, { ttl_seconds = 300, replay_policy = "reusable" } = {}) {
    if (!Number.isInteger(ttl_seconds) || ttl_seconds < 1) {
      throw new TypeError("Capability ttl_seconds must be a positive integer");
    }
    if (!new Set(["reusable", "single_use"]).has(replay_policy)) {
      throw new TypeError("Unsupported capability replay policy");
    }

    const key = requireKeyMetadata(this.keyProvider.activeKey(), {
      production: this.production,
    });
    if (key.status !== "active") throw new Error("CAPABILITY_SIGNING_KEY_NOT_ACTIVE");

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      ...claims,
      iss: "goreecloud-privacy-shield",
      kid: key.key_id,
      key_provider_id: key.provider_id ?? "in-memory-development",
      producer_identity: key.producer_identity ?? "goreecloud-privacy-shield-development",
      sig_alg: key.algorithm,
      iat: now,
      exp: now + ttl_seconds,
      jti: `psc_${crypto.randomUUID()}`,
      replay_policy,
    };
    const body = encode(payload);
    const signature = this.keyProvider.signDigest({
      key_id: key.key_id,
      digest: signingDigest(body),
    });
    if (!signature || typeof signature !== "string") {
      throw new Error("CAPABILITY_SIGNING_PROVIDER_INVALID_SIGNATURE_RESPONSE");
    }
    return `${body}.${signature}`;
  }

  parseAndVerify(token, { check_state = true, store = this.store } = {}) {
    const [body, signature, extra] = String(token ?? "").split(".");
    if (!body || !signature || extra !== undefined) throw new Error("INVALID_CAPABILITY_TOKEN");

    let claims;
    try {
      claims = decode(body);
    } catch {
      throw new Error("INVALID_CAPABILITY_PAYLOAD");
    }

    if (
      claims.iss !== "goreecloud-privacy-shield" ||
      !claims.jti ||
      !claims.kid ||
      !claims.sig_alg ||
      !claims.producer_identity ||
      !claims.key_provider_id ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp)
    ) {
      throw new Error("INVALID_CAPABILITY_CLAIMS");
    }

    const key = requireVerifyingTrustState(
      requireKeyMetadata(this.keyProvider.describeKey(claims.kid), {
        production: this.production,
      }),
    );
    if (claims.sig_alg !== key.algorithm) throw new Error("CAPABILITY_SIGNING_ALGORITHM_MISMATCH");
    if (claims.producer_identity !== key.producer_identity) {
      throw new Error("CAPABILITY_PRODUCER_IDENTITY_MISMATCH");
    }
    if (claims.key_provider_id !== key.provider_id) {
      throw new Error("CAPABILITY_KEY_PROVIDER_MISMATCH");
    }

    const verified = this.keyProvider.verifyDigest({
      key_id: claims.kid,
      digest: signingDigest(body),
      signature,
    });
    if (verified !== true) throw new Error("INVALID_CAPABILITY_SIGNATURE");

    if (claims.exp <= Math.floor(Date.now() / 1000)) throw new Error("CAPABILITY_EXPIRED");
    if (check_state && store.get("capability_revoked", claims.jti)) throw new Error("CAPABILITY_REVOKED");
    if (check_state && store.get("capability_consumed", claims.jti)) throw new Error("CAPABILITY_ALREADY_CONSUMED");
    return claims;
  }

  verify(token, expected = {}) {
    return requireExpectedClaims(this.parseAndVerify(token), expected);
  }

  revoke(tokenOrJti) {
    const value = String(tokenOrJti ?? "");
    const claims = value.includes(".") ? this.parseAndVerify(value, { check_state: false }) : null;
    const jti = claims?.jti ?? value;
    if (!jti.startsWith("psc_")) throw new Error("INVALID_CAPABILITY_ID");
    mutatePrivacyState(this.store, state => {
      state.set("capability_revoked", jti, {
        revoked: true,
        revoked_at: new Date().toISOString(),
      });
    });
    return jti;
  }

  consume(token, expected = {}) {
    const claims = requireExpectedClaims(
      this.parseAndVerify(token, { check_state: false }),
      expected,
    );
    if (claims.replay_policy !== "single_use") throw new Error("CAPABILITY_NOT_SINGLE_USE");

    return mutatePrivacyState(this.store, state => {
      if (state.get("capability_revoked", claims.jti)) throw new Error("CAPABILITY_REVOKED");
      if (state.get("capability_consumed", claims.jti)) throw new Error("CAPABILITY_ALREADY_CONSUMED");
      state.set("capability_consumed", claims.jti, {
        consumed: true,
        consumed_at: new Date().toISOString(),
      });
      return claims;
    });
  }
}
