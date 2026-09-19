# Privacy Shield State Provider Contract

## Purpose

Privacy Shield authority state includes consent, policy versions and active-policy pointers, capability revocation, single-use capability consumption, and privacy evidence with its integrity-chain head. A production runtime must not split those namespaces across unrelated caches or rely on process-local state for authorization decisions.

The machine-readable source contract is `contracts/privacy-shield.state-provider.json`. Runtime construction enforces the matching contract identity `goreecloud.privacy-shield.state-provider.v1` when `createPrivacyRuntime({ production: true, ... })` is requested.

## Required production properties

A production state provider must expose the normal `get`, `set`, `delete`, and `list` operations plus a synchronous `transaction` boundary and `stateProviderCapabilities()` declaration. The production profile requires all of these properties:

- durable state;
- restart recovery;
- atomic transactions;
- multi-writer serializability;
- distributed operation;
- fail-closed conflict behavior.

Privacy Shield authority mutations use the shared transaction boundary for consent changes, capability revocation and single-use consumption, policy publication/activation, and evidence event/head commits. This is required so related state cannot be partially committed or independently overwritten by concurrent authority operations.

## Built-in provider boundary

`MemoryPrivacyStateStore` is for development and tests only. It has in-process transactional staging but is not durable, distributed, restart-recoverable, or multi-writer serializable.

`FilePrivacyStateStore` is a bounded single-host durable provider. It uses private `0600` files, file `fsync`, atomic rename, directory `fsync`, a last-validated backup, restart recovery, transaction staging, and stale-writer refusal. It is intentionally marked non-production because it is not a distributed or multi-writer-serializable state system. `createDurablePrivacyRuntime({ production: true })` fails closed.

## Governed provider selection

Before provider-specific production integration work can be authorized, GoreeCloud must record an explicit provider-selection decision conforming to `contracts/privacy-shield.state-provider-selection.schema.json` under `decisions/state-providers/*.json`.

An approved selection must bind the exact provider identity and implementation authority, the complete Privacy Shield durable-authorization state scope, intended environments, and passed evaluation for durability, restart recovery, atomic transactions, multi-writer serializability, distributed topology, fail-closed conflict behavior, backup/restore, migration/rollback, access-control isolation, privacy-safe observability, and operational ownership.

Selection is a governance decision for bounded implementation work only. Every selection record must keep `production_acceptance_authorized: false`. It cannot approve production use, replace exact provider/deployment evidence, or substitute for the independent production acceptance record.

Approved selections are freshness-bounded by `review_by`. Stale selections fail closed. The built-in Memory and File providers cannot be approved for production integration selection. Multiple active approved providers for the same environment are rejected to prevent ambiguous authority-state ownership.

There are currently **zero approved state-provider selections** in the repository.

## Provider-neutral operational qualification

Privacy Shield includes `goreecloud.privacy-shield.state-provider-qualification.v1` and `runStateProviderOperationalQualification()` for controlled, provider-neutral operational exercises against a production-shaped distributed provider candidate.

A qualification controller must explicitly prove that the environment is controlled, disruptive operations are authorized, evidence is minimized, and the controller has no production-acceptance authority. The harness binds the exercise to the exact provider ID and version, provider implementation and authority, environment, deployment ID, topology ID, source revision, source tree, distributed/multi-writer shape, and replica count before operational evidence is produced.

The harness uses a synthetic qualification namespace and records only minimized observations and references. It directly exercises atomic transaction commit/rollback and delegates controlled topology/disruption probes for concurrent-writer serialization, partition/conflict behavior, restart recovery, corrupt-state recovery, backup/restore, and migration/rollback. Operational observability is checked against a minimized audit summary that rejects fields suggestive of private payloads, secrets, credentials, tokens, claims, user content, request bodies, or state values.

`access_control_isolation` is deliberately marked `requires_external_evidence`; source code and a provider-neutral controller cannot prove the deployed access-control policy or organizational isolation review. Operational ownership, supported-load performance, topology/replication/failover review, and production procedures also remain separately governed evidence obligations.

Every qualification result is hard-coded `authorizing: false`. A qualification run is not a candidate evaluation, provider selection, or production acceptance. It can support a later evidence-backed candidate evaluation and exact-provider acceptance record, but it cannot create either one. A complete current candidate evaluation remains required before provider selection, governed selection remains required before provider-specific production integration, and a fresh exact-provider/exact-deployment acceptance record remains required before production use.

The source test provider used by the regression suite is synthetic and is not production evidence. The repository still contains zero real state-provider candidate evaluation records, zero approved distributed state-provider selections, and zero production-approved state-provider acceptance records.

## Production acceptance boundary

A provider capability declaration is not production evidence. A provider-selection decision is also not production evidence. Source validation proves only that a provider presents the required contract shape, that Privacy Shield routes authority mutations through the transaction abstraction, and that governance boundaries remain structurally intact.

Production acceptance still requires exact-provider and exact-deployment evidence for at least:

- persistence across process and host restart as applicable;
- concurrent-writer serialization;
- atomic commit/rollback under injected failure;
- conflict and partition behavior;
- backup and restore;
- recovery from unavailable or corrupted state;
- latency and availability under supported load;
- credential and access-control isolation;
- monitoring and auditability without leaking private payloads;
- declared topology, replication, and failover behavior.

Until such evidence exists, the repository must not describe a source provider, capability declaration, qualification run, or selection record as accepted production Privacy Shield state infrastructure.

## Machine-readable provider acceptance

The independent production acceptance schema is `contracts/privacy-shield.state-provider-acceptance.schema.json`. Governed provider/deployment records belong under `acceptance/state-providers/*.json` and are validated separately from the provider capability, operational qualification, candidate-evaluation, and provider-selection contracts.

Production runtime construction consumes this independent acceptance boundary directly. `createPrivacyRuntime({ production: true, ... })` requires a fresh `state_provider_acceptance` record bound to the exact `runtime_revision`, exact `runtime_tree_sha`, requested `state_provider_environment`, and requested `state_provider_topology_id`. The injected provider must expose matching `provider_id`, `provider_version`, `provider_implementation`, and `provider_authority` metadata through `stateProviderCapabilities()`; self-declared capability booleans alone cannot satisfy the production gate.

A production-approved record is exact-revision and exact-topology bound. It must identify the provider implementation and authority, exact source revision and tree, provider version, deployment environment and topology, distributed/multi-writer replica shape, and all required production capabilities. It must also carry passing evidence for concurrent-writer serialization, atomic commit/rollback, partition/conflict behavior, restart recovery, corrupt-state recovery, backup/restore, migration/rollback, access-control isolation, and privacy-safe operational observability.

Acceptance evidence must exclude raw private payloads and secret material. Favorable acceptance is freshness-bounded through `valid_until`; stale acceptance fails closed. The built-in Memory and File providers are forbidden from receiving production acceptance records.

`tools/validate_state_provider_selection.py` additionally rejects any acceptance record that lacks a matching active approved provider selection for provider ID, provider implementation, integration authority, and environment. This prevents a structurally valid acceptance artifact from silently introducing an ungoverned provider.

The existence of any source contract or qualification harness does not create an accepted provider. Until a separately governed complete/current candidate evaluation exists, an approved selection exists, and a matching record under `acceptance/state-providers/` passes the complete acceptance gate, Privacy Shield has zero source-recorded production state providers.

## Current evidence

The single-host file provider has source-level and CI-tested evidence for consent/evidence/replay state surviving authority restart, capability revocation and single-use consumption surviving restart, private file modes, stale-writer refusal, atomic backup recovery, corrupt primary/backup fail-closed behavior, and transaction commit/rollback behavior.

That evidence is useful for development and bounded same-host acceptance. The provider-neutral operational qualification harness can now gather minimized controlled evidence from a future real distributed candidate, but no such candidate has been evaluated by this repository. Neither source-level evidence nor a qualification run establishes distributed production durability, candidate evaluation, provider selection, adapter production acceptance, compiled Browser acceptance, or overall platform production readiness.
