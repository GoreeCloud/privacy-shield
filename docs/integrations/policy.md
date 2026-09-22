# GoreeCloud Policy integration boundary

## Status

**Lifecycle:** Development  
**Integration state:** source adoption / migration required  
**Policy source revision:** `46071886da37a6566b69cc923005eef64cce2bcc`  
**Evaluation request contract:** `https://goreecloud.com/contracts/policy/evaluation-request/v1`  
**Decision contract:** `https://goreecloud.com/contracts/policy/decision/v1`

## Implemented boundary

Privacy Shield can construct GoreeCloud Policy v1 evaluation-request payloads and validate returned Policy v1 decision evidence through `src/platform-policy-contract.mjs`.

The adapter preserves the authoritative decision vocabulary:

- `allow`
- `deny`
- `conditional`
- `defer`
- `indeterminate`
- `error`

Returned decision evidence can be bound to the expected request provenance across policy ID/version, authority, subject, resource, and action. Mismatched provenance fails validation.

## Privacy and authority boundary

Privacy Shield remains authoritative for privacy-domain consent, capability, data-use, and privacy authorization decisions within its defined scope. GoreeCloud Policy owns shared policy representation and decision coordination; it does not replace Privacy Shield consent or capability authority.

A structurally valid Policy `allow` is Policy decision evidence only. This adapter exposes no authorization/execution function, does not execute obligations, and does not mutate Privacy Shield state.

Optional Policy request context is privacy-minimized. The source adapter rejects obvious secret-bearing and private-content keys recursively, including credentials/tokens, raw content/payload/message/query/body fields, contact fields, and IP-address fields.

## Deliberate limits

This source adapter:

- performs no network request;
- exposes no Policy endpoint;
- contains no Policy caller credential;
- distributes no policy data;
- executes no Policy obligations;
- enforces no shared Policy decision;
- mutates no consent/capability/privacy state;
- establishes no runtime freshness/expiry acceptance;
- establishes no target-environment evidence;
- establishes no production, release, or Stable acceptance.

## Remaining acceptance work

Production-capable integration still requires accepted caller identity, authenticated request/decision transport, shared policy distribution where applicable, freshness/expiry semantics, obligations handling boundaries, enforcement coordination that cannot widen Privacy Shield authority, target-environment validation, failure/recovery behavior, and explicit production acceptance on exact revisions.
