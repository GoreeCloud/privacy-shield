import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryPrivacySigningKeyProvider,
  PRIVACY_SIGNING_KEY_PROVIDER_CONTRACT,
} from "../src/privacy-signing-key-provider.mjs";
import {
  PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT,
  REQUIRED_SIGNING_KEY_QUALIFICATIONS,
  requireSigningKeyProviderAcceptance,
} from "../src/signing-key-acceptance.mjs";

const REVISION = "b".repeat(40);
const DEPLOYMENT = "signing-prod-a";
const SECRET = "0123456789abcdef0123456789abcdef";

class AcceptedProvider {
  #inner = new InMemoryPrivacySigningKeyProvider(
    SECRET,
    {
      provider_id: "accepted-kms",
      provider_version: "2026.09.1",
      producer_identity: "goreecloud-privacy-shield:production",
    },
  );

  keyProviderCapabilities() {
    return {
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
  }

  activeKey() { return this.#inner.activeKey(); }
  describeKey(keyId) { return this.#inner.describeKey(keyId); }
  signDigest(input) { return this.#inner.signDigest(input); }
  verifyDigest(input) { return this.#inner.verifyDigest(input); }
}

class NonActiveAcceptedProvider extends AcceptedProvider {
  constructor(status) {
    super();
    this.status = status;
  }

  activeKey() {
    return { ...super.activeKey(), status: this.status };
  }
}

class MissingKeyIdentityAcceptedProvider extends AcceptedProvider {
  activeKey() {
    const { key_id: _keyId, ...metadata } = super.activeKey();
    return metadata;
  }
}

function record(overrides = {}) {
  const qualification = Object.fromEntries(
    REQUIRED_SIGNING_KEY_QUALIFICATIONS.map(name => [name, "passed"]),
  );
  const evidence = REQUIRED_SIGNING_KEY_QUALIFICATIONS.map(name => ({
    id: `accept-${name.replaceAll("_", "-")}`,
    category: name,
    result: "passed",
    reference: `evidence://${name}`,
  }));
  const base = {
    schema_version: 1,
    contract_id: PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT,
    selection_decision_id: "provider-selection-test",
    provider_id: "accepted-kms",
    provider_implementation: "AcceptedProvider",
    provider_authority: "GoreeCloud/privacy-shield",
    provider_version: "2026.09.1",
    exact_source_revision: REVISION,
    deployment: { environment: "production", deployment_id: DEPLOYMENT },
    producer_identity: "goreecloud-privacy-shield:production",
    algorithms: ["HS256"],
    qualification,
    privacy: {
      raw_private_payloads_in_acceptance_evidence: false,
      secret_material_in_acceptance_evidence: false,
      full_capability_tokens_in_acceptance_evidence: false,
    },
    acceptance: {
      status: "passed",
      production_approved: true,
      exact_revision_required: true,
      valid_until: "2099-01-01T00:00:00Z",
    },
    evidence,
    limitations: [],
  };
  return {
    ...base,
    ...overrides,
    deployment: { ...base.deployment, ...(overrides.deployment ?? {}) },
    qualification: { ...base.qualification, ...(overrides.qualification ?? {}) },
    privacy: { ...base.privacy, ...(overrides.privacy ?? {}) },
    acceptance: { ...base.acceptance, ...(overrides.acceptance ?? {}) },
  };
}

test("exact provider acceptance returns only minimized runtime acceptance metadata", () => {
  const accepted = requireSigningKeyProviderAcceptance(new AcceptedProvider(), {
    record: record(),
    runtime_revision: REVISION,
    deployment_id: DEPLOYMENT,
  });
  assert.deepEqual(Object.keys(accepted).sort(), [
    "contract_id",
    "deployment_id",
    "exact_source_revision",
    "producer_identity",
    "provider_id",
    "provider_version",
    "selection_decision_id",
    "valid_until",
  ]);
  assert.equal(accepted.selection_decision_id, "provider-selection-test");
  assert.equal(accepted.provider_id, "accepted-kms");
  assert.equal(accepted.provider_version, "2026.09.1");
});

test("production acceptance fails closed on exact source revision drift", () => {
  assert.throws(
    () => requireSigningKeyProviderAcceptance(new AcceptedProvider(), {
      record: record(),
      runtime_revision: "c".repeat(40),
      deployment_id: DEPLOYMENT,
    }),
    /SIGNING_KEY_ACCEPTANCE_SOURCE_REVISION_MISMATCH/,
  );
});

test("production acceptance fails closed on deployment drift", () => {
  assert.throws(
    () => requireSigningKeyProviderAcceptance(new AcceptedProvider(), {
      record: record(),
      runtime_revision: REVISION,
      deployment_id: "signing-prod-b",
    }),
    /SIGNING_KEY_ACCEPTANCE_DEPLOYMENT_MISMATCH/,
  );
});

test("production acceptance fails closed on provider version drift", () => {
  assert.throws(
    () => requireSigningKeyProviderAcceptance(new AcceptedProvider(), {
      record: record({ provider_version: "2026.09.2" }),
      runtime_revision: REVISION,
      deployment_id: DEPLOYMENT,
    }),
    /SIGNING_KEY_ACCEPTANCE_PROVIDER_VERSION_MISMATCH/,
  );
});

test("production acceptance fails closed when expired", () => {
  assert.throws(
    () => requireSigningKeyProviderAcceptance(new AcceptedProvider(), {
      record: record({ acceptance: { valid_until: "2020-01-01T00:00:00Z" } }),
      runtime_revision: REVISION,
      deployment_id: DEPLOYMENT,
      now: Date.parse("2026-09-10T00:00:00Z"),
    }),
    /SIGNING_KEY_ACCEPTANCE_EXPIRED/,
  );
});

test("production acceptance requires an explicitly active current signing key", () => {
  for (const status of ["verifying", "revoked", "retired", "degraded"]) {
    assert.throws(
      () => requireSigningKeyProviderAcceptance(new NonActiveAcceptedProvider(status), {
        record: record(),
        runtime_revision: REVISION,
        deployment_id: DEPLOYMENT,
      }),
      new RegExp(`SIGNING_KEY_ACCEPTANCE_ACTIVE_KEY_TRUST_STATE:${status.toUpperCase()}`),
    );
  }
});

test("production acceptance requires active-key identity metadata", () => {
  assert.throws(
    () => requireSigningKeyProviderAcceptance(new MissingKeyIdentityAcceptedProvider(), {
      record: record(),
      runtime_revision: REVISION,
      deployment_id: DEPLOYMENT,
    }),
    /INVALID_PRODUCTION_SIGNING_KEY_METADATA/,
  );
});

test("production acceptance requires every qualification and matching passing evidence", () => {
  assert.throws(
    () => requireSigningKeyProviderAcceptance(new AcceptedProvider(), {
      record: record({ qualification: { signing_audit: "pending" } }),
      runtime_revision: REVISION,
      deployment_id: DEPLOYMENT,
    }),
    /SIGNING_KEY_ACCEPTANCE_QUALIFICATION_REQUIRED:signing_audit/,
  );

  const missingAuditEvidence = record();
  missingAuditEvidence.evidence = missingAuditEvidence.evidence.filter(
    entry => entry.category !== "signing_audit",
  );
  assert.throws(
    () => requireSigningKeyProviderAcceptance(new AcceptedProvider(), {
      record: missingAuditEvidence,
      runtime_revision: REVISION,
      deployment_id: DEPLOYMENT,
    }),
    /SIGNING_KEY_ACCEPTANCE_EVIDENCE_REQUIRED:signing_audit/,
  );
});

test("production acceptance preserves privacy-safe evidence boundaries", () => {
  assert.throws(
    () => requireSigningKeyProviderAcceptance(new AcceptedProvider(), {
      record: record({ privacy: { secret_material_in_acceptance_evidence: true } }),
      runtime_revision: REVISION,
      deployment_id: DEPLOYMENT,
    }),
    /SIGNING_KEY_ACCEPTANCE_PRIVACY_BOUNDARY:secret_material_in_acceptance_evidence/,
  );
});

test("signing-key acceptance requires a canonical selection decision binding", () => {
  const missing = record();
  delete missing.selection_decision_id;
  assert.throws(
    () => requireSigningKeyProviderAcceptance(new AcceptedProvider(), {
      record: missing,
      runtime_revision: REVISION,
      deployment_id: DEPLOYMENT,
    }),
    /SIGNING_KEY_ACCEPTANCE_SELECTION_DECISION_REQUIRED/,
  );

  const invalid = record();
  invalid.selection_decision_id = "Provider Selection";
  assert.throws(
    () => requireSigningKeyProviderAcceptance(new AcceptedProvider(), {
      record: invalid,
      runtime_revision: REVISION,
      deployment_id: DEPLOYMENT,
    }),
    /INVALID_SIGNING_KEY_ACCEPTANCE_SELECTION_DECISION/,
  );
});
