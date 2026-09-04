# Privacy Center — GLAZE UI V1.1 Adoption

Status: **Source Migration Candidate — Publication Blocked**  
Target baseline: **GLAZE UI V1.1 / 1.1.0 Stable**  
Published release commit: `15cc76d2bcd4065552dc31c77145b63f34d9e7b2`  
Published release tree: `52eb8207272498db227c984d2398e1242b659393`  
Canonical tag: `v1.1.0`  
Published web entrypoint: `css/glaze-v1.1.0.css`

## Scope

This record maps the GoreeCloud Privacy Center public web source toward the current governed GLAZE UI V1.1 baseline without changing Privacy Shield's privacy authority, consent authority, privacy-policy authority, data-minimization requirements, evidence semantics, or runtime acceptance state.

The Privacy Center is an administration/control surface. Durable privacy content remains on solid content planes. Bounded Soft Glaze is used for persistent navigation chrome; Deep Glaze and Live Glaze are not required by this public surface.

## Immutable source identity and current blocker

`website/glaze.lock.json` pins the published GLAZE UI V1.1 / 1.1.0 release identity and the expected thirteen CSS Git blobs. Those bytes are vendored under `website/glaze/`, with the intended entrypoint at `website/glaze/glaze-v1.1.0.css`.

The published immutable graph is not dependency-complete: `glaze-v1.components.css` imports `./glaze-v1.candidate.css`, but that file is absent from the locked release graph. Exact blob identity therefore does not prove a complete browser dependency graph.

Privacy Shield must not recreate the missing Candidate file, locally rewrite the immutable release, or treat an unreleased repair as Stable. A corrected immutable Stable GLAZE UI release must be published and Privacy Shield must be explicitly re-pinned before this migration can advance to artifact or rendered acceptance.

## Fail-closed publication integrity

`website/build.py` now validates the locked file set, every Git blob identity, and the complete local CSS `@import` closure **before modifying `website/dist`**. `website/validate_glaze_import_closure.py` exposes the same dependency gate to CI before the ordinary artifact validator runs.

While the published `v1.1.0` graph is incomplete, the V1.1 source migration is expected to fail that gate. The checked-in `website/dist` therefore remains at the current-main publication bytes rather than being replaced with a known-broken V1.1 artifact.

After a corrected immutable Stable release is available, the required sequence is:

1. explicitly update the Privacy Center lock to the accepted immutable release;
2. verify every vendored Git blob and the complete transitive CSS import closure;
3. regenerate the checked-in publication artifact deliberately;
4. require pre-build artifact freshness and post-build byte determinism;
5. validate canonical Privacy Shield artwork, security headers, local-only runtime dependencies, accessibility contracts, and authority language;
6. perform fresh rendered/browser and human Visual Excellence review; and
7. verify deployed bytes before production presentation acceptance is claimed.

This sequencing prevents CI from silently repairing stale or dependency-incomplete publication evidence.

## Consumer mapping

- The candidate source root activates `data-glaze-version="1.1"` and standard density through `data-glaze-density-profile="standard"`.
- Light, Dark, and Deep Dark use the V1.1 `data-glz-appearance` contract. System appearance is represented by the absence of an explicit Glaze appearance attribute.
- Persistent header navigation uses bounded Soft Glaze presentation.
- Durable privacy cards and status surfaces use solid content-card semantics; visual treatment does not create privacy state.
- General interactive targets retain a 48 px floor, with the V1.1 Touch Assistance contract providing a 56 px floor where enabled.
- Reduced Transparency, Reduced Motion, Increased Contrast, Forced Colors, large text, narrow screens, and constrained rendering remain independent acceptance concerns and must not lose content or privacy-state meaning.
- `website/site.css` and `website/site-polish.css` remain Privacy Shield-owned product styling layered after the design-system source once a valid graph can be published.

## Authority boundary

GLAZE UI standardizes presentation and interaction only. It cannot grant or revoke consent, create or upgrade a privacy decision, strengthen a privacy-protected state, change retention/deletion policy, authorize privacy-changing execution, validate recovery, or turn GoreeCloud Mesh transport into Privacy Shield evidence.

## Acceptance boundary

This source migration is not a GLAZE UI consumer acceptance decision. The current immutable dependency defect blocks publication before artifact acceptance. Repository source validation, a future regenerated artifact, responsive/browser tests, human Visual Excellence review, branch-preview verification, production deployment verification, central Glaze consumer acceptance, and exact deployed-byte confirmation remain separate gates. Until those gates are satisfied, the Platform Contract must not claim `applicable-conformant` for GLAZE UI.
