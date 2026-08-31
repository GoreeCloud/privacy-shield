# Privacy Center — Glaze UI 2.1 Adoption

Status: **Adoption Candidate**  
Target: **Glaze UI 2.1.0 Stable**  
Canonical Glaze UI release commit: `c49113eb8b93c267613fdf1bbca1f814495acad7`  
Canonical tag: `v2.1.0`

## Scope

This record maps the GoreeCloud Privacy Center public web surface to Glaze UI 2.1 Stable without changing Privacy Shield's privacy authority, consent authority, privacy-policy authority, data-minimization requirements, or runtime acceptance state.

Privacy Center is an administration/control surface. Its 2.1 material budget therefore keeps privacy content on solid **Surface** planes and uses **Soft Glaze** only for bounded persistent navigation chrome. Deep Glaze and Live Glaze are not required by this site.

## Consumed Stable 2.1 contract

- Canvas and Surface remain the content foundation.
- Persistent header/navigation may use `soft-glaze`; privacy explanations, privacy-state reporting, status cards, and relationship cards remain solid Surface content.
- General interactive targets retain a 48 px floor; Touch Assistance maps to a 56 px floor.
- Reduced Transparency and Forced Colors eliminate blur/translucency.
- Reduced Motion removes nonessential transforms/transitions and smooth scrolling.
- Increased Contrast strengthens boundaries and text-decoration cues.
- Browser zoom and large-text reflow preserve privacy content; layout collapses rather than hiding status or controls.
- Constrained/minimal performance states reduce or remove blur.
- Unsupported backdrop filtering falls back to solid/tonal surfaces.
- Safe-area and narrow-screen navigation remain operable without suppressing primary privacy sections.

## Repository-local mapping

`website/glaze-ui-2.1.0.css` is a Privacy Center-specific Stable subset mapped to the canonical Glaze UI 2.1 material/accessibility contracts. It is not represented as a byte-identical copy of the Glaze UI repository entrypoint.

`website/index.html` and `website/404.html` declare `goreecloud-glaze-ui=2.1.0`. `website/site.css` and `website/site-polish.css` remain Privacy Shield-owned product styling layered after the design-system subset.

The checked-in `website/dist` is part of the publication contract. Validation requires its committed bytes and file set to already match the current source build **before** the validator regenerates anything. A stale generated artifact therefore fails source validation rather than being silently repaired by the validation step.

## Authority boundary

Glaze UI standardizes presentation only. It cannot grant or revoke consent, create a privacy decision, strengthen a privacy-protected state, change retention/deletion policy, authorize privacy-changing execution, or turn GoreeCloud Mesh transport into Privacy Shield evidence.

## Acceptance boundary

Passing repository validation establishes source/build Adoption Candidate evidence only. It does **not** establish human Visual Excellence approval, branch-preview acceptance, production deployment acceptance, or production eligibility under the central Glaze UI consumer gate. Those remain independent evidence requirements.
