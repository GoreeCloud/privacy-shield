# GoreeCloud Privacy Shield — Security

## Security and privacy scope

Privacy Shield is GoreeCloud’s privacy and data-use authority. It is not a replacement for Wardveil Security, authentication, host/network security, malware protection, TLS/certificate validation, Firefox/Gecko sandboxing, backup, or recovery.

Security findings that affect Privacy Shield privacy guarantees are still material because compromised integrity, authorization, signing, state, or evidence can invalidate a privacy decision.

## Reporting a vulnerability

Report security-sensitive findings through an authorized private GoreeCloud security or repository security-reporting channel available to you. Do not publish exploit details, active credentials, private keys, signing secrets, recovery codes, access tokens, private user content, or production-sensitive evidence in an ordinary public issue or discussion.

If no private reporting path is available in your environment, escalate through the authorized GoreeCloud project/security administration path rather than disclosing sensitive details publicly.

Include, when safe and relevant:

- affected component and exact revision/version;
- affected runtime or deployment;
- concise reproduction conditions;
- expected and observed behavior;
- privacy/security impact;
- whether credentials or private data may have been exposed, without including those secrets/data;
- safe logs or minimized evidence;
- known workaround or containment information.

## Supported security posture

Repository CI and source tests establish only the checks they actually run for an exact revision. They do not establish production security, production key custody, production distributed-state correctness, compiled Browser acceptance, or platform-wide production approval.

The built-in memory/file state providers and in-memory signing-key provider are non-production. Production state and signing providers require independent exact-provider/exact-deployment acceptance and external operational/custody evidence.

## Signing and secret handling

Production signing material must not be exported into repository source, configuration, tests, acceptance JSON, logs, or evidence packages. Provider-facing signing is designed around opaque key references and digest-only handoff on the active Privacy Shield 2.0 development line.

Never commit:

- passwords or API keys;
- authentication/bearer/session tokens;
- private keys or signing secrets;
- recovery codes;
- production `.env` files;
- secret-bearing URLs;
- raw private payloads placed into evidence merely for convenience.

Use synthetic/nonfunctional values in tests and examples.

## Browser boundary

Privacy Shield Browser work must preserve Firefox/Gecko TLS, certificate validation, Safe Browsing, sandboxing, process isolation, site permissions, and update boundaries. Privacy features must not weaken these security mechanisms.

## Dependency and update handling

Dependency/security changes must follow GoreeCloud source-control, revision-control, vulnerability-management, and production-readiness requirements. Pin or verify critical automation dependencies where repository policy requires it, and re-run exact-revision validation after material changes.

## Response and recovery

For a material security/privacy incident: contain exposure, preserve required minimized evidence, revoke affected access/credentials when necessary, correct the authoritative runtime/integration, validate the correction, update tests, and document the corrective action in the appropriate GoreeCloud record.

A successful fix on a development branch is not production remediation until the applicable release/deployment/acceptance path is complete.