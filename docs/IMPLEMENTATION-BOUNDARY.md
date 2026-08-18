# Privacy Shield Implementation Boundary

## Purpose

This document defines the boundary between the portable Privacy Shield core in `GoreeCloud/goreecloud-privacy-shield` and the privileged Firefox/Gecko adapter in `GoreeCloud/goreecloud-browser`.

## Current authority split

### `GoreeCloud/goreecloud-privacy-shield`

This repository is the development home for reusable Privacy Shield logic and reviewed contracts that do not require Firefox/Gecko APIs.

Current portable responsibilities include:

- reviewed hostname matching for native content blocking;
- deterministic tracking-parameter cleaning;
- local, session-scoped behavioral tracker evidence;
- exact-match local-resource lookup;
- in-memory site-exception behavior used by tests and adapters;
- reviewed configuration and seed rules in `config/privacy-shield.v2.json`;
- identity, visual-identity governance, conformance, documentation, and shared rules/catalog lifecycle work.

It must not claim that Privacy Shield is a standalone browser extension, daemon, DNS filter, network firewall, Safe Browsing replacement, or platform-wide security product unless such a role is separately created and approved.

### `GoreeCloud/goreecloud-browser`

The Browser repository remains authoritative for the privileged Firefox adapter and compiled runtime behavior.

Browser-owned responsibilities include:

- preference-backed persistence for Privacy Shield settings and per-site exceptions;
- HTTP-channel observation, cancellation, and approved redirection;
- Browser lifecycle initialization and shutdown;
- Browser-owned navigation, copy, and share integration;
- private-browsing behavior;
- compatibility with inherited Firefox security and update mechanisms;
- compiled-runtime acceptance and release evidence.

The Browser implementation must preserve Firefox/Gecko technical authority for TLS, certificate validation, Safe Browsing, sandboxing, site/process isolation, permissions, and application-update mechanisms.

## Synchronization rule

The repositories must not silently drift. Changes to portable core behavior, configuration schemas, blocking rules, tracking-parameter rules, compatibility semantics, local-resource metadata, identity contracts, or production-readiness claims must be reviewed for corresponding Browser impact.

When GoreeCloud Browser consumes artifacts from this repository, the consumed version or source revision must remain traceable.

## Production boundary

Passing standalone repository validation proves source-contract consistency only. Privacy Shield must not be represented as production-ready until the exact built GoreeCloud Browser validates native request blocking, navigation/copy/share URL cleaning, tracker learning and blocking, per-site exceptions, private-browsing behavior, exact-match local-resource substitution and fail-open behavior, site compatibility, failure handling, and preservation of inherited Firefox security boundaries.

Final icon approval is a separate visual-identity gate and does not establish runtime readiness.
