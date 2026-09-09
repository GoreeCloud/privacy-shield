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

## Production acceptance boundary

A provider capability declaration is not production evidence. Source validation proves only that a provider presents the required contract shape and that Privacy Shield routes authority mutations through the transaction abstraction.

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

Until such evidence exists, the repository must not describe a source provider or a capability declaration as accepted production Privacy Shield state infrastructure.

## Machine-readable provider acceptance

The independent production acceptance schema is `contracts/privacy-shield.state-provider-acceptance.schema.json`. Governed provider/deployment records belong under `acceptance/state-providers/*.json` and are validated separately from the provider capability contract.

A production-approved record is exact-revision and exact-topology bound. It must identify the provider implementation and authority, exact source revision and tree, provider version, deployment environment and topology, distributed/multi-writer replica shape, and all required production capabilities. It must also carry passing evidence for concurrent-writer serialization, atomic commit/rollback, partition/conflict behavior, restart recovery, corrupt-state recovery, backup/restore, migration/rollback, access-control isolation, and privacy-safe operational observability.

Acceptance evidence must exclude raw private payloads and secret material. Favorable acceptance is freshness-bounded through `valid_until`; stale acceptance fails closed. The built-in Memory and File providers are forbidden from receiving production acceptance records.

The existence of the acceptance schema does not create an accepted provider. Until a separately governed record under `acceptance/state-providers/` passes the complete acceptance gate, Privacy Shield has zero source-recorded production state providers.

## Current evidence

The single-host file provider has source-level and CI-tested evidence for consent/evidence/replay state surviving authority restart, capability revocation and single-use consumption surviving restart, private file modes, stale-writer refusal, atomic backup recovery, corrupt primary/backup fail-closed behavior, and transaction commit/rollback behavior.

That evidence is useful for development and bounded same-host acceptance. It does not establish distributed production durability, adapter production acceptance, compiled Browser acceptance, or overall platform production readiness.
