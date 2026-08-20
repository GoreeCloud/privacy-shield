# Privacy Shield Platform Adoption

## Adoption rule

A GoreeCloud component may adopt Privacy Shield only through an explicit adapter or declared privacy-capability contract. Branding alone is not adoption.

Each integration must identify the runtime authority, supported capabilities, persisted Privacy Shield state, validation method, user controls, limitations, and production-acceptance gate.

## Initial adoption targets

### GoreeCloud Browser

Existing privileged adapter. Retains native request blocking, tracker protection, URL cleaning, local-resource substitution, site exceptions, and browsing privacy controls. Compiled Browser acceptance remains an independent gate.

### GoreeCloud Manager

Initial role: read-only privacy posture aggregation. Manager should display Privacy Shield adapter status, privacy capability coverage, exceptions, telemetry posture, retention posture, validation age, and known limitations without collecting raw private activity.

### Wardveil Security

Initial role: security-console correlation. Wardveil may present Privacy Shield findings and status alongside security findings while clearly distinguishing privacy from security authority.

### GoreeCloud DNS

Initial role: expose DNS privacy capabilities and policy state, including tracker/ad filtering, privacy-oriented DNS controls, and user-visible exceptions. DNS remains the runtime authority for DNS enforcement.

### GoreeCloud Network

Initial role: expose privacy-relevant private-network posture and DNS-routing privacy state. Network remains the runtime authority for encrypted networking and access controls.

### Native and maintained-fork applications

Applications should incrementally adopt reusable Privacy Shield contracts for telemetry minimization, retention/deletion controls, metadata minimization, privacy-safe diagnostics, permissions/data-access disclosure, and portable Privacy Shield-owned state.

## Capability vocabulary

Adapters should use stable capability identifiers rather than free-form claims. Initial identifiers are:

- `content.request-blocking`
- `tracking.behavioral-local`
- `tracking.parameter-cleaning`
- `dns.tracker-filtering`
- `telemetry.minimized`
- `telemetry.opt-in`
- `retention.bounded`
- `deletion.user-controlled`
- `metadata.minimized`
- `exceptions.user-visible`
- `privacy-status.local`
- `state.portable-export`

Capabilities may be expanded only through reviewed contract changes.

## Non-goals

Privacy Shield does not replace:

- Wardveil Security;
- GoreeCloud Identity;
- GoreeCloud Network or VPN functionality;
- host/network firewalls;
- malware scanning;
- vulnerability management;
- authentication or authorization;
- backup and recovery;
- application-specific runtime security controls.

## Acceptance

No adapter may report `Stable` or `production_ready` solely because the shared Privacy Shield repository passes validation. Each runtime must demonstrate its own implementation and acceptance evidence.
