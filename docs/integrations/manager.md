# GoreeCloud Manager Integration

Privacy Shield owns the producer side of the minimized status contract consumed by GoreeCloud Manager.

## Source boundary

`src/manager-status.mjs` constructs schema-version-1 Privacy Shield status documents for the shared contract in `contracts/privacy-shield.status.schema.json`.

The source producer is intentionally non-promoting:

- `runtime_acceptance_required` is always `true`;
- `production_approved` is always `false`;
- source status cannot report `protected`;
- source capability state cannot report `active`;
- raw private activity, credentials, and identifiers are fixed to absent;
- only canonical Privacy Shield capability identifiers are accepted; and
- timestamps require an explicit timezone.

This prevents a repository-local status serializer from becoming a substitute for runtime acceptance.

## Authority separation

Manager is a read-only administrative consumer. Manager does not gain Privacy Shield privacy authority, and Privacy Shield does not gain Manager administrative authority.

A successful source test or a valid status document does not establish an accepted producer deployment, end-to-end Manager delivery, production runtime acceptance, provider acceptance, or Anchor qualification.

## Remaining acceptance

The Manager integration remains migration-required until an accepted runtime producer is deployed and independently validated with freshness, delivery, fault handling, privacy guarantees, target-environment evidence, and production acceptance.
