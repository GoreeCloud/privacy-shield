# Privacy Shield Provider Evidence Review Attestations

This directory contains machine-readable review-attestation records for provider-evaluation evidence packages.

Review records conform to `contracts/privacy-shield.provider-evidence-review.schema.json` and are validated by `tools/validate_provider_evidence_reviews.py`.

A review attestation is **not** a candidate evaluation, **not** a provider-selection decision, **not** bounded implementation authorization, and **not** production acceptance. Every record keeps `authorizing: false`, `provider_selection_authorized: false`, and `production_acceptance_authorized: false`.

## Purpose

The provider-evidence package contract can identify exact evidence bytes, provider identity, scope, criterion coverage, freshness, and a bounded package review state. A bare `status: reviewed` value is not sufficient review provenance. A reviewed package must therefore have a separate active attestation that binds the review decision to:

- the exact package `evidence_id` and content-addressed `evidence_ref`;
- provider class and identity;
- GoreeCloud integration authority;
- exact provider-class-specific Privacy Shield scope;
- the exact `supports` criterion set declared by the package;
- the declared `review_authority`;
- `review_authority_reference`, a content-addressed reference to the governing review-authority record or other authority evidence;
- `review_evidence_reference`, a distinct content-addressed reference to the actual review evidence;
- the review timestamp and freshness boundary; and
- explicit privacy and non-authorizing governance constraints.

## Authority boundary

The schema and validator verify that a declared review authority and its references are present, content-addressed, internally consistent, privacy-safe at the locator boundary, and matched to the package. They do **not** prove that the declared person, role, team, process, repository, or record is actually authorized by GoreeCloud governance. That authority determination remains an external governance obligation and must be supported by the authoritative GoreeCloud record referenced by the attestation.

Do not invent a reviewer roster or infer authorization from repository write access, GitHub authorship, CI success, a document title, or the existence of a review record.

## Review decisions

`accepted-for-evaluation` means only that the evidence package may support the bounded provider candidate-evaluation criteria it declares while the review remains current. It does not approve the provider.

`needs-more-evidence` and `rejected` cannot support a package represented as reviewed.

An `active` review must remain within its own `valid_until` window and may not outlive the evidence artifact it reviews. A `superseded` review is retained as history but cannot support current reviewed-package state.

The review timestamp must not predate the evidence artifact collection time and must exactly match the package `governance.reviewed_at` timestamp. The review `supports` set must exactly match the package `supports` set so a review cannot be silently stretched to additional evaluation criteria.

The `review_authority_reference` and `review_evidence_reference` values must be distinct from the provider evidence artifact reference and from each other. All three use `evidence+sha256:<64-lowercase-hex>:<locator>` so mutable pointers cannot silently substitute different bytes.

## Privacy

Do not place credentials, private keys, signing secrets, bearer tokens, signed access URLs, raw private payloads, full capability tokens, or reusable secret material in review records or locators. Review artifacts and authority records must follow their own governing access controls and should expose only the minimum information necessary for traceability.

There are currently **zero provider evidence review-attestation JSON records** in this repository. This source boundary does not establish any real reviewer authority, reviewed provider dossier, provider candidate, selection, deployment, acceptance, or production authorization.
