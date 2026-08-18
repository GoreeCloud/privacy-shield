# Privacy Shield Implementation Boundary

## Purpose

This document defines the boundary between the standalone `GoreeCloud/goreecloud-privacy-shield` repository and the privileged Privacy Shield implementation inside `GoreeCloud/goreecloud-browser`.

## Current authority split

### `GoreeCloud/goreecloud-privacy-shield`

This repository is the source-controlled authority for Privacy Shield identity, visual-identity governance, conformance contracts, shared rules/catalog governance, documentation, and future reusable subsystem interfaces.

It must not claim that a standalone package, extension, daemon, network filter, or general GoreeCloud security product exists unless such an implementation is separately created and approved.

### `GoreeCloud/goreecloud-browser`

The Browser repository remains authoritative for the current privileged Firefox integration and compiled runtime behavior. Browser-owned implementation includes native request/content blocking, reviewed tracking-parameter cleanup, behavioral tracker evidence and blocking, per-site compatibility behavior, exact-match local-resource substitution, and Browser integration paths.

The Browser implementation must preserve Firefox/Gecko technical authority for TLS, certificate validation, Safe Browsing, sandboxing, site/process isolation, permissions, and application-update mechanisms.

## Synchronization rule

The two repositories must not silently drift. Changes to canonical Privacy Shield identity, rules/catalog schemas, compatibility semantics, local-resource metadata, or production-readiness claims must be reviewed for corresponding Browser impact.

Where a shared machine-readable artifact is eventually consumed directly by GoreeCloud Browser, its provenance and version must be traceable to this repository.

## Production boundary

Repository conformance is not compiled-runtime acceptance. Privacy Shield must not be represented as production-ready until the exact built GoreeCloud Browser validates request blocking, URL cleaning, tracker learning/blocking, compatibility exceptions, private-browsing behavior, local-resource substitution and fail-open behavior, site compatibility, and failure handling.

Final icon approval is a separate visual-identity gate and does not establish runtime readiness.
