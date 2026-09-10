# GoreeCloud Privacy Shield — Repository Specifications

## Status and authority

**Lifecycle:** Development  
**Component:** `goreecloud-privacy-shield`  
**Canonical project record:** `Project Specification — Privacy Shield` in GoreeCloud Google Drive  
**Implementation authority:** this repository for implementation-facing Privacy Shield contracts, schemas, source, validation, and synchronized local branding derivatives.

This repository specification is a source-adjacent summary. It does not replace the canonical project specification, policy, acceptance records, or runtime-specific production evidence.

## Product role

Privacy Shield is GoreeCloud’s shared privacy, consent, purpose-limitation, data-minimization, privacy-status, and data-use authorization foundation. Technical execution remains with the runtime that performs the operation. Privacy Shield must not be treated as a centralized privileged proxy or as a global protection badge.

The governing authorization principle for Privacy Shield 2.0 is:

> Authorization travels with the operation—not merely with the identity requesting it.

## Current source architecture

The repository contains:

- a portable Browser privacy core and reviewed Browser configuration/lifecycle contract;
- platform privacy, capability, adapter, status, identity, application-manifest, policy, decision, and capability-token contracts;
- a Privacy Decision Point and Privacy Enforcement Point source path;
- restrictive policy intersection, scoped consent, purpose/zone/destination/retention evaluation, and operation-bound capability source mechanisms;
- minimized privacy evidence and Privacy Receipt prototypes;
- bounded single-host durable state for development/acceptance work;
- Draft distributed state-provider, signing-key-provider, candidate-evaluation, evidence-package, review-attestation, provider-selection, operational-qualification, and exact-provider production-acceptance boundaries;
- fail-closed validation and test suites.

## Production boundaries

Current source validation does not establish production acceptance. Production authority remains independently gated by the exact runtime, capability, provider, source revision, deployment, environment, and evidence involved.

The built-in memory and file state providers are not production distributed-state providers. The in-memory signing-key provider is development-only. No provider is production-authorized merely because it implements a contract or passes provider-neutral source tests.

Exact compiled GoreeCloud Browser acceptance remains separate from portable/source validation. Other adapters also retain independent runtime acceptance.

## Privacy invariants

Privacy Shield work must preserve:

- local-first processing where practical;
- aggressive data minimization;
- explicit purpose limitation;
- least-scope permissions and authority;
- fail-closed authority boundaries;
- minimized evidence and status;
- no raw private activity solely to populate dashboards/status;
- no remote tracker telemetry as a normal Privacy Shield requirement;
- clear separation from Wardveil Security, Everkeep, GoreeCloud Identity, GoreeCloud DNS, GoreeCloud Network, and application/runtime authority;
- truthful unknown, unavailable, degraded, stale, unsupported, and unaccepted states;
- independent runtime and capability acceptance.

## Design and identity

Privacy Shield uses the approved Privacy Shield identity synchronized from `GoreeCloud/goreecloud-branding-assets`. The local consumer derivative is `branding/privacy-shield/privacy-shield-icon.svg`.

All Privacy Shield interfaces must follow the current governed Glaze UI release applicable to the platform. The retained legacy Privacy Center source still carries historical Glaze UI 2.1.0 material and requires a separately validated migration to the current Glaze UI V1.3 / 1.3.0 target before that migration may be claimed complete.

## Detailed source records

See:

- `README.md`
- `FEATURES.md`
- `FEATURE-ROADMAP.md`
- `docs/PLATFORM-ARCHITECTURE.md`
- `docs/PLATFORM-ADOPTION.md`
- `docs/ACCEPTANCE-STATUS.md`
- `docs/IMPLEMENTATION-BOUNDARY.md`
- `contracts/`
- `adapters/`
- `acceptance/`
- `evaluations/`
- `decisions/`
- `evidence/`
- `reviews/`

When this file conflicts with verified current implementation or canonical GoreeCloud records, verify the current state and correct the documentation rather than preserving the conflict.