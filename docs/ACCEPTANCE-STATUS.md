# Privacy Shield Acceptance Status

## Purpose

This document records the current acceptance state of GoreeCloud Privacy Shield and keeps source validation, Browser integration, visual-identity approval, and production approval as separate gates.

## Current source baseline

Portable-core hardening was merged through PR #18 as commit `34bcbe9ee6a99c2381bf204b7411286e63abb7a1` after Privacy Shield Validation run #24 completed successfully. The validated PR head was `3b1d24a102fea39189babe440c32ab278366ec5f`.

The merged hardening establishes:

- fail-closed handling for unsupported schema and ruleset contracts;
- validation of required component structures;
- deterministic master protection-toggle enforcement across portable blocking, URL cleaning, tracker learning and blocking, and local-resource lookup;
- exact-match local-resource substitution with fail-open behavior to the original network request;
- expanded portable-core test coverage for disabled protection state, repeated tracking parameters, contract rejection, and tracker-evidence clearing.

## Acceptance gates

### 1. Portable source acceptance

**State: Passed for the merged PR #18 scope.**

Repository validation demonstrates that the portable core, reviewed configuration, lifecycle contract, and related source tests are internally consistent for this revision.

### 2. Browser source integration

**State: Integrated at the source-contract level, but not sufficient for production approval.**

GoreeCloud Browser is the privileged Firefox/Gecko runtime authority. The Browser owns preference persistence, HTTP-channel integration, lifecycle hooks, private-browsing behavior, persistent site exceptions, navigation/copy/share integration, packaged UI behavior, and inherited Firefox security boundaries.

### 3. Exact compiled Browser acceptance

**State: Pending.**

The exact compiled GoreeCloud Browser must demonstrate, against the intended Privacy Shield source revision and exact Browser build, at minimum:

- request blocking and allow/bypass behavior;
- navigation, copy, and share URL cleaning;
- behavioral tracker evidence and blocking behavior;
- master protection-toggle behavior;
- persistent per-site exceptions;
- private-browsing isolation and lifecycle behavior;
- exact-match local-resource substitution and fail-open behavior;
- missing, malformed, unsupported, or unavailable policy-data handling;
- compatibility and rollback behavior;
- user-visible protection-state accuracy;
- keyboard and assistive-technology accessibility;
- light and dark Glaze UI behavior;
- preservation of Firefox/Gecko TLS, certificate validation, Safe Browsing, sandboxing, process isolation, permissions, and update boundaries.

Passing portable-source validation must never be substituted for this gate.

### 4. Canonical visual identity

**State: Pending explicit approval.**

The machine-readable identity contract remains fail-closed while `branding/privacy-shield/privacy-shield-icon.svg` is absent or unapproved. Placeholder, generic, inherited Browser, or Wardveil Security artwork must not be represented as the Privacy Shield identity.

Before visual showcase readiness is approved, the canonical artwork must pass compact-size, monochrome, light/dark Glaze UI, and identity-distinction review.

### 5. Overall production approval

**State: Pending.**

Privacy Shield must remain classified as active development until the exact compiled Browser acceptance gate and canonical visual-identity gate are both satisfied and the resulting state is deliberately documented.

## Production-boundary rule

A successful GitHub workflow, portable-core test suite, source-contract synchronization, or documentation update proves only the scope it directly validates. None of those artifacts independently proves production Browser behavior.
