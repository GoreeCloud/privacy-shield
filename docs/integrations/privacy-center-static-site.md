# Privacy Center — Current Static-Site and Glaze Authority

**Status:** Glaze V1.7 machine/deployment/readback evidence complete; human consumer acceptance remains blocked  
**Privacy authority:** GoreeCloud Privacy Shield  
**Static-site repository:** `GoreeCloud/static-websites`  
**Current public website:** `https://www.goreecloud.com`  
**Current Privacy route:** `https://www.goreecloud.com/privacy/`  
**Current Glaze consumer target:** Glaze V1.7 / `1.7.0`

## Current source authority

The current GoreeCloud public-web authority is the single retained website in `GoreeCloud/static-websites`. Its URL namespace identifies `sites/main/privacy/index.html` as the canonical `/privacy/` source. The former standalone `sites/privacy` package and the `GoreeCloud/privacy-shield/website` copy are migration/retirement or legacy deployment material, not current public-site source authority.

The canonical Privacy route at `GoreeCloud/static-websites@17303b6c7381faaa0e89ce6175ce24048fb56a12` now declares:

- `data-glaze-version="1.7.0"`;
- `goreecloud-glaze-ui=1.7.0`;
- consumer state `source-adopted-unaccepted`;
- the canonical Privacy Shield identity; and
- explicit separation between Privacy Shield privacy authority and application/service runtime authority.

The exact Privacy route blob at that revision is `40d4bcb1f8fc1e53bbbcde15f151ce1027157f96`.

This completes the canonical source-migration portion of the Privacy Center Glaze V1.7 requirement. Exact machine validation, production deployment, and canonical readback are also verified for the current public bytes. Human consumer acceptance, representative performance/resilience, legacy deployment retirement, production Privacy Shield runtime acceptance, Anchor qualification, and Stable status remain separate.

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

The exact deployed/readback website candidate is `17303b6c7381faaa0e89ce6175ce24048fb56a12`. Current static-websites `main` is `9ae21cf12e276ea7e553fcf2573318602886428e`; later support-documentation and test-restoration changes did not change the public Privacy route bytes.

For candidate `17303b6c7381faaa0e89ce6175ce24048fb56a12`:

- repository and main-site validation passed;
- isolated-artifact, responsive/interaction, and privacy/security validation passed;
- all eleven canonical HTML routes matched production byte-for-byte;
- total compared canonical HTML was 115,559 bytes;
- the 404 body plus Glaze and Mesh SVG assets also matched source; and
- the authoritative website consumer record reports `deployed-readback-verified`.

For Privacy Center specifically, `/privacy/` matched `sites/main/privacy/index.html` exactly at 10,154 bytes using source blob `40d4bcb1f8fc1e53bbbcde15f151ce1027157f96`.

The shared website consumer record is `pending-human-acceptance`. Owner visual, keyboard, assistive-technology, representative performance/resilience, and final production consumer approval remain pending. Source rollback reversibility is verified through Git history.

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

The Privacy Center Glaze gate therefore remains **blocked** for Privacy Shield Version 2.0 even though source migration, machine validation, deployment, and canonical readback are complete.
