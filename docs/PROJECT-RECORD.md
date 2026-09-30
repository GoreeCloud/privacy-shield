# GoreeCloud Privacy Shield — Project Record

**Repository:** `GoreeCloud/privacy-shield`  
**Lifecycle:** Seal — Platform Contract 2.0; exact candidate `privacy-shield-0.1-seal.1` freezes implementation source `01e7502b9828bb5611677964e4f6eada70e7d055`; Anchor qualification remains blocked pending runtime, provider, recovery, and production acceptance  
**License:** MPL-2.0  
**Current required Glaze target:** GLAZE UI V1.6 / `1.6.0`  
**Migration baseline:** `5abe4ba46f4e949fe45fc653e0f95af0b180cae9`  
**Record purpose:** Significant product, architecture, governance, provider-evaluation, lifecycle, and project-document migration history

## Product direction

Privacy Shield was established as GoreeCloud's native platform-wide privacy, consent, purpose-limitation, data-minimization, transparency, lifecycle, and data-use authorization authority.

Privacy Center is the user-facing privacy surface.

The enduring architecture deliberately separates privacy authorization from technical execution. Runtimes execute operations; Privacy Shield supplies privacy decisions, obligations, evidence, capability boundaries, and shared contracts.

The central principle remains:

> Authorization travels with the operation—not merely with the identity requesting it.

## Browser foundation

The project originated with a portable Browser privacy core and reviewed Browser rules/configuration lifecycle.

Browser remains the privileged runtime for Firefox/Gecko-specific privacy behavior, including applicable tracking resistance, native blocking, tracking-parameter cleanup, reviewed local substitution, site exceptions, and user controls.

Platform Privacy Shield later expanded beyond Browser without converting Browser into the platform privacy authority.

Compiled Browser runtime acceptance remains independently gated.

## Privacy Shield 2.0 authorization foundation

The Privacy Shield 2.0 line introduced a platform authorization path including:
- Privacy Decision Point;
- Privacy Enforcement Point;
- application/privacy manifests;
- policy intersection;
- scoped consent;
- purpose/processing-zone/destination/retention evaluation;
- signed operation-bound capabilities;
- replay/revocation semantics;
- privacy evidence and receipts;
- minimized status/evidence contracts.

Weave source may prove mechanism behavior without establishing production privacy authority.

## Durable-state development

Development work introduced bounded durable single-host state for consent, policy, replay/revocation, and evidence.

That state was intentionally treated as a Development/acceptance primitive rather than a distributed production provider.

Stale-writer and persistence-failure handling were hardened so source-level durability cannot silently lose authority state.

Production still requires a separately accepted state-provider/deployment boundary.

## Provider-governance architecture

Privacy Shield established explicit separation among:
1. provider candidate evaluation;
2. governed provider selection;
3. provider-specific implementation/deployment;
4. fresh exact-provider/exact-deployment production acceptance.

Provider candidate evidence is non-authorizing.

Selection may authorize bounded implementation only.

Production acceptance remains a later independent transition.

This separation applies to both distributed authority-state providers and signing-key custody providers.

## Provider evidence governance

Provider evidence work added:
- content-addressed evidence references;
- evidence packages;
- attributable review attestations;
- freshness bounds;
- provider/scope/environment matching;
- candidate evaluation records;
- selection records;
- production acceptance records;
- operational qualification contracts;
- external access-control assessment records.

Evidence provenance proves which bytes/review records are being referenced; it does not by itself prove technical correctness or authorize a provider.

## Historical FoundationDB evaluation

The project evaluated FoundationDB self-hosted multi-host as a distributed-state provider candidate.

Historical evidence established several candidate capabilities such as:
- durability;
- atomic transactions;
- multi-writer serializability;
- distributed topology;
- backup/restore.

The candidate failed the access-control-isolation criterion under the reviewed design/evidence boundary.

Passing other criteria did not override that failure.

FoundationDB therefore remained a failed, non-authorizing candidate rather than an approved provider.

This historical finding must not be converted into current provider selection without a new governed evaluation/design decision.

## Historical OVHcloud KMS HSM evaluation

The project evaluated OVHcloud KMS HSM-backed asymmetric signing as a signing-key custody candidate.

Historical evidence supported bounded provider-capability observations such as digest-only signing and non-exportable signing material.

GoreeCloud-specific lifecycle, identity, authorization, audit, outage/recovery, access-control, and operational criteria remained incomplete at the documented checkpoint.

The candidate remained non-authorizing.

Provider-specific implementation or billable service use requires separate governed selection, exception/cost/order decisions where applicable, and later production acceptance.

## Repository governance baseline

Development governance established mandatory root repository controls and fail-closed validation.

The baseline historically used root `SPECIFICATIONS.md` as the source-adjacent summary while the active project specification lived in Drive.

The project-record migration replaces that split authority with the mandatory repository-local:
- `PROJECT-SPECIFICATIONS.md`;
- `PROJECT-RECORD.md`.

The repository baseline validator must require these canonical files and reject reintroduction of the retired competing `SPECIFICATIONS.md`.

## Canonical repository reconciliation — September 20, 2026

PR #131 reconciled current machine-readable repository identity and documentation to:
`GoreeCloud/privacy-shield`.

It also reconciled the current shared Glaze target to GLAZE UI V1.6 / `1.6.0` while preserving historical Privacy Center Glaze UI 2.1.0 evidence as migration provenance.

The accepted merge baseline at that checkpoint was:
`35375db7596a8892ccb5b9b27fa7d3ad80353d66`.

The change did not alter provider selection, production acceptance, deployment, or lifecycle.

## Exact-revision stabilization — September 21, 2026

PR #132 added stronger exact-revision validation and repository-baseline regression controls.

It merged as:
`051fd663e231e3d41508dd810cec5288c38ad410`.

The change strengthened validation without promoting runtime/provider state.

## Feature/changelog governance migration — September 22, 2026

PR #133 migrated feature/change authority to:
- `IMPLEMENTED-FEATURES.md`;
- `PLANNED-FEATURES.md`;
- `CHANGELOGS.md`.

It retired root `FEATURE-ROADMAP.md` as repository authority and merged as:
`eab600359430791e5e52fd8125e2e181f5e5f9d1`.

PR #134 corrected the post-migration readback and merged as:
`cc535046f29afc16e96ec5d518babe17348f033d`.

Drive roadmap material became migration evidence rather than ongoing feature-state authority.

## Observability v1 source adoption — September 22, 2026

PR #136 added a privacy-minimized constructor for the authoritative GoreeCloud Observability v1 operational-signal contract.

It failed closed on sensitive attributes and did not grant telemetry collection or production publication authority.

A first validation attempt caught a missing `request_body` minimization case. The source was hardened and rerun successfully before merge.

PR #136 merged as:
`588dfb0f3a6671028dfc8bb032f94501dab3d101`.

Live producer identity, authenticated publication, freshness/completeness, retention/deletion, alerting, target evidence, and production acceptance remained open.

## Policy v1 source adoption — September 22, 2026

PR #138 adopted GoreeCloud Policy v1 request construction and decision-evidence validation.

A valid Policy `allow` remains explicitly non-authorizing for Privacy Shield: it does not become consent, a Privacy Shield capability, or operation execution authority.

PR #138 merged as:
`541d21e79f1377b8fa8b9a98e77d8e7bada66587`.

Live authenticated Policy exchange, distribution, freshness/expiry, obligations handling, enforcement coordination, and production acceptance remained open.

## Processing-zone authority hardening — September 24, 2026

PR #139, **Reject inherited processing-zone names at Privacy Decision Point**, hardened the PDP so caller-inherited/unsupported processing-zone vocabulary cannot silently become accepted authority.

The PR merged as processing-zone hardening baseline:
`0ca65ca3152e4ab70da25e49fafe1e54b06cece8`.

This preserves the broader rule that authority vocabulary must come from current governed Privacy Shield state rather than caller invention.

## Consent-record shape hardening and repository protection — September 28, 2026

PR #142, **Fail closed on malformed legacy consent records**, rejected malformed, inherited, and non-plain legacy consent objects before they can contribute authorization semantics. Its exact head `1f52ef58ab70251bf1c723ba5610072bc15cced3` passed the required `validate` check and merged through protected `main` as `5abe4ba46f4e949fe45fc653e0f95af0b180cae9`.

Post-merge Privacy Shield Validation run #530 / `36485978985` completed successfully on that exact merge commit.

The active `Protect main` ruleset now requires pull-request integration, strict `validate`, review-thread resolution, deletion prevention, non-fast-forward protection, zero configured approving reviews, and no bypass actors. The single-maintainer incompatibility was resolved by disabling last-push approval while preserving the remaining protections. Governance issue #140 closed after authoritative readback.

## Current Platform Contract boundary

The repository uses Platform Contract 2.0 and evaluates exactly nine Integral Platform Systems. Privacy Shield is now **Seal** because the provider-neutral core implementation has been frozen as exact candidate `privacy-shield-0.1-seal.1` at source `01e7502b9828bb5611677964e4f6eada70e7d055` / tree `21e9a9324aeb0fc2f6f1bfd6ba74768e7006297b` for Anchor qualification.

The transition preserves `deployment_state: development`, `qualification_state: blocked`, and all existing migration/recovery blockers while changing `next_gate` to `anchor`. Production provider selection/acceptance, representative runtime evidence, recovery, current Glaze consumer acceptance, observability/hosting, release evidence, and all other blocked gates remain qualification work; Seal does not represent them as passed.

Current source includes bounded adoption/integration evidence for several systems while remaining fail-closed where runtime acceptance is absent.

The repository's machine-readable conformance status remains nonconformant because required runtime/provider/recovery/current-Glaze/target evidence is incomplete.

Source adoption does not become production integration merely because contracts and tests pass.

## September 30, 2026 — Exact Seal candidate transition

Privacy Shield entered **Seal** under Platform Contract 2.0 with candidate `privacy-shield-0.1-seal.1`. The frozen implementation source is `01e7502b9828bb5611677964e4f6eada70e7d055` with tree `21e9a9324aeb0fc2f6f1bfd6ba74768e7006297b`; Privacy Shield Validation run `36782421370` succeeded on that exact source before transition.

The transition corrects the earlier repository-local Seal-readiness guard to match higher-authority GoreeCloud lifecycle governance: Seal requires an exact candidate identity, while production provider/runtime acceptance, recovery, all-nine-system conformance, release publication, and production readiness remain **Anchor qualification** gates. All eight gate groups remain blocked and `anchor_promotion_authorized` remains false.

The candidate remains provider-neutral, non-authorizing, and non-production. Qualification evidence may accumulate against the frozen source. Any material runtime, dependency/provider, privacy/security, recovery, supported-platform, or release-critical configuration change supersedes `seal.1` and requires a new Seal candidate.

## Current Glaze boundary

Historical Privacy Center source/deployment evidence uses Glaze UI 2.1.0.

Current shared GoreeCloud design-system authority requires GLAZE UI V1.6 / `1.6.0`.

Privacy Center therefore remains migration-required until exact-revision source, rendered, accessibility/resilience, performance, rollback, and application acceptance are complete.

Historical rendered evidence remains provenance only.

## Branding boundary

Privacy Shield has an approved canonical product identity synchronized from `GoreeCloud/branding-assets`.

The local canonical consumer derivative is:
`branding/privacy-shield/privacy-shield-icon.svg`.

Branding identity does not create runtime/privacy acceptance.

The separate open branding-review PR #44 remains independent from this project-governance migration.

## September 29, 2026 — Manager status producer source adoption

Privacy Shield added the producer side of the minimized status contract already consumed by GoreeCloud Manager. The source producer uses only canonical Privacy Shield capability identifiers, fixes raw-private-activity/credential/identifier guarantees to false, requires timezone-qualified timestamps, preserves `runtime_acceptance_required=true`, fixes `production_approved=false`, and rejects `protected` or `active` runtime claims at the source-only boundary.

This closes the missing repository-local producer implementation but does not establish deployed delivery, producer freshness, target-environment behavior, Manager production acceptance, or Anchor qualification.

## September 29, 2026 — Canonical Everkeep lifecycle-source migration

Privacy Shield migrated its lifecycle handoff provenance from the predecessor Everkeep repository identity to canonical `GoreeCloud/everkeep` revision `f69e369e4d8627280fac728b7f7bcb02c43b5edd`.

The canonical revision's `contracts/continuity.status.schema.json` blob SHA is `58c5a7d3580f05d395fc900d041ac54da37cbb01`, byte-identical to the historical status-schema blob used by the previous Privacy Shield pin. The migration therefore changes repository/source provenance without silently changing continuity-status semantics.

Privacy Shield's own authority identity is likewise canonicalized to `GoreeCloud/privacy-shield`. The lifecycle handoff remains non-authorizing and does not transfer target execution authority to Privacy Shield or Everkeep.

This advances Everkeep from source-blocked to migration-required under Platform Contract 2.0. Live Everkeep ingestion/execution, backup/restore, export/portability, target-environment recovery evidence, production recovery acceptance, Seal, and Anchor remain open.

## September 29, 2026 — Runtime HTTP liveness/readiness boundary

Privacy Shield added a portable HTTP surface for a hosted authority runtime. `/healthz` is liveness-only. `/readyz` returns ready only when the runtime is explicitly production-mode, carries fresh exact state-provider and signing-key acceptance records using the canonical acceptance contracts, and a host-supplied read-only runtime connectivity probe succeeds. Missing or stale dependency evidence fails closed to HTTP 503.

The existing capability-reference verification transport is formalized at `POST /v1/capabilities/verify`, with authenticated consumer identity still supplied independently by the hosting GoreeCloud Identity-aware transport.

The Platform Contract now declares these source interfaces and API version instead of null health/API state. No production host, domain, Identity transport binding, provider deployment, monitoring, target-environment acceptance, Seal, or Anchor is established by the source change.

## September 29, 2026 — Provider-governance inventory/provenance reconciliation

The repository's provider decision READMEs were corrected to match live authoritative source: one FoundationDB state-provider evaluation exists and is explicitly failed; one OVHcloud KMS/HSM signing-provider evaluation exists and remains draft/non-authorizing. There are still zero approved provider selections and zero production-approved provider acceptance records.

Active evaluation, evidence-package, and review records now use canonical `GoreeCloud/privacy-shield` integration authority. Historical content-addressed evidence locators remain unchanged because the governed package/review chain is keyed to those exact provenance references. CI validates the live authority/inventory boundary without rewriting historical locator identity.

This documentation/provenance repair does not change provider eligibility. FoundationDB remains blocked by failed access-control isolation and other pending operational criteria. OVHcloud remains incomplete and additionally requires the separate proprietary-service/necessity and explicit cost/order authorization before any billable selection/deployment path.

## September 29, 2026 — Fail-closed Seal readiness guard

Privacy Shield now carries `qualification/seal-readiness.json` plus an exact-head CI validator that blocks candidate freeze while eight release-critical gate groups remain unresolved: production distributed state, production signing-key custody, nine-system runtime acceptance, production Identity/authenticated hosting, Everkeep recovery, runtime-adapter acceptance, Privacy Center Glaze acceptance, and hosting/observability/recovery/release evidence.

The guard verifies the current failed FoundationDB state-provider candidate, draft OVHcloud signing candidate, absence of any approved provider selection or production acceptance record, eight external migration-required platform-system relationships, fail-closed runtime readiness source, `candidate_identity: null`, and empty release evidence. Any attempted Seal or Anchor declaration before those boundaries are replaced through governed accepted evidence now fails Privacy Shield validation.

## Current production/provider boundary

Privacy Shield is currently Weave and remains nonconformant.

The repository contains substantial authorization, consent, capability, evidence, provider-governance, Policy, Observability, Mesh/Identity delivery, and bounded durable-state source mechanisms.

Still-open production obligations include:
- accepted distributed authority state;
- accepted signing-key custody;
- production Identity issuance/JWKS/key lifecycle;
- live Mesh delivery;
- live Everkeep-backed backup/restore, export/portability, and accepted recovery;
- current Glaze UI Privacy Center acceptance;
- compiled Browser/runtime adapter acceptance;
- accepted DNS/Network/application adapters;
- live Policy exchange and obligations enforcement;
- live Observability publication/retention/alerting;
- target-environment failure/recovery evidence;
- explicit production approval.

No source/CI/documentation state should be represented as satisfying those gates.

## September 29, 2026 — Platform Contract 2.0 Weave migration

Privacy Shield was explicitly reclassified from legacy Contract 0.4 `development` semantics to Contract 2.0 `weave` using verified present evidence rather than a mechanical lifecycle translation. The core platform substantially exists; the unresolved work is now predominantly convergence work: production state/signing providers, Identity and Mesh runtime acceptance, Everkeep recovery, Privacy Center and compiled Browser acceptance, Policy/Observability live integration, adapter-specific production evidence, rollback, deployment, and explicit production approval.

The migration does not establish Seal or Anchor. Qualification remains blocked, no exact Seal candidate is frozen, and every existing production/provider/runtime blocker remains authoritative until independently accepted.

## Current repository protection state

GitHub reports `main` protected by active ruleset **Protect main** (ID `24119817`). The ruleset requires pull-request integration, strict required status check `validate`, review-thread resolution, deletion prevention, non-fast-forward protection, zero configured approving reviews, and no bypass actors. `require_last_push_approval` is disabled for the current single-maintainer model.

Repository protection is a source-integration control only. It does not establish runtime, provider, production, release, or lifecycle acceptance.

## September 28, 2026 — Project governance migration candidate

This migration:
- creates `PROJECT-SPECIFICATIONS.md`;
- creates `PROJECT-RECORD.md`;
- reconciles the active Drive project specification to current `main`;
- preserves significant Drive provider/lifecycle history without making stale provider counts/current-state statements authoritative;
- updates README navigation;
- updates repository-baseline validation to require the two canonical project files;
- retires root `SPECIFICATIONS.md` only after its current long-lived content is incorporated.

**Drive source:** Project Specification — Privacy Shield.docx  
**Drive file ID:** `1RDKWArXibW7BuOAla416Uu4Tf3ZEFzyo`  
**Drive deletion status:** **Blocked.**

The Drive source must remain until this migration is reviewed as required, accepted on the authoritative default branch, read back successfully, reconciled without discrepancy, and all migration deletion conditions are satisfied.

## Ongoing maintenance

Update this record for:
- major privacy-authority model changes;
- consent/capability lifecycle changes;
- provider evaluations/selections/acceptances;
- key-custody changes;
- distributed-state changes;
- runtime/adapters;
- platform-system integration;
- production activation;
- major incidents/recovery;
- licensing;
- lifecycle/release changes;
- project migration/retirement.

Routine implementation chronology remains in `CHANGELOGS.md`.

Current source capability state remains in `IMPLEMENTED-FEATURES.md` and `PLANNED-FEATURES.md`.


## September 29, 2026 — Canonical docs/ root-cleanliness migration

Privacy Shield migrated its human-readable root documentation into the repository's canonical `docs/` tree in accordance with the GoreeCloud Repository Root Cleanliness and Documentation Organization Standard.

The migration preserves document content and history, keeps `README.md`, `LICENSE`, source-control controls, and `goreecloud.platform.yaml` at root for entry-point or technical purposes, adds `docs/README.md` as the documentation index, and updates path-sensitive validation/evidence references. Repository validation now fails closed if the migrated documentation returns to root.

This is a repository-organization and maintainability change only. It does not establish provider selection, deployed runtime acceptance, production recovery, Seal, Anchor, or production privacy authority.
