# GoreeCloud Privacy Shield

GoreeCloud Privacy Shield is the first-party privacy and content-protection subsystem for GoreeCloud Browser.

It provides a GoreeCloud-owned foundation for native ad and tracker blocking, tracking-parameter cleanup, reviewed local-resource substitution, privacy-focused browsing controls, compatibility handling, and clear protection status without requiring a third-party extension for the core experience.

## Product identity

Privacy Shield is distinct from both GoreeCloud Browser and Wardveil Security:

- **GoreeCloud Browser** is the browser application.
- **Privacy Shield** is the Browser-specific privacy and content-protection subsystem.
- **Wardveil Security by GoreeCloud** is the platform-wide security and protection identity.

Privacy Shield therefore requires its own recognizable icon and visual identity. It must not reuse the Browser icon, a generic GoreeCloud mark, or the Wardveil Security identity.

## Current foundation

This repository contains the portable Privacy Shield core, reviewed rules contract, lifecycle governance, identity governance, and source validation:

- `config/privacy-shield.v2.json` — reviewed configuration and seed rules contract;
- `src/privacy-shield-core.mjs` — portable, Firefox-independent core behavior;
- `contracts/privacy-shield.ruleset-lifecycle.json` — machine-readable ruleset ownership, versioning, review, and Browser-consumption contract;
- `tools/validate_config.py` — fail-closed configuration validation;
- `tools/validate_ruleset_lifecycle.py` — fail-closed lifecycle and Browser-consumption validation;
- `tests/core.test.mjs` — Node tests for blocking, URL cleaning, tracker evidence, exceptions, and substitution boundaries;
- `tests/test_config.py` and `tests/test_ruleset_lifecycle.py` — source-contract tests;
- `.github/workflows/validate.yml` — automated core/configuration/lifecycle source validation;
- `contracts/privacy-shield.identity.json` — machine-readable product and visual-identity contract;
- `scripts/validate_privacy_shield_identity.py` — fail-closed identity/showcase validator;
- `.github/workflows/validate-identity.yml` — dedicated identity validation.

GoreeCloud Browser continues to own the Gecko-specific runtime adapter: preference persistence, HTTP-channel integration, Browser lifecycle hooks, private-browsing behavior, and integration with Browser-owned navigation/copy/share surfaces.

## Core responsibilities

Privacy Shield covers:

- first-party native ad and tracker request blocking;
- local behavioral tracker protection;
- tracking-parameter cleanup;
- reviewed exact-match local-resource substitution;
- site compatibility controls and persistent per-site exceptions in the Browser adapter;
- understandable blocking and protection reporting;
- privacy controls presented as native GoreeCloud Browser experiences.

The native blocker replaces the managed uBlock Origin dependency in the GoreeCloud Browser model. AdGuard Home remains a separate DNS/network filtering layer.

## Privacy and security boundaries

Privacy Shield does not replace or weaken Firefox/Gecko Safe Browsing, TLS, certificate validation, sandboxing, process isolation, site permissions, or the application update system.

Behavioral tracker learning stays local and session-scoped in the portable core. The reviewed threshold is three distinct first-party sites with a tracking signal. Remote tracker learning and remote tracker telemetry are not part of the approved contract.

Local-resource substitution remains exact-match only and fails open to the original network request. The payload catalog intentionally remains empty until resources receive provenance, licensing, integrity, update, and compatibility review.

The canonical ruleset is versioned independently from its JSON schema. Material rule or behavior changes require review and a ruleset-version increment; source validation cannot be used as a substitute for compiled Browser acceptance.

## Glaze UI

All Privacy Shield user interfaces must follow the GoreeCloud Glaze UI Design Language. Privacy controls should feel calm, legible, polished, and transparent rather than alarmist or antivirus-like.

## Icon direction

The official icon design brief calls for a rounded protective shield containing layered privacy bands that partially conceal a central web surface. The overlapping layers represent filtering and removal of unwanted tracking while legitimate web content remains accessible.

A subtle negative-space **P** may emerge from the relationship between the shield and the internal privacy layers, but it should not read as a conventional lettermark first.

The icon should communicate privacy, filtering, protection, user control, and transparency.

Avoid generic padlocks, fingerprints, crossed-out eyes, hacker imagery, insects, checkmarked shields, or other symbols that would blur the distinction between Privacy Shield and Wardveil Security.

**No final icon artwork is stored in this repository yet.**

## Canonical branding asset

When approved artwork exists, the canonical source is:

```text
branding/privacy-shield/privacy-shield-icon.svg
```

Derived toolbar, monochrome, favicon-sized, and high-resolution assets must originate from that authoritative SVG rather than being maintained as unrelated artwork.

The identity validator keeps visual showcase status fail-closed while the canonical icon is absent or unapproved. Placeholder, inherited, generic, or temporary artwork cannot be represented as the official Privacy Shield identity.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Ruleset lifecycle](docs/RULESET-LIFECYCLE.md)
- [Identity and icon standard](docs/IDENTITY.md)
- [GoreeCloud Browser integration requirements](docs/BROWSER-INTEGRATION.md)
- [Implementation boundary](docs/IMPLEMENTATION-BOUNDARY.md)
- [Branding asset directory](branding/privacy-shield/README.md)

## Validation

The repository validation workflows check the reviewed configuration contract, ruleset lifecycle contract, Python source-contract tests, portable Node core tests, JSON syntax, Python compilation, and the machine-readable Privacy Shield identity/showcase contract.

Passing these checks demonstrates source consistency only. It does **not** constitute compiled GoreeCloud Browser runtime acceptance or production approval.

## Status

Privacy Shield now has a documented identity, reviewed v2 configuration contract, portable core foundation, explicit ruleset lifecycle governance, automated validation, a fail-closed visual-identity gate, and explicit Browser integration boundaries. The next development work is deeper Browser synchronization and runtime/UI acceptance testing. Final icon artwork remains separate and unapproved.
