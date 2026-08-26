# Privacy Shield — GoreeCloud Mesh Evidence Boundary

Privacy Shield can publish minimized privacy evidence through GoreeCloud Mesh using the GoreeCloud Evidence Envelope v1 while retaining Privacy Shield as the sole privacy/data-use authority for the represented assertions.

The source profile is `contracts/privacy-shield.mesh-evidence-profile.json`.

## Core rule

Mesh may coordinate and transport Privacy Shield evidence. It may not authorize a data-use operation, extend consent, broaden a purpose, add a destination, weaken retention/deletion obligations, or convert an unavailable privacy decision into an allowed state.

A valid Mesh envelope is transport-valid only. Any operation that requires Privacy Shield authorization must still be evaluated against the applicable Privacy Shield manifest, policy, consent, purpose, zone, destination, lifecycle, and capability contracts.

## AI and RAG evidence

Privacy Shield AI/RAG work may use Mesh envelopes for bounded derived state such as:

- whether an AI context operation was authorized;
- whether a RAG boundary evaluation allowed, constrained, denied, or required user decision under a producer contract;
- whether required context disposal was evidenced;
- whether a privacy receipt exists and remains current.

The envelope must never carry prompt text, model context, retrieved document content, embeddings derived from private content, or other raw user payloads simply to make the state visible elsewhere.

## Lifecycle coordination with Everkeep

Privacy Shield may publish bounded lifecycle obligations such as retention authorization, deletion requirements, export restrictions, or successor-transfer constraints. Everkeep may consume those obligations when coordinating backups, recovery material, archives, or succession workflows.

Everkeep remains authoritative for recoverability and preservation evidence; Privacy Shield remains authoritative for the privacy/lifecycle rules that constrain those actions.

## Security coordination with Wardveil

Wardveil may consume sanitized Privacy Shield status or privacy-related obligations when security policy needs that context. Wardveil must not reinterpret a Privacy Shield privacy decision as Wardveil-authored privacy authority.

## Minimization

Mesh envelopes must contain derived state and bounded metadata only. Prohibited content includes:

- prompt or model-context content;
- browsing, DNS, network, or location history;
- message and file bodies;
- retrieved document bodies;
- credentials, keys, tokens, and secrets;
- raw consent-sensitive payloads.

Opaque evidence/receipt references and optional SHA-256 digests should be preferred over embedding evidence payloads.

## Acceptance boundary

This profile is a source-level interoperability contract. It does not promote any Privacy Shield adapter, AI gateway, Browser runtime, DNS/Network integration, or other component to production acceptance.
