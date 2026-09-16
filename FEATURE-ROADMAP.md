# Privacy Shield — Feature Roadmap

**Status:** Active roadmap control  
**As of:** 2026-09-15  
**Authoritative project record:** Project Specification — Privacy Shield  
**Canonical repository:** `GoreeCloud/goreecloud-privacy-shield`  
**Drive control:** `GoreeCloud/Feature Roadmap/Privacy Shield/FEATURE-ROADMAP.docx`

## Purpose

This file is the repository-side feature roadmap control for Privacy Shield. It records current planned and recommended feature work without replacing authoritative implementation evidence, exact-revision validation, runtime acceptance, release gates, or GoreeCloud Tasks Management.

Privacy Shield remains **Development**. Source-level capability enforcement, reference verification, and first-party service-authentication boundaries do not establish deployed production authorization, accepted key custody, durable production state, consumer acceptance, or Stable status.

## Roadmap

| ID | Feature / obligation | Priority | Current state |
| --- | --- | --- | --- |
| FR-001 | Reconcile and maintain every current planned or recommended Privacy Shield feature from the authoritative project record and verified repository evidence in this roadmap. | High | Ongoing control. |
| FR-002 | Move actionable feature obligations into GoreeCloud Tasks Management when required, preserving priority, dependency, blocker, and lifecycle disposition. | High | Ongoing control. |
| FR-003 | Do not mark features implemented, complete, cancelled, superseded, deployed, production-accepted, or Stable without authoritative evidence and synchronized repository/Drive/task records. | High | Ongoing control. |
| FR-004 | Preserve operation-bound Privacy Shield capability issuance and authority-local cryptographic verification so consuming services can carry opaque capability references without receiving Privacy Shield signing keys or signed bearer capabilities. | P0 | Source implemented in PR #105; runtime/deployment acceptance remains pending. |
| FR-005 | Provide authority-owned `verifyReference` / `consumeReference` enforcement paths with expiry, revocation, replay, expected-claim, key-rotation, retired-key, and single-use semantics preserved across opaque references. | P0 | Source implemented and regression-covered in PR #105; production durable state and runtime acceptance remain pending. |
| FR-006 | Maintain a versioned capability-reference verification contract that requires requester, resource, purpose, operation, processing zone, destination, retention mode, consumer identity, and consume mode while minimizing responses to authorization status, reference, and enforceable constraints. | P0 | Source implemented in PR #105; integration acceptance remains pending. |
| FR-007 | Preserve strict separation among first-party service authentication, end-user/requester identity, and Privacy Shield data-operation authorization. No service credential, network location, Mesh membership, or request body may create privacy authorization. | P0 | Source boundary implemented in PR #105; deployed Identity verifier/JWKS and requester-resolution evidence remain pending. |
| FR-008 | Authenticate the initial Search → Privacy Shield service boundary through an injected GoreeCloud Identity direct-service verifier using exact audience `goreecloud-privacy-shield`, exact service identity `goreecloud-search`, least-privilege verify/consume scopes, and fail-closed unexpected-scope handling. | P0 | Source implemented in PR #105. GoreeCloud Identity issuance/JWKS/key custody remains Draft/unmerged and runtime deployment is not accepted. |
| FR-009 | Require exact service-identity matching at the capability verification HTTP boundary without tolerant whitespace normalization; body `consumer_id` may confirm but never create or override the independently authenticated service identity. | P0 | Implemented on PR #105 current branch; exact-head CI revalidation required after the hardening change. |
| FR-010 | Connect the authenticated verification wrapper to an approved IPC/network host without weakening bounded POST+JSON, request-size, no-store, opaque-error, and authentication-before-authority guarantees. | P0 | Pending runtime implementation and acceptance. |
| FR-011 | Complete authenticated Browser/Index requester resolution for Search independently of Search service authentication before enabling required-mode Privacy Shield enforcement. | P0 | Pending cross-repository runtime work and evidence. |
| FR-012 | Produce end-to-end denial, consume/single-use, replay, revocation/expiry, constraint-mismatch, service-authentication, and requester-identity evidence across the real authenticated transport. | P0 | Pending representative integration evidence. |
| FR-013 | Complete production-grade durable authorization state, key custody/rotation, availability, recovery, monitoring, revocation propagation, per-runtime acceptance, release qualification, and Stable gates. | P0 | Pending. No production or Stable claim. |
| FR-014 | Keep every Privacy Shield-controlled graphical surface on the current Stable Glaze UI target with independent rendered/native/accessibility acceptance. | High | Ongoing platform requirement; consumer acceptance must remain application-specific. |

## Security and privacy boundary

Authorization travels with the data operation, not merely with the identity of the caller. Authentication answers who a caller is; Privacy Shield separately determines whether a specific data operation is authorized under its purpose, resource, operation, processing-zone, destination, retention, freshness, revocation, and replay constraints.

The signed Privacy Shield capability and signing keys remain authority-local. Consumer-facing transports should use opaque references plus independently verified service credentials. Failure, ambiguity, stale evidence, malformed identity, unsupported contract versions, and unavailable authority must fail closed without exposing signing material, raw claims, or sensitive internal state.

## Maintenance and synchronization

This roadmap and the corresponding Drive `FEATURE-ROADMAP.docx` must remain materially synchronized with one another and with the authoritative project record, current repository state, and GoreeCloud Tasks Management. Update both copies whenever feature scope, priority, dependency, implementation status, blocker, cancellation, supersession, recommendation, or verification state materially changes.

No feature may be represented as complete or Stable solely because it appears in this roadmap. Completion and lifecycle claims require applicable authoritative implementation, validation, review, runtime, release, deployment, and production evidence.

## Reconciliation rule

At each material feature change, reconcile this roadmap against the current authoritative project record, repository implementation state, applicable Platform System requirements, cross-repository identity/consumer contracts, and GoreeCloud Tasks Management. Missing obligations, stale status, duplicated work, roadmap drift, or undocumented disposition changes are defects to correct.
