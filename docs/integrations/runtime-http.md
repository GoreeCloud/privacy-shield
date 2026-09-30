# Privacy Shield Runtime HTTP Boundary

**Status:** Weave source implementation. No production host or deployment is implied.

Privacy Shield now defines one portable HTTP boundary for a hosted authority runtime.

## Routes

- `GET /healthz` — liveness only.
- `GET /readyz` — production readiness for the core Privacy Shield authority runtime.
- `POST /v1/capabilities/verify` — authenticated capability-reference verification using the existing bounded verification contract.

## Readiness semantics

`/readyz` returns HTTP 200 only when all of the following are true:

1. the runtime is explicitly in production mode;
2. the runtime carries a fresh exact state-provider acceptance record using the canonical state-provider acceptance contract;
3. the runtime carries a fresh exact signing-key-provider acceptance record using the canonical signing-key acceptance contract; and
4. the hosting environment supplies a read-only runtime probe and that probe succeeds.

Missing, expired, malformed, wrong-contract, development, or failed dependency evidence returns HTTP 503.

The runtime probe is intentionally host-supplied because this repository does not choose the production state/signing providers or hosting platform. A hosting implementation must use the probe to exercise its accepted provider path rather than replacing readiness with a static flag.

## Privacy and authority boundary

Health and readiness responses expose only bounded dependency state. They do not reveal provider identifiers, topology, keys, tokens, user identifiers, private content, capability references, or acceptance evidence bodies.

A successful readiness response means the hosted core authority runtime currently satisfies this bounded provider/connectivity readiness contract. It does not establish all nine Integral Platform System acceptances, Everkeep recovery, Manager delivery, Browser acceptance, production deployment approval, Seal, or Anchor.

Capability verification remains independently authenticated by the hosting GoreeCloud Identity-aware transport. A body-supplied consumer identifier cannot create or replace transport identity.

## Deployment boundary

This source does not open a socket, bind a domain, select a host, configure GoreeCloud Identity, select production providers, or publish the endpoint. Production deployment remains separately evidence-gated.
