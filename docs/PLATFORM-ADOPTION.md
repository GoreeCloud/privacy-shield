# Privacy Shield Platform Adoption

## Purpose

GoreeCloud Privacy Shield is the shared GoreeCloud privacy capability and product identity. GoreeCloud Browser remains its first and deepest runtime integration, but Browser is no longer the scope boundary.

Privacy Shield provides a common privacy contract that GoreeCloud applications and services can adopt according to their actual capabilities and data flows. It does not force Browser-specific request blocking into unrelated products.

## Platform relationship

- **Privacy Shield** owns privacy-specific policy, controls, status, explanations, and reusable privacy contracts.
- **Wardveil Security by GoreeCloud** owns the platform-wide security and protection identity.
- **Glaze UI** governs user-interface presentation.
- **Each consuming application or service** remains authoritative for its own runtime, data model, permissions, and enforcement mechanisms.

Privacy Shield and Wardveil are complementary. A privacy event can have security implications and a security event can have privacy implications, but the identities and authorities remain distinct.

## Capability-based adoption

A consuming component declares only the capabilities it implements. Initial shared capabilities are:

1. Data minimization.
2. Telemetry control.
3. Metadata protection.
4. External-content protection.
5. Sharing and export privacy.
6. Local-processing preference.
7. Privacy status and explanation.
8. Privacy event contract.

The canonical machine-readable definition is `contracts/privacy-shield.platform.json`.

## Adoption tiers

### Tier 1 — Privacy-aware

The component consumes the identity, terminology, and applicable privacy requirements. It documents its privacy boundary and validates compatibility with the shared platform contract.

### Tier 2 — Privacy-integrated

The component implements one or more shared Privacy Shield capabilities and exposes them through its own runtime or UI.

### Tier 3 — Privacy-enforcing

The component actively enforces privacy decisions in a privileged or policy-authoritative runtime, records bounded privacy events, and provides component-specific acceptance evidence.

Browser is a Tier 3 consumer. Other components may be Tier 1, Tier 2, or Tier 3 according to their role.

## Initial adoption map

- **Browser** — request blocking, tracker protection, tracking-parameter cleanup, per-site exceptions, privacy status, and local behavioral protections.
- **Search** — query privacy, external-engine request minimization, telemetry controls, metadata reduction, safe outbound request behavior, and understandable privacy status.
- **DNS** — privacy-preserving DNS policy, filtering visibility, query-log minimization, retention controls, upstream resolver privacy, and privacy event reporting.
- **Network** — privacy-aware connection metadata, diagnostic minimization, local-first status handling, and bounded privacy events for client/network behavior.
- **Manager** — read-only platform privacy posture, adoption visibility, contract compatibility, exceptions, and privacy event summaries without becoming the enforcement authority.
- **Identity** — minimized authentication metadata, privacy-aware audit boundaries, consent/status presentation where applicable, and explicit external identity-provider boundaries.
- **Notes, Memos, Tasks, Contacts, Gallery, Feed, Keyboard, Notify, Backup** — capability-specific privacy controls for data collection, attachments, clipboard/input, exports, sharing, notifications, synchronization, retention, logs, backups, and external processing.

## Integration contract

A consuming repository should:

1. Pin a compatible Privacy Shield platform contract version or exact revision.
2. Declare the capability IDs it implements.
3. Document its local enforcement authority and limitations.
4. Validate the declared capability set in CI.
5. Fail closed on an unknown contract schema or incompatible contract version.
6. Keep sensitive payloads out of shared privacy events by default.
7. Use the canonical Privacy Shield identity only for privacy-specific controls and status.
8. Keep Wardveil Security identity for security-specific controls and status.
9. Provide runtime acceptance evidence before claiming an enforcing integration is production-ready.

## Shared event shape

Privacy events should be locally generated and minimal. A normalized event should identify only what is needed for status, diagnostics, or audit, such as:

- schema version;
- timestamp;
- application or service identifier;
- Privacy Shield capability ID;
- action or outcome;
- policy/rule identifier when applicable;
- severity or user-attention level when applicable;
- bounded non-sensitive diagnostic metadata.

URLs, query text, message contents, contact data, note contents, credentials, file contents, clipboard contents, DNS query payloads, or other sensitive material must not be included by default.

## Migration from the Browser-only model

The existing Browser ruleset and lifecycle contract remain valid Browser-specific artifacts. They are not generalized into a universal rules engine. The new platform contract sits above them:

`Privacy Shield platform contract -> application capability contract -> application runtime enforcement`

For Browser:

`Privacy Shield platform contract -> Browser Privacy Shield rules/lifecycle contract -> Firefox/Gecko runtime`

This preserves the mature Browser integration while allowing other GoreeCloud products to adopt Privacy Shield without inheriting browser-specific assumptions.

## Production status

Platform-wide architecture approval does not make every listed product Privacy Shield-integrated. Each consuming repository must implement, validate, and record its own adoption. Browser's outstanding compiled-runtime acceptance remains a Browser-specific gate and no longer blocks the existence of the shared platform contract itself.
