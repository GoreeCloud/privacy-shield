# Privacy Shield Provider Evaluation Evidence Packages

This directory contains machine-readable sidecar records for evidence artifacts used by Privacy Shield state-provider and signing-key provider candidate evaluations.

Package records conform to `contracts/privacy-shield.provider-evidence-package.schema.json` and are validated by `tools/validate_provider_evidence_packages.py`.

A provider evidence package is **not** a candidate evaluation, **not** a provider-selection decision, and **not** production acceptance. Every package keeps `authorizing: false` and `production_acceptance_authorized: false`.

Each package binds one immutable evidence artifact to:

- an exact provider class and provider identity;
- the applicable GoreeCloud integration authority;
- the exact Privacy Shield capability and environment scope;
- state-provider implementation and authority-state scope when applicable;
- signing-key producer identity when applicable;
- the artifact SHA-256 digest and approved locator;
- collection and freshness timestamps;
- the exact candidate-evaluation criteria the artifact supports;
- a bounded review state; and
- explicit privacy constraints.

The package `evidence_ref` must exactly equal `evidence+sha256:<artifact.digest>:<artifact.locator>`. The digest identifies the exact evidence bytes being referenced. It does not prove that those bytes are correct, sufficient, authoritative, fresh, or applicable.

A package with `governance.status: reviewed` records that the package metadata and referenced artifact were reviewed for the declared bounded use. Review is still non-authorizing. Reviewed packages must remain within their `valid_until` window. Captured, rejected, superseded, or stale packages cannot support a resolved (`passed` or `failed`) candidate-evaluation criterion.

Every criterion evidence reference in an evaluation must resolve to a matching package whose `supports` list includes that exact criterion. The evaluation-level `governance.evidence_reference` must resolve to a package supporting `evaluation-summary`. Provider identity, integration authority, environment scope, and provider-class-specific scope must match the evaluation exactly.

Do not store credentials, signing secrets, private keys, bearer tokens, signed access URLs, raw private payloads, full capability tokens, or other secret-bearing material in package records or locators. Evidence artifacts themselves must follow their governing privacy and access-control requirements and should contain only the minimum information needed to support the claimed criterion.

There are currently **zero provider evidence package JSON records** in this repository. The schema and validator create an evidence-packaging boundary only; they do not establish a provider candidate, reviewed evidence dossier, selection, deployment, acceptance, or production authorization.
