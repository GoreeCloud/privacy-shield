# OVHcloud KMS signing lifecycle and audit candidate evidence — 2026-09-19

Status: captured public-source evidence only; non-authorizing; not production acceptance.

Candidate: OVHcloud Key Management Service with HSM-backed asymmetric signing keys for GoreeCloud Privacy Shield operation-bound capability signing.
Intended environment: production.
Integration authority: GoreeCloud/goreecloud-privacy-shield.

Authoritative sources reviewed:
- https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/kms-usage
- https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/quick-start
- https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/architecture-overview
- https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/logs
- https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/raci
- https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/import-export-keys-byok

Captured findings:
- The regional REST signing endpoint accepts a base64 message, signature algorithm, and an isdigest boolean that indicates the message is already hashed. This is direct API-shape evidence that a Privacy Shield adapter can submit a precomputed digest rather than raw capability claims, subject to exact adapter testing.
- OVHcloud KMS supports RSA and EC asymmetric service keys with sign and verify operations. HSM is an available protection level for newly created keys.
- OVHcloud documents HSM-backed keys as remaining inside the HSM and cryptographic operations as executing on the HSM. HSM-backed key material is replicated across three physical HSMs according to region topology.
- Service keys have active, deactivated, compromised, and deleted lifecycle behavior. Deactivated or compromised keys reject sign and verify; deletion is permanent; successful state changes take effect immediately for subsequent requests.
- Lifecycle APIs support activate, deactivate, and delete. These primitives can support GoreeCloud rotation/retirement/revocation workflows, but an exact overlapping-key rotation and safe-retirement procedure has not been implemented or exercised.
- OVHcloud KMS audit logs document request method/path/status, IAM identities and operation, resource URN, source IP/certificate, region/domain identifiers, and request ID. The documented format does not list request bodies or signing payloads, which is useful privacy-minimization evidence, but exact production log contents, forwarding, access, and retention still require validation.
- OVHcloud IAM controls key access. REST API authentication can use a service account, personal access token, or access certificate. Exact least-privilege policy and GoreeCloud service identity binding remain unconfigured.
- OVHcloud documents regional resilience and HSM replication. Its shared-responsibility model assigns key administration and reversibility responsibilities to the customer while OVHcloud operates the managed service and continuity infrastructure.
- Imported/BYOK keys can have different extractability history; HSM-backed keys cannot currently be used for BYOK. A Privacy Shield production key would need exact generation and non-exportability evidence for the chosen creation path rather than relying on provider class alone.

Unresolved before any completed evaluation or selection:
- isdigest support is API capability evidence only; no Privacy Shield adapter has demonstrated exact algorithm, encoding, producer identity, error, and verification behavior.
- Producer-identity binding is not established merely by the KMS key context field or IAM identity. The Privacy Shield producer binding must be designed and tested explicitly.
- Rotation overlap, safe retirement, emergency revocation, stale-key rejection in Privacy Shield verification, and recovery/continuity procedures have not been exercised.
- Privacy-safe audit acceptance requires exact deployed log samples, access controls, retention, forwarding configuration, and confirmation that no capability payload or secret material is recorded.
- Exact region, IAM policy, service account/certificate lifecycle, operational ownership, support/escalation, outage handling, and replacement/export strategy remain undecided.
- OVHcloud KMS is a proprietary managed external service. GoreeCloud requires a documented exception/necessity review before long-term production selection.
- Ordering a KMS domain or creating keys may create provider obligations or billing; no order, subscription change, key creation, cost authorization, selection, deployment, or production acceptance is authorized by this evidence.
