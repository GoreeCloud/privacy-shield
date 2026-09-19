# FoundationDB operational and security candidate evidence — 2026-09-19

Status: captured public-source evidence only; non-authorizing; not production acceptance.

Candidate: self-hosted FoundationDB multi-host cluster for GoreeCloud Privacy Shield durable authorization state.
Intended environment: production.
Integration authority: GoreeCloud/goreecloud-privacy-shield.

Authoritative sources reviewed:
- https://apple.github.io/foundationdb/administration.html
- https://apple.github.io/foundationdb/configuration.html
- https://apple.github.io/foundationdb/known-limitations.html
- https://apple.github.io/foundationdb/experimental-features.html
- https://apple.github.io/foundationdb/operations.html
- https://apple.github.io/foundationdb/mr-status.html
- https://apple.github.io/foundationdb/api-general.html
- https://apple.github.io/foundationdb/api-python.html
- https://apple.github.io/foundationdb/backups.html

Captured findings:
- On Linux, FoundationDB uses fdbmonitor to supervise fdbserver and backup-agent child processes; terminated child processes are restarted, and the operating system can restart fdbmonitor itself. This is source-level restart/recovery capability evidence, not proof of GoreeCloud host-failure recovery.
- FoundationDB recommends odd coordinator quorums and physically independent coordinator placement; triple redundancy commonly uses five coordinators. Current GoreeCloud one-VPS infrastructure cannot satisfy the intended failure-isolated production topology.
- FoundationDB can move a cluster to new machines and documents production upgrade procedures. These are migration-operability inputs, but GoreeCloud migration/rollback acceptance still requires exact deployed exercises.
- Machine-readable cluster status is available as JSON and exposes availability, recovery state, fault tolerance, worker health, queue/lag, storage capacity, and related operational signals. This provides an observability surface, but GoreeCloud still must define and validate privacy-minimized collection and retention.
- Client trace logging is disabled by default and can be enabled explicitly. FoundationDB also provides options to disable client statistics logging. Exact production trace/log fields and retention remain unreviewed for Privacy Shield.
- FoundationDB supports TLS for client/server and server/server connections, including peer certificate verification and client options to disable plaintext connections. TLS must be deliberately configured and verified; it is not treated as automatically satisfied.
- FoundationDB's current known-limitations documentation explicitly states that anyone able to connect to a cluster can read and write every key and that no user-level access control exists; external protections are required.
- FoundationDB tenants can constrain transactions to tenant boundaries, but the current experimental-features documentation classifies Tenant as experimental and says experimental features should not be used for production. Tenant isolation therefore cannot be counted as accepted production access-control isolation for this candidate.
- FoundationDB backup tooling supports TLS for backup traffic and documented disaster-recovery workflows, but exact GoreeCloud backup credentials, destinations, restore validation, and independent recovery copies remain unselected and unverified.

Unresolved before any completed evaluation or selection:
- Production access-control isolation is not proven by FoundationDB itself. A production design would require a separately accepted external network/identity isolation boundary or another supported production-grade control; experimental tenants are insufficient.
- Current GoreeCloud infrastructure has only one production VPS and cannot satisfy failure-isolated multi-host production topology.
- No GoreeCloud FoundationDB deployment exists, so restart, host-loss, partition, backup/restore, migration/rollback, corruption, capacity, and failover exercises have not been run.
- Privacy-safe observability must be defined against exact status/trace fields, retention, access controls, and redaction behavior.
- Operational ownership, patching, upgrade cadence, incident handling, monitoring, backup ownership, and recovery responsibilities remain unaccepted.
- This evidence does not authorize infrastructure purchase, deployment, provider selection, or production acceptance.
