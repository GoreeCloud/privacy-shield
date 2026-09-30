# GoreeCloud Privacy Shield — Capabilities

## Overview

GoreeCloud Privacy Shield is the platform-wide privacy, consent, data-governance, minimization, transparency, and user-control authority for GoreeCloud.

This capability record describes the current verified repository state. Privacy Shield is classified **Weave** under Platform Contract 2.0. Its `deployment_state` remains `development`, its `qualification_state` remains `blocked`, and its next lifecycle gate is Seal. Source implementation, contracts, validators, and exact-revision tests do not by themselves establish deployed production privacy enforcement, production-approved providers, runtime acceptance, release status, Seal, or Anchor qualification.

## Core Capabilities

### Platform privacy authorization

Current source implements a privacy authorization foundation that evaluates declared data use against application manifests, policy, consent, purpose, processing zone, destination, retention, and lifecycle requirements.

The source includes:

- a Privacy Decision Point;
- a restrictive privacy policy engine;
- a Privacy Enforcement Point;
- operation-bound capability issuance and verification;
- consent lifecycle handling;
- privacy evidence and receipt models;
- authority-local opaque capability-reference handling;
- source-level replay, revocation, expiry, and key-lifecycle controls;
- durable single-host privacy state and recovery primitives.

Authorization constraints are designed to narrow established authority rather than create new authority.

### Browser privacy foundation

The repository contains a portable Browser Privacy Shield core and reviewed Browser rules/configuration contracts supporting source-level Browser privacy behavior such as:

- advertising and tracker request blocking;
- tracking-parameter cleanup;
- reviewed local-resource substitution;
- persistent site exceptions;
- privacy-focused Browser controls;
- Browser-specific privacy status and acceptance contracts.

Browser implementation remains subject to exact compiled-runtime acceptance. Source presence is not a production Browser acceptance record.

### Consent, privacy lock, and lifecycle controls

Current Development source contains controls for:

- purpose-bound consent grants;
- expiration, denial, revocation, and supersession;
- one-time and session-oriented consent semantics;
- permission and purpose drift detection;
- explainable privacy decisions and Privacy Receipts;
- restriction-only Privacy Lock behavior;
- fail-closed authority and evidence-state handling.

Production use still requires accepted durable providers, real authenticated runtime adoption, production acceptance, and exact consumer evidence.

### Provider-neutral authority and signing boundaries

Privacy Shield contains Development source controls for:

- transactional authority-state provider boundaries;
- distributed and multi-writer conflict handling contracts;
- provider-neutral qualification and evidence packages;
- governed provider candidate evaluation and selection records;
- provider-neutral, exact-provider/deployment access-control assessment records with fail-closed temporal and record-identity validation;
- production-provider acceptance gates;
- opaque signing-key references;
- digest-only signing-provider boundaries;
- provider/version/deployment binding;
- rotation, retirement, revocation, and audit semantics.

No repository reference, in-memory, file, fixture, or test provider is a production provider merely because it satisfies source-level interfaces or tests. Real provider selection, deployment, operational qualification, recovery evidence, key custody, and production acceptance remain open. No provider access-control assessment records currently exist.

## User Capabilities

### Privacy Center

Privacy Center provides the user-facing surface for Privacy Shield state, controls, explanations, receipts, exceptions, and related privacy information.

The canonical Privacy Center source is now the GoreeCloud static-website privacy surface and declares the current **GLAZE UI V1.6 / `1.6.0` Anchor** target. This repository's `website/` directory remains a historical Glaze UI 2.1.0 legacy/transitional deployment copy rather than current source authority. Exact-current downstream human/rendered/accessibility/performance/resilience review, rollback, legacy deployment retirement/cutover, and production acceptance remain required.

### Privacy explanations and status

Privacy Shield defines minimized, evidence-backed status and explanation contracts intended to distinguish:

- source implementation;
- runtime acceptance;
- production acceptance;
- capability-specific coverage;
- blocked or unavailable authority;
- stale or insufficient evidence.

A user-visible Privacy Shield state must not imply protection or authorization beyond the exact evidence and scope that support it.

## Administrative Capabilities

Current repository capabilities include:

- canonical privacy capability registry and adapter schemas;
- machine-readable application-manifest and privacy-policy contracts;
- privacy decision and capability-token schemas;
- runtime-acceptance and evidence contracts;
- platform adoption and acceptance-state documentation;
- provider qualification, evidence, and acceptance controls;
- validation workflows and fail-closed source checks.

These controls support governed administration and review. They do not create production authority without accepted external providers, runtime evidence, and deployment acceptance.

## Platform Integrations

Privacy Shield is one of the nine GoreeCloud Integral Platform Systems. The current repository manifest uses Platform Contract 2.0 and keeps GoreeCloud Sync separately governed.

### GoreeCloud Manager

A privacy-safe read-only Manager status consumer exists, and Privacy Shield now implements the bounded privacy-safe source producer for that status contract. Accepted producer deployment, delivery/freshness, target-environment validation, and Manager production acceptance remain incomplete.

**State:** applicable migration required.

### Privacy Shield

This repository implements the Privacy Shield authority itself. A separate Privacy-Shield-to-Privacy-Shield integration is not applicable.

### Wardveil Security

Source architecture preserves Wardveil as the separate security authority. Wardveil may provide security evidence relevant to privacy decisions without becoming the privacy authority.

**State:** applicable migration required; live runtime-specific production acceptance remains incomplete.

### Everkeep

Privacy Shield has source-tested single-host durable state and local backup-recovery primitives. Everkeep remains authoritative for platform recovery and preservation.

**State:** applicable migration required pending live Everkeep ingestion/execution, accepted backup/restore, target-environment recovery evidence, and production recovery acceptance.

### Glaze UI

Canonical Privacy Center source adoption now targets GLAZE UI V1.6 / `1.6.0`, while exact-current rendered, accessibility, performance/resilience, rollback, cutover, and application acceptance remain incomplete.

**State:** applicable migration required.

### GoreeCloud Mesh

Source-level minimized privacy-evidence delivery and producer-bound Platform Registry delivery are implemented and validated with authority-transfer disabled.

**State:** applicable migration required pending deployed Identity issuance/JWKS trust, live Mesh routing/publication, and end-to-end runtime acceptance.

### GoreeCloud Identity

Privacy Shield contains source-validated credential-provider boundaries for scoped Mesh and registry delivery.

**State:** applicable migration required pending production Identity issuance, JWKS/key custody, rotation/revocation operations, and live acceptance.

### GoreeCloud Policy

Privacy Shield owns privacy-domain authorization semantics, while GoreeCloud Policy remains a separate platform authority.

**State:** applicable migration required; Policy v1 source contracts are adopted, while live caller identity, authenticated decision exchange, distribution/freshness, obligations handling, target-environment evidence, and production acceptance remain open.

### GoreeCloud Observability

Privacy Shield implements the privacy-minimized GoreeCloud Observability v1 source contract, while live authenticated publication/collection and operational acceptance remain incomplete.

**State:** applicable migration required pending live producer identity, authenticated publication/collection, freshness/completeness, retention/deletion, diagnostics/alerting, target-environment evidence, and production acceptance.

## Data and Interoperability

Privacy Shield is designed around minimized, portable, machine-readable contracts. Current repository capabilities include schemas for application manifests, policy, decisions, capability tokens, adapters, status, identity, platform behavior, capability registration, Mesh evidence, and runtime acceptance.

Shared evidence should contain bounded derived state, reason codes, obligations, freshness information, opaque references, and digests where appropriate rather than raw private payloads.

## Supported Platforms and Interfaces

The repository manifest currently declares:

- web;
- Firefox.

Additional applications and services may integrate Privacy Shield through explicit adapters and acceptance contracts. An adapter declaration does not establish runtime or production acceptance.

## Security and Privacy Capabilities

Current source includes:

- privacy-by-default and least-data enforcement contracts;
- fail-closed handling for missing, malformed, stale, conflicting, or unaccepted authority;
- purpose and destination restriction;
- retention/lifecycle constraints;
- privacy-safe evidence boundaries;
- replay and revocation semantics;
- explicit separation between authentication and privacy authorization;
- signing-provider and authority-state provider boundaries;
- privacy status that must remain scoped to current evidence.

Production key custody, approved production transport, distributed state-provider acceptance, and complete production failure-mode validation remain open.

## Resilience, Backup, and Recovery Capabilities

Current source provides validated single-host durability and bounded local backup-recovery primitives for Privacy Shield-owned state.

Production recovery remains incomplete until GoreeCloud verifies accepted Everkeep-backed backup/restore, replay and revocation preservation, evidence integrity, provider recovery, signing-key lifecycle recovery, availability, monitoring, rollback, and fail-closed degradation.

## Accessibility Capabilities

Accessibility requirements apply to Privacy Center and other user-facing Privacy Shield surfaces. Current Stable Glaze UI migration and exact-revision rendered accessibility acceptance remain outstanding, so no current production accessibility-conformance claim is made here.

## Automation and Validation Capabilities

The repository provides automated validation for Privacy Shield contracts, platform declarations, Development source mechanisms, provider-governance controls, Browser acceptance schemas, adapters, and related source integrity.

Validation is revision-specific. Passing CI is supporting source evidence and is not a substitute for runtime, deployment, production, release, or Stable acceptance.

## Current Limitations

Privacy Shield currently remains Development. Major open acceptance boundaries include:

- real production authority-state provider selection, deployment, and qualification;
- non-exportable production signing-key custody and accepted rotation/revocation operations;
- deployed GoreeCloud Identity issuance and JWKS trust;
- approved production transport and authenticated requester resolution;
- accepted Everkeep recovery;
- compiled Browser runtime acceptance;
- independent consumer runtime acceptance, including current Monitor and Notify adapters;
- Privacy Center migration and acceptance against Glaze UI 1.6.0;
- accepted GoreeCloud Policy and GoreeCloud Observability integrations;
- production monitoring, failure-mode, rollback, deployment, and explicit production acceptance;
- release and Stable qualification.

## Capability Validation

Use exact repository revision, runtime artifact, provider/deployment identity, evidence freshness, and consumer scope when validating a capability.

A capability may be described as current only to the level supported by authoritative evidence. Missing or stale evidence fails closed. Source validation must not be converted into a production claim, and one accepted runtime must not be used to infer platform-wide Privacy Shield acceptance.
