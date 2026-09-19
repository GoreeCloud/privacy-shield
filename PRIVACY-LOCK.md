# Privacy Shield 2.0 — Privacy Lock

**Lifecycle:** Development source candidate  
**Roadmap:** FR-009  
**Authority boundary:** Privacy Lock is a temporary restriction overlay. It may narrow or deny existing privacy authority; it never creates or widens authority.

## Purpose

Privacy Lock provides a user-controlled way to temporarily reduce nonessential privacy authority across participating GoreeCloud applications without pretending that every operation can be safely disabled by a single master switch.

The source implementation is policy-driven, scoped, reversible, expiring, and explainable. It keeps essential security, account recovery, emergency, resilience, and required system operations under their own independent authorities.

## Lock modes

The current source contract supports two explicit modes:

- `strict_optional` — denies every optional Privacy Lock category for the selected application scope.
- `custom` — applies explicit deny or constrain rules to selected optional categories.

The governed optional categories are:

- optional data sharing;
- optional personalization;
- nonessential background access;
- optional external processing;
- optional AI/context access;
- optional diagnostics; and
- optional cross-application data use.

Custom rules cannot target independently governed essential categories.

## Application scope

Every lock is bound to a subject and an explicit application scope. The special `*` application scope means every participating application for that subject; it is not a platform-wide production acceptance claim.

A runtime must explicitly identify itself as participating. A nonparticipating runtime is reported as not covered rather than being presented as protected by Privacy Lock.

When a participating runtime is under an active lock, missing or unsupported Privacy Lock category metadata fails closed.

## Temporary and reversible state

A lock requires a creation time and a future expiration time. Only one active lock may exist for the same subject at a time. A lock may be released early with a release actor and reason code.

Privacy Lock identifiers and authority-bearing strings are exact-bound rather than silently normalized. Required strings reject leading/trailing whitespace, control characters, empty values, and oversized values. String timestamps must be explicit timezone-qualified values; timezone-ambiguous local timestamps are rejected rather than interpreted implicitly.

Lock state is stored through the injected Privacy Shield state-provider boundary. Its durability therefore inherits the guarantees of the selected provider. Memory and single-host development providers do not become production accepted merely because they can store Privacy Lock state.

## Monotonic restriction rule

`PrivacyLockAuthority.assess()` takes an already evaluated Privacy Shield decision and applies only additional restriction.

A Privacy Lock assessment declares:

- `authorization_effect: restriction_only`; and
- `may_widen_authority: false`.

A deny rule converts an otherwise usable decision into `DENY`, removes any capability-token reference from the derived decision, and adds the Privacy Lock enforcement obligation.

A constrain rule may convert `ALLOW` to `ALLOW_WITH_CONSTRAINTS` and add explicit lock constraints. It never converts `DENY` or `REQUIRE_USER_DECISION` into an allow state.

## Independent essential authority

Privacy Lock must not silently exempt an operation merely because a caller labels it essential.

The independently governed categories are:

- essential security;
- account recovery;
- emergency operations;
- resilience operations; and
- required system operations.

When one of these categories is encountered under an active lock, the operation remains blocked unless an independent authority verifier accepts an evidence reference for that exact subject, application, category, and Privacy Lock context.

Privacy Lock does not manufacture that evidence and does not become the security, recovery, emergency, resilience, or system-operation authority. If verification is unavailable or rejected, the derived decision fails closed with `PRIVACY_LOCK_INDEPENDENT_AUTHORITY_REQUIRED`.

## Explainability

Each assessment records the exact lock ID and expiry, application, category, restriction effect, reason code, constraints, and whether independent authority was required and verified.

These fields are designed to feed Privacy Receipts 2.0 and Privacy Center without collecting the private operation content solely for presentation detail.

## Current acceptance boundary

This FR-009 source slice does not establish:

- authenticated user activation of Privacy Lock;
- accepted application/runtime participation;
- production state-provider durability;
- production enforcement across GoreeCloud applications;
- accepted independent authority providers;
- Privacy Center UI adoption;
- production acceptance; or
- Stable qualification.

Those remain separate evidence and acceptance gates.
