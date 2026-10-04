# GoreeCloud Privacy Shield Public Website

> **Static website source authority:** the current one-retained-website authority is `GoreeCloud/static-websites`, with the canonical Privacy Center route at `sites/main/privacy/index.html` and `https://www.goreecloud.com/privacy/`. This `website/` directory is a protected legacy/transitional deployment copy and is not current public-site source authority. Do not remove it until its remaining custom-domain/deployment role, rollback value, and retirement/cutover state are authoritatively resolved.

The canonical current Privacy Center route is `https://www.goreecloud.com/privacy/`. The legacy custom-domain deployment record remains `https://privacy.goreecloud.com` until that separate deployment is explicitly retired or redirected and verified.

## Current presentation boundary

This protected legacy copy's active local source still uses **Glaze UI 2.1.0** for its presentation layer.

The canonical Privacy Center source in `GoreeCloud/static-websites/sites/main/privacy/index.html` now targets **Glaze V1.7 / 1.7.0** at static-websites revision `531744f2a82133caca8ddde00fa782415d1a42e1`. Its consumer state is `source-adopted-unaccepted`.

The V1.7 migration preserves the website's existing same-origin presentation implementation and binds the current shared Stable/Anchor Glaze authority without treating that source adoption as downstream acceptance. Glaze V1.7.0 intentionally inherits the accepted V1.6.0 runtime surface; unverified V1.7 Development behavior is not part of the Stable runtime.

These presentation changes do not create or upgrade Privacy Shield privacy authority, consent state, data-governance enforcement, evidence validity, or runtime acceptance. Glaze cannot create a privacy decision or turn transport/visual state into privacy evidence.

Legacy-copy status remains **Historical active-source baseline / migration required**. See `GLAZE-UI-2.1-ADOPTION.md`. It is migration provenance for this legacy deployment path, not current Privacy Center source authority. Historical 2.0 evidence is retained only in `GLAZE-UI-2.0-HISTORICAL.md`.

## Current legacy Cloudflare Pages contract

Until the controlled legacy retirement/cutover is completed, the retained legacy contract remains:

- Repository: `GoreeCloud/goreecloud-privacy-shield`
- Production branch: `main`
- Root directory: repository root
- Build command: `python3 website/build.py`
- Build output directory: `website/dist`
- Custom domain: `privacy.goreecloud.com`

The current source authority is `GoreeCloud/static-websites/sites/main/privacy/index.html`. Any remaining Cloudflare custom-domain/root/build retirement or redirect for this legacy copy must be verified through authenticated deployment controls rather than inferred from source documentation.

The legacy build copies the approved canonical Privacy Shield identity from `branding/privacy-shield/privacy-shield-icon.svg` into the isolated public artifact. The public icon is therefore not independently redrawn or maintained.

`website/dist` is legacy publication evidence, not canonical source authority. It must remain deterministic while the legacy deployment is in service. The canonical central package intentionally excludes generated `dist` as source authority.

Source, generated artifact, deployed Pages revision, canonical-domain bytes, and human consumer acceptance remain distinct evidence classes.

## Current canonical website evidence

The canonical V1.7 source migration merged through static-websites PR #132 as revision `531744f2a82133caca8ddde00fa782415d1a42e1`.

For that exact revision:

- static-websites repository validation passed after merge;
- main-site exact source/build/browser validation passed after merge;
- Cloudflare Pages reported successful deployment for exact revision `531744f2a82133caca8ddde00fa782415d1a42e1`;
- Cloudflare deployment id is `833c933e-f6d0-48ce-b14d-30c8e62a74f2`;
- preview URL is `https://833c933e.goreecloud-website.pages.dev`; and
- the current Glaze V1.7 consumer record remains `pending-evidence` with production approval false.

A post-merge canonical-domain exact-byte verification of the V1.7 revision remains pending. Human visual, keyboard, assistive-technology, representative performance/resilience, rollback, final deployed-byte/readback, and owner consumer acceptance also remain pending.

## Validation

Legacy-repository validation remains available while this deployment source is active:

```bash
python3 website/validate.py
```

The canonical website has its own exact-candidate validation in `GoreeCloud/static-websites`. Current static-websites main is `531744f2a82133caca8ddde00fa782415d1a42e1`, and the canonical Privacy Center source is Glaze V1.7 / 1.7.0 with consumer state `source-adopted-unaccepted`.

## Publication and acceptance boundary

Privacy Shield runtime, privacy contracts, and canonical product identity remain authoritative in this repository. **Static public website source authority does not.** The public-site source is governed from `GoreeCloud/static-websites/sites/main/privacy/index.html`.

The retained `website/dist` and this legacy source copy may continue serving rollback/deployment needs only until the legacy deployment path is explicitly retired or redirected and the resulting production state is accepted.

Successful source validation, browser smoke, or a Cloudflare Pages deployment does not establish final Privacy Center consumer acceptance or broader Privacy Shield production acceptance. Canonical-domain byte verification, human review, accessibility/assistive-technology acceptance, representative performance/resilience, rollback evidence, legacy cutover/retirement, and owner consumer acceptance remain separately governed.
