# Privacy Shield Provider Access-Control Assessments

This directory is reserved for governed external access-control and isolation assessment records for Privacy Shield production-provider candidates.

An assessment is **not** a provider selection, deployment authorization, production acceptance, release decision, or Stable qualification. It is not production acceptance. Every record must remain exact-provider, exact-version, exact-source-revision, exact-deployment-bound, freshness-bounded, privacy-minimized, and non-authorizing.

The assessment contract is `contracts/privacy-shield.provider-access-control-assessment.schema.json`.

A complete assessment requires passing evidence for every required control:

- exclusive provider-boundary access;
- authenticated workload identity;
- least-privilege authorization;
- credential lifecycle and revocation;
- prevention of direct bypass paths;
- fail-closed unauthorized access;
- governed administrative access;
- privacy-safe audit evidence; and
- production-grade controls without reliance on experimental or unstable isolation features.

Resolved controls require content-addressed evidence references. A complete assessment may support a later candidate-evaluation criterion decision or production-acceptance evidence package, but it does not itself change either state.

There are currently **no provider access-control assessment records** in this directory. The failed FoundationDB candidate and draft OVHcloud KMS candidate remain unchanged until separately governed evidence supports a new decision.
