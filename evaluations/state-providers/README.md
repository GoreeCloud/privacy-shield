# Privacy Shield State-Provider Candidate Evaluations

This directory contains privacy-minimized, evidence-backed candidate evaluation records for real distributed Privacy Shield state providers.

Evaluation records conform to `contracts/privacy-shield.state-provider-evaluation.schema.json` and are validated by `tools/validate_state_provider_selection.py` plus the shared provider-evaluation evidence provenance validator.

A candidate evaluation is **not** a provider-selection decision and is **not** production acceptance. Every evaluation record must keep `authorizing: false` and `production_acceptance_authorized: false`. A complete/current evaluation may support a later governed selection under `decisions/state-providers/`, and a separately governed exact-provider/exact-deployment acceptance record remains mandatory before production use.

Resolved criteria (`passed` or `failed`) require evidence references. Every reference must be content-addressed as `evidence+sha256:<64-lowercase-hex-digest>:<locator>`. The locator may point to an authorized external evidence artifact, qualification run, or governed artifact location; the digest binds the evaluation claim to the exact evidence bytes that were reviewed. The overall `governance.evidence_reference` must use the same form.

A content-addressed reference does not prove that the referenced evidence is correct, sufficient, current, authoritative, or applicable. Reviewers must still verify the actual evidence, its authority, its scope, its collection procedure, and its applicability to the candidate and intended environments. Repository validation only prevents resolved criteria from relying on mutable or unauthenticated free-form evidence pointers.

A `complete` evaluation requires every criterion to be `passed`, is freshness-bounded by `valid_until`, and must exactly match any selection that cites it for provider identity, implementation, integration authority, authority-state scope, environment scope, and criterion results.

Do not store credentials, secret material, raw private payloads, signed access URLs, bearer tokens, or other secret-bearing locator material in evaluation records or their repository evidence references.

There are currently **zero state-provider candidate evaluation records** in this repository and therefore zero complete candidate evaluations.
