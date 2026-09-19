# FoundationDB state-provider candidate evidence — 2026-09-19

Status: captured public-source evidence only; non-authorizing; not production acceptance.

Candidate: self-hosted FoundationDB multi-host cluster for GoreeCloud Privacy Shield durable authorization state.
Intended environment: production.
Integration authority: GoreeCloud/goreecloud-privacy-shield.

Authoritative sources reviewed:
- https://github.com/apple/foundationdb
- https://github.com/apple/foundationdb/blob/main/LICENSE
- https://apple.github.io/foundationdb/developer-guide.html
- https://apple.github.io/foundationdb/administration.html
- https://apple.github.io/foundationdb/backups.html
- https://apple.github.io/foundationdb/operations.html

Captured findings:
- FoundationDB is published under Apache License 2.0 and describes itself as an open-source distributed transactional key-value store.
- The developer guide documents global ACID transactions with strict serializability and optimistic concurrency.
- The developer guide states successful writes are written to multiple cluster nodes and describes durability across failures or network partitions.
- Administration documentation defines a cluster as processes spread across physical machines and warns that multiple VMs on one physical machine subvert hardware-failure isolation unless explicitly modeled.
- Administration documentation describes multi-machine fault tolerance, odd coordinator quorums, TLS support, cluster monitoring, and multi-datacenter operation.
- Backup documentation describes consistent point-in-time backup and restore for disaster recovery.

Unresolved before any completed evaluation or selection:
- GoreeCloud currently has only one production VPS; the candidate cannot satisfy the required distributed production topology on current infrastructure.
- Exact production node count, regions, redundancy mode, coordinator placement, storage layout, TLS/PKI, and network policy are not selected or deployed.
- Restart and host-failure exercises have not been run against a GoreeCloud deployment.
- Backup/restore, migration/rollback, corruption recovery, access-control isolation, privacy-safe observability, and operational ownership are not yet accepted.
- Performance and capacity are not qualified for Privacy Shield workloads.
- This evidence does not authorize infrastructure purchase, deployment, provider selection, or production acceptance.
