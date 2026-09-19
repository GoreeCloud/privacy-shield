# Privacy Shield 2.0 — Runtime Trust & Acceptance Matrix

**Lifecycle:** Development source candidate  
**Roadmap:** FR-010  
**Authority effect:** None

## Purpose

The Runtime Trust & Acceptance Matrix gives Privacy Shield a capability-level view of what each application, adapter, runtime, and representative target has independently demonstrated. It exists to prevent a broad or stale "protected" label from replacing exact acceptance evidence.

The matrix is a read/evaluation artifact. It cannot authorize data use, mint consent, create capability tokens, extend evidence validity, transfer producer authority, approve a runtime, or promote any product lifecycle state.

## Independent acceptance stages

Each capability row preserves three independently evidenced stages:

- **Source** — exact source revision/tree evidence for the capability contract or implementation.
- **Runtime** — exact runtime/target evidence that the capability executed with the required failure behavior.
- **Production** — explicit production-acceptance evidence for that exact scope.

A later stage cannot stand in for an earlier stage. Runtime evidence without current source evidence is conflicting rather than Runtime Validated. Production evidence without current source and runtime evidence is conflicting rather than Production Accepted.

## Evidence freshness

A passed stage requires an observation time, an expiration time, and at least one bounded evidence reference. Future-dated observations, timezone-ambiguous timestamps, non-canonical bounded strings, hidden input fields, oversized evidence collections, and inverted validity windows are rejected. Once evidence expires, the matrix falls back to the strongest still-current earlier stage and reports the row as expired rather than silently preserving the stronger claim.

The matrix reports `unknown`, `current`, `expired`, or `conflicting` freshness. Failed stage evidence remains visible as `failed`; it is not converted into a reassuring unknown state.

## Capability-level scope

Rows are independently keyed by application, adapter, runtime authority, representative target, and capability. Duplicate rows for the same exact scope are rejected rather than merged. This prevents one capability or target from upgrading another capability or target by implication.

The matrix intentionally complements rather than replaces `privacy-shield.adapter-runtime-acceptance.schema.json`. Existing adapter acceptance records remain exact evidence records. FR-010 adds the capability-level evaluation layer needed to compare independent acceptance and freshness without rewriting those records or manufacturing missing stages.

## Acceptance boundary

This source candidate does not establish real application/runtime adoption, current production evidence, production provider acceptance, Privacy Center adoption, GoreeCloud-wide protection, production acceptance, or Stable qualification. Every participating application, adapter, runtime, target, and capability must still prove its own accepted evidence. The evaluator also treats its input as an exact-bound closed shape and rejects ambiguous timestamps or silently normalized identifiers so malformed evidence cannot be upgraded by convenience parsing.
