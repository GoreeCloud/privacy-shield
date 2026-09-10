# GoreeCloud Privacy Shield — Privacy Policy

This repository privacy-policy copy summarizes current Privacy Shield privacy requirements and implementation boundaries. The authoritative GoreeCloud governance record is `Policy — Privacy Shield` in Google Drive. Runtime-specific applications and services remain responsible for their own accurate user-facing disclosures and actual data handling.

## Privacy by default

Privacy Shield requires privacy-preserving defaults appropriate to a component’s approved role and purpose. Integration must not broaden permissions, collection, logging, telemetry, sharing, retention, or external processing merely to make Privacy Shield easier to operate.

## Data minimization and purpose limitation

Privacy Shield is local-first and requires the minimum information practical for an approved purpose. Information collected for one purpose must not be silently reused for an unrelated purpose.

Privacy Shield itself must not become a platform-wide reason to collect additional private information.

## Status and evidence

Privacy Shield status must be evidence-backed and minimized. Ordinary status should not unnecessarily contain browsing history, visited URLs, search queries, DNS queries, packet/network contents, request/response bodies, cookies, authentication headers, passwords, tokens, private keys, recovery codes, private messages, file contents, private media, detailed private routes, or other private activity that is unnecessary for the status purpose.

Unknown, unavailable, stale, malformed, conflicting, unsupported, or unverifiable evidence must not be converted into a favorable privacy claim.

## Telemetry, logging, and tracker learning

Privacy Shield does not approve remote tracker learning or remote tracker telemetry as normal operating requirements. Optional telemetry and diagnostics must be minimized and must have a documented purpose, known recipient, controlled access, understood retention, and acceptable privacy impact.

Where a local or self-hosted method can satisfy the requirement, GoreeCloud privacy policy prefers it over unnecessary external transmission.

## Permissions and user control

Privacy-sensitive permissions should be opt-in unless the platform requires them for functionality explicitly requested by the user. Requests must be contextual, purpose-bound, and least-scope. Where supported, permissions and exceptions should remain reviewable and revocable.

A denied permission must not be silently replaced with a broader collection path to obtain equivalent private information.

## Retention, deletion, and portability

Retention must be purposeful and defined by the authoritative component. Privacy Shield may represent deletion or portable export only when the actual runtime implements the corresponding mechanism.

A deletion action in one interface does not by itself prove immediate removal from every database, cache, synchronization target, backup, recovery copy, or external provider. Backup/recovery lifecycle authority remains with Everkeep where applicable.

## External integrations and AI

External integrations must remain privacy-reviewed and use the minimum practical exposure. Private GoreeCloud information must not be placed into broader search indexes, embedding stores, model context, AI datasets, or external AI services merely because a technical integration makes it possible.

Privacy Shield integration never bypasses the authoritative application’s ownership, authentication, authorization, or runtime controls.

## Browser privacy

Browser-specific Privacy Shield behavior may include request blocking, tracker resistance, tracking-parameter cleanup, reviewed local-resource substitution, and site exceptions. GoreeCloud Browser remains the technical authority for Firefox/Gecko-specific execution.

Browser source integration does not establish acceptance for every compiled Browser build.

## System boundaries

Privacy Shield governs privacy. It does not replace Wardveil Security, GoreeCloud Identity, GoreeCloud DNS, GoreeCloud Network, Everkeep, application authorization, TLS/certificate validation, Safe Browsing, sandboxing, malware protection, backup, or recovery.

## Development and production claims

Source code, schemas, branding, passing CI, documentation, or a valid-looking acceptance record do not by themselves establish production privacy protection. Production claims require evidence for the exact runtime/provider/deployment and applicable capability.

Privacy Shield 2.0 state-provider, signing-key-provider, evidence-review, selection, and acceptance machinery on the active development line remains non-production unless a separately governed exact acceptance record proves otherwise.

## Questions and incident reporting

Use an authorized GoreeCloud support, privacy, or repository channel appropriate to your environment. Do not place credentials, access tokens, signing secrets, private keys, recovery codes, private messages, private file contents, or other reusable secrets into ordinary reports.

This file must be updated when verified Privacy Shield data handling or user-facing privacy behavior materially changes.