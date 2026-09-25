# GoreeCloud Privacy Shield — Changelogs

**Status:** Authoritative repository changelog  
**Canonical repository:** `GoreeCloud/privacy-shield`  
**Lifecycle:** Development

## Purpose

This file records meaningful Privacy Shield implementation, governance, compatibility, privacy/security-boundary, and lifecycle changes. It is repository history, not a release announcement and not proof of deployment, production acceptance, or Stable qualification.

Google Drive roadmap/changelog copies are not authoritative under the GoreeCloud Repository Feature Tracking and Changelog Governance standard.

## 2026-09-25 — Development consent-expiry hardening

- Deny consent with a present malformed or non-string expiry before a Privacy Decision Point can return ALLOW. Invalid, empty, and unparseable values use the existing CONSENT_EXPIRED denial path; absent optional expiry retains its existing behavior.
- Added regression tests for malformed expiry values, expired consent, valid future consent, and omitted expiry. This is source-level hardening; production providers, human security review, integration, runtime acceptance, and release qualification remain separately gated.

## 2026-09-22

### GoreeCloud Policy v1 bounded source adoption — issue #137

- Added a pure Privacy Shield Policy v1 request constructor and decision-evidence validator pinned to authoritative GoreeCloud Policy revision `46071886da37a6566b69cc923005eef64cce2bcc`.
- Preserved the exact six-value Policy decision vocabulary and exact request/decision field sets, with optional binding of returned decision provenance to the expected request.
- Added recursive minimization that rejects obvious credentials/secrets and raw private-content context keys.
- Kept a valid Policy `allow` explicitly non-authorizing for Privacy Shield: the adapter exposes no consent, execution, obligations-execution, or Privacy Shield state-mutation function.
- Reconciled Platform Contract 0.4 Policy state from `applicable-blocked` to `applicable-migration-required` for source adoption only.
- No Policy caller credential, live decision exchange, policy distribution, freshness/expiry acceptance, obligations execution, enforcement coordination, target-environment evidence, production acceptance, release, or Stable qualification is established by this source change.

### GoreeCloud Observability v1 bounded source adoption — PR #136 / issue #135

- Added a pure Privacy Shield operational-signal constructor pinned to authoritative GoreeCloud Observability revision `a7f6a65f442d3e517baddbe7b6ce7c250d142c8c` and contract `https://goreecloud.com/contracts/observability/operational-signal/v1`.
- Preserved the complete Observability nine-state vocabulary and contract TTL bounds while allowing explicit unknown/unavailable/stale/partially-observed evidence rather than manufacturing healthy state.
- Added recursive privacy minimization that rejects obvious credentials, secrets, content/payload/message/query/body fields, direct contact fields, IP-address fields, and direct user identifiers from signal attributes.
- Reconciled Platform Contract 0.4 Observability state from `applicable-blocked` to `applicable-migration-required` for source adoption only.
- First exact-head validation caught a missing `request_body` minimization case; source was hardened and all exact-head gates rerun successfully before merge.
- Squash-merged as signed commit `588dfb0f3a6671028dfc8bb032f94501dab3d101`; post-merge Privacy Shield Validation and Platform Contract runs succeeded.
- No network publication, producer credential, telemetry retention, alerting/SLO authority, target-environment monitoring coverage, production acceptance, release, or Stable qualification is established by this source change.

### Repository feature/changelog governance migration — PR #133

- Replaced the retired repository `FEATURE-ROADMAP.md` control with authoritative `IMPLEMENTED-FEATURES.md`, `PLANNED-FEATURES.md`, and `CHANGELOGS.md` records.
- Split verified source capabilities from incomplete/runtime/production obligations while preserving the meaningful Privacy Shield roadmap scope.
- Updated repository-baseline validation so the three Git-native records are mandatory and the retired roadmap fails closed if reintroduced.
- Removed Google Drive roadmap synchronization as an ongoing repository obligation; former Drive roadmap records are migration evidence only pending governed cleanup after authoritative destination verification.
- Exact candidate `412b377ec13bf4b0b72c7ed3b78c75dae1a30703` passed Privacy Shield Validation run #506 / Actions run `35789353021` and was squash-merged as `eab600359430791e5e52fd8125e2e181f5e5f9d1`.
- This governance migration does not change Privacy Shield runtime behavior, provider selection, production acceptance, release status, or Stable qualification.

## 2026-09-21

### Exact-revision repository stabilization — PR #132

- Hardened Privacy Shield validation with explicit post-checkout exact-revision readback and repository-baseline regression coverage.
- Exact candidate `63c1554fb84fd8b079141651ba863539511662bd` passed Privacy Shield Validation before squash merge as `051fd663e231e3d41508dd810cec5288c38ad410`; post-merge validation also succeeded.
- Provider selection, deployment, runtime acceptance, production acceptance, release, and Stable status remained unchanged.

### Canonical repository and current-authority reconciliation — PR #131

- Corrected machine-readable repository identity and current documentation to canonical `GoreeCloud/privacy-shield` and current Stable Glaze UI target 1.6.0.
- Preserved the historical Privacy Center source implementation as migration-required rather than silently rebinding old evidence to current Stable authority.
- Exact-head Privacy Shield Validation and Platform Contract checks passed before merge.

### Provider assessment integrity hardening — PRs #129–#130

- Added a non-authorizing, exact-provider/deployment access-control assessment boundary for external provider evidence.
- Hardened assessment temporal and identity integrity without promoting or selecting a provider.
- FoundationDB remained failed on access-control isolation; OVHcloud KMS HSM remained a draft/non-authorizing signing candidate.

## 2026-09-20

### Provider evaluation evidence expansion — PR #128

- Integrated reviewed provider evidence and bounded criterion resolution for the transactional-state and signing-key provider evaluation paths.
- Preserved fail-closed provider selection: FoundationDB capabilities did not overcome failed access-control isolation, and OVHcloud KMS HSM evidence did not establish GoreeCloud-specific lifecycle/operational acceptance.
- No infrastructure purchase, provider selection, deployment, or production approval was authorized by the source change.

## Earlier Development history

Meaningful earlier source milestones remain preserved in Git commit/PR history and current repository documentation, including:

- PR #105 — authority-local opaque capability-reference/service-authentication source boundary.
- PRs #93–#96 — Consent Lifecycle 2.0, purpose/permission drift detection, Privacy Receipts 2.0/decision preview, and Privacy Lock foundations.
- replacement PR #110 — capability-level Source/Runtime/Production trust-and-acceptance matrix.
- replacement PR #112 — Everkeep lifecycle handoff boundary.
- replacement PR #114 — Identity-authenticated Mesh delivery boundary.
- PR #117 — compiled-Browser acceptance contract/evaluator source foundation.
- PR #119 — Monitor/Notify adapter declarations.
- PR #80 — transactional authority-state and signing-provider governance source foundations.

These milestones are Development source history. Their remaining runtime/provider/deployment/production/release obligations are tracked in `PLANNED-FEATURES.md`, GoreeCloud Tasks Management, and applicable repository issues/PRs.

## Maintenance rule

Update this file in the same governed workflow for meaningful implementation, compatibility, privacy/security-boundary, migration, deprecation/removal, governance, release, or lifecycle changes. Record exact revisions/PRs where they materially improve traceability. Do not describe source or CI changes as deployed, production-accepted, released, or Stable unless those separate gates are actually verified.
