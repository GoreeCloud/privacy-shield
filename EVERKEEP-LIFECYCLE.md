# Privacy Shield 2.0 — Everkeep Lifecycle Handoff

## Purpose

FR-011 defines the bounded handoff from Privacy Shield lifecycle obligations to Everkeep continuity evidence without making Privacy Shield an execution engine or making Everkeep the owner of an application's underlying technical operation.

Privacy Shield remains authoritative for the privacy/lifecycle obligation. Everkeep remains the GoreeCloud continuity, resilience, recovery, preservation, portability, and succession evidence system. The application, backup system, recovery system, storage system, or other named `execution_authority` remains authoritative for the actual target mutation or operation.

## Authoritative Everkeep source binding

This source candidate is reviewed against `GoreeCloud/goreecloud-everkeep` revision `d55d6317e084de8732681721eaad073c6bb6e725` and its `contracts/continuity.status.schema.json` contract.

Each issued lifecycle obligation records both that exact Everkeep source revision and status schema. Evidence presented for assessment must carry the same exact producer revision and status schema in addition to naming the Everkeep repository; a repository name alone is not enough to establish source compatibility. Evidence from another valid Everkeep revision or another schema fails closed until the obligation/consumer relationship is explicitly migrated.

That Everkeep source defines conservative continuity states, requires current verified evidence before `ready`, and explicitly states that Everkeep does not own the underlying technical operation merely because it presents continuity state.

The source revision pin is a compatibility reference only. It is not Everkeep runtime acceptance or production approval.

## Lifecycle operations

The closed obligation contract supports these lifecycle operations:

- `retain`
- `delete`
- `export`
- `recovery`
- `succession`
- `preservation`

Each obligation is bound to one opaque subject, GoreeCloud application, resource scope, purpose, privacy basis, expected execution authority, issue time, operation-specific parameters, and optional prior evidence references.

Raw content, credentials, reusable secrets, and arbitrary payload fields are not part of the obligation contract.

## Authority boundary

Every lifecycle obligation fixes:

- `privacy_authority: GoreeCloud/goreecloud-privacy-shield`
- `everkeep_authority: GoreeCloud/goreecloud-everkeep`
- `authorization_effect: false`
- `execution_authorization: false`
- `authority_transfer: false`

Privacy Shield cannot name itself as the lifecycle `execution_authority`.

Issuing an obligation does not prove that retention, deletion, export, recovery, succession, or preservation occurred. Transport acceptance, acknowledgement, persistence, presentation, or an Everkeep status record alone also does not prove the target operation succeeded.

## Evidence assessment

`assessEverkeepLifecycleEvidence()` accepts only evidence produced through the pinned Everkeep authority boundary and requires exact binding to the obligation ID, Everkeep source revision, Everkeep status schema, operation, resource scope, and execution authority.

A `satisfied` assessment requires all of the following:

1. the evidence state is `satisfied`;
2. execution is explicitly verified;
3. at least one evidence reference is present;
4. evidence has a valid observation time at or after the obligation issue time;
5. Everkeep provides a bounded `fresh_until` time that is still current;
6. the assessment caller supplies a positive `maxEvidenceAgeMs` consumer freshness policy and the evidence age does not exceed it;
7. the producer revision and status schema exactly match the obligation's Everkeep pins; and
8. all other exact obligation bindings match.

Everkeep's `fresh_until` is producer validity, not permission to keep evidence acceptable indefinitely. The consuming Privacy Shield runtime or operation retains independent authority to require more recent evidence. Effective freshness therefore ends at the earlier of the producer's `fresh_until` boundary and the caller-selected maximum evidence age measured from `observed_at`.

There is deliberately no global default maximum age in this source contract. A missing consumer freshness policy cannot yield `satisfied`; the result fails closed to `unknown` with `consumer_freshness_policy_missing`. A present policy that is zero, negative, fractional, or outside JavaScript's safe-integer duration range is rejected. The owning operation or runtime must choose and justify a positive bounded duration appropriate to its privacy and lifecycle risk.

`execution_verified: true` is valid only with `state: satisfied`. A record that claims verified execution while reporting `pending`, `failed`, or `unknown` is internally contradictory and is rejected instead of being normalized into a weaker state. The published assessment schema mirrors this invariant in both directions: `satisfied` requires verified execution, and verified execution requires `satisfied`.

Missing, stale, future-dated, pre-obligation, unverified, contradictory, source/schema-mismatched, consumer-age-expired, or otherwise mismatched evidence fails closed. Persisted obligation and evidence timestamps must remain canonical UTC in exact JavaScript `toISOString()` form rather than being silently normalized from alternate timezone representations. A pending obligation becomes `overdue` when its defined lifecycle deadline has passed. Stale or unbounded evidence cannot be reused as current proof of lifecycle completion.

The consumer freshness ceiling narrows evidence acceptance only. It does not change Everkeep retention, evidence production, lifecycle execution authority, or the underlying target operation.

## Everkeep relationship

Everkeep may aggregate or normalize evidence from the technical system that actually owns the operation. For example, an application remains authoritative for deletion or export behavior, while a recovery system remains authoritative for its restoration operation. Everkeep can present evidence about those outcomes without silently absorbing their execution authority.

Privacy Shield consumes only the bounded evidence needed to determine whether its lifecycle obligation has current verified support. It does not turn continuity evidence into new data-use authority.

## Acceptance boundary

This FR-011 candidate establishes a source-level contract and reference implementation only. It does not establish:

- deployed Everkeep lifecycle ingestion;
- a production application executor;
- runtime retain/delete/export/recovery/succession/preservation execution;
- a universal or production-approved consumer freshness duration;
- production Everkeep status or recovery acceptance;
- Privacy Shield production state-provider acceptance;
- production GoreeCloud Identity/key acceptance;
- Privacy Center runtime adoption;
- production acceptance or Stable qualification.

Every runtime and execution authority must still prove its own exact-revision and target-environment acceptance.
