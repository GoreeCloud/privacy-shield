# Privacy Shield 2.0 — Identity-Authenticated Mesh Delivery

**Feature:** FR-012  
**Status:** Development / source candidate  
**Authority transfer:** None  
**Production acceptance:** Not established

FR-012 strengthens Privacy Shield evidence delivery to GoreeCloud Mesh without turning transport authentication into privacy authorization.

## Exact identity boundary

The FR-012 path requests a credential from GoreeCloud Identity for exactly:

- service: `privacy-shield`;
- audience: `goreecloud-mesh`; and
- scope: `mesh.evidence.write`.

The returned credential attestation must bind those exact values. Additional scopes fail closed instead of being treated as harmless capability expansion.

Privacy Shield does not parse bearer tokens and does not become Identity authority. The injected Identity provider returns bounded credential metadata plus an opaque access token. Privacy Shield validates the metadata and uses the token only for the immediate Mesh request.

## Freshness, rotation, revocation, and trust

The caller must choose both a maximum credential age and minimum remaining validity. FR-012 deliberately does not invent a global credential lifetime. A credential fails closed when it is future-issued, older than the caller policy, too close to expiry, not current under rotation policy, revoked/not active, or missing current Identity trust verification.

Trust metadata must be issued by `goreecloud-identity`, have `verified` status, not be future-dated, still be current, and not outlive the credential itself.

## Mesh acceptance binding

A successful authenticated delivery additionally requires Mesh to return an acceptance binding for the same credential ID, `privacy-shield` service identity, `goreecloud-mesh` audience, exact write scope, and verified Identity trust. The Mesh acceptance response must explicitly preserve `authority_transfer: false`.

The resulting Privacy Shield handling receipt also fixes:

- `authorization_effect: false`; and
- `authority_transfer: false`.

Authenticated transport never creates, extends, upgrades, or transfers Privacy Shield data-use authority.

## Credential handling

Bearer material is excluded from evidence and returned receipts. Provider and transport exceptions are sanitized so upstream errors cannot reflect secret credentials into local error text. Credential acquisition happens per delivery; Privacy Shield does not persist the bearer token.

## Acceptance boundary

This source candidate does not prove genuine GoreeCloud Identity issuance, production credential rotation/revocation, Mesh trust verification, deployed mutual trust, live delivery, target-environment behavior, production acceptance, or Stable Privacy Shield 2.0. Those remain independent runtime and production gates.
