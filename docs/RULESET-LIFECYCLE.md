# Privacy Shield Ruleset Lifecycle

## Purpose

This document defines how the canonical GoreeCloud Privacy Shield ruleset is reviewed, versioned, validated, consumed by GoreeCloud Browser, and kept separate from production acceptance.

The canonical machine-readable ruleset is:

```text
config/privacy-shield.v2.json
```

The machine-readable lifecycle contract is:

```text
contracts/privacy-shield.ruleset-lifecycle.json
```

## Ownership and review

GoreeCloud owns and reviews the Privacy Shield ruleset. A third-party extension, remote rules service, remote tracker-learning service, telemetry service, or remote local-resource catalog is not required for the approved core model.

Review is required for semantic changes affecting:

- native content-blocking hosts;
- behavioral tracker-protection semantics;
- tracking-parameter cleanup rules;
- URL-cleaning exemptions;
- local-resource substitution metadata and payloads;
- inherited Browser security boundaries.

## Versioning

The ruleset has an explicit `ruleset_version` independent from its JSON `schema_version`.

- `schema_version` changes when the structure or interpretation of the machine-readable configuration changes.
- `ruleset_version` changes when reviewed Privacy Shield behavior or reviewed rule content changes materially.
- Editorial documentation changes do not require a ruleset-version increment when they do not alter runtime semantics.
- A semantic ruleset change must not be silently committed under the prior reviewed version.

The lifecycle contract records the exact schema and ruleset versions it governs. Repository validation fails if those values drift apart.

## Browser consumption

`GoreeCloud/goreecloud-browser` remains the current privileged runtime authority.

A Browser adapter consuming the canonical contract must validate both schema and ruleset versions. An unsupported contract must fail closed rather than being interpreted optimistically or partially.

Fail closed in this context means the adapter must refuse to treat an unknown configuration contract as approved Privacy Shield policy. This requirement does not mean that ordinary web requests should be broadly blocked when Privacy Shield configuration cannot be loaded; Browser failure behavior must remain deliberate, visible, and compatible with inherited Firefox security and networking behavior.

## Privacy boundaries

Tracker learning remains local and session-scoped. Remote tracker learning and tracker telemetry are not allowed by the approved contract.

Persistent per-site exceptions remain local to the Browser adapter rather than being uploaded as a centralized browsing profile.

Local-resource substitution uses exact reviewed matches and fails open to the original network request. The resource catalog remains empty until each payload receives provenance, licensing, integrity, update, and compatibility review.

## Release boundary

Source validation verifies that the ruleset and lifecycle contract are internally consistent. It does not establish production readiness.

Production acceptance requires the exact compiled GoreeCloud Browser to validate Privacy Shield behavior, private-browsing behavior, site compatibility, failure handling, and inherited Firefox/Gecko security boundaries.

The lifecycle contract therefore keeps `production_ready` false and the canonical configuration keeps `production_approved` false until that separate acceptance process is completed and explicitly recorded.

## Validation

The repository validates this lifecycle with:

```text
tools/validate_ruleset_lifecycle.py
```

and tests it with:

```text
tests/test_ruleset_lifecycle.py
```

The main Privacy Shield validation workflow executes both as part of source validation.
