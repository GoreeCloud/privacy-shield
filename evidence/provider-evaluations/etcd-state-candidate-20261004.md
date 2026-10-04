# etcd state-provider candidate evidence — 2026-10-04

Status: captured public-source capability evidence only; non-authorizing; not provider selection or production acceptance.

Candidate: self-hosted etcd v3.7.2 multi-member cluster for GoreeCloud Privacy Shield durable authorization state.
Intended environment: production.
Integration authority: GoreeCloud/privacy-shield.

Authoritative sources reviewed:
- https://github.com/etcd-io/etcd/releases
- https://etcd.io/docs/v3.7/learning/api_guarantees/
- https://etcd.io/docs/v3.7/learning/api/
- https://etcd.io/docs/v3.7/op-guide/recovery/
- https://etcd.io/docs/v3.7/op-guide/authentication/rbac/
- https://etcd.io/docs/v3.7/op-guide/security/
- https://etcd.io/docs/v3.7/op-guide/monitoring/
- https://etcd.io/docs/v3.7/upgrades/upgrading-etcd/
- https://etcd.io/docs/v3.7/upgrades/upgrade_3_7/
- https://etcd.io/docs/v3.7/downgrades/
- https://etcd.io/docs/v3.7/faq/

Captured findings:
- etcd v3.7.2 is the current published v3.7 release listed by the upstream release page on September 22, 2026; the upstream project source is Apache-2.0 licensed.
- The v3.7 API guarantees document states that etcd KV operations are durable and strictly serializable. KV operations are atomic and occur in a total order consistent with real-time order.
- The v3 API transaction model applies compare predicates atomically and chooses either the success or failure request block. This supports compare-and-swap style fail-closed authority updates rather than last-writer-wins mutation.
- etcd uses quorum-based distributed consensus. Official recovery/FAQ material states a cluster automatically recovers from temporary failures and tolerates up to (N-1)/2 permanent member failures; loss of quorum prevents further updates instead of accepting divergent writes.
- The disaster-recovery guide documents live snapshots, snapshot integrity hashes, restore into a new logical cluster, membership replacement, and revision-bump/compaction options for consumers that cache/watch state.
- etcd v3 RBAC supports users, roles, and key-range read/write permissions. Authentication protects the v3 gRPC KV surface when enabled.
- etcd supports client/server and peer mutual TLS, certificate validation, and dedicated client/peer trust roots. Security is not enabled by default and therefore must be explicitly configured and verified by GoreeCloud.
- Monitoring uses Prometheus-compatible metrics and health endpoints. Stable high-level metrics cover operational state without requiring Privacy Shield state values; debug/profiling endpoints are optional and can remain disabled. Metrics/health endpoints are outside v3 RBAC and therefore require private binding, mTLS, and/or network-policy protection.
- The v3.7 documentation defines controlled one-minor-at-a-time rolling upgrades. Official downgrade documentation exists, and the v3.6-to-v3.7 upgrade guide requires a pre-upgrade snapshot and describes rollback/recovery options.
- etcd is a bounded infrastructure dependency, not a GoreeCloud application product. It can be operated without a proprietary hosted control plane or mandatory commercial service.

Unresolved before production acceptance:
- No GoreeCloud etcd cluster exists yet, and current production topology must demonstrate at least three genuinely failure-isolated members before distributed acceptance.
- Exact node placement, storage devices, TLS/PKI, RBAC key ranges, workload identity, firewall/network policy, metrics endpoint protection, backup destination, and restore procedures remain undeployed.
- Exact adapter semantics between Privacy Shield's state-provider contract and etcd transactions are not implemented or accepted yet.
- Concurrent-writer, partition/conflict, restart, corruption, backup/restore, migration/rollback, latency, availability, and supported-load exercises have not been run against a GoreeCloud deployment.
- Exact log/metric field allow-lists, retention, deletion, and access-control policy require deployed privacy review.
- This evidence does not authorize provider selection, infrastructure purchase, deployment, production acceptance, release, Anchor, or Stable status.
