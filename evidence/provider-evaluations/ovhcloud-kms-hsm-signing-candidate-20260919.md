# OVHcloud KMS HSM signing-provider candidate evidence — 2026-09-19

Status: captured public-source evidence only; non-authorizing; not production acceptance.

Candidate: OVHcloud Key Management Service with HSM-backed asymmetric signing keys for GoreeCloud Privacy Shield operation-bound capability signing.
Intended environment: production.
Integration authority: GoreeCloud/goreecloud-privacy-shield.

Authoritative sources reviewed:
- https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/quick-start
- https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/kms-usage
- https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/architecture-overview
- https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/import-export-keys-byok

Captured findings:
- OVHcloud KMS supports RSA and EC asymmetric service keys with sign and verify operations.
- The service supports an HSM protection level for cryptographic keys.
- OVHcloud architecture documentation states HSM-backed keys never leave the hardware and that cryptographic operations execute on HSMs.
- OVHcloud documents Thales Luna HSMs certified to FIPS 140-3 Level 3 and Common Criteria EAL4+, with HSM-backed keys replicated across three physical HSMs according to region topology.
- Access to keys is controlled by OVHcloud IAM; regional REST API authentication can use a service account, personal access token, or certificate.
- OVHcloud KMS documentation describes regional resilience and host/zone failure behavior.

Unresolved before any completed evaluation or selection:
- Exact compatibility with Privacy Shield's digest-only signDigest interface has not been proven by an implemented adapter and exact API request/response tests.
- Key activation, rotation, retirement, emergency revocation, stale-key rejection, and verification overlap have not been exercised for the intended GoreeCloud lifecycle.
- Privacy-safe signing audit evidence and exact log minimization have not been reviewed.
- Exact production region, outage behavior, recovery/continuity procedure, access-control policy, and operational ownership are not accepted.
- The KMS is a proprietary external managed service. GoreeCloud's open-source governance therefore requires an explicit documented exception/necessity review before long-term production selection.
- Ordering/using KMS and keys may create provider billing; no order, subscription change, key creation, or cost authorization is established by this evidence.
- This evidence does not authorize provider selection, deployment, key creation, production use, or production acceptance.
