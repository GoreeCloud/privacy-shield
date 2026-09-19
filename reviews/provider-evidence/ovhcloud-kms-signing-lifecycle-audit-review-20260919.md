# Review — OVHcloud KMS signing lifecycle/audit evidence — 2026-09-19

Evidence package:
- `ovhcloud-kms-signing-lifecycle-audit-docs-20260919`
- Provider: OVHcloud KMS HSM-backed asymmetric signing
- Evidence digest: `212607e3358fcf6a9140c3df1f7f7f130a8b6bf496648dcf1bd2e3e5e18dac46`

Review method:
- Re-read the captured evidence artifact.
- Cross-checked current OVHcloud KMS official documentation for pre-hashed signing API support, key lifecycle states, IAM, audit-log fields, regional resilience, HSM protection, and customer/provider responsibility boundaries.
- Confirmed that KMS audit documentation enumerates request/identity/resource/network metadata without documenting signing payload bodies as log fields.

Review result:
- `accepted-for-evaluation`.

Reason:
- The package accurately distinguishes API capability from unimplemented GoreeCloud lifecycle and producer-binding behavior.
- The evidence is suitable to inform later candidate-evaluation decisions for digest-only signing, rotation/retirement/revocation, privacy-safe audit, fail-closed untrusted state, recovery continuity, and operational ownership.
- Producer-identity binding remains unsupported by this package and has no evidence reference in the candidate evaluation.
- This review does not approve the proprietary managed-service exception, an OVHcloud KMS order, key creation, provider selection, adapter implementation, deployment, or production acceptance.

Non-authorizing boundary:
- Proprietary-service exception/necessity review and separate explicit cost/order authorization remain mandatory before any billable KMS action or selection.
