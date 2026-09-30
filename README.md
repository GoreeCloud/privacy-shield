# GoreeCloud Privacy Shield

GoreeCloud Privacy Shield is the platform-wide privacy, consent, data-governance, minimization, transparency, and user-control authority for GoreeCloud. It defines shared privacy contracts, data-use authorization, tracking resistance, data-minimization expectations, privacy-safe telemetry and retention controls, user-visible privacy status, and runtime-specific adapter requirements across supported GoreeCloud applications and services.

GoreeCloud Browser remains a privileged Privacy Shield runtime and continues to provide Browser-specific native ad and tracker blocking, tracking-parameter cleanup, reviewed local-resource substitution, site exceptions, and privacy-focused browsing controls.

> **Current status:** Seal under Platform Contract 2.0. Exact candidate `privacy-shield-0.1-seal.1` freezes implementation source at `01e7502b9828bb5611677964e4f6eada70e7d055`. Deployment remains development and Anchor qualification remains blocked on the gate groups in `qualification/seal-readiness.json`. Seal does not create production privacy authority; any material runtime, provider/dependency, privacy/security, recovery, supported-platform, or release-critical configuration change supersedes this candidate.

## Product identity

Privacy Shield is distinct from GoreeCloud Browser and Wardveil Security:

- **GoreeCloud Privacy Shield** is the platform-wide privacy and data-use authority and shared privacy-control identity.
- **GoreeCloud Browser** is the browser application and privileged Firefox/Gecko runtime authority for Browser-specific Privacy Shield behavior.
- **Wardveil Security by GoreeCloud** is the platform-wide security and protection authority. It may provide security evidence to Privacy Shield and present Privacy Shield status without replacing Privacy Shield privacy authority.
- **GoreeCloud Mesh** is the coordination and governance plane. It may transport or correlate Privacy Shield decisions and evidence but cannot create, extend, or upgrade privacy authority.
- **Everkeep** is the resilience and preservation authority and coordinates lifecycle effects such as deletion across backups and recovery material.
- **Glaze UI** is the shared GoreeCloud visual and interaction language.

The approved canonical Privacy Shield icon is stored at `branding/privacy-shield/privacy-shield-icon.svg`. Candidate 01 was explicitly approved on August 19, 2026 after direct review of a rendered PNG. PR #20 merged the authored design as `44d47982d154e0a0a9a913d232a2eae835c6905f`; PR #22 promoted it to the canonical path and merged as `164310648a140a97df006146949fc0c59272eda8`.

## Current foundation

This repository contains the portable Browser Privacy Shield core, the platform authorization core, reviewed Browser rules contract, platform privacy contract, canonical capability registry, lifecycle governance, identity governance, branding authority, and source validation:

- `config/privacy-shield.v2.json` — reviewed Browser configuration and seed rules contract;
- `src/privacy-shield-core.mjs` — portable Firefox-independent Browser privacy behavior;
- `src/privacy-decision-point.mjs` — platform Privacy Decision Point for manifest, policy, consent, purpose, zone, destination, and lifecycle authorization;
- `src/privacy-policy-engine.mjs` — restrictive machine-enforceable policy evaluation and constraint intersection;
- `src/consent-authority.mjs` — scoped consent grant, expiration, and revocation authority prototype;
- `src/capability-token.mjs` — signed, operation-bound capability authority with key rotation, revocation, and replay controls;
- `src/privacy-enforcement-point.mjs` — reference Privacy Enforcement Point that issues and verifies constrained capabilities;
- `src/privacy-evidence.mjs` — minimized evidence and Privacy Receipt prototype;
- `contracts/privacy-shield.policy.schema.json` — machine-readable privacy-policy rule-set contract;
- `contracts/privacy-shield.application-manifest.schema.json` — application privacy declaration contract;
- `contracts/privacy-shield.decision.schema.json` — authorization request/decision contract;
- `contracts/privacy-shield.capability-token.schema.json` — capability-token contract, including signing-key and replay semantics;
- `contracts/privacy-shield.ruleset-lifecycle.json` — Browser ruleset ownership, versioning, review, and Browser-consumption contract;
- `contracts/privacy-shield.identity.json` — machine-readable product and visual-identity contract;
- `contracts/privacy-shield.platform.json` — platform-wide privacy authority, domains, adapter model, and privacy principles;
- `contracts/privacy-shield.capabilities.json` — canonical Privacy Shield capability identifiers, definitions, initial runtime ownership, and governance;
- `contracts/privacy-shield.adapter.schema.json` — machine-readable adapter declaration contract whose capability enum must match the canonical registry exactly;
- `contracts/privacy-shield.status.schema.json` — minimized producer-to-consumer privacy-status contract;
- `branding/privacy-shield/privacy-shield-icon.svg` — approved canonical visual identity;
- `docs/PLATFORM-ARCHITECTURE.md` — platform-wide authority and distributed-adapter architecture;
- `docs/PLATFORM-ADOPTION.md` — current adoption state and canonical capability vocabulary;
- `tools/` and `scripts/` — fail-closed source validation;
- `tests/` — Browser core, platform authorization, policy, and contract coverage;
- `.github/workflows/` — automated validation.

## Privacy Shield 2.0 authorization core

Privacy Shield 2.0 adds an enforceable data-use authorization path alongside the existing Browser privacy runtime. Its foundational invariant is:

> Authorization travels with the operation—not merely with the identity requesting it.

The current source-level decision path is:

`Application / AI / Service → Privacy Enforcement Point → Privacy Decision Point → Manifest + Policy + Consent + Purpose + Zone + Destination + Retention Evaluation → Operation-Bound Capability → Enforcement → Privacy Evidence → Privacy Receipt`

The Decision Point supports four outcomes: `ALLOW`, `DENY`, `ALLOW_WITH_CONSTRAINTS`, and `REQUIRE_USER_DECISION`.

Policy rules can currently:

- deny matching operations;
- require a fresh user decision even when prior consent exists;
- restrict permitted processing zones;
- restrict permitted destinations;
- restrict retention modes;
- prohibit external disclosure;
- inject enforcement obligations;
- cap capability lifetimes.

Constraints intersect rather than broaden authority. A policy cannot use this engine to add a destination, processing zone, operation, purpose, or resource that the application manifest and consent state did not already authorize.

Operation-bound capabilities support explicit signing-key identifiers, rotation, revocation, reusable or single-use replay policy, and key retirement. Source-tested single-host durable consent, policy, replay/revocation, and privacy-evidence state now exists, but production/distributed authority-state acceptance, accepted Everkeep-backed recovery, production key custody, runtime integration, and component-specific acceptance remain required.

## Platform responsibilities

Privacy Shield may govern these privacy domains when implemented by a supported runtime adapter:

- application privacy and contextual permissions;
- purpose limitation and data-use authorization;
- Browser content protection and tracking resistance;
- network and DNS privacy policy integration;
- AI retrieval, context, agent delegation, model-destination, and retention authority;
- telemetry, diagnostics, and observability minimization;
- data collection, retention, deletion, and export expectations;
- metadata minimization and tracking-parameter resistance;
- privacy status, explanations, receipts, exceptions, and user controls.

A component must not claim a Privacy Shield capability that it has not implemented and validated. The canonical capability IDs are controlled by `contracts/privacy-shield.capabilities.json`; branding or adjacent functionality does not confer undeclared capabilities.

## Distributed adapter model

Privacy Shield is not a centralized privileged proxy. Runtime authority remains with the component that actually performs the work while Privacy Shield supplies privacy authorization and shared contracts:

- GoreeCloud Browser owns Firefox/Gecko-specific request interception and browsing privacy behavior.
- GoreeCloud DNS owns DNS privacy filtering and DNS-policy execution when its `dns-privacy` adapter is accepted.
- GoreeCloud Network owns privacy-relevant encrypted networking when its `network-privacy` adapter is accepted.
- Native GoreeCloud applications own their storage and runtime implementation while using Privacy Shield for applicable privacy authorization and evidence contracts.
- GoreeCloud Manager and Wardveil Security may consume bounded Privacy Shield status without collecting raw private activity merely for dashboard presentation.

The central `adapters/` directory is not a wishlist. Draft downstream candidates remain outside that canonical directory until their source-side contract reaches the approved central-integration point.

## Browser responsibilities

The existing Browser adapter continues to cover first-party native ad and tracker request blocking, local behavioral tracker protection, tracking-parameter cleanup, reviewed exact-match local-resource substitution, site compatibility controls, persistent per-site exceptions, understandable blocking/protection reporting, and native GoreeCloud Browser privacy controls.

The native blocker replaces the managed uBlock Origin dependency in the GoreeCloud Browser model. DNS filtering remains a separate runtime concern owned by GoreeCloud DNS/its underlying DNS stack.

## Privacy and security boundaries

Privacy Shield does not replace Wardveil Security, GoreeCloud Identity, VPN/private-network transport, GoreeCloud DNS, host/network firewalls, malware scanning, vulnerability management, authentication, backup, or recovery. Authentication identifies an actor; it does not by itself authorize that actor to use information for an arbitrary purpose.

For Browser behavior, Privacy Shield does not replace or weaken Firefox/Gecko Safe Browsing, TLS, certificate validation, sandboxing, process isolation, site permissions, or the application update system.

Privacy Shield remains local-first. Remote tracker learning and remote tracker telemetry are not approved. Platform status aggregation should prefer minimal derived state over raw browsing history, DNS history, network flows, content, message bodies, files, clipboard contents, typed text, location history, credentials, or similarly sensitive payloads.

## Glaze UI and branding

All Privacy Shield user interfaces must follow Glaze UI. The approved icon uses a rounded protective shield, a partially visible central web surface, and layered privacy bands representing filtering and interception. The optional negative-space P is deliberately omitted rather than forcing a conventional lettermark.

Derived toolbar, monochrome, favicon-sized, settings, documentation, and high-resolution assets must originate from `branding/privacy-shield/privacy-shield-icon.svg`. Placeholder, inherited, generic, independently redrawn, or Wardveil artwork must not be represented as the Privacy Shield identity.

## Project governance

Long-lived Privacy Shield project authority is repository-local:

- [Project specifications](docs/PROJECT-SPECIFICATIONS.md) — durable product requirements and acceptance boundaries.
- [Project record](docs/PROJECT-RECORD.md) — significant architecture, lifecycle, provider-governance, and migration history.

Current feature state remains in [Implemented features](docs/IMPLEMENTED-FEATURES.md) and [Planned features](docs/PLANNED-FEATURES.md); chronology remains in [Changelogs](docs/CHANGELOGS.md). Provider evaluation, selection, and production acceptance remain governed by their exact repository records. Historical Drive project specifications become migration provenance only after the governed migration is accepted and verified.

## Documentation

- [Documentation index](docs/README.md)
- [Capabilities](docs/CAPABILITIES.md)
- [Features](docs/FEATURES.md)
- [Benefits](docs/BENEFITS.md)
- [Branding](docs/BRANDING.md)
- [User manual](docs/USER-MANUAL.md)
- [Security](docs/SECURITY.md)
- [Privacy policy](docs/PRIVACY%20POLICY.md)
- [Runtime trust acceptance matrix](docs/RUNTIME-TRUST-ACCEPTANCE-MATRIX.md)
- [Platform architecture](docs/PLATFORM-ARCHITECTURE.md)
- [Platform adoption](docs/PLATFORM-ADOPTION.md)
- [Canonical capability registry](contracts/privacy-shield.capabilities.json)
- [Application privacy manifest schema](contracts/privacy-shield.application-manifest.schema.json)
- [Privacy policy schema](contracts/privacy-shield.policy.schema.json)
- [Privacy decision schema](contracts/privacy-shield.decision.schema.json)
- [Capability-token schema](contracts/privacy-shield.capability-token.schema.json)
- [Adapter declaration schema](contracts/privacy-shield.adapter.schema.json)
- [Sanitized status schema](contracts/privacy-shield.status.schema.json)
- [Browser architecture](docs/ARCHITECTURE.md)
- [Ruleset lifecycle](docs/RULESET-LIFECYCLE.md)
- [Identity and icon standard](docs/IDENTITY.md)
- [Approved icon record](docs/APPROVED-ICON.md)
- [Browser integration requirements](docs/BROWSER-INTEGRATION.md)
- [Implementation boundary](docs/IMPLEMENTATION-BOUNDARY.md)
- [Acceptance status](docs/ACCEPTANCE-STATUS.md)
- [Branding assets](branding/privacy-shield/README.md)

## Status

| Gate | State |
| --- | --- |
| Portable Browser core foundation | Complete |
| Reviewed Browser v2 configuration and lifecycle contract | Complete |
| Canonical Privacy Shield icon | Approved and canonicalized |
| Browser contract synchronization | Source-integrated |
| Platform-wide privacy role | Approved and merged |
| Platform Contract 2.0 lifecycle | Weave; deployment development, qualification blocked, next gate Seal |
| Platform contract and adapter/status architecture | Merged |
| Canonical capability registry | Merged and machine-validated |
| Privacy Shield 2.0 PDP/PEP authorization prototype | Implemented; source-level validation required for each revision |
| Policy engine and restrictive policy contract | Implemented; source-level prototype |
| Capability rotation, revocation, and replay controls | Implemented; production key/revocation infrastructure pending |
| Single-host durable consent/evidence/replay persistence | Source-implemented and validated; production/distributed provider and Everkeep recovery acceptance pending |
| GoreeCloud Manager status path | Read-only consumer plus bounded source producer implemented; deployed delivery/freshness/target acceptance pending |
| Wardveil Security status presenter | Merged; read-only authority separation enforced |
| GoreeCloud DNS `dns-privacy` adapter | Draft downstream candidate; not centrally promoted or production-approved |
| GoreeCloud Network `network-privacy` adapter | Draft downstream candidate; not centrally promoted or production-approved |
| Additional application privacy adapters | Planned/incremental |
| Compiled Browser runtime/UI acceptance | Pending |
| Overall platform production approval | Not a single global gate; adapter-specific acceptance required |

Privacy Shield is a platform-wide GoreeCloud privacy foundation, but each runtime integration retains an independent implementation and production-acceptance boundary. Shared contract validation, successful CI, source-level authorization tests, branding approval, or a downstream draft declaration do not independently authorize an adapter as production-ready.
