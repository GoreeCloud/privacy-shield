# Privacy Shield Signing-Key Provider Candidate Evaluations

This directory contains privacy-minimized, evidence-backed candidate evaluation records for production-capable Privacy Shield signing-key custody providers.

Evaluation records conform to `contracts/privacy-shield.signing-key-provider-evaluation.schema.json` and are validated by `tools/validate_signing_key_provider_selection.py` plus the shared provider-evaluation evidence provenance and evidence-package validators.

A candidate evaluation is **not** a provider-selection decision and is **not** production acceptance. Every evaluation record must keep `authorizing: false` and `production_acceptance_authorized: false`. A complete/current evaluation may support a later governed selection under `decisions/signing-key-providers/`, and a separately governed exact-provider/exact-deployment acceptance record remains mandatory before production use.

Resolved criteria (`passed` or `failed`) require evidence references. Every reference must be content-addressed as `evidence+sha256:<64-lowercase-hex-digest>:<locator>`. The locator may point to an authorized external evidence artifact, qualification run, or governed artifact location; the digest binds the evaluation claim to the exact evidence bytes that were reviewed. The overall `governance.evidence_reference` must use the same form.

Every evaluation evidence reference must also resolve to a governed package under `evidence/provider-evaluations/*.json` conforming to `contracts/privacy-shield.provider-evidence-package.schema.json`. The package must match the evaluation's signing-key provider identity, integration authority, producer identity, capability, and environment scope. Its `supports` list must include the exact criterion referenced; the evaluation-level reference must resolve to a package supporting `evaluation-summary`.

A resolved criterion may use only a `reviewed` and fresh evidence package. A complete or failed evaluation likewise requires its `evaluation-summary` package to be reviewed and fresh. Captured, rejected, superseded, stale, mismatched, or unscoped packages fail closed and cannot support a resolved candidate-evaluation claim.

A content-addressed reference or reviewed package does not prove that the referenced evidence is correct, sufficient, current, authoritative, or applicable beyond the package's declared scope. Reviewers must still verify the actual evidence, its source authority, collection procedure, scope, and applicability to the candidate and intended environments. Repository validation prevents mutable evidence substitution and cross-provider/scope reuse; it does not replace governed technical review.

A `complete` evaluation requires every criterion to be `passed`, is freshness-bounded by `valid_until`, and must exactly match any selection that cites it for provider identity, integration authority, producer/capability scope, environment scope, and criterion results.

Do not store signing secrets, credentials, raw private payloads, full capability tokens, signed access URLs, bearer tokens, or other secret-bearing material in evaluation records, evidence package records, or their locators.

There is currently **one draft signing-key provider candidate evaluation record** for OVHcloud KMS with HSM-backed asymmetric signing and one matching captured provider evidence package. Every evaluation criterion remains pending because the package has not received a governed evidence-review attestation and no GoreeCloud KMS key, adapter, or exact runtime qualification exists. The candidate is also a proprietary managed external service, so a separate GoreeCloud exception/necessity review and explicit cost/order authorization remain required before any selection or deployment. There are therefore zero complete signing-key provider candidate evaluations, zero approved signing-key provider selections, and zero production-approved signing-key provider acceptance records.
