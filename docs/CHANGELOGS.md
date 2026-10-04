# GoreeCloud Privacy Shield — Changelogs

## 2026-10-04 — Browser runtime-boundary correction

- Verified that the seal.1 compiled-Browser acceptance schema, evaluator, tests, and Browser adapter are byte-identical between frozen Privacy Shield source `01e7502b9828bb5611677964e4f6eada70e7d055` and current main.
- Confirmed the frozen contract already supports `chromium-cef`, `firefox-gecko`, Android System WebView Chromium, and other mature-engine records.
- Corrected stale Firefox-only qualification wording without changing runtime behavior or transferring standalone Firefox-adapter acceptance to GoreeCloud Browser.
- Kept `runtime-adapter-acceptance` blocked pending fresh exact compiled GoreeCloud Browser acceptance for the current CEF/Chromium runtime.
- Broader adapter expansion remains Version 2.0.1 scope; no production, Anchor, or Stable authority is created.

## 2026-10-04 — Privacy Center canonical readback reconciliation

- Bound the Privacy Center Glaze gate to the stronger current `GoreeCloud/static-websites` V1.7 evidence set.
- Recorded deployed/readback candidate `17303b6c7381faaa0e89ce6175ce24048fb56a12`, Privacy route blob `40d4bcb1f8fc1e53bbbcde15f151ce1027157f96`, and byte-for-byte canonical readback across all eleven public HTML routes.
- Verified current static-websites main `9ae21cf12e276ea7e553fcf2573318602886428e` retains the same public Privacy bytes.
- Kept `privacy-center-glaze-acceptance` blocked on owner visual, keyboard, assistive-technology, representative performance/resilience, final consumer approval, and legacy deployment retirement/cutover.
- No Privacy Shield runtime, production, Anchor, or Stable authority is created by website readback evidence.

## 2026-10-03 — Version 2.0 release provenance/rollback evidence contract

- Added a fail-closed machine-readable release-evidence template for `privacy-shield-2.0.0-seal.1`.
- Bound required final evidence to exact release/tag identity, artifact/package digest, SBOM/signing/source provenance, deployed revision/environment, canonical readback, and a completed rollback exercise.
- Added validation that requires every release-specific value to remain pending or null while only the template exists.
- Kept hosting/Observability/recovery/release qualification blocked; this contract does not create a published release, artifact identity, production deployment, Anchor, or Stable authority.

## 2026-10-03 — Firefox adapter evidence and Browser runtime-boundary reconciliation

- Bound the accepted standalone Privacy Shield 0.2.0 Firefox-adapter release from `GoreeCloud/firefox-addons` into Version 2.0 qualification evidence without treating it as compiled GoreeCloud Browser acceptance.
- Recorded the exact release source, successful Mozilla signing workflow, accepted signed-XPI digest, and accepted Firefox 155.0.1 / Zorin OS target environment in `docs/integrations/firefox-adapter-acceptance.md`.
- Reconciled current Browser reality: live `GoreeCloud/browser` development uses CEF/Chromium, while the frozen Version 2.0 Browser gate was defined around a Firefox runtime.
- Kept `runtime-adapter-acceptance` blocked pending governed runtime-boundary/candidate reconciliation and exact compiled GoreeCloud Browser acceptance.
- No platform-wide Privacy Shield production authority, Anchor, or Stable status is created by the accepted standalone Firefox adapter.

## 2026-10-03 — Privacy Center Glaze V1.7 source adoption

- Reconciled the canonical Privacy Center source to Glaze V1.7 / `1.7.0` after static-websites PR #132 merged as `531744f2a82133caca8ddde00fa782415d1a42e1`.
- Recorded successful post-merge repository and main-site source/build/browser validation plus the successful Cloudflare Pages deployment check for that exact static-websites revision.
- Updated the Privacy Shield Platform Contract Glaze relationship from historical source target `1.6.0` to current source target `1.7.0` while keeping the relationship migration-required.
- Kept `privacy-center-glaze-acceptance` blocked because current consumer review, canonical-site readback, rollback evidence, legacy deployment retirement/cutover, and final consumer acceptance remain incomplete.
- This evidence advances only the source-migration/deployment portion of the Version 2.0 gate and does not create Privacy Shield runtime authority, production acceptance, Anchor, or Stable status.

## 2026-10-03 — Version 2.0 release identity and 2.0.1 scope split

- Rebased the governed Privacy Shield release identity to **Version 2.0.0** without changing the frozen implementation source: candidate `privacy-shield-2.0.0-seal.1` remains bound to `01e7502b9828bb5611677964e4f6eada70e7d055`.
- Preserved Seal lifecycle, development deployment, blocked Anchor qualification, and all eight mandatory qualification gate groups. Missing state-provider, signing-key, platform-runtime, Identity, Everkeep, Browser, Glaze, hosting, Observability, recovery, and release evidence is not treated as passing.
- Assigned non-gating unfinished/unverified feature expansion to **Version 2.0.1**, including the replacement visual-identity work and broader adapter expansion beyond the supported Browser/Firefox 2.0 boundary.
- Retained exact compiled GoreeCloud Browser acceptance, current Glaze migration/acceptance, provider selection/acceptance, recovery, and production-release evidence as Version 2.0 requirements.

## 2026-09-30 — Privacy Shield 0.1 Seal candidate

- Promoted the current release line from Weave to **Seal** under Platform Contract 2.0 by freezing exact candidate `privacy-shield-0.1-seal.1` at implementation source `01e7502b9828bb5611677964e4f6eada70e7d055` / tree `21e9a9324aeb0fc2f6f1bfd6ba74768e7006297b`.
- Added `qualification/seal-candidate.json` with the successful exact-source Privacy Shield Validation identity and a non-authorizing provider-neutral candidate boundary.
- Reclassified the existing eight gate groups as blocked **Anchor qualification** gates rather than reasons to withhold exact Seal identity.
- Updated Platform Contract lifecycle metadata, Seal/Anchor readiness validation, README, acceptance status, project record, and planned-feature authority while preserving development deployment, blocked qualification, migration/recovery flags, unaccepted providers/adapters, and empty published-release evidence.
- Any material release-critical implementation/configuration change invalidates `seal.1` and requires a new Seal candidate; this transition grants no production or Anchor authority.

## 2026-09-30 — Browser runtime exact evidence-set binding

- Hardened FR-013 compiled-Browser runtime acceptance so the caller must independently supply the exact content-addressed build, dimension, and review evidence-reference set.
- Runtime acceptance now fails if the record references evidence outside that expected set, if the expected set contains unused evidence, or if the expected set contains duplicates.
- Added regression coverage while preserving exact source/tree/artifact identity, reviewer-authority binding, freshness, all ten required runtime dimensions, and non-authorizing/non-production semantics.
- This source hardening does not create compiled Browser evidence or grant production, Seal, Anchor, or other lifecycle authority.

## 2026-09-30 — Browser runtime reviewer-authority binding

- Hardened FR-013 compiled-Browser runtime acceptance so the caller must supply an independently expected reviewer authority and the record's review authority must match it exactly.
- Added regression coverage for missing and mismatched reviewer authority while preserving exact source/tree/artifact binding, evidence freshness, all ten required runtime dimensions, and non-authorizing/non-production semantics.
- This source hardening does not create Browser runtime evidence, production approval, release authority, Seal, or Anchor state.

## 2026-09-30 — Acceptance and Browser identity documentation reconciliation

- Reconciled `docs/BROWSER-INTEGRATION.md` with the already-approved canonical Privacy Shield identity; Browser surfaces must use traceable derivatives while visual approval remains separate from compiled-runtime acceptance.
- Reconciled `docs/ACCEPTANCE-STATUS.md` to current main, Platform Contract 2.0 Weave lifecycle, merged P0 provider-governance source, and the actual empty production state-provider, signing-provider, and compiled-Browser acceptance directories.
- Removed stale Draft/current-authority references to closed PR #73 and merged PR #80 without changing provider selection, runtime acceptance, production approval, Seal, or Anchor state.
- Follow-up: made the acceptance-status source-baseline wording self-stable by identifying `main` as live authority and the prior SHA as a reconciliation baseline rather than a permanently current HEAD assertion.

## 2026-09-30 — Repository root symlink hardening

- Hardened repository-baseline validation so prohibited or retired root documentation is rejected even when reintroduced as a broken symbolic link whose target does not exist.
- Added regression coverage for both migrated root documentation and retired `FEATURE-ROADMAP.md` symlink cases.
- This repository-governance hardening does not change Privacy Shield runtime/provider/recovery acceptance, production authority, Seal, or Anchor state.

## 2026-09-29 — Repository root documentation migration

- Moved the repository's human-readable project records from root into the canonical `docs/` tree under the GoreeCloud repository-root cleanliness standard.
- Added `docs/README.md` as the documentation index and updated README navigation, Platform Contract evidence paths, Seal-readiness evidence paths, pull-request guidance, and repository-baseline validation.
- Repository CI now requires the migrated documentation under `docs/` and fails if those records are reintroduced at root; README.md, LICENSE, source-control controls, and `goreecloud.platform.yaml` remain at root for entry-point or technical purposes.
- This organization change does not modify Privacy Shield runtime/provider/recovery acceptance, production authority, Seal, or Anchor state.

## 2026-09-29 — Capability and status documentation reconciliation

- Reconciled `CAPABILITIES.md` and `README.md` with the authoritative Platform Contract 2.0 **Weave** lifecycle, development deployment state, blocked qualification state, and Seal next gate.
- Reconciled canonical Privacy Center Glaze UI V1.6 source adoption, Manager source producer availability, Everkeep/Policy/Observability migration-required states, and the validated single-host durable privacy-state boundary.
- Production/distributed providers, live integrations, recovery acceptance, runtime acceptance, Seal, and Anchor remain unaccepted.

## 2026-09-29 — Fail-closed Seal readiness guard

- Added a machine-readable Privacy Shield Seal-readiness record covering eight release-critical gate groups that still block candidate freeze.
- Added CI validation that keeps lifecycle at Weave with `candidate_identity: null`, requires zero active provider selections/production provider acceptances at the current blocked state, and rejects Seal/Anchor promotion while runtime/provider/recovery/release evidence remains incomplete.
- Bound the guard to the failed FoundationDB candidate, draft OVHcloud signing candidate, eight migration-required external platform systems, fail-closed runtime HTTP readiness, and empty release evidence.
- This guard does not create a Seal candidate or authorize provider spending/deployment; it prevents lifecycle metadata from outrunning accepted evidence.

## 2026-09-29 — Provider-governance inventory and provenance reconciliation

- Corrected state/signing provider decision records that still reported zero candidate evaluations despite one active FoundationDB and one active OVHcloud candidate dossier.
- Canonicalized active evaluation/package/review **integration authority** to `GoreeCloud/privacy-shield` while intentionally retaining the historical content-addressed evidence locators that the governed package/review chain is keyed to.
- Corrected signing-provider documentation to reflect the two actually passed candidate criteria rather than the stale “all pending” statement.
- Added fail-closed CI validation for candidate inventory, canonical repository provenance, zero-selection/zero-acceptance state, and current candidate status boundaries.
- No provider was selected or production-accepted; FoundationDB remains failed and OVHcloud remains draft/non-authorizing.

## 2026-09-29 — Runtime HTTP liveness/readiness boundary

- Added portable `/healthz` liveness and fail-closed `/readyz` readiness routing for a hosted Privacy Shield authority runtime.
- Readiness requires production mode, fresh canonical state-provider acceptance, fresh canonical signing-key acceptance, and a successful host-supplied read-only runtime connectivity probe.
- Formalized the already bounded capability-reference verification HTTP contract at `POST /v1/capabilities/verify`.
- Declared the source API/health interfaces in Platform Contract 2.0 while preserving all hosting, Identity, provider, monitoring, recovery, deployment, Seal, and Anchor gates.

## 2026-09-29 — Canonical Everkeep lifecycle-source migration

- Re-pinned the Privacy Shield lifecycle handoff from predecessor repository identities to canonical `GoreeCloud/privacy-shield` and `GoreeCloud/everkeep`.
- Pinned canonical Everkeep revision `f69e369e4d8627280fac728b7f7bcb02c43b5edd`; its `continuity.status` schema blob is byte-identical to the historical pinned schema, preserving contract semantics while correcting provenance.
- Added canonical-provenance regression coverage and reconciled Platform Contract 2.0 Everkeep from source-blocked to migration-required.
- Live Everkeep ingestion/execution, backup/restore, export/portability, recovery evidence, production acceptance, Seal, and Anchor remain separate gates.

## 2026-09-29 — Manager status producer source adoption

- Added a privacy-minimized schema-version-1 Privacy Shield status producer for the existing GoreeCloud Manager read-only consumer contract.
- Restricted source-only status to development/partial/attention/unavailable and inactive/pending-acceptance/unavailable capability states; `protected`, active runtime claims, and production approval cannot be self-created.
- Fixed raw private activity, credential content, and identifying content declarations to false and require canonical capability IDs plus timezone-qualified status times.
- Manager integration remains migration-required pending deployed delivery, freshness, target-environment validation, and production acceptance.

## 2026-09-29 — Platform Contract 2.0 Weave migration

- Migrated the authoritative platform manifest from Contract 0.4 to Contract 2.0 and reclassified Privacy Shield from legacy Development to **Weave** based on verified convergence maturity.
- Added explicit lifecycle metadata with development deployment state, blocked qualification, migration/recovery flags, next gate Seal, and no fabricated candidate identity.
- Repinned Platform Contract validation to the current Contract 2.0 evaluator while preserving all unresolved provider, runtime, Everkeep, Glaze UI consumer, Browser, Identity, Mesh, Manager, Policy, Observability, deployment, and production blockers.
- This lifecycle correction does not create Seal, Anchor, production privacy authority, provider acceptance, or runtime acceptance.

## 2026-09-29 — Browser acceptance caller-clock integrity hardening

- Require a timezone-qualified timestamp when FR-013 receives its caller-controlled evaluation clock as text, eliminating environment-dependent parsing from freshness and review-window decisions.
- Preserve `Date` object support and all existing exact-source, exact-tree, exact-artifact, evidence-validity, review, and non-authorizing boundaries.
- This hardening does not create Browser runtime evidence, production approval, release authority, or lifecycle promotion.

## 2026-09-28 — Browser acceptance evidence-locator privacy hardening

- Tightened compiled-Browser acceptance evidence references so each content-addressed digest is paired only with a credential-safe logical locator rather than URL, query, fragment, user-info, assignment, encoded, traversal, or absolute-path syntax.
- Added regression and schema coverage while preserving exact source/tree/artifact binding, freshness, independent review, and the non-promoting production boundary.
- This source hardening does not create compiled Browser runtime acceptance, provider acceptance, deployment authority, release, or Stable qualification.

**Status:** Authoritative repository changelog  
**Canonical repository:** `GoreeCloud/privacy-shield`  
**Lifecycle:** Seal

## Purpose

This file records meaningful Privacy Shield implementation, governance, compatibility, privacy/security-boundary, and lifecycle changes. It is repository history, not a release announcement and not proof of deployment, production acceptance, Seal, or Anchor qualification.

Google Drive roadmap/changelog copies are not authoritative under the GoreeCloud Repository Feature Tracking and Changelog Governance standard.

## 2026-09-28 — Browser acceptance repository identity reconciliation

- Rebound the active Browser adapter and compiled-runtime acceptance contract to the canonical `GoreeCloud/browser` and `GoreeCloud/privacy-shield` repositories.
- Runtime and production acceptance remain separately evidence-gated.

## 2026-09-28 — Browser runtime acceptance gap reporting

- Added non-authorizing draft reporting for missing, duplicate, non-passing, and evidence-empty Browser runtime acceptance dimensions.
- The strict exact-source/artifact/runtime evaluator remains unchanged and is still required for any runtime acceptance.

## 2026-09-28 — Repository-local project governance migration

- Added canonical repository-local `PROJECT-SPECIFICATIONS.md` and `PROJECT-RECORD.md` reconciled to protected main `5abe4ba46f4e949fe45fc653e0f95af0b180cae9`.
- Retired the competing root `SPECIFICATIONS.md` summary after incorporating its durable requirements into the canonical project specification.
- Updated README navigation and fail-closed repository-baseline validation/tests so the canonical project records are required and the retired summary cannot silently return.
- Reconciled current repository protection and PR #142 consent-record hardening evidence without promoting provider, runtime, production, release, or lifecycle authority.
- The Drive project specification remains migration provenance until post-merge readback and governed source-retirement checks are complete.

## 2026-09-28 — Privacy Center Glaze UI V1.6 source-authority reconciliation

- Bound current Privacy Center source authority to `GoreeCloud/static-websites/sites/main/privacy/index.html` on current static-websites main `5d05997e2759989db7018e91e8a7a017acfde1d4`; the canonical file still declares Glaze UI `1.6.0`.
- Recorded the current `retained-public-site` and `Cloudflare Pages` checks as successful while preserving older PR #128 deployment evidence as historical migration provenance rather than inherited acceptance for later website revisions.
- Reclassified this repository's `website/` Glaze UI 2.1.0 source as legacy/transitional deployment material instead of current Privacy Center source authority.
- Reconciled the platform manifest and repository-native feature records so source adoption is implemented while exact-current human/rendered/accessibility/performance/resilience/rollback consumer acceptance and legacy deployment retirement remain open.
- Reconciled protected-main governance into implemented source/governance truth and removed the obsolete planned protection gap.
- No website presentation or repository-governance evidence grants consent, privacy execution authority, Privacy Shield runtime production acceptance, release approval, or lifecycle promotion.

## 2026-09-25 — Development legacy-consent validation hardening

- Fail closed before a Privacy Decision Point can authorize a malformed legacy-map consent record. Non-plain-object consent values, malformed revocation state, noncanonical purpose constraints, malformed processing-zone/destination constraints, and present malformed or noncanonical expiry values now deny instead of inheriting permissive behavior.
- Present expiry must be a trimmed timezone-qualified string aligned with the ConsentAuthority timestamp boundary; invalid, empty, unparseable, or expired values use the existing CONSENT_EXPIRED denial path, while other malformed legacy consent structure uses CONSENT_INVALID. Absent optional expiry retains its existing behavior.
- Added regression tests for malformed consent records and constraints, malformed/noncanonical expiry values, expired consent, valid future Z/offset consent, and omitted expiry. This is source-level hardening; production providers, independent security review, integration, runtime acceptance, and release qualification remain separately gated.

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
