# Privacy Shield Platform Adoption

## Adoption rule

A GoreeCloud component may adopt Privacy Shield only through an explicit adapter or declared privacy-capability contract. Branding alone is not adoption.

Each integration must identify the runtime authority, supported capabilities, privacy guarantees, validation method, limitations, and production-acceptance gate. Shared Privacy Shield validation is never a substitute for runtime-specific acceptance.

The canonical capability vocabulary is machine-readable in `contracts/privacy-shield.capabilities.json`. The adapter declaration schema in `contracts/privacy-shield.adapter.schema.json` must expose exactly the same capability identifiers.

## Current adoption state

### GoreeCloud Browser

Role: privileged enforcement adapter.

Browser remains the authoritative Firefox/Gecko runtime for its implemented Privacy Shield behavior. The canonical Browser adapter currently declares Browser-specific capabilities and retains its independent compiled-runtime acceptance boundary. Browser source integration does not authorize other GoreeCloud runtimes to reuse Browser capability claims.

### GoreeCloud Manager

Role: read-only status consumer.

Manager's privacy-safe status consumer has been merged into `GoreeCloud/goreecloud-manager`. It accepts only minimized Privacy Shield status that explicitly excludes raw private activity, credentials, and identifying content. Manager does not enforce Privacy Shield controls, infer undeclared capabilities, or promote production approval. No accepted runtime status producer is currently activated for the Manager path.

### Wardveil Security

Role: read-only security-context presenter.

Wardveil's Privacy Shield presentation contract has been merged into `GoreeCloud/goreecloud-wardveil-security`. Wardveil may display sanitized Privacy Shield status while keeping the privacy and security authorities separate. Privacy Shield-derived status never independently authorizes `Protected by Wardveil`, and Privacy Shield is excluded from Wardveil's primary required-control aggregation by default.

### GoreeCloud DNS

Role: candidate `dns-privacy` enforcement adapter.

The focused GoreeCloud DNS adapter candidate is maintained in a stacked draft branch/PR in `GoreeCloud/goreecloud-dns`. It declares only `dns-privacy`, keeps `runtime_acceptance_required=true`, and keeps `production_approved=false`. GoreeCloud DNS remains authoritative for client-facing DNS filtering/policy and Unbound remains authoritative for recursive resolution, caching, and DNSSEC under the current architecture. The candidate is not added to the canonical central adapter directory until its DNS-side source and runtime acceptance boundary is sufficiently established.

### GoreeCloud Network

Role: candidate `network-privacy` enforcement adapter.

The focused GoreeCloud Network adapter candidate is maintained in a stacked draft branch/PR in `GoreeCloud/goreecloud-network`. It declares only `network-privacy`, keeps `runtime_acceptance_required=true`, and keeps `production_approved=false`. GoreeCloud Network remains authoritative for encrypted private networking, WireGuard/TUN behavior, peer connectivity, management, signaling, relay, and routing. Privacy Shield does not become a VPN engine, route controller, firewall, DNS service, identity provider, or application-authorization layer.

### Native and maintained-fork applications

Additional applications may incrementally adopt application-level capabilities only when those controls actually exist at the authoritative runtime and have an explicit acceptance boundary. Product identity, Glaze UI presentation, Wardveil presentation, or general privacy-oriented intent is insufficient evidence of implementation.

## Canonical capability vocabulary

The current Privacy Shield adapter capabilities are:

- `content-blocking` — reviewed privacy-invasive content/request blocking at an implementing runtime.
- `tracking-resistance` — supported local-first tracking-resistance behavior.
- `url-cleaning` — reviewed tracking-parameter removal from supported URL handling paths.
- `dns-privacy` — privacy-oriented DNS filtering/policy behavior at the authoritative DNS runtime.
- `network-privacy` — privacy-preserving encrypted private-network connectivity at the authoritative networking runtime.
- `telemetry-minimization` — minimized optional telemetry/diagnostic collection under an explicit application contract.
- `data-minimization` — purpose-bound collection/processing minimization at an implementing application.
- `retention-controls` — bounded retention controls at the authoritative application runtime.
- `deletion-controls` — user-authorized deletion controls at the authoritative application runtime.
- `portable-export` — documented portable export for approved Privacy Shield-owned or privacy-relevant application state.
- `privacy-status` — minimized status production conforming to the shared status contract without exporting raw private activity.
- `user-visible-exceptions` — authorized, user-visible Privacy Shield exceptions or overrides without unrelated private-data exposure.

These identifiers are stable contract keys. New capability identifiers require reviewed changes to the canonical capability registry, adapter schema, platform validator, and applicable documentation.

## Status and data-minimization rule

Privacy Shield dashboards and aggregators should consume only purpose-bound status. Raw browsing activity, raw DNS queries, raw network flows, credentials, identifiers, unrestricted diagnostic logs, or other private source data must not be exported merely to make a centralized Privacy Shield view more detailed.

A status consumer must not synthesize implementation from branding, configuration presence, product identity, or a neighboring capability. For example, a DNS adapter does not gain `tracking-resistance` merely because it blocks some tracker domains, and a Network adapter does not gain `dns-privacy` merely because it can distribute DNS configuration.

## Non-goals

Privacy Shield does not replace:

- Wardveil Security;
- GoreeCloud Identity;
- GoreeCloud Network or VPN functionality;
- GoreeCloud DNS or recursive DNS functionality;
- host/network firewalls;
- malware scanning;
- vulnerability management;
- authentication or authorization;
- backup and recovery;
- application-specific runtime security controls.

## Acceptance

No adapter may report Stable, `production_ready`, or `production_approved=true` solely because the shared Privacy Shield repository passes validation. Each runtime must demonstrate its own implementation and acceptance evidence.

The canonical `adapters/` directory should contain only adapter declarations whose source-side contract has reached the approved central-integration point. Draft downstream candidates may remain documented here without being promoted into the canonical central adapter directory.
