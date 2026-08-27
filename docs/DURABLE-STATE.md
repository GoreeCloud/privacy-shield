# Durable Privacy State

Privacy Shield includes a single-node JSON-backed reference state store for consent grants, capability replay/revocation state, and minimized evidence records. This is a source-level durability mechanism, not a distributed production state service.

## Integrity and recovery behavior

`JsonFilePrivacyStateStore` uses an explicit versioned state shape and refuses to load malformed, unsupported, or unexpectedly widened state. Normal writes use a same-directory temporary file and atomic rename. Before replacing a validated primary state, the store retains a mode-`0600` last-known-good backup.

If the primary state is missing or invalid and a validated backup is available, the store restores that backup to the primary path before continuing. If neither primary nor backup state validates, startup fails closed. A state mutation that cannot be persisted is rolled back in memory and returned as an error rather than being reported as durable.

The state store contains authorization and evidence metadata. It is not a signing-key store and must not be used for secrets or private key custody.

## Remaining production boundary

This reference does not provide multi-node consensus, distributed locking, cross-region durability, managed encryption-key custody, external database replication, or production disaster-recovery guarantees. Runtime adapters that require distributed Privacy Shield authority still need a deployment-specific durable state backend with equivalent fail-closed versioning, replay/revocation semantics, backup/recovery evidence, and component-specific acceptance.
