# Privacy Shield Signing-Key Custody

## Purpose

Privacy Shield operation-bound capabilities must be cryptographically authorized without exposing production private signing material to ordinary application code, Privacy Center, GoreeCloud Manager, GoreeCloud Mesh consumers, evidence recipients, or the capability authority itself.

The machine-readable source contract is `contracts/privacy-shield.signing-key-provider.json`. Runtime construction enforces the matching contract identity `goreecloud.privacy-shield.signing-key-provider.v1` when a production Privacy Shield capability authority is requested.

## Source architecture

`PrivacyCapabilityAuthority` no longer performs HMAC/private-key operations directly. It computes a SHA-256 digest of the serialized capability body and delegates only that digest plus an opaque key identifier to the injected signing provider.

The provider interface is intentionally narrow:

- `activeKey()` returns immutable public key metadata for the currently active signing key;
- `describeKey(keyId)` resolves immutable public key metadata for verification;
- `signDigest({ key_id, digest })` signs a SHA-256 digest without returning private material;
- `verifyDigest({ key_id, digest, signature })` verifies against provider-managed trust state;
- `keyProviderCapabilities()` declares the provider contract and structural capabilities.

Capability tokens bind the exact `kid`, `key_provider_id`, `producer_identity`, and `sig_alg` used for signing. Verification fails closed on provider/key/producer/algorithm drift.

## Development provider boundary

`InMemoryPrivacySigningKeyProvider` exists for development and tests. Its key map, active-key pointer, provider identity, and producer identity are private class state. Public methods return only immutable key metadata and digest-signing results.

The provider still retains raw shared secrets in process memory and cannot prove independent audit, hardware-backed non-exportability, or external custody. It is therefore explicitly `production_eligible: false` and must never be promoted as production Privacy Shield key infrastructure.

Legacy `capability_keys` and raw-secret constructor inputs remain supported only for non-production compatibility. Production runtime construction rejects them with `PRODUCTION_CAPABILITY_KEY_PROVIDER_REQUIRED`.

## Production provider requirements

A production provider must independently declare and later prove all of the following for the exact provider and deployment:

- signing material is non-exportable from the custody boundary;
- callers use opaque key references rather than private material;
- the provider signs only minimized SHA-256 digests supplied by Privacy Shield;
- stable key identifiers are available for exact verification and audit;
- rotation, retirement, and revocation are supported;
- producer identity is bound to the signing operation and key metadata;
- signing operations are auditable without logging private capability payloads;
- revoked, stale, unknown, retired, or otherwise untrusted key state fails closed;
- provider responses never return private signing material.

A structural provider declaration is necessary for source integration but is not production acceptance.

## Key lifecycle semantics

The current development provider supports:

- one active signing key;
- retained verification-only keys after rotation;
- retirement of non-active keys after the caller determines they are no longer needed for valid token verification;
- explicit revocation that causes verification to fail closed.

Production lifecycle policy must additionally define and verify generation, activation, overlap, rotation cadence, safe retirement timing, emergency revocation, trust-store propagation, stale-state handling, provider outage behavior, and recovery.

## Data minimization

The capability authority serializes the operation-bound token body locally, hashes it locally with SHA-256, and sends only the digest and opaque key identifier to the signing provider. This prevents a remote or separately privileged custody provider from needing raw request purpose, resource, destination, retention, or other capability claims merely to perform signing.

Signing audit evidence must likewise avoid raw private payloads, credentials, tokens, or user content.

## Production acceptance boundary

This source slice does **not** establish production key custody. Production acceptance still requires exact-provider and exact-deployment evidence for at least:

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

No KMS, HSM, cloud key service, or other production custody implementation is accepted merely because it can implement the provider interface.

## Current status

**Development / source boundary implemented / production provider and runtime acceptance pending.**

The repository now has a production-shaped opaque signing-provider contract, a bounded in-memory development provider, fail-closed production gating, digest-only signing handoff, producer/provider identity binding, lifecycle hooks, tests, and CI contract validation. A real production provider, operational key lifecycle, external custody evidence, and exact-provider acceptance remain required before production claims are permitted.
