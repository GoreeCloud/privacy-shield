# GoreeCloud Privacy Shield User Manual

Central GoreeCloud copy: [User Manual — Privacy Shield](https://docs.google.com/document/d/1UJ_0h1y2JlNDy8CDYbqtWLqMLTt0nlottMBiWtxjH2Y)

## Current availability and scope

GoreeCloud Privacy Shield is GoreeCloud’s shared privacy, consent, data-minimization, data-use, transparency, and privacy-status foundation. Privacy Shield is implemented through the GoreeCloud component that actually performs an operation; it is not a single global switch and it does not transfer runtime authority away from the application, browser, DNS, network, storage, or other component responsible for the work.

Privacy Shield is in active development. Current support is capability- and runtime-specific. The shared source foundation and several Browser/privacy contracts are implemented, but a global “Privacy Shield protected” or platform-wide production-approved state is not valid. Each runtime and capability must carry its own current acceptance evidence.

## Public Privacy Center

The public Privacy Center is available at https://privacy.goreecloud.com. It provides Privacy Shield information and presentation. It is not evidence that a particular application, device, Browser build, adapter, or data operation is protected or production accepted.

The Privacy Center’s static website source is being migrated to the centralized GoreeCloud static-websites repository. That website-source migration does not create privacy authority or change the acceptance state of a runtime.

## Using Privacy Shield in GoreeCloud Browser

GoreeCloud Browser is the privileged Firefox/Gecko runtime for Browser-specific Privacy Shield behavior. The current Privacy Shield source contains native request blocking, tracker resistance, tracking-parameter cleanup, reviewed exact-match local-resource substitution, privacy controls, and persistent per-site exception behavior.

The Browser integration is source-integrated, but exact compiled Browser acceptance remains pending. Do not infer that every installed or development Browser build has passed the current Privacy Shield runtime-acceptance gate. Use the status and controls presented by the exact Browser build, and treat unknown, unavailable, stale, or unverified state as such.

When a supported Browser build exposes Privacy Shield controls, use the Browser’s own controls for Browser-specific protection and site exceptions. A site exception changes only the scope governed by that Browser control; it does not disable unrelated GoreeCloud privacy or security systems.

## Understanding Privacy Shield status

Privacy Shield status is intended to be conservative and evidence-backed. A favorable state must come from the runtime or producer that actually implements the applicable capability.

Unknown, unavailable, degraded, stale, incompatible, unsupported, or unverifiable evidence must not be converted into a favorable protection claim. A Privacy Shield icon, setting, dashboard card, successful build, source file, or passing unrelated test is not by itself proof of runtime protection.

Status consumers such as GoreeCloud Manager or Wardveil Security may present minimized Privacy Shield state. Presenting that state does not transfer Privacy Shield enforcement authority to the consumer.

## Privacy and data handling

Privacy Shield follows local-first and data-minimization requirements. Privacy Shield status should use the minimum derived information needed to describe privacy state and should not become an alternate telemetry system.

Ordinary Privacy Shield status must not unnecessarily contain browsing history, visited URLs, search queries, DNS queries, packet or message contents, file contents, credentials, authentication headers, tokens, private keys, recovery codes, or similarly sensitive payloads.

Remote tracker learning and remote tracker telemetry are not approved as normal Privacy Shield behavior. Where a less-invasive local or self-hosted method can satisfy the requirement, GoreeCloud privacy policy prefers it.

## Permissions, exceptions, retention, deletion, and export

Privacy-sensitive permissions should be requested only for a documented purpose and at the least practical scope. Where the platform supports it, permissions should remain reviewable and revocable.

Privacy Shield may represent retention, deletion, or export only when the authoritative application or service actually implements the corresponding behavior. Deleting something from one interface does not by itself prove immediate deletion from every cache, backup, recovery, synchronization, or external layer.

Privacy Shield does not replace Everkeep backup/recovery authority, GoreeCloud Identity authentication/identity authority, Wardveil Security protection authority, GoreeCloud DNS, GoreeCloud Network, or application-specific access controls.

## Privacy Shield 2.0 development features

Privacy Shield 2.0 is a next-major-upgrade development program. Its operation-bound authorization path, distributed state-provider boundary, signing-key-provider boundary, evidence packages, review attestations, provider-selection controls, and production-acceptance schemas are development/source controls unless and until their exact providers, deployments, and runtimes receive the required independent acceptance.

There are currently no production-approved distributed Privacy Shield state-provider records and no production-approved Privacy Shield signing-key-provider records in the source-controlled acceptance directories. Do not treat the presence of these contracts or successful source validation as production authorization.

## Troubleshooting

If Privacy Shield status is missing or unfavorable, do not assume protection succeeded. Confirm which GoreeCloud application or runtime produced the state, which capability is being represented, whether that runtime reports a current accepted state, and whether an exception or disabled control applies.

If a Browser site behaves incorrectly after protection is applied, use only the Browser’s supported site-exception or protection controls for that site and re-check the displayed state. An exception should be kept as narrow as practical and removed when it is no longer needed.

When reporting a privacy problem through an authorized GoreeCloud support or repository channel, include the affected application/runtime, version or exact build when known, the capability or control involved, expected behavior, and observed behavior. Do not include passwords, access tokens, private keys, recovery codes, private message contents, private file contents, or other reusable secrets.

## Current limitations

Exact compiled GoreeCloud Browser acceptance is pending. Production distributed authorization state, production signing-key custody, broader adapter acceptance, the complete Runtime Trust & Acceptance Matrix, Privacy Shield 2.0 consent lifecycle, decision preview, Privacy Lock, complete Everkeep lifecycle enforcement, Identity-authenticated Mesh delivery, and the planned Privacy Center/Glaze UI V1.3 migration are not established as generally available production features by the current source state.

Privacy Shield remains independently gated by runtime and capability. Successful source validation or documentation updates do not promote a runtime, adapter, provider, or deployment into production.

## Authoritative references

The canonical implementation-facing source is `GoreeCloud/goreecloud-privacy-shield`. The controlling project documentation includes `Project Specification — Privacy Shield` and `Policy — Privacy Shield`. Repository acceptance detail is maintained in `docs/ACCEPTANCE-STATUS.md`.

This manual describes currently verified behavior and boundaries. Planned or proposed Privacy Shield 2.0 work is included only when it is explicitly labeled as development or pending.