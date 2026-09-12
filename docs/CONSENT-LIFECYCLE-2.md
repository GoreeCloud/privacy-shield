# Privacy Shield 2.0 — Consent Lifecycle and Drift Source Boundary

## Status

Development source candidate only. This document does not establish production privacy authorization, runtime acceptance, real user consent, or Stable qualification.

## Purpose

The Consent Lifecycle 2.0 source layer makes consent duration, termination, and permission scope explicit so a grant cannot silently outlive or outgrow the user-authorized operation that created it.

The current bounded source implementation supports:

- `purpose_bound` grants, keyed by exact requester, resource, and purpose;
- `one_time` grants that become ineffective after one atomic consumption;
- `session` grants that require the exact session identifier at evaluation time and can be explicitly ended;
- `expiring` grants that require an explicit expiration timestamp;
- durable `denied` decisions;
- durable revocation with a bounded reason;
- explicit consent supersession before an existing denial, grant, or revocation may be replaced;
- closed permission scopes under `goreecloud.privacy-shield.consent-scope.v1`;
- fail-closed purpose and permission drift assessment before an operation may use a lifecycle-valid grant.

## Consent permission scope

Every newly created consent record receives a canonical closed scope. The scope can authorize only these dimensions:

- `data_categories` — exact data-category identifiers allowed by the grant;
- `destinations` — exact processing or delivery destinations allowed by the grant;
- `zones` — exact privacy/processing zones allowed by the grant;
- `capabilities` — exact capabilities allowed by the grant;
- `retention_seconds` — the maximum retention duration allowed by the grant;
- `export` — whether export is allowed;
- `ai` — whether AI/context use is allowed;
- `background` — whether background operation is allowed;
- `sharing` — whether sharing is allowed.

Unknown fields, duplicate set values, invalid contract identifiers, malformed values, and negative or unsafe retention durations are rejected when a grant is created. A missing grant scope is normalized to the narrowest representable scope rather than to broad implied authority.

## Drift-aware operation assessment

`ConsentAuthority.assessOperation()` is the bounded authorization check for an operation that wants to rely on consent. The operation must supply an explicit requested scope. Missing or malformed request scope fails closed.

An operation is authorized only when all applicable lifecycle rules pass and its requested permission scope is equal to or narrower than the stored grant:

- requested data categories must be a subset of granted data categories;
- requested destinations must be a subset of granted destinations;
- requested zones must be a subset of granted zones;
- requested capabilities must be a subset of granted capabilities;
- requested retention must not exceed the grant's maximum retention;
- export, AI, background, or sharing may be `true` only when the corresponding grant permission is `true`;
- purpose remains exact-bound by requester/resource/purpose and a different purpose cannot inherit a grant for the same requester/resource.

Scope expansion returns `CONSENT_SCOPE_DRIFT` with the exact drift dimensions. A different active purpose returns `CONSENT_PURPOSE_DRIFT`. Missing, invalid, denied, revoked, not-yet-effective, expired, consumed, or session-mismatched authority remains non-authorizing.

`isEffective()` remains a lifecycle-validity helper. Lifecycle validity alone is not permission-scope authorization and must not be substituted for `assessOperation()` when an operation has data, destination, retention, zone, capability, export, AI, background, or sharing semantics.

## Fail-closed rules

Consent is not effective or authorizing when any applicable lifecycle or scope requirement is unsatisfied. In particular:

- denied or revoked records never authorize an operation;
- expired records never authorize an operation;
- one-time records authorize at most one successful consumption;
- session records require the exact session context;
- a record already present for the same requester/resource/purpose cannot be silently overwritten;
- replacement requires `supersedes_consent_id` to bind the new decision to the exact prior consent record;
- a new record cannot inject revocation or one-time-consumption state;
- an operation cannot omit its requested scope and still obtain a drift-aware authorization result;
- an operation cannot expand an authorized dimension merely because the original consent remains lifecycle-valid.

Explicit supersession can create a new broader grant only as a new consent decision bound to the exact prior consent ID. Drift detection never mutates or widens the existing grant automatically.

## Authority and durability boundary

The consent authority stores lifecycle decisions and canonical permission scope through the injected Privacy Shield state-provider abstraction. Durability therefore inherits the guarantees of the selected state provider. The single-process memory provider and single-host file provider remain non-production where the Privacy Shield production state-provider contract requires distributed, serializable, multi-writer behavior.

This source layer does not choose a production state provider, signing provider, identity provider, deployment topology, or reviewer. It does not create real user consent and cannot convert test records into production authorization.

## Relationship to later Privacy Shield 2.0 work

This branch advances roadmap FR-006 and FR-007 source mechanics. It intentionally does not claim completion of:

- application/runtime adoption of the drift-aware operation assessment contract;
- a production accepted state provider or signing provider;
- real user-consent capture or user-facing consent-management UX;
- FR-008 Privacy Receipts 2.0 and decision preview;
- FR-009 Privacy Lock;
- FR-010 complete Runtime Trust & Acceptance Matrix;
- FR-011 Everkeep lifecycle enforcement contract;
- FR-012 Identity-authenticated Mesh delivery expansion;
- application- or adapter-specific runtime acceptance;
- production acceptance or Stable qualification.

Those remain independently governed work.
