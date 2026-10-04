# GoreeCloud Privacy Shield — Implemented Features

## Browser runtime acceptance clock-integrity hardening

The FR-013 compiled-Browser acceptance evaluator now requires an explicit timezone when the caller evaluation clock is supplied as text, preventing host-local timezone interpretation from changing freshness or review-window decisions. Native `Date` inputs remain supported. This is source-level validation hardening only and creates no runtime or production acceptance.

## Browser runtime acceptance evidence-reference privacy hardening

The FR-013 compiled-Browser acceptance evaluator requires content-addressed evidence references to use credential-safe logical locators. Transport URLs, query/fragment syntax, user-info markers, encoded locator material, assignment-style parameters, absolute paths, and traversal segments fail closed. This strengthens retained evidence privacy without creating runtime or production acceptance.

**Status:** Authoritative repository feature record  
**As of:** 2026-09-29  
**Canonical repository:** `GoreeCloud/privacy-shield`  
**Lifecycle:** Seal

## Verified Version 2.0 scope

Version 2.0.0 is the bounded release identity for the implementation already frozen at source `01e7502b9828bb5611677964e4f6eada70e7d055`. This record identifies source capabilities that exist; it does not convert any source-only capability into runtime or production acceptance. Mandatory Version 2.0 Anchor gates remain in `qualification/seal-readiness.json`. Future feature expansion outside those gates is assigned to Version 2.0.1.

## Purpose

This file records Privacy Shield features and source capabilities supported by current authoritative repository evidence. It does not convert source implementation, CI success, contracts, evidence records, or documentation into deployment, production acceptance, release approval, Seal, or Anchor qualification.

Google Drive feature-roadmap copies are retired as feature authority under the GoreeCloud Repository Feature Tracking and Changelog Governance standard. GitHub repository records are authoritative for feature state.

## Implemented source capabilities

Development legacy-consent validation hardening: the decision point rejects malformed legacy-map consent structure through CONSENT_INVALID and rejects present malformed/noncanonical expiry through CONSENT_EXPIRED before authorization. `tests/consent-expiry.test.mjs` covers primitive, array, exotic/non-plain-object, and otherwise invalid consent records; malformed constraints; malformed/noncanonical expiry; expired consent; valid future Z/offset consent; and absent expiry behavior. This source capability does not establish production consent acceptance.

| ID | Implemented feature / capability | Evidence and boundary |
| --- | --- | --- |
| IF-001 | Authority-local opaque capability-reference verification and single-use consumption with independently authenticated service-credential boundaries. | Source integrated through PR #105. Production Identity issuance/JWKS/key custody, approved transport, requester resolution, Search required-mode enforcement, end-to-end runtime evidence, production acceptance, and Stable qualification remain open. |
| IF-002 | Consent Lifecycle 2.0 source foundation with purpose-bound grants, denials/revocation, session/expiry semantics, one-time consumption, supersession, and exact authority-bearing identifiers. | Source integrated through PR #93. Real user consent, accepted production state/signing providers, runtime adoption, deployment, and production acceptance remain open. |
| IF-003 | Purpose and permission drift detection with fail-closed assessment of incompatible scope expansion. | Source integrated through PR #94. Real application/runtime adoption and production acceptance remain open. |
| IF-004 | Privacy Receipts 2.0, explainable decision evidence, and non-authorizing privacy-decision preview foundations. | Source integrated through PR #95. Production persistence/signing, real consent, Privacy Center/runtime adoption, external portability, deployment, and production acceptance remain open. |
| IF-005 | Privacy Lock restriction-only Development foundation. | Source integrated through PR #96. Authenticated activation, accepted participating-runtime enforcement, production state-provider durability, Privacy Center adoption, and production acceptance remain open. |
| IF-006 | Capability-level Source / Runtime / Production trust-and-acceptance matrix with bounded evidence freshness. | Source integrated through replacement PR #110. Runtime and production acceptance remain independently gated. |
| IF-007 | Everkeep lifecycle handoff contract for retain/delete/export/recovery/succession/preservation obligations without transferring Everkeep execution or authorization authority. | Source handoff is re-pinned to canonical `GoreeCloud/everkeep` revision `f69e369e4d8627280fac728b7f7bcb02c43b5edd`; its `continuity.status` schema blob is byte-identical to the historical source previously pinned by Privacy Shield. Deployed Everkeep ingestion/execution, backup/restore, export/portability, target-environment recovery evidence, and production acceptance remain open. |
| IF-008 | Identity-authenticated Mesh evidence-delivery source boundary with exact service identity/audience/scope, fresh credentials, trust-window binding, receipt binding, and `authority_transfer=false`. | Source integrated through replacement PR #114. Genuine production Identity issuance, rotation/revocation, live Mesh routing/verification, target-environment acceptance, and production approval remain open. |
| IF-009 | Exact compiled-Browser acceptance contract/evaluator foundation covering ten required privacy dimensions with content-addressed evidence and non-authorizing acceptance semantics, plus a draft dimension-gap reporter for evidence collection. | The active evaluator, schema, tests, and Browser adapter are bound to the canonical repositories `GoreeCloud/browser` and `GoreeCloud/privacy-shield`. The reporter cannot grant runtime or production acceptance and never substitutes for the strict evaluator. No real compiled Browser acceptance record is established; artifact/device/runtime evidence and production acceptance remain open. |
| IF-010 | Privacy-safe Monitor and Notify adapter declarations that preserve consumer runtime authority and require independent acceptance. | Source integrated through PR #119. Remaining adapter expansion and each adapter's runtime/production acceptance remain independent. |
| IF-011 | Provider-neutral transactional authority-state and signing-provider governance boundaries, provider evidence/review controls, temporal/identity integrity, and external access-control assessment gates. | Source evolved through PR #80 and provider-governance work through PRs #128–#130. No provider is production-selected or production-accepted; FoundationDB remains failed on access-control isolation and OVHcloud KMS HSM remains a non-authorizing candidate. |
| IF-012 | Platform Contract 2.0 source declaration evaluating exactly nine Integral Platform Systems while keeping GoreeCloud Sync separately governed and classifying the current line as Seal. | `goreecloud.platform.yaml` and `qualification/seal-candidate.json`. Version 2.0.0 is the current exact Seal identity; deployment remains development, qualification remains blocked, next gate is Anchor, and applicable runtime/platform-system acceptance remains separately gated. |
| IF-013 | Exact-revision repository validation and governed documentation/feature-history baseline for material source changes. | `tools/validate_repository_baseline.py`, `tests/test_repository_baseline.py`, `.github/workflows/validate.yml`; PR #132 established exact-revision stabilization controls and PR #133 migrated feature/changelog authority to the Git-native records. Live protection is independently verified and recorded by IF-017. |
| IF-014 | Privacy-minimized GoreeCloud Observability v1 operational-signal construction with exact state vocabulary, TTL bounds, collection-gap preservation, and recursive rejection of obvious secret-bearing/privacy-sensitive telemetry attributes. | Source integrated through PR #136 using `src/observability-signal.mjs`, `tests/observability-signal.test.mjs`, and `docs/integrations/observability.md`. No live publication, producer authentication, telemetry retention, alerting, target-environment coverage, or production acceptance is established. |
| IF-015 | Bounded GoreeCloud Policy v1 evaluation-request construction and decision-evidence validation with exact decision vocabulary, provenance binding, privacy-minimized context, and no conversion of Policy `allow` into Privacy Shield consent or execution authority. | `src/platform-policy-contract.mjs`, `tests/platform-policy-contract.test.mjs`, and `docs/integrations/policy.md`. No live Policy caller identity, transport, distribution, obligations execution, enforcement coordination, target-environment evidence, or production acceptance is established. |
| IF-016 | Canonical public Privacy Center source adoption of Glaze UI V1.6 / 1.6.0 in the single retained GoreeCloud website. | `docs/integrations/privacy-center-static-site.md` binds the canonical route to `GoreeCloud/static-websites/sites/main/privacy/index.html`. Current static-websites main `5d05997e2759989db7018e91e8a7a017acfde1d4` retains historical Glaze UI `1.6.0` source evidence; its `retained-public-site` and `Cloudflare Pages` checks are successful. The current shared target is Glaze V1.7 / `1.7.0`, so fresh migration plus human/rendered/accessibility/performance/resilience/rollback consumer acceptance remains a Version 2.0 Anchor gate. Legacy 2.1.0 deployment retirement and Privacy Shield runtime/production acceptance also remain open. |
| IF-017 | Enforced protected-main repository integration for the single-maintainer model. | Active ruleset `Protect main` requires pull requests, strict `validate`, review-thread resolution, deletion and non-fast-forward protection, zero configured approving reviews, no last-push approval, and no bypass actors. PR #142 and PR #144 both merged through this protected path and passed exact-main post-merge validation. This is repository-governance evidence only, not runtime or production acceptance. |
| IF-018 | Privacy-minimized GoreeCloud Manager status producer with canonical capability vocabulary and fail-closed non-production acceptance semantics. | `src/manager-status.mjs`, `tests/manager-status.test.mjs`, `tests/manager-status-schema.test.mjs`, and `docs/integrations/manager.md`. End-to-end runtime publication, freshness/delivery, target-environment acceptance, and production approval remain open. |

## Manager status producer source boundary

Privacy Shield now constructs the shared schema-version-1 Manager status document through `src/manager-status.mjs`. The producer accepts only canonical capability identifiers, fixes all privacy guarantees to exclude raw activity/credentials/identifiers, requires explicit-timezone timestamps, keeps runtime acceptance required, fixes production approval false, and refuses `protected` or `active` runtime claims at this source-only stage.


## Runtime HTTP liveness, readiness, and capability verification

Privacy Shield now defines a portable hosted-runtime HTTP boundary with `GET /healthz`, `GET /readyz`, and the existing authenticated `POST /v1/capabilities/verify` contract. Readiness fails closed unless the runtime is in production mode, carries fresh canonical state-provider and signing-key acceptance records, and passes a host-supplied read-only runtime connectivity probe. Source implementation does not imply deployment.

## Authority boundary

Privacy Shield owns privacy-domain authorization and data-use decisions within its defined authority. It does not manufacture Identity, Mesh, Everkeep, Wardveil Security, Policy, Observability, Glaze UI, application-runtime, provider, deployment, or production authority. An implemented contract, adapter, validator, or passing workflow proves only the exact source/build/test scope it actually validates.

## Maintenance rule

Update this file in the same governed repository workflow whenever a feature becomes implemented, materially changes, is removed, or has its evidence/boundary changed. Do not add a feature solely because it is planned, documented, represented by an unmerged branch, or present in a retired Drive roadmap.
