# GoreeCloud Privacy Shield

GoreeCloud Privacy Shield is the shared first-party privacy capability and privacy identity for the GoreeCloud platform. GoreeCloud Browser is its first and deepest runtime integration, but Privacy Shield is not limited to Browser. It provides reusable privacy contracts, capability definitions, identity governance, source validation, and application-specific adoption guidance for GoreeCloud applications and services.

## Product identity

Privacy Shield is distinct from both individual GoreeCloud applications and Wardveil Security:

- **GoreeCloud Privacy Shield** is the platform-wide privacy capability and privacy-specific identity.
- **GoreeCloud Browser** is a Privacy Shield consumer and remains the privileged Firefox/Gecko authority for Browser-specific enforcement.
- **Wardveil Security by GoreeCloud** is the platform-wide security and protection identity.
- **Glaze UI** is the shared design language used to present Privacy Shield controls and status.

The approved canonical Privacy Shield icon is stored at `branding/privacy-shield/privacy-shield-icon.svg`. Candidate 01 was explicitly approved on August 19, 2026 after direct review of a rendered PNG. PR #20 merged the authored design as `44d47982d154e0a0a9a913d232a2eae835c6905f`; PR #22 promoted it to the canonical path and merged as `164310648a140a97df006146949fc0c59272eda8`.

## Current foundation

This repository contains the shared Privacy Shield platform contract, portable Browser privacy core, reviewed Browser rules contract, lifecycle governance, identity governance, branding authority, and source validation:

- `contracts/privacy-shield.platform.json` — machine-readable platform-wide Privacy Shield capability and adoption contract;
- `docs/PLATFORM-ADOPTION.md` — platform adoption architecture and initial application map;
- `config/privacy-shield.v2.json` — reviewed Browser configuration and seed rules contract;
- `src/privacy-shield-core.mjs` — portable Firefox-independent Browser privacy behavior;
- `contracts/privacy-shield.ruleset-lifecycle.json` — Browser ruleset ownership, versioning, review, and consumption contract;
- `contracts/privacy-shield.identity.json` — machine-readable product and visual-identity contract;
- `branding/privacy-shield/privacy-shield-icon.svg` — approved canonical visual identity;
- `docs/APPROVED-ICON.md` — explicit icon approval and review record;
- `tools/validate_config.py` and `tools/validate_ruleset_lifecycle.py` — fail-closed Browser source validation;
- `scripts/validate_privacy_shield_identity.py` — fail-closed identity/showcase validator;
- `tests/` — portable-core and contract coverage;
- `.github/workflows/` — automated validation.

Portable-core hardening was merged through PR #18 as `34bcbe9ee6a99c2381bf204b7411286e63abb7a1`. Repository acceptance-state reconciliation was merged through PR #19 as `a8a98be3c2a4f5dff706761a80cca8b704a65af9`.

## Platform responsibilities

Privacy Shield provides reusable privacy capabilities for data minimization, telemetry control, metadata protection, external-content protection, sharing and export privacy, local-processing preference, privacy status and explanation, and normalized privacy events.

Adoption is capability-based. A component implements only the Privacy Shield capabilities relevant to its documented role. Application runtimes remain authoritative for their own enforcement, permissions, data models, and user workflows.

The initial adoption targets include Browser, Search, DNS, Network, Manager, Identity, Notes, Memos, Tasks, Contacts, Gallery, Feed, Keyboard, Notify, and Backup. Adoption must be implemented and validated in each consuming repository before that product is described as Privacy Shield-integrated.

## Browser responsibilities

Browser remains the mature Tier 3 Privacy Shield consumer. Browser-specific Privacy Shield behavior covers first-party native ad and tracker request blocking, local behavioral tracker protection, tracking-parameter cleanup, reviewed exact-match local-resource substitution, site compatibility controls, persistent per-site exceptions through the Browser adapter, understandable blocking/protection reporting, and native GoreeCloud Browser privacy controls.

The native blocker replaces the managed uBlock Origin dependency in the GoreeCloud Browser model. AdGuard Home and GoreeCloud DNS remain separate DNS/network filtering layers.

## Privacy and security boundaries

Privacy Shield does not replace authentication, authorization, encryption, TLS, certificate validation, sandboxing, process isolation, application permissions, application update systems, host security, or Wardveil Security.

Browser behavioral tracker learning stays local and session-scoped in the portable core. Remote tracker learning and remote tracker telemetry are not part of the approved Browser contract. Local-resource substitution remains exact-match only and fails open to the original network request.

Platform-wide Privacy Shield adoption must minimize sensitive event payloads. Shared privacy events must not include private content, credentials, clipboard contents, note text, contact data, DNS query payloads, message contents, or other sensitive information by default.

## Glaze UI and branding

All Privacy Shield user interfaces must follow Glaze UI. The approved icon uses a rounded protective shield, a partially visible central web surface, and layered privacy bands representing filtering and interception. The optional negative-space P is deliberately omitted rather than forcing a conventional lettermark.

Derived toolbar, monochrome, favicon-sized, settings, documentation, and high-resolution assets must originate from `branding/privacy-shield/privacy-shield-icon.svg`. Placeholder, inherited, generic, independently redrawn, or Wardveil artwork must not be represented as the Privacy Shield identity.

## Documentation

- [Platform adoption](docs/PLATFORM-ADOPTION.md)
- [Architecture](docs/ARCHITECTURE.md)
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
| Platform-wide Privacy Shield role | Approved and contract-defined |
| Shared capability/adoption contract | Implemented on platform-expansion branch |
| Portable Browser core foundation | Complete |
| Reviewed Browser v2 configuration and lifecycle contract | Complete |
| Portable-core hardening | Merged and source-validated |
| Fail-closed identity/showcase contract | Complete |
| Canonical Privacy Shield icon | Approved and canonicalized |
| Browser contract synchronization | Source-integrated |
| Compiled Browser runtime/UI acceptance | Pending |
| Non-Browser application adoption | Implementation and acceptance pending per repository |

Privacy Shield is now architected as a platform-wide capability. Production claims remain component-specific: each consuming application or service must implement, validate, and record its own Privacy Shield integration. Browser's compiled runtime/UI acceptance remains a Browser-specific gate rather than a blocker for the shared platform architecture.
