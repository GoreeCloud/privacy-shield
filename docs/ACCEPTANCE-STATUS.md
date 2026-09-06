# Privacy Shield Acceptance Status

## Purpose

This document records the current acceptance state of GoreeCloud Privacy Shield and keeps source validation, state-provider qualification, Browser integration, visual-identity approval, adapter runtime acceptance, and production approval as separate gates.

## Current source baseline

The current `main` line includes the portable Browser core, the platform-wide Privacy Shield authorization foundation, policy/consent/capability/evidence authorities, the shared runtime composition layer, and a bounded single-host durable state provider. Exact merged revision `f10d90c0c53c0b876d6ff5cdb6926d6b87205438` passed both repository validation jobs and its Cloudflare Pages deployment check on September 6, 2026.

The single-host durable source now includes private `0600` primary/backup state files, file and directory `fsync`, atomic rename, validated backup recovery, stale-writer refusal, fail-closed invalid-state handling, and restart tests for consent, evidence, capability revocation, and single-use replay consumption.

The production state-provider contract is separately defined by `contracts/privacy-shield.state-provider.json` and documented in `docs/STATE-PROVIDER.md`. A production provider must additionally supply durable distributed multi-writer-serializable transactions and must pass exact-provider deployment acceptance; the built-in memory and file providers remain non-production.

## Acceptance gates

### 1. Portable and platform source acceptance

**State: Passed for the current merged source scope.**

Repository validation demonstrates that the portable core, reviewed configuration, lifecycle contract, platform/adapter contracts, authorization source, durable single-host state source, and related tests are internally consistent for the exact validated revision.

This is source acceptance only. It does not establish runtime acceptance for a downstream adapter or production state provider.

### 2. Single-host durable state source

**State: Implemented and source-validated; bounded/non-production.**

`FilePrivacyStateStore` and `createDurablePrivacyRuntime()` provide a crash-consistent, restart-recoverable single-host development and bounded-acceptance path. Tests prove restart persistence for consent, evidence, capability revocation, and single-use consumption; stale-writer refusal; private file modes; primary/backup recovery; corrupt-state failure behavior; and transaction commit/rollback semantics.

The built-in file provider is explicitly not distributed or multi-writer serializable and must not be selected as a production Privacy Shield state provider.

### 3. Production state provider

**State: Contract defined; provider implementation and runtime acceptance pending.**

`createPrivacyRuntime({ production: true, ... })` requires the V1 state-provider capability profile: durability, restart recovery, atomic transactions, multi-writer serializability, distributed operation, and fail-closed conflict handling. A capability declaration is necessary source metadata, not proof that a provider actually satisfies those properties.

Production acceptance requires exact-provider and exact-deployment concurrency, failure/recovery, backup/restore, topology, access-control, and operational evidence. No source-controlled provider currently carries production acceptance.

### 4. Browser source integration

**State: Integrated at the source-contract level, but not sufficient for production approval.**

GoreeCloud Browser is the privileged Firefox/Gecko runtime authority. The Browser owns preference persistence, HTTP-channel integration, lifecycle hooks, private-browsing behavior, persistent site exceptions, navigation/copy/share integration, packaged UI behavior, and inherited Firefox security boundaries.

### 5. Exact compiled Browser acceptance

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

### 6. Canonical visual identity

**State: Passed.**

Candidate 01 was explicitly approved by the user on August 19, 2026 after direct review of a 1024×1024 PNG rendered from the exact authored SVG. PR #20 merged the authored design as `44d47982d154e0a0a9a913d232a2eae835c6905f`. PR #22 promoted the approved geometry to `branding/privacy-shield/privacy-shield-icon.svg` and merged as `164310648a140a97df006146949fc0c59272eda8`.

Compact 16 px, 20 px, and 24 px checks preserve the shield silhouette and layered structure. The monochrome derivative supports controlled Glaze UI presentation. The approval evidence is recorded in `docs/APPROVED-ICON.md`.

### 7. Adapter-specific runtime acceptance

**State: Incremental; no single platform-wide production gate is satisfied by source validation alone.**

Privacy Shield is a platform-wide authority implemented through runtime adapters. Browser, DNS, Network, AI, telemetry, and application adapters retain their own execution authority and must each pass the applicable exact-revision acceptance boundary before claiming the corresponding Privacy Shield capability in production.

A successful adapter does not automatically promote unrelated adapters.

### 8. Overall platform production posture

**State: Active development with independently gated runtime integrations.**

The platform foundation, canonical identity, and substantial source mechanisms are implemented. Production use remains bounded by the exact state provider and runtime adapters involved in a given operation. The project must not use a global “production approved” or equivalent claim to imply that every Privacy Shield capability is accepted across every GoreeCloud runtime.

## Production-boundary rule

A successful GitHub workflow, portable-core test suite, source-contract synchronization, state-provider capability declaration, documentation update, or icon approval proves only the scope it directly validates. None of those artifacts independently proves production Browser behavior, distributed state correctness, adapter enforcement, or overall platform-wide runtime acceptance.
