# GoreeCloud Privacy Shield — Project Record

**Repository:** `GoreeCloud/privacy-shield`  
**Lifecycle:** Development  
**License:** MPL-2.0  
**Current required Glaze target:** GLAZE UI V1.6 / `1.6.0`  
**Migration baseline:** `0ca65ca3152e4ab70da25e49fafe1e54b06cece8`  
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

Development source may prove mechanism behavior without establishing production privacy authority.

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

The PR merged as current migration baseline:
`0ca65ca3152e4ab70da25e49fafe1e54b06cece8`.

This preserves the broader rule that authority vocabulary must come from current governed Privacy Shield state rather than caller invention.

## Current Platform Contract boundary

The repository currently uses Platform Contract 0.4 and evaluates exactly nine Integral Platform Systems. Canonical Platform Contract 2.0 now governs new migrations; Privacy Shield must migrate explicitly from current evidence rather than silently translating the 0.4 lifecycle.

Current source includes bounded adoption/integration evidence for several systems while remaining fail-closed where runtime acceptance is absent.

The repository's machine-readable conformance status remains nonconformant because required runtime/provider/recovery/current-Glaze/target evidence is incomplete.

Source adoption does not become production integration merely because contracts and tests pass.

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

## Current production/provider boundary

At the migration baseline, Privacy Shield remains Development.

The repository contains substantial authorization, consent, capability, evidence, provider-governance, Policy, Observability, Mesh/Identity delivery, and bounded durable-state source mechanisms.

Still-open production obligations include:
- accepted distributed authority state;
- accepted signing-key custody;
- production Identity issuance/JWKS/key lifecycle;
- live Mesh delivery;
- Everkeep-backed backup/restore;
- current Glaze UI Privacy Center acceptance;
- compiled Browser/runtime adapter acceptance;
- accepted DNS/Network/application adapters;
- live Policy exchange and obligations enforcement;
- live Observability publication/retention/alerting;
- target-environment failure/recovery evidence;
- explicit production approval.

No source/CI/documentation state should be represented as satisfying those gates.

## Repository protection gap

At this migration baseline, GitHub reports `main` unprotected.

Issue #140 tracks default-branch protection and required Privacy Shield validation.

The connected GitHub application does not expose branch-protection/ruleset mutation. This record therefore does not claim that protection has been enforced.

## September 25, 2026 — Project governance migration candidate

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
