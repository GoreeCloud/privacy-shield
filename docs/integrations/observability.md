# GoreeCloud Observability integration boundary

## Status

**Lifecycle:** Development  
**Integration state:** source adoption / migration required  
**Observability source revision:** `a7f6a65f442d3e517baddbe7b6ce7c250d142c8c`  
**Contract:** `https://goreecloud.com/contracts/observability/operational-signal/v1`

## Implemented boundary

Privacy Shield can construct an Observability v1 operational-signal payload from Privacy Shield-owned operational evidence through `src/observability-signal.mjs`.

The constructor preserves the authoritative state vocabulary:

- `healthy`
- `degraded`
- `failed`
- `unavailable`
- `unknown`
- `stale`
- `partially_observed`
- `not_monitored`
- `not_applicable`

It also enforces the contract TTL range of 1 through 86,400 seconds and preserves explicit collection-gap evidence.

## Privacy boundary

Operational evidence must be privacy-minimized before it leaves Privacy Shield authority. The source adapter rejects obvious secret-bearing and privacy-sensitive attribute names recursively, including credentials/tokens, request content/payloads/messages/queries, direct contact fields, IP-address fields, and direct user identifiers.

A caller must use `unknown`, `unavailable`, `stale`, or `partially_observed` when the available evidence does not support a stronger state. Absence of evidence must not be converted into `healthy`.

## Deliberate limits

This source adapter:

- performs no network request;
- exposes no endpoint;
- contains no collector credential;
- retains no telemetry;
- establishes no producer authentication;
- establishes no live collection or delivery;
- establishes no retention/deletion policy acceptance;
- establishes no alerting or SLO authority;
- establishes no target-environment monitoring coverage;
- establishes no production, release, or Stable acceptance.

Privacy Shield remains authoritative for privacy decisions. GoreeCloud Observability remains authoritative for shared operational telemetry and evidence correlation. Observability evidence must not become a substitute for Privacy Shield authorization or user-content collection.

## Remaining acceptance work

Production-capable integration still requires an accepted producer identity, authenticated delivery, collector/runtime integration, freshness/completeness validation, privacy-preserving retention/deletion behavior, diagnostics/alerting acceptance, target-environment verification, and explicit production acceptance on exact revisions.
