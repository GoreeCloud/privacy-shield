# GoreeCloud operational profile for etcd Privacy Shield candidate — 2026-10-04

Status: candidate operational-ownership and privacy-observability plan; non-authorizing; not deployment or production acceptance.

Candidate: self-hosted etcd v3.7.2 multi-member cluster.
Requesting service and state authority: GoreeCloud Privacy Shield.
Integration authority: GoreeCloud/privacy-shield.
Intended environment: production.

Proposed ownership boundary:
- Privacy Shield owns the provider adapter, key namespace, transaction mapping, schema/version compatibility, runtime fail-closed behavior, and exact provider acceptance binding.
- GoreeCloud infrastructure operations own host placement, service supervision, storage provisioning, firewall/network policy, patching, and node replacement.
- GoreeCloud Identity remains the identity authority for any approved workload/client identity and certificate lifecycle; etcd does not become an identity authority.
- GoreeCloud Observability remains the platform telemetry authority. The provider integration may publish only approved aggregate health/capacity/latency/consensus signals; it must not export Privacy Shield state values, raw evidence payloads, credentials, tokens, or user content.
- Everkeep remains backup/restore/recovery-verification authority. etcd snapshots may be a provider-native input to Everkeep-governed backup and restore, not a replacement for Everkeep acceptance.
- Privacy Shield remains the sole authority for consent, policy, capability revocation/consumption, and privacy evidence semantics.

Proposed topology and isolation:
- Minimum intended production topology: three failure-isolated etcd members; additional members require explicit quorum/failure-domain review.
- Client and peer traffic must use authenticated TLS. Plaintext client or peer transport is not acceptable for production.
- etcd authentication must be enabled. The Privacy Shield runtime identity receives only the exact key-range permissions required for its dedicated namespace.
- Metrics and health endpoints must be bound privately or protected by mTLS/network policy because they are outside v3 RBAC.
- Debug/profiling endpoints remain disabled in production unless explicitly enabled for a bounded incident with separate access controls and retention.
- Direct end-user access to etcd is prohibited.

Proposed privacy-observability profile:
- Collect aggregate availability, quorum/leader, request error, commit latency, backend size/quota, WAL/snapshot, peer transport, disk, and process-resource metrics required for reliability.
- Do not collect key names, values, transaction payloads, Privacy Shield evidence content, bearer tokens, credentials, certificate private material, or raw request bodies.
- Use an explicit metric allow-list and retention/deletion schedule before production acceptance.
- Keep verbose/debug logging disabled by default. Any temporary diagnostic logging requires incident-scoped authorization and post-incident deletion review.

Proposed recovery and change control:
- Take provider-native snapshots on a governed schedule and copy them into the Everkeep-controlled recovery path.
- Verify snapshot integrity and perform fresh restore exercises against an isolated target before production acceptance.
- Upgrade only through supported adjacent-version paths after health checks and a fresh backup.
- Preserve a documented downgrade/snapshot recovery path before each version transition.
- Treat any provider version, topology, identity, key-range policy, storage-layout, or security-profile change as qualification-affecting until revalidated.

Operational-ownership conclusion:
- Ownership responsibilities are defined sufficiently for candidate evaluation and provider-selection consideration.
- This plan does not prove that the responsibilities are staffed, deployed, monitored, or exercised in production.
- A separately governed provider selection, exact implementation, external access-control assessment, operational qualification, and production acceptance remain mandatory.
