# GoreeCloud Privacy Shield

GoreeCloud Privacy Shield is the first-party privacy and content-protection subsystem for GoreeCloud Browser. It provides a GoreeCloud-owned foundation for native ad and tracker blocking, tracking-parameter cleanup, reviewed local-resource substitution, privacy-focused browsing controls, compatibility handling, and understandable protection status without requiring a third-party extension for the core experience.

## Product identity

Privacy Shield is distinct from GoreeCloud Browser and Wardveil Security:

- **GoreeCloud Browser** is the browser application and privileged Firefox/Gecko runtime authority.
- **Privacy Shield** is the Browser-specific privacy and content-protection subsystem.
- **Wardveil Security by GoreeCloud** is the platform-wide security and protection identity.

The approved canonical Privacy Shield icon is stored at `branding/privacy-shield/privacy-shield-icon.svg`. Candidate 01 was explicitly approved on August 19, 2026 after direct review of a rendered PNG. PR #20 merged the authored design as `44d47982d154e0a0a9a913d232a2eae835c6905f`; PR #22 promoted it to the canonical path and merged as `164310648a140a97df006146949fc0c59272eda8`.

## Current foundation

This repository contains the portable Privacy Shield core, reviewed rules contract, lifecycle governance, identity governance, branding authority, and source validation:

- `config/privacy-shield.v2.json` — reviewed configuration and seed rules contract;
- `src/privacy-shield-core.mjs` — portable Firefox-independent core behavior;
- `contracts/privacy-shield.ruleset-lifecycle.json` — machine-readable ruleset ownership, versioning, review, and Browser-consumption contract;
- `contracts/privacy-shield.identity.json` — machine-readable product and visual-identity contract;
- `branding/privacy-shield/privacy-shield-icon.svg` — approved canonical visual identity;
- `docs/APPROVED-ICON.md` — explicit icon approval and review record;
- `tools/validate_config.py` and `tools/validate_ruleset_lifecycle.py` — fail-closed source validation;
- `scripts/validate_privacy_shield_identity.py` — fail-closed identity/showcase validator;
- `tests/` — portable-core and contract coverage;
- `.github/workflows/` — automated validation.

Portable-core hardening was merged through PR #18 as `34bcbe9ee6a99c2381bf204b7411286e63abb7a1`. Repository acceptance-state reconciliation was merged through PR #19 as `a8a98be3c2a4f5dff706761a80cca8b704a65af9`.

## Core responsibilities

Privacy Shield covers first-party native ad and tracker request blocking, local behavioral tracker protection, tracking-parameter cleanup, reviewed exact-match local-resource substitution, site compatibility controls, persistent per-site exceptions through the Browser adapter, understandable blocking/protection reporting, and native GoreeCloud Browser privacy controls.

The native blocker replaces the managed uBlock Origin dependency in the GoreeCloud Browser model. AdGuard Home remains a separate DNS/network filtering layer.

## Privacy and security boundaries

Privacy Shield does not replace or weaken Firefox/Gecko Safe Browsing, TLS, certificate validation, sandboxing, process isolation, site permissions, or the application update system.

Behavioral tracker learning stays local and session-scoped in the portable core. Remote tracker learning and remote tracker telemetry are not part of the approved contract. Local-resource substitution remains exact-match only and fails open to the original network request.

## Glaze UI and branding

All Privacy Shield user interfaces must follow Glaze UI. The approved icon uses a rounded protective shield, a partially visible central web surface, and layered privacy bands representing filtering and interception. The optional negative-space P is deliberately omitted rather than forcing a conventional lettermark.

Derived toolbar, monochrome, favicon-sized, settings, documentation, and high-resolution assets must originate from `branding/privacy-shield/privacy-shield-icon.svg`. Placeholder, inherited, generic, independently redrawn, or Wardveil artwork must not be represented as the Privacy Shield identity.

## Documentation

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
| Portable core foundation | Complete |
| Reviewed v2 configuration and lifecycle contract | Complete |
| Portable-core hardening | Merged and source-validated |
| Fail-closed identity/showcase contract | Complete |
| Canonical Privacy Shield icon | Approved and canonicalized |
| Browser contract synchronization | Source-integrated |
| Compiled Browser runtime/UI acceptance | Pending |
| Overall production approval | Pending compiled Browser acceptance |

Privacy Shield remains active development until exact compiled GoreeCloud Browser runtime/UI acceptance is executed, reviewed, and recorded. Source validation, Browser source synchronization, successful CI, and icon approval do not independently authorize production-ready classification.
