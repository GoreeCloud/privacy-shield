# GoreeCloud Privacy Shield Public Website

This directory contains the source for the planned public Privacy Shield website at `https://privacy.goreecloud.com`.

## Cloudflare Pages contract

- Repository: `GoreeCloud/goreecloud-privacy-shield`
- Production branch: `main`
- Root directory: repository root
- Build command: `python3 website/build.py`
- Build output directory: `website/dist`
- Planned custom domain: `privacy.goreecloud.com`

The build copies the approved canonical Privacy Shield identity from `branding/privacy-shield/privacy-shield-icon.svg` into the isolated public artifact. The public icon is therefore not independently redrawn or maintained.

## Validation

Run:

```bash
python3 website/validate.py
```

The validator builds the site, verifies canonical icon integrity, checks required public status/boundary language, and requires the hardened Pages response-header contract.

## Publication boundary

Only `website/dist` is intended for Cloudflare Pages publication. The repository remains the authoritative implementation and identity source; private source material, internal contracts, tests, and operational files are not implicitly published merely because the public website is deployed.

Connecting the Cloudflare Pages project, activating the custom domain, and changing DNS are separate controlled production operations.
