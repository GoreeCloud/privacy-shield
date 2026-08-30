# GoreeCloud Privacy Shield Public Website

This directory contains the source for the public Privacy Center at `https://privacy.goreecloud.com`.

## Current presentation boundary

The Privacy Center targets **Glaze UI 2.0.0 Stable** for its public presentation layer. The current modernization strengthens responsive navigation, 48px interaction targets, safe-area handling, reduced-motion and reduced-transparency behavior, increased-contrast and forced-colors fallbacks, no-backdrop resilience, and print behavior. These presentation changes do not create or upgrade Privacy Shield privacy authority, consent state, data-governance enforcement, or runtime acceptance.

## Cloudflare Pages contract

- Repository: `GoreeCloud/goreecloud-privacy-shield`
- Production branch: `main`
- Root directory: repository root
- Build command: `python3 website/build.py`
- Build output directory: `website/dist`
- Custom domain: `privacy.goreecloud.com`

The build copies the approved canonical Privacy Shield identity from `branding/privacy-shield/privacy-shield-icon.svg` into the isolated public artifact. The public icon is therefore not independently redrawn or maintained.

## Validation

Run:

```bash
python3 website/validate.py
```

The validator builds the site, verifies canonical icon integrity, checks required public status/boundary language, and requires the hardened Pages response-header contract.

## Publication and acceptance boundary

Only `website/dist` is intended for Cloudflare Pages publication. The repository remains the authoritative implementation and identity source; private source material, internal contracts, tests, and operational files are not implicitly published merely because the public website is deployed.

A successful source validation or build does not itself authorize broader Privacy Shield claims or establish acceptance of the website revision. The exact candidate revision must pass the applicable branch-preview/deployment verification before merge, and the resulting `main` revision must be verified on `privacy.goreecloud.com` after deployment. Source, generated artifact, and deployed bytes must agree before this presentation modernization is recorded as production-accepted.

Cloudflare project configuration and DNS changes remain separate controlled production operations from source changes in this repository.
