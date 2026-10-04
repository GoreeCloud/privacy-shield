# Privacy Center — Current Static-Site and Glaze Authority

**Status:** Glaze V1.7 source adoption completed; downstream acceptance remains blocked  
**Privacy authority:** GoreeCloud Privacy Shield  
**Static-site repository:** `GoreeCloud/static-websites`  
**Current public website:** `https://www.goreecloud.com`  
**Current Privacy route:** `https://www.goreecloud.com/privacy/`  
**Current Glaze consumer target:** Glaze V1.7 / `1.7.0`

## Current source authority

The current GoreeCloud public-web authority is the single retained website in `GoreeCloud/static-websites`. Its URL namespace identifies `sites/main/privacy/index.html` as the canonical `/privacy/` source. The former standalone `sites/privacy` package and the `GoreeCloud/privacy-shield/website` copy are migration/retirement or legacy deployment material, not current public-site source authority.

The canonical Privacy route at `GoreeCloud/static-websites@531744f2a82133caca8ddde00fa782415d1a42e1` now declares:

- `data-glaze-version="1.7.0"`;
- `goreecloud-glaze-ui=1.7.0`;
- consumer state `source-adopted-unaccepted`;
- the canonical Privacy Shield identity; and
- explicit separation between Privacy Shield privacy authority and application/service runtime authority.

The exact Privacy route blob at that revision is `aadf935248db716858b7882b1685d0bcdd4a6da4`.

This completes the **source-migration** portion of the Privacy Center Glaze V1.7 requirement. It does not establish downstream consumer acceptance, canonical deployed-byte equivalence, legacy deployment retirement, production Privacy Shield runtime acceptance, Anchor qualification, or Stable status.

## Exact Glaze authority

The website source lock at the same static-websites revision binds:

- Glaze version: `1.7.0`;
- canonical repository: `GoreeCloud/glaze`;
- bounded Stable/Anchor authority revision: `1a5756daed2294155be2e9972b24f580f6222b7b`;
- Stable runtime entrypoint: `js/glaze-v1.7.0.mjs`;
- entrypoint blob: `c669d9c6f1738b2a56cb02b2e00fa0ca229117c0`;
- Stable runtime baseline: `1.6.0`; and
- website consumer state: `source-adopted-unaccepted`.

Glaze V1.7.0 intentionally inherits the accepted V1.6.0 runtime surface and excludes unverified V1.7 Development behavior. That bounded compatibility decision reduces migration risk but does not transfer downstream consumer acceptance.

## Current repository and deployment evidence

Static-websites PR #132 merged the V1.7 source migration to `main` as `531744f2a82133caca8ddde00fa782415d1a42e1`.

For that exact merged revision:

- post-merge `Validate static website repository` completed successfully;
- post-merge `Validate main GoreeCloud website` completed successfully;
- the exact source/build/browser workflow validates the V1.7 lock, isolated artifact, public boundary, and canonical-page browser smoke;
- Cloudflare Pages check `111344235579` completed successfully for exact revision `531744f2a82133caca8ddde00fa782415d1a42e1`;
- Cloudflare deployment id is `833c933e-f6d0-48ce-b14d-30c8e62a74f2`; and
- the associated Pages preview is `https://833c933e.goreecloud-website.pages.dev`.

This establishes exact source adoption and successful Pages deployment for the merged revision. It does **not** establish canonical-domain exact-byte readback because the repository production verifier has not yet been run post-merge against the new V1.7 revision through an authenticated workflow-dispatch path.

The website's V1.7 consumer-acceptance record remains `pending-evidence`, with production approval false. Human visual, keyboard, assistive-technology, representative performance/resilience, exact rollback, canonical production readback, and final owner consumer acceptance remain pending.

## Legacy Privacy Shield website copy

`GoreeCloud/privacy-shield/website` remains a protected legacy/transitional deployment copy and intentionally retains its historical Glaze UI 2.1.0 source/build validator while that legacy contract exists. It must not be relabeled as a V1.7 implementation without actually rebuilding and accepting those bytes.

The current Privacy Shield Platform Contract therefore distinguishes:

1. **Canonical Privacy Center source:** Glaze V1.7 / 1.7.0 in `GoreeCloud/static-websites/sites/main/privacy/index.html`.
2. **Legacy/transitional copy:** historical 2.1.0 source in this repository.
3. **Consumer acceptance:** still blocked until exact-current rendered/accessibility/performance/resilience/rollback/canonical-readback/human acceptance requirements pass.
4. **Legacy retirement/cutover:** still pending until the historical Privacy Shield deployment path is explicitly retired or redirected and verified.
5. **Privacy Shield runtime/production acceptance:** separate and unaffected by website presentation state.

## Authority boundary

Glaze is presentation authority only. Source migration, successful CI, a Pages deployment check, rendered website state, or a consumer record cannot create consent, authorize data use, upgrade privacy evidence, grant runtime capability, or establish Privacy Shield production acceptance.

The Privacy Center Glaze gate therefore remains **blocked** for Privacy Shield Version 2.0 even though its source-migration substep is now complete.
