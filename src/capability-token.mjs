import crypto from "node:crypto";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

export class PrivacyCapabilityAuthority {
  constructor(secret) {
    if (!secret || String(secret).length < 32) throw new TypeError("Capability authority requires a strong secret");
    this.secret = String(secret);
  }

  issue(claims, { ttl_seconds = 300 } = {}) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: "goreecloud-privacy-shield",
      iat: now,
      exp: now + ttl_seconds,
      jti: `psc_${crypto.randomUUID()}`,
      ...claims
    };
    const body = encode(payload);
    const signature = crypto.createHmac("sha256", this.secret).update(body).digest("base64url");
    return `${body}.${signature}`;
  }

  verify(token, expected = {}) {
    const [body, signature] = String(token ?? "").split(".");
    if (!body || !signature) throw new Error("INVALID_CAPABILITY_TOKEN");
    const expectedSignature = crypto.createHmac("sha256", this.secret).update(body).digest();
    const suppliedSignature = Buffer.from(signature, "base64url");
    if (expectedSignature.length !== suppliedSignature.length || !crypto.timingSafeEqual(expectedSignature, suppliedSignature)) {
      throw new Error("INVALID_CAPABILITY_SIGNATURE");
    }
    const claims = decode(body);
    if (claims.exp <= Math.floor(Date.now() / 1000)) throw new Error("CAPABILITY_EXPIRED");
    for (const [key, value] of Object.entries(expected)) {
      if (value !== undefined && claims[key] !== value) throw new Error(`CAPABILITY_${key.toUpperCase()}_MISMATCH`);
    }
    return claims;
  }
}
