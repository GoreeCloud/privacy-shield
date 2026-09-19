# Privacy Shield Signing-Key Provider Selection Records

This directory is the source-controlled machine-readable decision boundary for selecting a production-capable signing-key custody provider for Privacy Shield operation-bound capability signing.

Selection records conform to `contracts/privacy-shield.signing-key-provider-selection.schema.json` and are validated by `tools/validate_signing_key_provider_selection.py`.

Before a selection record can exist, it must reference an evidence-backed candidate evaluation under `evaluations/signing-key-providers/` conforming to `contracts/privacy-shield.signing-key-provider-evaluation.schema.json`. The selection summary must exactly match that dossier's provider identity, integration authority, producer/capability scope, environment scope, and criterion results. An approved selection requires the referenced evaluation to be complete and current, cannot predate the evaluation, and cannot have a review deadline later than the evaluation's `valid_until` boundary.

A candidate evaluation is non-authorizing. A selection record is also **not** production acceptance. Every evaluation record must keep `authorizing: false` and `production_acceptance_authorized: false`; every selection record must keep `production_acceptance_authorized: false`. Production use still requires the independent exact-provider/exact-deployment acceptance process under `acceptance/signing-key-providers/`.

CI rejects multiple active approved selections for the same environment. If a production signing-key acceptance record exists, CI requires a matching active approved selection for the same provider, integration authority, producer identity, and environment before that acceptance record can be considered structurally valid.

There are currently **zero signing-key provider candidate evaluation records**, **zero approved signing-key provider selections**, and **zero production-approved signing-key provider acceptance records** in this repository. No KMS, HSM, cloud key service, or other production custody provider is selected by the presence of these directories, schemas, or validators.

Do not store signing secrets, credentials, raw private payloads, or full capability tokens in evaluation or selection records.
