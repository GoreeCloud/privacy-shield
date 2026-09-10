# Privacy Shield Acceptance Status

## Purpose

This document records the current acceptance state of GoreeCloud Privacy Shield and keeps source validation, state-provider qualification, signing-key custody, Browser integration, visual-identity approval, adapter runtime acceptance, and production approval as separate gates.

## Current source baseline

Current `main` HEAD is `a779655dc5ee545857b5cdb767abdf89ade7949d`, a documentation-only commit that added the repository feature-roadmap control. The previously recorded merged implementation baseline `f10d90c0c53c0b876d6ff5cdb6926d6b87205438` passed both repository validation jobs and its Cloudflare Pages deployment check on September 6, 2026.

Draft PR #73 extends that merged baseline with the transactional production state-provider boundary and independent provider-acceptance gate. Its reconciled exact head `204605975032252118aa22cc6584c4e75c6e160d` is source-validation green but remains Development/Draft/non-production.

Draft PR #80 is stacked on PR #73 and advances Privacy Shield 2.0 signing-key custody. It now contains both the opaque provider boundary and a fail-closed exact-provider acceptance layer. It remains Development/Draft/non-production and does not inherit production acceptance from PR #73 or from source validation.

## Acceptance gates

### 1. Portable and platform source acceptance

**State: Passed for the current merged source scope.**

Repository validation demonstrates that the portable core, reviewed configuration, lifecycle contract, platform/adapter contracts, authorization source, durable single-host state source, and related tests are internally consistent for the exact validated merged revisions where recorded.

This is source acceptance only. It does not establish runtime acceptance for a downstream adapter, production state provider, production signing-key provider, or overall platform production use.

### 2. Single-host durable state source

**State: Implemented and source-validated; bounded/non-production.**

`FilePrivacyStateStore` and `createDurablePrivacyRuntime()` provide a crash-consistent, restart-recoverable single-host development and bounded-acceptance path. Tests prove restart persistence for consent, evidence, capability revocation, and single-use consumption; stale-writer refusal; private file modes; primary/backup recovery; corrupt-state failure behavior; and transaction commit/rollback semantics.

The built-in file provider is explicitly not distributed or multi-writer serializable and must not be selected as a production Privacy Shield state provider.

### 3. Production state provider

**State: Contract and acceptance gate implemented in Draft development; provider implementation and runtime acceptance pending.**

Draft PR #73 requires the V1 state-provider capability profile: durability, restart recovery, atomic transactions, multi-writer serializability, distributed operation, and fail-closed conflict handling. It also requires independently governed exact-provider/exact-deployment acceptance evidence. A capability declaration or schema-valid record is necessary source metadata, not proof that a provider actually satisfies those properties.

Production acceptance requires exact-provider and exact-deployment concurrency, failure/recovery, backup/restore, topology, access-control, operational evidence, and a fresh production-approved acceptance record. No source-controlled provider currently carries production acceptance.

### 4. Production signing-key custody

**State: Source custody boundary and exact acceptance gate implemented in Draft development; real production provider and operational acceptance pending.**

Draft PR #80 moves capability signing behind `goreecloud.privacy-shield.signing-key-provider.v1`. `PrivacyCapabilityAuthority` computes a local SHA-256 digest and delegates only the digest plus an opaque key identifier to the provider. Tokens bind the key ID, provider ID, provider version, producer identity, and signing algorithm. Privacy Shield independently rejects untrusted public key state before provider signature verification can run.

Production runtime construction now requires more than provider capability declarations. `createPrivacyRuntime({ production: true, ... })` requires a fresh passing `goreecloud.privacy-shield.signing-key-provider-acceptance.v1` record that matches the exact Privacy Shield source revision, exact provider ID and provider version, producer identity, accepted signing algorithm, and deployment ID. Every required custody qualification must be passed and backed by passing evidence.

The acceptance record is also privacy-bounded: raw private payloads, secret material, and full capability tokens are forbidden from acceptance evidence. The runtime exposes only minimized acceptance metadata rather than the full evidence record.

Repository validation checks both the acceptance schema and any future records under `acceptance/signing-key-providers/`. There are currently **no production-approved signing-key provider records**, so no production signing-key custody claim is authorized.

Legacy raw `capability_keys` remain available only for non-production compatibility through `InMemoryPrivacySigningKeyProvider`. The in-memory provider remains explicitly non-production and cannot receive production acceptance.

No KMS, HSM, cloud key service, or other exact production signing provider has been implemented or accepted by this source slice. Secure key generation, non-exportability, caller authorization, producer binding, rotation/retirement/emergency revocation, stale-state rejection, privacy-safe signing audit, outage/degraded behavior, recovery/continuity, access-control review, and exact runtime integration evidence remain separate production gates. See `docs/SIGNING-KEY-CUSTODY.md`.

### 5. Browser source integration

**State: Integrated at the source-contract level, but not sufficient for production approval.**

GoreeCloud Browser is the privileged Firefox/Gecko runtime authority. The Browser owns preference persistence, HTTP-channel integration, lifecycle hooks, private-browsing behavior, persistent site exceptions, navigation/copy/share integration, packaged UI behavior, and inherited Firefox security boundaries.

### 6. Exact compiled Browser acceptance

**State: Pending.**

The exact compiled GoreeCloud Browser must demonstrate, against the intended Privacy Shield source revision and exact Browser binary, at minimum:

- request blocking and allow/bypass behavior;
- navigation, copy, and share URL cleaning;
- behavioral tracker evidence and blocking behavior;
- master protection-toggle behavior;
- persistent per-site exceptions;
- private-browsing isolation and lifecycle behavior;
- exact-match local-resource substitution and fail-open behavior;
- missing, malformed, unsupported, or unavailable policy-data handling;
- compatibility, rollback, and recovery behavior;
- user-visible protection-state accuracy using the approved Privacy Shield identity where applicable;
- keyboard and assistive-technology accessibility;
- current Glaze UI behavior for supported appearances and accessibility modes;
- preservation of Firefox/Gecko TLS, certificate validation, Safe Browsing, sandboxing, process isolation, permissions, and update boundaries.

Passing portable-source validation must never be substituted for this gate.

### 7. Canonical visual identity

**State: Existing identity passed; Privacy Shield 2.0 identity refresh remains separate planned work.**

Candidate 01 was explicitly approved by the user on August 19, 2026 after direct review of a 1024×1024 PNG rendered from the exact authored SVG. PR #20 merged the authored design as `44d47982d154e0a0a9a913d232a2eae835c6905f`. PR #22 promoted the approved geometry to `branding/privacy-shield/privacy-shield-icon.svg` and merged as `164310648a140a97df006146949fc0c59272eda8`.

That historical/current identity acceptance does not pre-approve the proposed Privacy Shield 2.0 icon/logo/artwork refresh. Any replacement identity requires its own design, accessibility, compact-size, Glaze UI V1.3 conformance, human review, and explicit promotion evidence.

### 8. Adapter-specific runtime acceptance

**State: Incremental; no single platform-wide production gate is satisfied by source validation alone.**

Privacy Shield is a platform-wide authority implemented through runtime adapters. Browser, DNS, Network, AI, telemetry, and application adapters retain their own execution authority and must each pass the applicable exact-revision acceptance boundary before claiming the corresponding Privacy Shield capability in production.

A successful adapter does not automatically promote unrelated adapters.

### 9. Overall platform production posture

**State: Active development with independently gated runtime integrations.**

The platform foundation, canonical identity, and substantial source mechanisms are implemented. Production use remains bounded by the exact state provider, signing-key provider, and runtime adapters involved in a given operation. The project must not use a global “production approved” or equivalent claim to imply that every Privacy Shield capability is accepted across every GoreeCloud runtime.

## Production-boundary rule

A successful GitHub workflow, portable-core test suite, source-contract synchronization, state-provider capability declaration, signing-provider capability declaration, schema-valid acceptance record, documentation update, or icon approval proves only the scope it directly validates. None of those artifacts independently proves production Browser behavior, distributed state correctness, signing-key custody, adapter enforcement, or overall platform-wide runtime acceptance.
