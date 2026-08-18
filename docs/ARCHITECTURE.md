# Privacy Shield Architecture

## Purpose

This repository defines the portable GoreeCloud Privacy Shield core contract, reviewed privacy rules, validation, tests, and branding/documentation boundaries.

Privacy Shield remains a Browser-specific subsystem. This repository does not turn it into a general network firewall, DNS service, certificate authority, Safe Browsing replacement, or platform-wide security framework.

## Repository boundary

The portable core in `src/privacy-shield-core.mjs` contains behavior that does not require Firefox/Gecko APIs:

- reviewed hostname matching for native content blocking;
- deterministic tracking-parameter cleaning;
- local, session-scoped behavioral tracker evidence;
- exact-match local-resource lookup;
- in-memory site-exception behavior used by tests and adapters.

The reviewed contract and seed rules are stored in `config/privacy-shield.v2.json`.

The dedicated repository is the development home for reusable Privacy Shield logic and reviewed rule changes. GoreeCloud Browser continues to own the runtime adapter until an explicit, validated synchronization mechanism is introduced.

## GoreeCloud Browser adapter boundary

The Browser integration remains responsible for Firefox-specific behavior, including:

- preference-backed persistence for user settings and site exceptions;
- HTTP-channel observation and cancellation;
- request redirection when URL cleaning or an approved local-resource substitution applies;
- Browser-owned navigation, copy, and share integration;
- private-browsing behavior;
- lifecycle initialization and shutdown;
- compatibility with inherited Firefox security mechanisms.

Portable code must not bypass or replace Firefox Safe Browsing, TLS, certificate validation, sandboxing, process isolation, site permissions, or the application update system.

## Native blocker boundary

Privacy Shield is the GoreeCloud-owned native content blocker for GoreeCloud Browser. uBlock Origin is not a required or managed dependency of the Privacy Shield model.

The seed ruleset is intentionally conservative. Expansion requires review and tests. Cosmetic filtering and richer dynamic filtering remain planned capabilities rather than implied current functionality.

## Behavioral tracker protection

Tracker evidence remains local. The reviewed threshold is three distinct first-party sites with a tracking signal before a third party becomes eligible for behavioral blocking. Repeated observations on one first-party site do not satisfy the threshold.

The portable core keeps this evidence in memory. A runtime adapter must not persist it as browsing history or upload it for remote learning.

## URL cleaning

The cleaner removes only reviewed tracking parameters. Unknown and functional parameters are preserved. Authentication/sign-in exemptions are part of the reviewed configuration.

The same deterministic rule set should be used by Browser-owned navigation and copy/share surfaces.

## Local-resource substitution

Substitution is exact-match only and fails open to the original network request. The resource catalog remains empty until each payload has approved provenance, licensing, integrity verification, update procedures, and compatibility tests.

Recognizing a CDN hostname alone is never sufficient grounds for substitution.

## Production boundary

Passing repository validation establishes source-contract consistency only. It does not approve a compiled GoreeCloud Browser for production.

Production acceptance remains dependent on testing the exact built Browser for normal and private browsing, site compatibility, blocker behavior, tracker learning and exceptions, URL cleaning, reviewed local-resource substitution, failure behavior, and inherited Firefox security boundaries.

## Branding boundary

The icon design contract is documented separately. No final icon artwork is part of this core foundation. When approved, the authoritative artwork path remains:

```text
branding/privacy-shield/privacy-shield-icon.svg
```
