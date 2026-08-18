# GoreeCloud Browser Integration Requirements

## Role

GoreeCloud Privacy Shield is a first-party subsystem of GoreeCloud Browser. Browser integration must make the subsystem feel native while preserving a clear identity boundary between the Browser application, Privacy Shield, and Wardveil Security.

## Required Browser surfaces

Privacy Shield should be represented consistently across the Browser where privacy protection is relevant, including:

- toolbar or address-bar protection status;
- per-site protection panel;
- Browser privacy settings;
- blocked-content and tracker details;
- compatibility and exception controls;
- onboarding or explanatory surfaces where appropriate;
- diagnostics and troubleshooting surfaces intended for users or administrators.

All of these surfaces must follow Glaze UI patterns.

## Identity rules

Browser integration must:

- use the Privacy Shield name for browser-specific privacy and content-protection features;
- use the approved Privacy Shield icon only after final artwork is explicitly approved;
- keep Privacy Shield visually distinct from the Browser application icon;
- keep Privacy Shield visually and semantically distinct from Wardveil Security;
- avoid substituting generic shield, padlock, fingerprint, checkmark, inherited Browser, or Wardveil artwork where the Privacy Shield identity should appear;
- use compact or monochrome derivatives only when they originate from the approved canonical Privacy Shield artwork.

While the canonical icon remains pending, Browser surfaces must use a non-branded text/state fallback or another clearly non-identity development treatment rather than presenting placeholder artwork as Privacy Shield.

## Canonical asset contract

The authoritative branding source belongs in the Privacy Shield repository at:

```text
branding/privacy-shield/privacy-shield-icon.svg
```

Browser-specific generated or packaged derivatives must be traceable back to that source. The Browser repository must not become a second independent source of truth for the artwork.

The machine-readable identity state is maintained in:

```text
contracts/privacy-shield.identity.json
```

A Browser build or showcase surface must not claim canonical Privacy Shield visual readiness while that contract remains `pending-canonical-icon` / `blocked-pending-canonical-icon`.

## Ruleset consumption contract

The canonical reviewed Privacy Shield ruleset is:

```text
config/privacy-shield.v2.json
```

Ruleset ownership and lifecycle requirements are defined by:

```text
contracts/privacy-shield.ruleset-lifecycle.json
```

The Browser runtime adapter must validate supported schema and ruleset versions before treating a contract as approved Privacy Shield policy. Unsupported contract versions must fail closed at the policy-consumption boundary rather than being partially or optimistically interpreted.

Material ruleset changes require explicit review and a ruleset-version decision before Browser synchronization. Ruleset source validation does not constitute Browser production acceptance.

## Functional expectations

The Browser should integrate Privacy Shield as a native subsystem capable of supporting:

- first-party ad and tracker blocking;
- behavioral tracker protection;
- tracking-parameter cleanup;
- reviewed local-resource substitution where appropriate;
- per-site exceptions and compatibility controls;
- clear visibility into what was blocked or changed;
- user control over protection behavior;
- safe failure and recovery behavior when filter data or supporting resources are unavailable.

## User experience expectations

Privacy Shield controls should be:

- understandable without requiring expert knowledge;
- concise in the toolbar and richer in expanded panels;
- transparent about whether protection is active, modified, disabled, or bypassed for a site;
- reversible through clear per-site controls;
- accessible by keyboard and assistive technology;
- usable under both light and dark Glaze UI themes.

Privacy surfaces should avoid fear-based language and unexplained severity indicators.

## Security and privacy expectations

Implementation must follow applicable GoreeCloud security, privacy, data-protection, dependency, and update standards. Privacy Shield itself must not introduce unnecessary telemetry or tracking to provide its protections.

Behavioral tracker evidence must remain local and session-scoped under the approved contract. Persistent per-site exceptions remain local to the Browser adapter. Remote tracker learning, remote tracker telemetry, a required remote rules service, and a remote local-resource catalog are outside the approved core model.

Filter data, rule updates, exceptions, and local-resource substitution mechanisms must be validated and handled defensively. User-visible exceptions must be explicit and reversible.

Privacy Shield must not replace or weaken Firefox/Gecko Safe Browsing, TLS, certificate validation, sandboxing, process isolation, site permissions, or application-update mechanisms.

## Production acceptance

The exact compiled GoreeCloud Browser must validate Privacy Shield request blocking, URL cleaning in navigation/copy/share paths, tracker learning and blocking, persistent site exceptions, private-browsing behavior, exact-match local-resource substitution and fail-open behavior, site compatibility, failure handling, accessibility, Glaze UI behavior, and inherited Firefox security boundaries before production readiness is claimed.

## Artwork status

No final Privacy Shield icon artwork is approved yet. No placeholder, inherited, generic, or temporary icon may be represented as the official Privacy Shield identity or used to claim showcase readiness.
