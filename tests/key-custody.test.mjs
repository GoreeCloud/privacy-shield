import assert from "node:assert/strict";
import test from "node:test";

import { PrivacyCapabilityAuthority } from "../src/capability-token.mjs";
import {
  InMemoryPrivacySigningKeyProvider,
  PRIVACY_SIGNING_KEY_PROVIDER_CONTRACT,
} from "../src/privacy-signing-key-provider.mjs";

const SECRET = "0123456789abcdef0123456789abcdef";

class StructuralProductionSigningProvider {
  #inner;

  constructor({ omit_capability = null } = {}) {
    this.status = "active";
    this.producerIdentity = "goreecloud-privacy-shield:test-issuer";
    this.omitCapability = omit_capability;
    this.lastSignInput = null;
    this.verifyCalls = 0;
    this.#inner = new InMemoryPrivacySigningKeyProvider(
      {
        active_key_id: "kms-key-v1",
        keys: { "kms-key-v1": SECRET },
      },
      {
        provider_id: "test-kms",
        producer_identity: this.producerIdentity,
      },
    );
  }

  keyProviderCapabilities() {
    const result = {
      contract: PRIVACY_SIGNING_KEY_PROVIDER_CONTRACT,
      production_eligible: true,
      non_exportable_signing_material: true,
      opaque_key_references: true,
      digest_only_signing: true,
      key_identifiers: true,
      rotation: true,
      retirement: true,
      revocation: true,
      producer_identity_binding: true,
      auditable_signing: true,
      fail_closed_on_untrusted_state: true,
      private_material_export: false,
    };
    if (this.omitCapability) delete result[this.omitCapability];
    return result;
  }

  activeKey() {
    return this.describeKey("kms-key-v1");
  }

  describeKey(keyId) {
    const metadata = this.#inner.describeKey(keyId);
    if (!metadata) return null;
    return Object.freeze({
      ...metadata,
      producer_identity: this.producerIdentity,
      status: this.status,
    });
  }

  signDigest(input) {
    if (this.status !== "active") throw new Error("CAPABILITY_SIGNING_KEY_NOT_ACTIVE");
    this.lastSignInput = { ...input };
    return this.#inner.signDigest(input);
  }

  verifyDigest(input) {
    this.verifyCalls += 1;
    if (!new Set(["active", "verifying"]).has(this.status)) {
      throw new Error(`CAPABILITY_SIGNING_KEY_${this.status.toUpperCase()}`);
    }
    return this.#inner.verifyDigest(input);
  }
}

function decodeClaims(token) {
  const [body] = token.split(".");
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
}

test("development signing provider keeps raw secret material opaque", () => {
  const provider = new InMemoryPrivacySigningKeyProvider(SECRET);
  assert.deepEqual(Object.keys(provider), []);
  assert.equal(JSON.stringify(provider).includes(SECRET), false);
  assert.equal(provider.describeKey("development-v1").secret, undefined);
  assert.equal(provider.keyProviderCapabilities().production_eligible, false);
  assert.equal(provider.keyProviderCapabilities().private_material_export, false);
});

test("production capability authority rejects raw secret configuration", () => {
  assert.throws(
    () => new PrivacyCapabilityAuthority(SECRET, { production: true }),
    /PRODUCTION_CAPABILITY_KEY_PROVIDER_REQUIRED/,
  );
});

test("production capability authority requires every custody capability", () => {
  const provider = new StructuralProductionSigningProvider({
    omit_capability: "auditable_signing",
  });
  assert.throws(
    () => new PrivacyCapabilityAuthority(provider, { production: true }),
    /PRIVACY_SIGNING_KEY_PROVIDER_CAPABILITY_REQUIRED:auditable_signing/,
  );
});

test("production provider receives only a digest and binds issuer identity", () => {
  const provider = new StructuralProductionSigningProvider();
  const authority = new PrivacyCapabilityAuthority(provider, { production: true });
  const token = authority.issue({
    requester_id: "app.notes",
    resource_id: "note:1",
    purpose: "summarize",
    iss: "attacker",
    kid: "attacker-key",
    jti: "attacker-jti",
  });
  const claims = authority.verify(token, {
    requester_id: "app.notes",
    purpose: "summarize",
  });

  assert.equal(claims.iss, "goreecloud-privacy-shield");
  assert.equal(claims.kid, "kms-key-v1");
  assert.equal(claims.key_provider_id, "test-kms");
  assert.equal(claims.producer_identity, "goreecloud-privacy-shield:test-issuer");
  assert.equal(claims.sig_alg, "HS256");
  assert.match(claims.jti, /^psc_/);

  assert.deepEqual(Object.keys(provider.lastSignInput).sort(), ["digest", "key_id"]);
  assert.match(provider.lastSignInput.digest, /^[0-9a-f]{64}$/);
  assert.equal(provider.lastSignInput.digest.includes("summarize"), false);
  assert.equal(provider.lastSignInput.key_id, "kms-key-v1");
});

test("authority fails closed on revoked key metadata before provider verification", () => {
  const provider = new StructuralProductionSigningProvider();
  const authority = new PrivacyCapabilityAuthority(provider, { production: true });
  const token = authority.issue({ requester_id: "app.notes" });
  provider.status = "revoked";
  assert.throws(
    () => authority.verify(token),
    /CAPABILITY_SIGNING_KEY_TRUST_STATE:REVOKED/,
  );
  assert.equal(provider.verifyCalls, 0);
});

test("verification rejects producer identity drift", () => {
  const provider = new StructuralProductionSigningProvider();
  const authority = new PrivacyCapabilityAuthority(provider, { production: true });
  const token = authority.issue({ requester_id: "app.notes" });
  const original = decodeClaims(token);
  assert.equal(original.producer_identity, "goreecloud-privacy-shield:test-issuer");

  provider.producerIdentity = "goreecloud-privacy-shield:unexpected-issuer";
  assert.throws(
    () => authority.verify(token),
    /CAPABILITY_PRODUCER_IDENTITY_MISMATCH/,
  );
  assert.equal(provider.verifyCalls, 0);
});
