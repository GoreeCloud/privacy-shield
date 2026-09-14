import crypto from "node:crypto";
import { MemoryPrivacyStateStore } from "./privacy-state-store.mjs";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function requireSecret(secret, label) {
  if (!secret || String(secret).length < 32) {
    throw new TypeError(`${label} requires a secret of at least 32 characters`);
  }
  return String(secret);
}

export class PrivacyCapabilityAuthority {
  constructor(configuration, { store = new MemoryPrivacyStateStore() } = {}) {
    this.keys = new Map();
    this.store = store;

    if (typeof configuration === "string") {
      this.activeKeyId = "development-v1";
      this.keys.set(this.activeKeyId, requireSecret(configuration, "Capability authority"));
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
      this.keys.set(keyId, requireSecret(secret, `Capability key ${keyId}`));
    }
    if (!this.keys.has(activeKeyId)) {
      throw new TypeError("Capability active_key_id must reference a configured key");
    }
    this.activeKeyId = activeKeyId;
  }

  rotate(keyId, secret) {
    if (!keyId || typeof keyId !== "string") throw new TypeError("Capability key id is required");
    this.keys.set(keyId, requireSecret(secret, `Capability key ${keyId}`));
    this.activeKeyId = keyId;
  }

  retire(keyId) {
    if (keyId === this.activeKeyId) throw new Error("CANNOT_RETIRE_ACTIVE_CAPABILITY_KEY");
    return this.keys.delete(keyId);
  }

  issue(claims, { ttl_seconds = 300, replay_policy = "reusable" } = {}) {
    if (!Number.isInteger(ttl_seconds) || ttl_seconds < 1) throw new TypeError("Capability ttl_seconds must be a positive integer");
    if (!new Set(["reusable", "single_use"]).has(replay_policy)) throw new TypeError("Unsupported capability replay policy");

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: "goreecloud-privacy-shield",
      kid: this.activeKeyId,
      iat: now,
      exp: now + ttl_seconds,
      jti: `psc_${crypto.randomUUID()}`,
      replay_policy,
      ...claims
    };
    const body = encode(payload);
    const secret = this.keys.get(this.activeKeyId);
    const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
    const token = `${body}.${signature}`;

    // The signed bearer token remains authority-local. Consumers may carry only
    // the opaque jti reference while Privacy Shield resolves and verifies the
    // original signed token inside its own trust boundary. This avoids sharing
    // HMAC signing keys with every service that needs to enforce authorization.
    this.store.set("capability_token", payload.jti, {
      token,
      issued_at: new Date(payload.iat * 1000).toISOString(),
      expires_at: new Date(payload.exp * 1000).toISOString()
    });
    return token;
  }

  parseAndVerify(token, { check_state = true } = {}) {
    const [body, signature, extra] = String(token ?? "").split(".");
    if (!body || !signature || extra !== undefined) throw new Error("INVALID_CAPABILITY_TOKEN");

    let claims;
    try {
      claims = decode(body);
    } catch {
      throw new Error("INVALID_CAPABILITY_PAYLOAD");
    }

    const secret = this.keys.get(claims.kid);
    if (!secret) throw new Error("UNKNOWN_CAPABILITY_KEY");

    const expectedSignature = crypto.createHmac("sha256", secret).update(body).digest();
    let suppliedSignature;
    try {
      suppliedSignature = Buffer.from(signature, "base64url");
    } catch {
      throw new Error("INVALID_CAPABILITY_SIGNATURE");
    }
    if (expectedSignature.length !== suppliedSignature.length || !crypto.timingSafeEqual(expectedSignature, suppliedSignature)) {
      throw new Error("INVALID_CAPABILITY_SIGNATURE");
    }

    if (claims.iss !== "goreecloud-privacy-shield" || !claims.jti) throw new Error("INVALID_CAPABILITY_CLAIMS");
    if (claims.exp <= Math.floor(Date.now() / 1000)) throw new Error("CAPABILITY_EXPIRED");
    if (check_state && this.store.get("capability_revoked", claims.jti)) throw new Error("CAPABILITY_REVOKED");
    if (check_state && this.store.get("capability_consumed", claims.jti)) throw new Error("CAPABILITY_ALREADY_CONSUMED");
    return claims;
  }

  verify(token, expected = {}) {
    const claims = this.parseAndVerify(token);
    for (const [key, value] of Object.entries(expected)) {
      if (value !== undefined && claims[key] !== value) throw new Error(`CAPABILITY_${key.toUpperCase()}_MISMATCH`);
    }
    return claims;
  }

  tokenForReference(reference) {
    const jti = String(reference ?? "").trim();
    if (!jti.startsWith("psc_")) throw new Error("INVALID_CAPABILITY_ID");
    const record = this.store.get("capability_token", jti);
    if (!record?.token) throw new Error("CAPABILITY_REFERENCE_NOT_FOUND");
    return { jti, token: record.token };
  }

  verifyReference(reference, expected = {}) {
    const { jti, token } = this.tokenForReference(reference);
    const claims = this.verify(token, expected);
    if (claims.jti !== jti) throw new Error("CAPABILITY_REFERENCE_MISMATCH");
    return claims;
  }

  consumeReference(reference, expected = {}) {
    const { jti, token } = this.tokenForReference(reference);
    const claims = this.consume(token, expected);
    if (claims.jti !== jti) throw new Error("CAPABILITY_REFERENCE_MISMATCH");
    return claims;
  }

  revoke(tokenOrJti) {
    const value = String(tokenOrJti ?? "");
    const jti = value.includes(".") ? this.parseAndVerify(value, { check_state: false }).jti : value;
    if (!jti.startsWith("psc_")) throw new Error("INVALID_CAPABILITY_ID");
    this.store.set("capability_revoked", jti, { revoked: true, revoked_at: new Date().toISOString() });
    return jti;
  }

  consume(token, expected = {}) {
    const claims = this.verify(token, expected);
    if (claims.replay_policy !== "single_use") throw new Error("CAPABILITY_NOT_SINGLE_USE");
    this.store.set("capability_consumed", claims.jti, { consumed: true, consumed_at: new Date().toISOString() });
    return claims;
  }
}
