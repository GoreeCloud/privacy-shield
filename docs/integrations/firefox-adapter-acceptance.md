# Privacy Shield Firefox Adapter Acceptance Evidence

**Status:** Accepted bounded Firefox-adapter evidence; does not satisfy compiled GoreeCloud Browser acceptance  
**Evidence repository:** `GoreeCloud/firefox-addons`  
**Current evidence repository main:** `cf4aef5bb5f1108f5964b39f57ba768ea3733236`  
**Accepted Firefox adapter release:** Privacy Shield `0.2.0` Stable  
**Release source revision:** `eb5e2ff4c439d290ac3f61dc73e9e90b49f3181b`

## Purpose

This record binds Privacy Shield Version 2.0 qualification to the verified standalone Firefox-adapter evidence that already exists in the canonical GoreeCloud Firefox monorepo. It deliberately keeps the separate compiled GoreeCloud Browser runtime gate fail closed.

The Firefox adapter and GoreeCloud Browser are different acceptance surfaces. A signed and accepted Firefox extension does not prove the behavior of a compiled GoreeCloud Browser binary, its native shell, its renderer/engine integration, or its application-level privacy controls.

## Verified Firefox adapter evidence

Current `GoreeCloud/firefox-addons` main retains the governed Privacy Shield 0.2.0 Stable release records.

The exact reviewed and signed release provenance is:

- source revision: `eb5e2ff4c439d290ac3f61dc73e9e90b49f3181b`;
- unsigned reviewed XPI SHA-256: `23287a50aa7615f422ac1cab8ed3d124f89df1c39fb0173db889c9d7fd2f46e7`;
- accepted target-acceptance record SHA-256: `ece8f510df497dee9fdcc08775d115dbea57f43506527c4805125da7915631ea`;
- Mozilla-signed XPI SHA-256: `c4d01e131fe4a18fdd7f0c13c22fd849f2e99d271fef43ca6cbb390430819b62`;
- signed evidence artifact ID: `10000415077`;
- signed evidence artifact archive SHA-256: `7471447807ec3469401652d9a3b28083c3cf461ab01bc03cc0a5c3d95cb910df`;
- Firefox add-on ID: `privacy-shield@goreecloud.com`;
- accepted human target environment: Firefox `155.0.1` on a Zorin OS laptop.

GitHub Actions run `34070682147` (`Privacy Shield Mozilla Signing`) completed successfully on the exact release source revision.

The retained release records state that the accepted Firefox adapter completed:

- deterministic packaging and exact unsigned-candidate digest binding;
- source privacy review;
- human target-environment review;
- real-Firefox runtime regression;
- popup quick-control acceptance;
- Strict / Compatible / Reset compatibility and recovery acceptance;
- forced Manifest V3 event-page wake recovery;
- Mozilla signing and signed-archive inspection;
- persistent signed-XPI installation;
- full same-profile Firefox restart without reinstalling the extension;
- post-restart protection checks.

## Qualification effect

This evidence closes the question of whether a bounded, signed GoreeCloud Privacy Shield Firefox adapter has accepted runtime evidence: it does.

It does **not** close Privacy Shield Version 2.0 gate `runtime-adapter-acceptance`, because the Version 2.0 gate requires exact compiled GoreeCloud Browser acceptance for the supported Browser runtime boundary.

The Firefox release records themselves explicitly exclude GoreeCloud Browser compiled-runtime acceptance from the 0.2.0 Stable decision.

Current `GoreeCloud/browser` source uses a CEF/Chromium desktop render path and remains Development with incomplete representative runtime, packaging, accessibility, security/privacy integration, artifact, rollback, and production acceptance. No exact compiled GoreeCloud Browser acceptance record is established by the Firefox add-on release.

Changing the Version 2.0 supported Browser runtime boundary is a release-critical scope change and must not be inferred from the existence of the Firefox adapter or the current CEF/Chromium Browser development path. Any such change requires separate governed candidate reconciliation.

## Authority boundary

This record grants no platform-wide Privacy Shield production authority, no GoreeCloud Browser production authority, no DNS/Network/application adapter acceptance, no Anchor promotion, and no Stable status for Privacy Shield Version 2.0.

It records verified partial evidence only.
