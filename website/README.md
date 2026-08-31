# GoreeCloud Privacy Shield Public Website

This directory contains the source and checked-in publication artifact for the public Privacy Center at `https://privacy.goreecloud.com`.

## Current presentation boundary

The Privacy Center targets **Glaze UI 2.1.0 Stable** for its public presentation layer. Privacy content uses solid Surface planes; Soft Glaze is bounded to persistent navigation chrome under the administration/control-surface material budget. The current mapping preserves 48 px general interaction targets, a 56 px Touch Assistance floor, safe-area handling, reduced-motion and reduced-transparency behavior, increased-contrast and forced-colors fallbacks, performance and no-backdrop resilience, and large-text/narrow-screen reflow.

These presentation changes do not create or upgrade Privacy Shield privacy authority, consent state, data-governance enforcement, evidence validity, or runtime acceptance. Glaze UI cannot create a privacy decision or turn a transport/visual state into privacy evidence.

Current source-level adoption status is **Adoption Candidate**. See `GLAZE-UI-2.1-ADOPTION.md`. Historical 2.0 evidence is retained only in `GLAZE-UI-2.0-HISTORICAL.md`.

## Cloudflare Pages contract

- Repository: `GoreeCloud/goreecloud-privacy-shield`
- Production branch: `main`
- Root directory: repository root
- Build command: `python3 website/build.py`
- Build output directory: `website/dist`
- Custom domain: `privacy.goreecloud.com`

The build copies the approved canonical Privacy Shield identity from `branding/privacy-shield/privacy-shield-icon.svg` into the isolated public artifact. The public icon is therefore not independently redrawn or maintained.

`website/dist` is checked in as publication evidence. It must be deterministic and byte-identical to the current source build. The validator checks that committed artifact before invoking the build, so a stale artifact cannot be silently regenerated into a passing CI result.

## Validation

Run:

```bash
python3 website/validate.py
```

The validator checks the pre-build committed artifact, builds the site, verifies post-build determinism, verifies canonical icon integrity, enforces the Glaze UI 2.1 material/accessibility mapping and current-version markers, checks required public status/authority language, and requires the hardened Pages response-header contract.

## Publication and acceptance boundary

Only `website/dist` is intended for Cloudflare Pages publication. The repository remains the authoritative implementation and identity source; private source material, internal contracts, tests, and operational files are not implicitly published merely because the public website is deployed.

A successful source validation or build does not itself authorize broader Privacy Shield claims or establish acceptance of the website revision. The exact candidate revision must pass the applicable branch-preview/deployment verification before merge, and the resulting `main` revision must be verified on `privacy.goreecloud.com` after deployment. **Source, committed generated artifact, and deployed bytes must agree** before this presentation migration can be recorded as production-accepted.

Human Visual Excellence review and central Glaze UI consumer acceptance remain separate from automated source/build validation. Cloudflare project configuration and DNS changes remain separate controlled production operations from source changes in this repository.
