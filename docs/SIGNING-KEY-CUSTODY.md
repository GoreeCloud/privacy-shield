# Privacy Shield Signing-Key Custody

## Purpose

Privacy Shield operation-bound capabilities must be cryptographically authorized without exposing production private signing material to ordinary application code, Privacy Center, GoreeCloud Manager, GoreeCloud Mesh consumers, evidence recipients, or the capability authority itself.

The machine-readable source contract is `contracts/privacy-shield.signing-key-provider.json`. Production acceptance records conform to `contracts/privacy-shield.signing-key-provider-acceptance.schema.json` and, when they exist, live under `acceptance/signing-key-providers/`.

## Source architecture

`PrivacyCapabilityAuthority` does not perform production private-key operations directly. It computes a SHA-256 digest of the serialized capability body and delegates only that digest plus an opaque key identifier to the injected signing provider.

The provider interface is intentionally narrow:

- `activeKey()` returns immutable public key metadata for the currently active signing key;
- `describeKey(keyId)` resolves immutable public key metadata for verification;
- `signDigest({ key_id, digest })` signs a SHA-256 digest without returning private material;
- `verifyDigest({ key_id, digest, signature })` verifies against provider-managed trust state;
- `keyProviderCapabilities()` declares the provider contract and structural capabilities.

Capability tokens bind the exact `kid`, `key_provider_id`, `key_provider_version`, `producer_identity`, and `sig_alg` used for signing. Verification fails closed on provider, provider-version, key, producer, algorithm, or trust-state drift.

## Development provider boundary

`InMemoryPrivacySigningKeyProvider` exists for development and tests. Its key map, active-key pointer, provider identity, provider version, and producer identity are private class state. Public methods return only immutable key metadata and digest-signing results.

The provider still retains raw shared secrets in process memory and cannot prove independent audit, hardware-backed non-exportability, or external custody. It is therefore explicitly `production_eligible: false` and must never receive production acceptance.

Legacy `capability_keys` and raw-secret constructor inputs remain supported only for non-production compatibility. Production runtime construction rejects them with `PRODUCTION_CAPABILITY_KEY_PROVIDER_REQUIRED`.

## Production provider requirements

A production provider must independently declare and later prove all of the following for the exact provider version and deployment:

- signing material is non-exportable from the custody boundary;
- callers use opaque key references rather than private material;
- the provider signs only minimized SHA-256 digests supplied by Privacy Shield;
- stable key identifiers are available for exact verification and audit;
- provider-version identity is available for exact acceptance binding;
- rotation, retirement, and revocation are supported;
- producer identity is bound to the signing operation and key metadata;
- signing operations are auditable without logging private capability payloads;
- revoked, stale, unknown, retired, or otherwise untrusted key state fails closed;
- provider responses never return private signing material.

A structural provider declaration is necessary for source integration but is not production acceptance.

## Runtime production acceptance gate

`createPrivacyRuntime({ production: true, ... })` now requires all of the following for signing custody:

- an injected production-eligible `capability_key_provider`;
- a `capability_key_acceptance` record with `status: passed` and `production_approved: true`;
- a non-expired `acceptance.valid_until` value;
- an exact 40-character `runtime_revision` matching the acceptance record;
- a `capability_key_deployment_id` matching the accepted deployment;
- exact provider ID, provider version, producer identity, and signing-algorithm agreement with active provider metadata;
- every required qualification marked `passed`;
- passing evidence for every required qualification category;
- privacy-safe acceptance evidence that explicitly excludes raw private payloads, secret material, and full capability tokens.

The runtime returns only minimized acceptance metadata in `signing_acceptance`; it does not expose the evidence record through the runtime object.

The required qualification set covers secure key generation, non-exportability, caller authorization, producer identity binding, rotation, retirement, emergency revocation, stale/untrusted rejection, signing audit, outage/degraded behavior, recovery/continuity, access-control review, and exact runtime integration.

## Key lifecycle semantics

The current development provider supports:

- one active signing key;
- retained verification-only keys after rotation;
- retirement of non-active keys after the caller determines they are no longer needed for valid token verification;
- explicit revocation that causes verification to fail closed.

Production lifecycle policy must additionally define and verify generation, activation, overlap, rotation cadence, safe retirement timing, emergency revocation, trust-store propagation, stale-state handling, provider outage behavior, and recovery.

## Data minimization

The capability authority serializes the operation-bound token body locally, hashes it locally with SHA-256, and sends only the digest and opaque key identifier to the signing provider. This prevents a remote or separately privileged custody provider from needing raw request purpose, resource, destination, retention, or other capability claims merely to perform signing.

Signing and acceptance audit evidence must likewise avoid raw private payloads, credentials, tokens, secret material, or user content. Full capability tokens are explicitly excluded from acceptance evidence.

## Operational qualification harness

Privacy Shield now includes the provider-neutral `goreecloud.privacy-shield.signing-key-qualification.v1` operational exercise contract and `runSigningKeyOperationalQualification()` harness.

The harness requires an explicit qualification controller that proves all of the following structural preconditions before any disruptive lifecycle exercise can run:

- the environment is controlled;
- disruptive operations are explicitly authorized;
- evidence is minimized;
- the controller has no production-acceptance authority.

The harness uses synthetic SHA-256 exercise digests only. It does not submit raw capability bodies, user content, capability claims, full capability tokens, or signing secrets to qualification evidence.

Within a controlled provider/deployment, the harness can exercise and emit minimized, non-authorizing evidence for:

- unauthorized caller rejection;
- producer-identity binding;
- rotation to a distinct active key;
- verification-only overlap for the previous key;
- retirement followed by fail-closed verification;
- emergency revocation;
- stale/revoked key rejection;
- provider outage/degraded signing failure;
- recovery and continuity after disruption;
- privacy-safe signing audit coverage;
- exact source/provider-version/deployment runtime-integration probes.

Three acceptance dimensions intentionally cannot be auto-passed by this harness: `secure_key_generation`, `non_exportability`, and `access_control_review`. They are always emitted as `requires_external_evidence` because source code cannot prove how a real custody service generated a key, whether production key material is physically/provider-enforced non-exportable, or whether the deployed access-control policy passed its required review.

Every qualification run is hard-coded `authorizing: false`. Passing operational exercises can support a later acceptance record, but a run cannot itself approve a provider, deployment, runtime, or production release. A fresh exact-provider acceptance record remains mandatory.

`tools/validate_signing_key_qualification.py` keeps the operational/external qualification partition, privacy boundary, controller authorization requirements, and non-authorizing release boundary fail-closed in CI.

## Repository acceptance validation

`tools/validate_signing_key_provider.py` validates both the structural provider contract and any checked-in acceptance records. A production-approved record is rejected unless it is fresh, exact-revision bound, complete, privacy-safe, and backed by passing evidence for every qualification category.

The repository currently contains no production-approved signing-key provider record. `acceptance/signing-key-providers/README.md` preserves that explicit boundary rather than creating a synthetic or placeholder approval.

## Production acceptance boundary

This source slice does **not** establish production key custody. Production acceptance still requires real exact-provider and exact-deployment evidence for at least:

- secure key generation and custody;
- non-exportability enforcement;
- caller/service identity authorization to sign;
- producer identity binding;
- rotation, retirement, and emergency revocation exercises;
- stale/revoked/untrusted key rejection;
- audit completeness and privacy-safe logging;
- provider outage and degraded-state behavior;
- recovery and continuity procedures;
- key-policy and access-control review;
- exact runtime acceptance against the intended Privacy Shield revision.

No KMS, HSM, cloud key service, or other production custody implementation is accepted merely because it can implement the provider interface, pass source tests, or pass the provider-neutral qualification harness.

## Current status

**Development / source custody boundary, exact acceptance gate, and provider-neutral operational qualification harness implemented / production provider and production acceptance pending.**

The repository now has a production-shaped opaque signing-provider contract, provider-version-bound capability metadata, a bounded in-memory development provider, fail-closed production gating, digest-only signing handoff, producer/provider identity binding, independent authority-side trust-state rejection, a freshness-bounded exact-provider acceptance contract, runtime acceptance enforcement, a controlled non-authorizing operational qualification harness, tests, and CI validation. A real production provider, exact deployment exercises, external key-generation/non-exportability/access-control evidence, and production-approved exact-provider acceptance record remain required before production claims are permitted.