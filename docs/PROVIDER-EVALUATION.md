# Privacy Shield Provider Candidate Evaluation Governance

## Purpose

Privacy Shield 2.0 separates provider qualification into three independently governed stages:

1. **Candidate evaluation** — evidence-backed assessment of whether a provider appears suitable for a bounded GoreeCloud integration decision.
2. **Provider selection** — explicit governance decision authorizing bounded provider-specific implementation work.
3. **Production acceptance** — fresh exact-provider/exact-deployment evidence authorizing the applicable production use.

These stages must not be collapsed. Candidate evaluation is non-authorizing. Selection may authorize implementation only. Production use remains forbidden until the independent acceptance gate passes.

## State-provider evaluation

State-provider candidate evaluations conform to `contracts/privacy-shield.state-provider-evaluation.schema.json` and live under `evaluations/state-providers/*.json` when real candidate evidence exists.

A record binds the provider identity, provider implementation, GoreeCloud integration authority, complete durable-authorization state scope, intended environments, evaluation criteria, evidence references, freshness, privacy boundary, and limitations.

The required criteria are durability, restart recovery, atomic transactions, multi-writer serializability, distributed topology, fail-closed conflict behavior, backup/restore, migration/rollback, access-control isolation, privacy-safe observability, and operational ownership.

Every resolved criterion requires at least one evidence reference. A `complete` evaluation requires every criterion to be `passed` and a future `valid_until`. Evaluation records must keep both `authorizing: false` and `production_acceptance_authorized: false`.

## Signing-key provider evaluation

Signing-key provider candidate evaluations conform to `contracts/privacy-shield.signing-key-provider-evaluation.schema.json` and live under `evaluations/signing-key-providers/*.json` when real candidate evidence exists.

A record binds the provider identity, GoreeCloud integration authority, exact Privacy Shield signing capability and producer identity, intended environments, evaluation criteria, evidence references, freshness, privacy boundary, and limitations.

The required criteria are digest-only signing, non-exportable signing material, opaque key references, stable key identifiers, rotation/retirement/revocation, producer-identity binding, privacy-safe audit, fail-closed untrusted-state behavior, outage/degraded behavior, recovery/continuity, access-control isolation, and operational ownership.

Every resolved criterion requires at least one evidence reference. A `complete` evaluation requires every criterion to be `passed` and a future `valid_until`. Evaluation records must keep both `authorizing: false` and `production_acceptance_authorized: false`.

## Selection binding

Each state-provider or signing-key provider selection must carry `evaluation_record_id` and reference an existing evaluation dossier of the same provider type.

The validator requires exact agreement between the selection and its dossier for provider identity, applicable implementation authority, scope, environments, and all criterion results. The selection decision must not predate the evaluation. Its `review_by` deadline must be no later than the supporting evaluation's `valid_until`, preventing an authorization-to-implement decision from surviving after its evidence basis becomes stale.

An approved selection additionally requires a `complete`, current evaluation with every criterion passed. This prevents selection records from self-asserting favorable evaluation results without separate evidence provenance.

Production acceptance must then carry the exact `selection_decision_id` of the active approved selection. Provider identity or environment similarity is not sufficient: the acceptance artifact must be traceable to the precise governed decision that authorized provider-specific implementation.

## Privacy boundary

Candidate evaluation records must not become stores for operational secrets or user activity. State-provider evaluation records exclude credentials, secret material, and raw private payloads. Signing-key provider evaluation records additionally exclude full capability tokens.

Evidence references should point to bounded authoritative evidence without copying private payloads or secret material into the governance record.

## Current lifecycle boundary

The repository currently contains no real state-provider candidate evaluation records and no real signing-key provider candidate evaluation records. Therefore it also contains no approved provider selections or production-approved provider acceptance records for these P0 capabilities.

The presence of schemas, validators, directories, or this documentation does not select a database, distributed state service, KMS, HSM, cloud key service, Vault deployment, PKCS#11 device, topology, credential, key, or production deployment.

**Status: Development / provider-neutral source governance / non-production.**
