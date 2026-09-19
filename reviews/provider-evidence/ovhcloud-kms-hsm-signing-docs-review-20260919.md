# Review — OVHcloud KMS HSM signing evidence — 2026-09-19

Evidence package:
- `ovhcloud-kms-hsm-signing-docs-20260919`
- Provider: OVHcloud KMS HSM-backed asymmetric signing
- Evidence digest: `45593ed53b2f5bb2dac7bb24d912cdf234c8484430cf58beceadf1e11709ad68`

Review method:
- Re-read the captured evidence artifact.
- Cross-checked current OVHcloud KMS official documentation for RSA/EC sign/verify support, HSM protection level, HSM key non-exportability, HSM replication/resilience, IAM-controlled use, and regional failure behavior.
- Confirmed the documentation still describes HSM-backed keys as remaining inside the HSM and cryptographic operations as executing on HSM hardware.

Review result:
- `accepted-for-evaluation`.

Reason:
- The captured claims are materially supported by current OVHcloud documentation and are appropriately bounded as managed-service capability evidence.
- The evidence is suitable to inform later candidate-evaluation decisions for non-exportable signing material, opaque key references, stable key identifiers, outage/degraded behavior, access-control isolation, and the evaluation summary.
- This review does not approve the proprietary managed-service exception, an OVHcloud KMS order, key creation, provider selection, adapter implementation, deployment, or production acceptance.

Non-authorizing boundary:
- Proprietary-service exception/necessity review and separate explicit cost/order authorization remain mandatory before any billable KMS action or selection.
