# GoreeCloud Privacy Shield Public Website

> **Static website source authority:** the canonical source for the public Privacy Center is now `GoreeCloud/goreecloud-static-websites/sites/privacy`. This `website/` directory is a protected transitional deployment copy while Cloudflare Pages still uses the legacy repository. Future authoritative public-site source changes belong in the centralized repository. Do not remove this copy until Cloudflare repository/root/build cutover and exact production verification have passed.

The public Privacy Center is `https://privacy.goreecloud.com`.

## Current presentation boundary

The Privacy Center targets **Glaze UI 2.1.0 Stable** for its public presentation layer. Privacy content uses solid Surface planes; Soft Glaze is bounded to persistent navigation chrome under the administration/control-surface material budget. The current mapping preserves 48 px general interaction targets, a 56 px Touch Assistance floor, safe-area handling, reduced-motion and reduced-transparency behavior, increased-contrast and forced-colors fallbacks, performance and no-backdrop resilience, and large-text/narrow-screen reflow.

These presentation changes do not create or upgrade Privacy Shield privacy authority, consent state, data-governance enforcement, evidence validity, or runtime acceptance. Glaze UI cannot create a privacy decision or turn a transport/visual state into privacy evidence.

Current source-level adoption status is **Adoption Candidate**. See `GLAZE-UI-2.1-ADOPTION.md`. Historical 2.0 evidence is retained only in `GLAZE-UI-2.0-HISTORICAL.md`.

## Current legacy Cloudflare Pages contract

Until the controlled deployment cutover is completed, production still uses this legacy contract:

- Repository: `GoreeCloud/goreecloud-privacy-shield`
- Production branch: `main`
- Root directory: repository root
- Build command: `python3 website/build.py`
- Build output directory: `website/dist`
- Custom domain: `privacy.goreecloud.com`

The target source authority after cutover is `GoreeCloud/goreecloud-static-websites/sites/privacy`; the final Pages root/build configuration must be verified through authenticated Cloudflare controls rather than inferred from source documentation.

The legacy build copies the approved canonical Privacy Shield identity from `branding/privacy-shield/privacy-shield-icon.svg` into the isolated public artifact. The public icon is therefore not independently redrawn or maintained.

`website/dist` is legacy publication evidence, not canonical source authority. It must remain deterministic while the legacy deployment is in service. The canonical central package intentionally excludes generated `dist` as source authority.

Source, committed generated artifact, and deployed bytes remain distinct evidence classes during the migration. Matching the retained legacy source and `website/dist` does not establish that the centralized source package is deployed, and it does not itself authorize broader Privacy Shield claims.

## Validation

Legacy-repository validation remains available while this deployment source is active:

```bash
python3 website/validate.py
```

The centralized package has its own exact-candidate validation in `GoreeCloud/goreecloud-static-websites` and has reached `validated-in-central-repo`.

## Publication and acceptance boundary

Privacy Shield runtime, privacy contracts, and canonical product identity remain authoritative in this repository. **Static public website source authority does not.** The public-site source package is governed from `GoreeCloud/goreecloud-static-websites/sites/privacy`.

The retained `website/dist` and this legacy source copy may continue serving rollback/deployment needs only until the Cloudflare Pages project is cut over and the exact resulting production deployment is accepted. A successful source validation or build does not establish that cutover or broader Privacy Shield production acceptance.

Human Visual Excellence review and central Glaze UI consumer acceptance remain separate from automated source/build validation. Cloudflare project configuration and DNS changes remain separate controlled production operations from source changes.
