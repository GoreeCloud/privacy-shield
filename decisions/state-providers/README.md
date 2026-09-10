# Privacy Shield State-Provider Selection Decisions

This directory contains governed machine-readable decisions selecting a real distributed Privacy Shield state provider for bounded provider-specific integration work.

Selection records conform to `contracts/privacy-shield.state-provider-selection.schema.json` and are validated by `tools/validate_state_provider_selection.py`.

Before a selection record can exist, it must reference an evidence-backed candidate evaluation under `evaluations/state-providers/` conforming to `contracts/privacy-shield.state-provider-evaluation.schema.json`. The selection summary must exactly match that dossier's provider identity, implementation, integration authority, authority-state scope, environment scope, and criterion results. An approved selection requires the referenced evaluation to be complete and current, cannot predate the evaluation, and cannot have a review deadline later than the evaluation's `valid_until` boundary.

A candidate evaluation is non-authorizing. A provider selection is also **not** production acceptance. Every evaluation record must keep `authorizing: false` and `production_acceptance_authorized: false`; every selection record must keep `production_acceptance_authorized: false`. A separately governed, fresh exact-provider/exact-deployment record under `acceptance/state-providers/` remains mandatory before production use can be claimed.

There are currently **zero state-provider candidate evaluation records**, **zero approved state-provider selections**, and **zero production-approved state-provider acceptance records** in this repository.

Do not add credentials, secret material, or raw private payloads to candidate-evaluation or provider-selection records.
