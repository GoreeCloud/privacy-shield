# Privacy Shield — Feature Roadmap

**Status:** Active roadmap control  
**As of:** 2026-09-09  
**Authoritative project record:** Project Specification — Privacy Shield  
**Canonical repository:** GoreeCloud/goreecloud-privacy-shield  
**Drive control:** `GoreeCloud/Feature Roadmap/Privacy Shield/FEATURE-ROADMAP.docx`

## Purpose

This file is the repository-side feature roadmap control for Privacy Shield. It records current planned and recommended feature work without replacing the authoritative project record, implementation evidence, release gates, or GoreeCloud Tasks Management.

## Roadmap

| ID | Feature / obligation | Priority | Current state |
| --- | --- | --- | --- |
| FR-001 | Reconcile and maintain every current planned or recommended Privacy Shield feature from the authoritative project record and verified repository evidence in this roadmap. | High | Ongoing control |
| FR-002 | Move actionable feature obligations into GoreeCloud Tasks Management when required, preserving priority, dependency, and lifecycle disposition. | High | Ongoing control |
| FR-003 | Do not mark features implemented, complete, cancelled, or superseded without authoritative evidence and synchronized repository/Drive roadmap updates. | High | Ongoing control |
| FR-004 | Privacy Shield 2.0 transactional production authority state: durable atomic transactions, distributed/multi-writer state-provider boundary, fail-closed conflict handling, independent provider acceptance, backup/restore and recovery evidence. | P0 | In Development — Draft PR #73 has the transactional source contract and independent acceptance gate; no production distributed provider or provider/deployment acceptance exists yet. |
| FR-005 | Privacy Shield 2.0 production signing-key custody: opaque key references, non-exportable production material, digest-only signing, key IDs, provider-version and producer binding, rotation/retirement/revocation, auditable signing, fail-closed trust state, and exact-provider acceptance. | P0 | In Development — Draft PR #80 contains the opaque signing-provider boundary, provider-version-bound capability metadata, authority-side trust-state rejection, exact source/provider/deployment acceptance schema, runtime freshness/acceptance enforcement, tests, and CI validation. No real production KMS/HSM/provider or production-approved acceptance record exists yet. |
| FR-006 | Consent Lifecycle 2.0, including one-time/session/expiring/purpose-bound grants, durable denials and revocation, and no silent authority widening. | P1 | Planned — not established as implemented by the current P0 work. |
| FR-007 | Purpose and permission drift detection that invalidates incompatible grants when data, purpose, destination, retention, zone, capability, export, AI, background, or sharing scope expands. | P1 | Planned — not established as implemented by the current P0 work. |
| FR-008 | Privacy Receipts 2.0, explainable decisions, and privacy decision preview with minimized evidence and no authorization effect from preview. | P1 | Planned — existing bounded receipt/evidence mechanisms do not constitute the complete 2.0 scope. |
| FR-009 | Privacy Lock for scoped, reversible restriction of nonessential sharing, personalization, background access, external processing, AI/context, diagnostics, and cross-app data. | P1 | Planned. |
| FR-010 | Runtime Trust & Acceptance Matrix with capability-level independent acceptance and evidence freshness states. | P1 | Planned expansion — current adapter/state acceptance foundations remain independently scoped and do not constitute the full matrix. |
| FR-011 | Everkeep lifecycle enforcement contract for retain/delete/export/recovery/succession/preservation obligations without Privacy Shield claiming Everkeep execution. | P1 | Planned. |
| FR-012 | Identity-authenticated Mesh delivery with exact service identity, narrow scopes, fresh credentials, trust verification, rotation/revocation, and `authority_transfer: false`. | P1 | Planned expansion — existing Mesh-related source work must not be treated as complete 2.0 acceptance. |
| FR-013 | Complete exact compiled GoreeCloud Browser acceptance for protection, cleaning, exceptions, private browsing, local substitution, failure modes, accessibility, status accuracy, and Firefox/Gecko boundaries. | P1 | Pending exact compiled runtime acceptance. |
| FR-014 | Privacy Center redesign and actual Glaze UI V1.3 / 1.3.0 migration with exact-revision consumer acceptance, accessibility, rollback, deterministic build, deployed-byte verification, and rendered review. | P1 | Planned migration — accepted Privacy Center source remains on historical Glaze UI 2.1.0 until a reviewed V1.3 migration passes. |
| FR-015 | Privacy Shield 2.0 icon, logo, symbol, lockups, accessibility presentations, compact derivatives, and Glaze UI V1.3 visual-identity promotion. | P1 | Planned — the existing approved identity remains current until an explicitly reviewed replacement is promoted. |
| FR-016 | Adapter-by-adapter expansion across DNS, Network, applications, AI/context, messaging, search, storage/files, health-related apps, and other services with exact capability/runtime evidence. | P2 | Planned/incremental; no platform-wide acceptance is implied. |

## Maintenance and synchronization

This roadmap and the corresponding Drive `FEATURE-ROADMAP.docx` must remain materially synchronized with one another and with the authoritative project or service record. Update both copies whenever feature scope, priority, dependency, implementation status, cancellation, supersession, recommendation, or verification state materially changes.

No feature may be represented as complete or Stable solely because it appears in this roadmap. Completion and lifecycle claims require the applicable authoritative implementation, validation, review, release, and production evidence.

## Reconciliation rule

At each material feature change, reconcile this roadmap against the current authoritative project record, repository implementation state, applicable platform-system requirements, and GoreeCloud Tasks Management. Missing obligations, stale status, duplicated work, roadmap drift, or undocumented disposition changes are defects to correct.
