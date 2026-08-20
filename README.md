# GoreeCloud Privacy Shield

GoreeCloud Privacy Shield is the platform-wide privacy foundation for GoreeCloud. It defines shared privacy contracts, reusable privacy behavior, tracking resistance, data-minimization expectations, privacy-safe telemetry and retention controls, user-visible privacy status, and runtime-specific adapter requirements across supported GoreeCloud applications and services.

GoreeCloud Browser remains a privileged Privacy Shield runtime and continues to provide Browser-specific native ad and tracker blocking, tracking-parameter cleanup, reviewed local-resource substitution, site exceptions, and privacy-focused browsing controls.

## Product identity

Privacy Shield is distinct from GoreeCloud Browser and Wardveil Security:

- **GoreeCloud Privacy Shield** is the platform-wide privacy authority and shared privacy-control identity.
- **GoreeCloud Browser** is the browser application and privileged Firefox/Gecko runtime authority for Browser-specific Privacy Shield behavior.
- **Wardveil Security by GoreeCloud** is the platform-wide security and protection authority. It may present Privacy Shield status without replacing Privacy Shield privacy authority.
- **Glaze UI** is the shared GoreeCloud visual and interaction language.

The approved canonical Privacy Shield icon is stored at `branding/privacy-shield/privacy-shield-icon.svg`. Candidate 01 was explicitly approved on August 19, 2026 after direct review of a rendered PNG. PR #20 merged the authored design as `44d47982d154e0a0a9a913d232a2eae835c6905f`; PR #22 promoted it to the canonical path and merged as `164310648a140a97df006146949fc0c59272eda8`.

## Current foundation

This repository contains the portable Privacy Shield core, reviewed Browser rules contract, platform privacy contract, lifecycle governance, identity governance, branding authority, and source validation:

- `config/privacy-shield.v2.json` — reviewed Browser configuration and seed rules contract;
- `src/privacy-shield-core.mjs` — portable Firefox-independent Browser privacy behavior;
- `contracts/privacy-shield.ruleset-lifecycle.json` — Browser ruleset ownership, versioning, review, and Browser-consumption contract;
- `contracts/privacy-shield.identity.json` — machine-readable product and visual-identity contract;
- `contracts/privacy-shield.platform.json` — platform-wide privacy authority, domains, adapter model, and privacy principles;
- `branding/privacy-shield/privacy-shield-icon.svg` — approved canonical visual identity;
- `docs/PLATFORM-ARCHITECTURE.md` — platform-wide authority and distributed-adapter architecture;
- `docs/PLATFORM-ADOPTION.md` — initial adoption targets and capability vocabulary;
- `docs/APPROVED-ICON.md` — explicit icon approval and review record;
- `tools/` and `scripts/` — fail-closed source validation;
- `tests/` — portable-core and contract coverage;
- `.github/workflows/` — automated validation.

## Platform responsibilities

Privacy Shield may govern these privacy domains when implemented by a supported runtime adapter:

- application privacy and permission minimization;
- Browser content protection and tracking resistance;
- network and DNS privacy policy integration;
- telemetry, diagnostics, and observability minimization;
- data collection, retention, deletion, and export expectations;
- metadata minimization and tracking-parameter resistance;
- privacy status, explanations, exceptions, and user controls.

A component must not claim a Privacy Shield capability that it has not implemented and validated.

## Distributed adapter model

Privacy Shield is not a centralized privileged proxy. Runtime authority remains with the component that actually performs the work:

- GoreeCloud Browser owns Firefox/Gecko-specific request interception and browsing privacy behavior.
- GoreeCloud DNS owns DNS privacy filtering and DNS-policy execution.
- GoreeCloud Network owns privacy-relevant encrypted networking and DNS-routing behavior.
- Native and maintained-fork applications own their storage, permissions, telemetry, retention, deletion, and export implementations.
- GoreeCloud Manager and Wardveil Security may aggregate bounded Privacy Shield status without collecting raw private activity merely for dashboard presentation.

## Browser responsibilities

The existing Browser adapter continues to cover first-party native ad and tracker request blocking, local behavioral tracker protection, tracking-parameter cleanup, reviewed exact-match local-resource substitution, site compatibility controls, persistent per-site exceptions, understandable blocking/protection reporting, and native GoreeCloud Browser privacy controls.

The native blocker replaces the managed uBlock Origin dependency in the GoreeCloud Browser model. DNS filtering remains a separate runtime concern owned by GoreeCloud DNS/its underlying DNS stack.

## Privacy and security boundaries

Privacy Shield does not replace Wardveil Security, GoreeCloud Identity, VPN/private-network transport, host/network firewalls, malware scanning, vulnerability management, authentication, authorization, backup, or recovery.

For Browser behavior, Privacy Shield does not replace or weaken Firefox/Gecko Safe Browsing, TLS, certificate validation, sandboxing, process isolation, site permissions, or the application update system.

Privacy Shield remains local-first. Remote tracker learning and remote tracker telemetry are not approved. Platform status aggregation should prefer minimal derived state over raw browsing history, DNS history, content, message bodies, files, clipboard contents, typed text, location history, credentials, or similarly sensitive payloads.

## Glaze UI and branding

All Privacy Shield user interfaces must follow Glaze UI. The approved icon uses a rounded protective shield, a partially visible central web surface, and layered privacy bands representing filtering and interception. The optional negative-space P is deliberately omitted rather than forcing a conventional lettermark.

Derived toolbar, monochrome, favicon-sized, settings, documentation, and high-resolution assets must originate from `branding/privacy-shield/privacy-shield-icon.svg`. Placeholder, inherited, generic, independently redrawn, or Wardveil artwork must not be represented as the Privacy Shield identity.

## Documentation

- [Platform architecture](docs/PLATFORM-ARCHITECTURE.md)
- [Platform adoption](docs/PLATFORM-ADOPTION.md)
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
| Platform-wide privacy role | Approved |
| Platform contract and adoption architecture | Initial foundation implemented |
| Manager/Wardveil privacy posture integration | Planned |
| DNS/Network privacy adapter integration | Planned |
| Application privacy adapters | Planned/incremental |
| Compiled Browser runtime/UI acceptance | Pending |
| Overall platform production approval | Not a single global gate; adapter-specific acceptance required |

Privacy Shield is now a platform-wide GoreeCloud privacy foundation, but each runtime integration retains an independent implementation and production-acceptance boundary. Shared contract validation, successful CI, or branding approval do not independently authorize an adapter as production-ready.
