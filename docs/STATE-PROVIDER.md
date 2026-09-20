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

`access_control_isolation` is deliberately marked `requires_external_evidence`; source code and a provider-neutral controller cannot prove the deployed access-control policy or organizational isolation review. External isolation evidence is now governed by `contracts/privacy-shield.provider-access-control-assessment.schema.json` with records reserved under `reviews/provider-access-control/*.json`. A complete assessment must be exact-provider, exact-version, exact-source-revision, exact-deployment-bound and must prove boundary exclusivity, workload identity, least privilege, credential lifecycle, bypass prevention, fail-closed unauthorized access, administrative governance, privacy-safe audit, and production-grade controls without experimental isolation dependencies. The assessment remains non-authorizing and cannot substitute for candidate evaluation, provider selection, or production acceptance. Operational ownership, supported-load performance, topology/replication/failover review, and production procedures also remain separately governed evidence obligations.

Every qualification result is hard-coded `authorizing: false`. A qualification run is not a candidate evaluation, provider selection, or production acceptance. It can support a later evidence-backed candidate evaluation and exact-provider acceptance record, but it cannot create either one. A complete current candidate evaluation remains required before provider selection, governed selection remains required before provider-specific production integration, and a fresh exact-provider/exact-deployment acceptance record remains required before production use.

The repository contains one real **failed, non-authorizing** state-provider candidate evaluation for a self-hosted multi-host FoundationDB cluster with two matching reviewed evidence packages and active `accepted-for-evaluation` attestations. Reviewed public evidence supports durability, atomic transactions, multi-writer serializability, distributed topology, and backup/restore as provider capabilities. Access-control isolation is failed because current upstream documentation states that any client able to connect can read and write every key and tenants remain experimental rather than an accepted production boundary. Restart recovery, fail-closed conflict behavior, migration/rollback, privacy-safe observability, and operational ownership remain pending. The current one-VPS production topology also cannot qualify the intended failure-isolated multi-host deployment. The repository still contains zero complete state-provider evaluations, zero approved distributed state-provider selections, and zero production-approved state-provider acceptance records.

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

`tools/validate_state_provider_selection.py` additionally requires every acceptance record to carry the exact `selection_decision_id` of the active approved provider selection and rejects records whose decision ID, provider ID, provider implementation, integration authority, or environment does not exactly match that selection. This prevents a structurally valid acceptance artifact from silently attaching itself to a different or merely similar provider decision.

The existence of any source contract or qualification harness does not create an accepted provider. Until a separately governed complete/current candidate evaluation exists, an approved selection exists, and a matching record under `acceptance/state-providers/` passes the complete acceptance gate, Privacy Shield has zero source-recorded production state providers.

## Current evidence

The single-host file provider has source-level and CI-tested evidence for consent/evidence/replay state surviving authority restart, capability revocation and single-use consumption surviving restart, private file modes, stale-writer refusal, atomic backup recovery, corrupt primary/backup fail-closed behavior, and transaction commit/rollback behavior.

That evidence is useful for development and bounded same-host acceptance. A real FoundationDB multi-host candidate is now recorded as a failed candidate evaluation: five provider-capability criteria are passed, access-control isolation is failed, and the deployment-dependent criteria remain pending; no GoreeCloud FoundationDB cluster exists. The provider-neutral operational qualification harness can gather minimized controlled evidence only after an appropriately isolated deployment exists and disruptive qualification is authorized. Neither reviewed public documentation, source-level evidence, nor a future qualification run by itself establishes distributed production durability, a complete candidate evaluation, provider selection, adapter production acceptance, compiled Browser acceptance, or overall platform production readiness.
