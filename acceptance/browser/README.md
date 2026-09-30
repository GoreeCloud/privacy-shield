# GoreeCloud Browser Runtime Acceptance

This directory is the governed evidence location for **Privacy Shield 2.0 FR-013** exact compiled GoreeCloud Browser runtime-acceptance records.

## Current state

There are **zero real Browser runtime-acceptance JSON records** in this directory.

The presence of the FR-013 contract, evaluator, tests, workflow validation, or this directory does not establish Browser runtime acceptance, production approval, Release Candidate status, or Stable qualification.

## Record requirements

A future record must use `contracts/privacy-shield.browser-runtime-acceptance.v1.schema.json` and must be evaluated against independently supplied expectations for:

- exact GoreeCloud Browser source commit;
- exact GoreeCloud Browser source tree;
- exact Privacy Shield source commit;
- exact compiled Browser artifact SHA-256;
- independently expected runtime-review authority; and
- caller-selected evidence freshness.

The exact compiled artifact must carry bounded build provenance and representative target metadata. Every required Browser privacy dimension must have a passed result with content-addressed evidence:

- content blocking;
- tracking resistance;
- URL cleaning;
- privacy status accuracy;
- user-visible exceptions;
- private-browsing isolation;
- local substitution;
- failure modes;
- accessibility/status accuracy; and
- rendering-engine boundary behavior, including explicit Firefox/Gecko vs Chromium-family authority boundaries where applicable.

The strict evaluator requires the expected reviewer authority from the caller and rejects a record whose self-declared review authority does not match that independent expectation.

A record accepted for runtime remains non-authorizing and non-promoting. `authorization_effect`, `authority_transfer`, and `production_approved` are fixed to `false` in the FR-013 source contract.

## Evidence rule

Do not add placeholder, synthetic, copied-forward, or source-only acceptance records here. Real records require evidence from the exact compiled Browser artifact and representative target named by the record.
