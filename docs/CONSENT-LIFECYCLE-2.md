# Privacy Shield 2.0 — Consent Lifecycle Source Boundary

## Status

Development source candidate only. This document does not establish production privacy authorization, runtime acceptance, or Stable qualification.

## Purpose

The Consent Lifecycle 2.0 source layer makes consent duration and termination explicit so a grant cannot silently outlive the user-authorized lifecycle that created it.

The current bounded source implementation supports:

- `purpose_bound` grants, keyed by exact requester, resource, and purpose;
- `one_time` grants that become ineffective after one atomic consumption;
- `session` grants that require the exact session identifier at evaluation time and can be explicitly ended;
- `expiring` grants that require an explicit expiration timestamp;
- durable `denied` decisions;
- durable revocation with a bounded reason;
- explicit consent supersession before an existing denial, grant, or revocation may be replaced.

## Fail-closed rules

Consent is not effective when any applicable lifecycle requirement is unsatisfied. In particular:

- denied or revoked records never authorize an operation;
- expired records never authorize an operation;
- one-time records authorize at most one successful consumption;
- session records require the exact session context;
- a record already present for the same requester/resource/purpose cannot be silently overwritten;
- replacement requires `supersedes_consent_id` to bind the new decision to the exact prior consent record;
- a new record cannot inject revocation or one-time-consumption state.

## Authority and durability boundary

The consent authority stores lifecycle decisions through the injected Privacy Shield state-provider abstraction. Durability therefore inherits the guarantees of the selected state provider. The single-process memory provider and single-host file provider remain non-production where the Privacy Shield production state-provider contract requires distributed, serializable, multi-writer behavior.

This source layer does not choose a production state provider, signing provider, identity provider, deployment topology, or reviewer. It does not create real user consent and cannot convert test records into production authorization.

## Relationship to later Privacy Shield 2.0 work

This slice addresses the lifecycle mechanics in roadmap FR-006. It intentionally does not claim completion of:

- FR-007 purpose and permission drift detection across widened data, destination, retention, export, AI, background, sharing, or capability scope;
- FR-008 Privacy Receipts 2.0 and decision preview;
- FR-009 Privacy Lock;
- FR-010 complete Runtime Trust & Acceptance Matrix;
- application- or adapter-specific runtime acceptance.

Those remain independently governed work.
