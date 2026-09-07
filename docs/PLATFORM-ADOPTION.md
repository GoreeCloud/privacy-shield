# Privacy Shield Platform Adoption

## Adoption rule

A GoreeCloud component may adopt Privacy Shield only through an explicit adapter or declared privacy-capability contract. Branding alone is not adoption.

Each integration must identify the runtime authority, supported capabilities, privacy guarantees, validation method, limitations, and production-acceptance gate. Shared Privacy Shield validation is never a substitute for runtime-specific acceptance.

The canonical capability vocabulary is machine-readable in `contracts/privacy-shield.capabilities.json`. The adapter declaration schema in `contracts/privacy-shield.adapter.schema.json` must expose exactly the same capability identifiers.

Exact-runtime acceptance records are stored separately under `acceptance/` and validated against `contracts/privacy-shield.adapter-runtime-acceptance.schema.json`. A passed runtime record proves only the declared adapter capabilities at the exact source revision and representative target it names. It does not silently set `production_approved=true`, grant undeclared capabilities, or promote the consuming application's lifecycle.

## Current adoption state

### GoreeCloud Browser

Role: privileged enforcement adapter.

Browser remains the authoritative Firefox/Gecko runtime for its implemented Privacy Shield behavior. The canonical Browser adapter currently declares Browser-specific capabilities and retains its independent compiled-runtime acceptance boundary. Browser source integration does not authorize other GoreeCloud runtimes to reuse Browser capability claims.

### GoreeCloud Manager

Role: read-only status consumer.

Manager's privacy-safe status consumer has been merged into `GoreeCloud/goreecloud-manager`. It accepts only minimized Privacy Shield status that explicitly excludes raw private activity, credentials, and identifying content. Manager does not enforce Privacy Shield controls, infer undeclared capabilities, or promote production approval. No accepted runtime status producer is currently activated for the Manager path.

### GoreeCloud Care

Role: local-first application privacy/status adapter.

The canonical `goreecloud-care` adapter declares only `telemetry-minimization`, `data-minimization`, and `privacy-status`, with `GoreeCloud/goreecloud-zorin-os` remaining the runtime authority. Its exact dev22 source `a0eeac5fc3081225dbaeec6e0a5e5578cfe26569` passed representative Zorin OS 17.3 runtime/package acceptance for those declared capabilities and the associated minimized local status boundary. The machine-readable record is `acceptance/goreecloud-care.json`.

This runtime acceptance is revision-scoped and does not expand Care into content blocking, tracking resistance, DNS privacy, network privacy, retention/deletion authority, export authority, or exception management. Care remains Development / nonconformant and the central adapter deliberately retains `production_approved=false`; production approval is a separate governed release decision.

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

## Compact and wearable privacy presentation

Privacy Shield status may be surfaced on compact, glanceable, wearable, notification, tile, complication, or similarly constrained Glaze UI surfaces only through the same minimized status boundary used by larger consumers.

A constrained privacy surface must:

- present only declared capabilities actually implemented by the authoritative runtime;
- preserve non-passing, unavailable, unsupported, exception, or stale conditions instead of collapsing them into a generic protected-looking icon;
- avoid exporting raw browsing history, DNS queries, network flows, message content, files, clipboard data, typed text, location history, credentials, identifiers, or unrestricted diagnostics merely to enrich the surface;
- preserve enough authority and scope context for the user to understand which runtime and capability the status describes, directly or through an accessible focused detail path;
- keep user-visible exceptions and overrides distinguishable from normal protection state when they materially alter the represented capability;
- use deep links to the authoritative application for detailed controls rather than duplicating privileged privacy controls in a status-only wearable or glance surface;
- follow the current Stable Glaze UI contract for the target form factor before a consuming application claims production conformance.

A compact Privacy Shield surface is a minimized view of existing privacy state. It does not become a new enforcement adapter and cannot grant capabilities, production approval, or privacy authority to the presenting application.

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

A machine-readable runtime acceptance record under `acceptance/` must bind a passed result to the canonical adapter declaration, exact immutable source revision, representative target, declared capability set, matching privacy assertions, and evidence references. The platform validator rejects capability/privacy drift and rejects production approval that disagrees with the canonical adapter declaration. Runtime acceptance and production approval are deliberately separate states.

A consumer that adds a compact or wearable Privacy Shield surface must additionally validate minimized payload use, capability truthfulness, exception/non-passing presentation, accessible state communication, and the absence of raw private activity at the exact intended source revision.

The canonical `adapters/` directory should contain only adapter declarations whose source-side contract has reached the approved central-integration point. Draft downstream candidates may remain documented here without being promoted into the canonical central adapter directory.
