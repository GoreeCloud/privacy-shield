# Privacy Shield Signing-Key Provider Selection

## Purpose

Privacy Shield must not move from a provider-neutral signing contract directly to implementation or production acceptance without an explicit GoreeCloud provider-selection decision.

This document defines the source-controlled selection boundary between the generic signing-key custody architecture and a future exact production provider implementation.

## Machine-readable decision contract

Provider-selection records conform to `contracts/privacy-shield.signing-key-provider-selection.schema.json` and live under `decisions/signing-key-providers/*.json` when a real selection decision exists.

A selection record binds:

- a decision ID;
- provider ID and human-readable provider name;
- the GoreeCloud repository authorized to own the integration;
- Privacy Shield as the requesting service;
- operation-bound capability signing as the exact capability scope;
- producer identity `goreecloud-privacy-shield`;
- the explicitly selected target environments;
- evaluated custody and operational requirements;
- governing decision reference, decision time, and review deadline;
- a non-secret limitations list.

## Evaluation requirements

An approved selection must record every required selection criterion as passed:

- digest-only signing;
- non-exportable signing material capability;
- opaque key references;
- stable key identifiers;
- rotation, retirement, and revocation support;
- producer-identity binding;
- privacy-safe signing audit capability;
- fail-closed behavior for untrusted key state;
- defined outage/degraded behavior;
- defined recovery/continuity behavior;
- access-control isolation capability;
- clear operational ownership.

This evaluation is a provider-selection threshold, not proof that the deployed provider actually satisfies production acceptance. External evidence and exact-deployment exercises remain separate.

## Governance boundary

Only a record with `governance.status: approved` may set `implementation_authorized: true`.

Every selection record is required to set `production_acceptance_authorized: false`. Provider selection authorizes bounded integration work only. It cannot authorize a production runtime, provider deployment, Stable release, or platform-wide Privacy Shield state.

Approved selections are review-bounded. A stale `review_by` value causes validation to fail closed rather than allowing an old selection to silently remain authoritative.

CI also rejects multiple active approved signing providers for the same environment.

## Acceptance dependency

A signing-key provider acceptance record under `acceptance/signing-key-providers/` is structurally invalid unless it carries the exact `selection_decision_id` of a current active approved selection and that decision also matches the same:

- provider ID;
- GoreeCloud integration authority;
- producer identity;
- deployment environment.

An acceptance record cannot satisfy this dependency by matching any other approved provider decision with similar attributes. Selection therefore precedes acceptance, while acceptance remains independently exact-decision, exact-provider, exact-version, exact-source-revision, exact-deployment, evidence-backed, and freshness-bounded.

## Privacy boundary

Selection records must not contain:

- signing-key secret material;
- service credentials;
- raw private payloads;
- full capability tokens.

The selection process should record capability and governance conclusions rather than private operational content.

## Current status

There are currently **zero approved signing-key provider selection records** in the repository.

One **draft, non-authorizing** candidate evaluation now exists for OVHcloud KMS with HSM-backed asymmetric signing. Its evidence package is captured but unreviewed, all evaluation criteria remain pending, no KMS domain/key or adapter exists, and the managed service still requires a separate GoreeCloud proprietary-service exception/necessity review plus explicit cost/order authorization before it could be selected or deployed.

No KMS, HSM, cloud key service, Vault deployment, PKCS#11 device, or other custody provider is selected, implemented, deployed, or production-accepted by this governance layer. A complete reviewed evaluation and explicit provider-selection decision must be recorded through the governing GoreeCloud process before provider-specific integration work is represented as authorized.
