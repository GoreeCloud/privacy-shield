# Privacy Shield State-Provider Selection Decisions

This directory contains governed machine-readable decisions selecting a real distributed Privacy Shield state provider for bounded provider-specific integration work.

Selection records conform to `contracts/privacy-shield.state-provider-selection.schema.json` and are validated by `tools/validate_state_provider_selection.py`.

A provider selection is **not** production acceptance. Every selection record must keep `production_acceptance_authorized: false`. A separately governed, fresh exact-provider/exact-deployment record under `acceptance/state-providers/` remains mandatory before production use can be claimed.

There are currently **zero approved state-provider selections** in this repository.

Do not add credentials, secret material, or raw private payloads to provider-selection records.
