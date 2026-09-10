# Privacy Shield Signing-Key Provider Selection Records

This directory is the source-controlled machine-readable decision boundary for selecting a production-capable signing-key custody provider for Privacy Shield operation-bound capability signing.

A selection record is **not** production acceptance. It may authorize implementation and integration work for an explicitly scoped provider, but it must always keep `production_acceptance_authorized` false. Production use still requires the independent exact-provider/exact-deployment acceptance process under `acceptance/signing-key-providers/`.

Selection records must conform to `contracts/privacy-shield.signing-key-provider-selection.schema.json` and must not contain signing secrets, credentials, raw private payloads, or full capability tokens.

An approved selection must record the provider ID, GoreeCloud integration authority, exact Privacy Shield producer/capability scope, target environment set, evaluated custody requirements, governing decision reference, decision time, and review deadline. CI rejects multiple active approved selections for the same environment.

If a production signing-key acceptance record exists, CI requires a matching active approved selection for the same provider, integration authority, producer identity, and environment before that acceptance record can be considered structurally valid.

There are currently **zero approved signing-key provider selection records** in this repository. No KMS, HSM, cloud key service, or other production custody provider is selected by the presence of this directory, schema, or validator.
