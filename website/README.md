# GoreeCloud Privacy Shield Public Website

This directory contains the source and checked-in publication artifact for the public Privacy Center at `https://privacy.goreecloud.com`.

## Current presentation boundary

Privacy Center source is being migrated toward the governed **GLAZE UI V1.1 / 1.1.0** baseline. The published V1.1 release identity is locked in `glaze.lock.json` to release commit `15cc76d2bcd4065552dc31c77145b63f34d9e7b2`, and the expected thirteen CSS Git blobs are vendored under `glaze/`.

That immutable release graph currently contains a verified missing dependency: `glaze-v1.components.css` imports `./glaze-v1.candidate.css`, but the file is not part of the locked release graph. Exact Git blob identity alone is therefore insufficient publication evidence.

Privacy Center source preserves solid durable privacy content, bounded Soft Glaze navigation chrome, 48 px general interaction targets, the V1.1 56 px Touch Assistance intent, reduced-motion and reduced-transparency behavior, increased-contrast and forced-colors fallbacks, performance/no-backdrop resilience, and large-text/narrow-screen reflow. Those source properties remain unaccepted until a complete immutable design-system graph can be built and rendered.

These presentation changes do not create or upgrade Privacy Shield privacy authority, consent state, data-governance enforcement, evidence validity, or runtime acceptance. GLAZE UI cannot create a privacy decision or turn transport/visual state into privacy evidence.

Current adoption status is **Source Migration Candidate — Publication Blocked**. See `GLAZE-UI-V1.1-ADOPTION.md`. Superseded 2.1 and 2.0 records remain historical only.

## Cloudflare Pages contract

- Repository: `GoreeCloud/goreecloud-privacy-shield`
- Production branch: `main`
- Root directory: repository root
- Build command: `python3 website/build.py`
- Build output directory: `website/dist`
- Custom domain: `privacy.goreecloud.com`

The build copies the approved canonical Privacy Shield identity from `branding/privacy-shield/privacy-shield-icon.svg` into the isolated public artifact. The public icon is therefore not independently redrawn or maintained.

`website/build.py` resolves the locked Glaze file set, verifies every expected Git blob, validates the complete same-directory CSS import closure, and only then may replace `website/dist`. The current immutable `v1.1.0` graph is expected to fail this gate before publication output is modified.

Because that dependency gate is currently unsatisfied, this candidate deliberately retains `website/dist` at current-main publication bytes rather than checking in a known-broken V1.1 artifact. After a corrected immutable Stable GLAZE UI release is explicitly re-pinned, the committed artifact must be deliberately regenerated and revalidated before presentation acceptance can advance.

No Glaze CDN or other remote UI runtime is intended after a valid source graph is available; accepted design-system files are published under the same-origin `website/dist/assets/glaze/` path.

## Validation

Run the dependency gate first:

```bash
python3 website/validate_glaze_import_closure.py
```

After that gate succeeds on a corrected immutable Stable release and the committed artifact has been deliberately regenerated, run:

```bash
python3 website/validate.py
python3 website/validate_responsive.py
python3 website/browser_responsive_smoke.py
```

The first gate shares `website/build.py`'s locked-blob and transitive import validation. The ordinary validator then requires the committed artifact to already be fresh before invoking the build, verifies post-build determinism, canonical icon integrity, GLAZE UI activation/appearance/material/accessibility mapping, required public status/authority language, and the hardened Pages response-header contract.

## Publication and acceptance boundary

Only `website/dist` is intended for Cloudflare Pages publication. The repository remains the authoritative implementation and identity source; private source material, internal contracts, tests, and operational files are not implicitly published merely because the public website is deployed.

A source migration, exact blob lock, passing non-publication test, generated artifact, or preview does not authorize broader Privacy Shield claims or establish acceptance of the website revision. A corrected candidate must pass applicable branch-preview/deployment verification before merge, and the resulting `main` revision must be verified on `privacy.goreecloud.com` after deployment. **Source, committed generated artifact, and deployed bytes must agree** before the V1.1 presentation migration can be recorded as production-accepted.

Human Visual Excellence review and central GLAZE UI consumer acceptance remain separate from automated source/build validation. Cloudflare project configuration and DNS changes remain separate controlled production operations from source changes in this repository.
