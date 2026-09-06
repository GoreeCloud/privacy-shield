# Durable Privacy State

Privacy Shield includes a single-node JSON-backed reference state store for consent grants, capability replay/revocation state, and minimized evidence records. This is a source-level durability mechanism, not a distributed production state service.

## Integrity and recovery behavior

`FilePrivacyStateStore` uses an explicit versioned state shape and refuses to load malformed, unsupported, or unexpectedly widened state. Normal writes use a collision-resistant same-directory temporary file, flush the file with `fsync`, atomically rename it into place, reassert mode `0600`, and then `fsync` the containing directory so a reported successful mutation has both file-content and directory-entry durability on supported filesystems.

Before replacing a validated primary state, the store retains the exact last-known-good primary as a mode-`0600` backup using the same atomic, file-flushed, directory-flushed write path. It also fingerprints the loaded primary and refuses stale writes when another runtime has created, replaced, or removed the durable state since this instance loaded it.

If the primary state is missing or invalid and a validated backup is available, the store restores that backup through the atomic durable write path before continuing. If neither primary nor backup state validates, startup fails closed. A state mutation that cannot be persisted is rolled back in memory and returned as an error rather than being reported as durable.

The state store contains authorization and evidence metadata. It is not a signing-key store and must not be used for secrets or private key custody.

## Remaining production boundary

This reference does not provide multi-node consensus, distributed locking, cross-region durability, managed encryption-key custody, external database replication, or production disaster-recovery guarantees. Runtime adapters that require distributed Privacy Shield authority still need a deployment-specific durable state backend with equivalent fail-closed versioning, replay/revocation semantics, backup/recovery evidence, and component-specific acceptance.
