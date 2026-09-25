# GoreeCloud Privacy Shield Public Website

> **Static website source authority:** the current one-retained-website authority is `GoreeCloud/static-websites`, with the canonical Privacy Center route at `sites/main/privacy/index.html` and `https://www.goreecloud.com/privacy/`. This `website/` directory is a protected legacy/transitional deployment copy and is not current public-site source authority. Do not remove it until its remaining custom-domain/deployment role, rollback value, and retirement/cutover state are authoritatively resolved.

The canonical current Privacy Center route is `https://www.goreecloud.com/privacy/`. The legacy custom-domain deployment record remains `https://privacy.goreecloud.com` until that separate deployment is explicitly retired or redirected and verified.

## Current presentation boundary

This protected legacy copy's active local source still uses **Glaze UI 2.1.0** for its presentation layer. The canonical Privacy Center source in `GoreeCloud/static-websites/sites/main/privacy/index.html` already targets **Glaze UI 1.6.0**; current exact-revision downstream human/consumer acceptance and legacy deployment retirement/cutover remain pending. Privacy content uses solid Surface planes; Soft Glaze is bounded to persistent navigation chrome under the administration/control-surface material budget. The current mapping preserves 48 px general interaction targets, a 56 px Touch Assistance floor, safe-area handling, reduced-motion and reduced-transparency behavior, increased-contrast and forced-colors fallbacks, performance and no-backdrop resilience, and large-text/narrow-screen reflow.

These presentation changes do not create or upgrade Privacy Shield privacy authority, consent state, data-governance enforcement, evidence validity, or runtime acceptance. Glaze UI cannot create a privacy decision or turn a transport/visual state into privacy evidence.

Legacy-copy status is **Historical active-source baseline / migration required**. See `GLAZE-UI-2.1-ADOPTION.md`. It is migration provenance for this legacy deployment path, not current Privacy Center source authority. Historical 2.0 evidence is retained only in `GLAZE-UI-2.0-HISTORICAL.md`.

## Current legacy Cloudflare Pages contract

Until the controlled deployment cutover is completed, production still uses this legacy contract:

- Repository: `GoreeCloud/goreecloud-privacy-shield`
- Production branch: `main`
- Root directory: repository root
- Build command: `python3 website/build.py`
- Build output directory: `website/dist`
- Custom domain: `privacy.goreecloud.com`

The current source authority is `GoreeCloud/static-websites/sites/main/privacy/index.html`. Any remaining Cloudflare custom-domain/root/build retirement or redirect for this legacy copy must be verified through authenticated deployment controls rather than inferred from source documentation.

The legacy build copies the approved canonical Privacy Shield identity from `branding/privacy-shield/privacy-shield-icon.svg` into the isolated public artifact. The public icon is therefore not independently redrawn or maintained.

`website/dist` is legacy publication evidence, not canonical source authority. It must remain deterministic while the legacy deployment is in service. The canonical central package intentionally excludes generated `dist` as source authority.

Source, committed generated artifact, and deployed bytes remain distinct evidence classes during the migration. Matching the retained legacy source and `website/dist` does not establish that the centralized source package is deployed, and it does not itself authorize broader Privacy Shield claims.

## Validation

Legacy-repository validation remains available while this deployment source is active:

```bash
python3 website/validate.py
```

The canonical website has its own exact-candidate validation in `GoreeCloud/static-websites`. Current main is `d708ae383ae1f7abee649ead32fc1342320eaaf9`; PR #128 exact candidate `3bd8c1671b271949a6bc69e082c7223703b20f76` passed repository, main-site, and production-deployment verification before merge.

## Publication and acceptance boundary

Privacy Shield runtime, privacy contracts, and canonical product identity remain authoritative in this repository. **Static public website source authority does not.** The public-site source is governed from `GoreeCloud/static-websites/sites/main/privacy/index.html`.

The retained `website/dist` and this legacy source copy may continue serving rollback/deployment needs only until the Cloudflare Pages project is cut over and the exact resulting production deployment is accepted. A successful source validation or build does not establish that cutover or broader Privacy Shield production acceptance.

Human Visual Excellence review and central Glaze UI consumer acceptance remain separate from automated source/build validation. Cloudflare project configuration and DNS changes remain separate controlled production operations from source changes.
