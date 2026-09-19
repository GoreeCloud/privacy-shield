# Privacy Shield Provider Evaluation Evidence Packages

This directory contains machine-readable sidecar records for evidence artifacts used by Privacy Shield state-provider and signing-key provider candidate evaluations.

Package records conform to `contracts/privacy-shield.provider-evidence-package.schema.json` and are validated by `tools/validate_provider_evidence_packages.py`. A package represented as `governance.status: reviewed` must also have a matching active review attestation under `reviews/provider-evidence/`, conforming to `contracts/privacy-shield.provider-evidence-review.schema.json` and validated by `tools/validate_provider_evidence_reviews.py`.

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

Provider-evidence timestamps are fail-closed at both the package boundary and the repository temporal-integrity boundary. The package validator independently rejects future collection and review timestamps: `artifact.collected_at` cannot be later than the validator's current time, and a `reviewed` package cannot carry a future `governance.reviewed_at`. Independently, the repository temporal-integrity gate applies the same impossible-future boundary across provider governance records. `artifact.valid_until` must be later than collection, review cannot predate collection or occur outside the artifact validity window, and a reviewed package cannot remain current after its artifact expires. Captured historical records may remain non-authorizing provenance, but impossible future evidence must fail closed before it can participate in provider governance.

A package with `governance.status: reviewed` is no longer self-sufficient evidence of review provenance. It must resolve to a separate active `accepted-for-evaluation` review attestation that exactly matches the package evidence identity, provider identity, integration authority, provider-class-specific scope, supported criterion set, and review timestamp. The review must remain fresh and cannot outlive the evidence artifact.

The separate review record must identify a declared review authority, content-address the governing review-authority record or authority evidence, and content-address the actual review evidence. Those three references—the provider evidence artifact, authority record, and review evidence—must remain distinct. Repository validation binds them together but does **not** prove that the declared reviewer or authority is genuinely authorized by GoreeCloud governance; that remains an external authoritative-governance determination.

Captured, rejected, superseded, stale, or unattested packages cannot support a resolved (`passed` or `failed`) candidate-evaluation criterion. A review decision of `rejected` or `needs-more-evidence` likewise cannot support a package represented as reviewed.

Every criterion evidence reference in an evaluation must resolve to a matching package whose `supports` list includes that exact criterion. The evaluation-level `governance.evidence_reference` must resolve to a package supporting `evaluation-summary`. Provider identity, integration authority, environment scope, and provider-class-specific scope must match the evaluation exactly.

Do not store credentials, signing secrets, private keys, bearer tokens, signed access URLs, raw private payloads, full capability tokens, or other secret-bearing material in package or review records or their locators. Evidence and review artifacts must follow their governing privacy and access-control requirements and should contain only the minimum information needed to support the claimed criterion and review.

There are currently **two captured provider evidence package JSON records** in this repository: one for a self-hosted multi-host FoundationDB state-provider candidate and one for an OVHcloud KMS HSM-backed signing-key candidate. There are **zero provider evidence review-attestation JSON records**. Both packages remain captured/unreviewed, so they cannot support a resolved candidate-evaluation criterion, provider selection, deployment, production acceptance, or production authorization.
