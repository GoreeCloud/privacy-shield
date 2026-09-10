# GoreeCloud Privacy Shield — Repository Notes

## Current lifecycle

Privacy Shield is in Development. The platform foundation and substantial source mechanisms exist, but production authority is independently gated by runtime, capability, provider, exact revision, deployment, environment, and evidence.

Do not use a single global `protected`, `production approved`, or equivalent state to summarize all Privacy Shield integrations.

## Current P0 development line

The active Privacy Shield 2.0 P0 line contains source controls for transactional/distributed state, production signing-key custody boundaries, provider-neutral qualification, candidate evaluation, content-addressed evidence, evidence packages, attributable evidence-review attestations, governed provider selection, and exact-provider production acceptance.

These controls do not select or deploy a real distributed database, KMS, HSM, cloud key service, PKCS#11 device, or other production provider. Real evidence, selection, implementation, deployment, and acceptance remain separate gates.

## Documentation authority

- Canonical project specification: `Project Specification — Privacy Shield` in `GoreeCloud/Projects`.
- Canonical Privacy Shield policy: `Policy — Privacy Shield`.
- Canonical central user manual: `GoreeCloud/User Manuals/User Manual — Privacy Shield`.
- Repository feature roadmap: `FEATURE-ROADMAP.md`, synchronized with `GoreeCloud/Feature Roadmap/Privacy Shield/FEATURE-ROADMAP.docx`.
- Implementation acceptance detail: `docs/ACCEPTANCE-STATUS.md`.

## Public website source

The public Privacy Center is `https://privacy.goreecloud.com`. Canonical static-site source authority has moved to `GoreeCloud/goreecloud-static-websites/sites/privacy`; this repository retains a transitional deployment copy under `website/` until the Cloudflare cutover and production-byte verification are complete.

## Branding authority

Privacy Shield branding authority is `GoreeCloud/goreecloud-branding-assets`, canonical path `systems/privacy-shield/privacy-shield-icon.svg`. The local `branding/privacy-shield/privacy-shield-icon.svg` is a synchronized consumer derivative.

## Review routing note

This repository uses pull requests for material changes, so `.github/PULL_REQUEST_TEMPLATE.md` is maintained as a repository control. A `.github/CODEOWNERS` file is not introduced by the baseline remediation because no authoritative repository ownership/reviewer mapping has yet been verified for this repository. Repository write access, commit authorship, or CI success must not be treated as proof of provider-evidence review authority.

## Sensitive information

Do not commit credentials, bearer tokens, private keys, signing secrets, recovery codes, private user content, production secrets, or secret-bearing evidence locators. Evidence and acceptance artifacts must remain within their explicit minimization and access-control boundaries.

## Maintenance

These notes are not a substitute for changelogs, specifications, policies, or acceptance records. Update them when repository-level development/operational context materially changes.