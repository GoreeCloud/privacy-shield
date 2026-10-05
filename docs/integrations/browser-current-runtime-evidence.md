# GoreeCloud Browser current CEF evidence — Privacy Shield FR-013 support

**Observed Browser source:** `95d92a89f09a64c079b2a5b8077e82db955dfb74`  
**Browser source tree:** `09c16bce62837018950993da083dc0343d5641c1`  
**Browser repository:** `GoreeCloud/browser`  
**Evidence role:** Supporting Development evidence only; not a Privacy Shield Browser runtime-acceptance record.

## Exact current runtime evidence

Browser Core CI run `37355677044` / #891 passed on the exact source revision above.

Its Linux CEF render lane successfully completed:

- exact-source checkout and revision verification;
- pinned CEF bootstrap and render-capable build;
- render-candidate runtime payload verification;
- staged installed-runtime launch;
- private-only startup without materializing the normal persistent profile;
- sandboxed CEF launch under Xvfb;
- bounded renderer-crash recovery;
- windowless page pixels, custom/standard cursors, pointer input, and context menu;
- windowless popup rendering;
- direct keyboard and non-conflicting Control input;
- clipboard shortcuts;
- bounded external text and safe-web-link delivery while rejecting local file URIs;
- GTK IME commit.

The pinned runtime remains:

- CEF `152.0.6+g708dc14+chromium-152.0.7977.83`;
- Chromium `152.0.7977.83`;
- pinned CEF minimal archive SHA-256 `daf8c2b6e63787d6a91d666205a8a4521419937eabaf47723738c86aea7135bd`.

Security Evidence run `37355676946` / #336 passed on the same Browser source and retained artifact `11365065113`, digest `sha256:c5a30e73976235dc74343458853cbfd4a32f0f410165a2225a706d0f91afdbf5`. That artifact contains exact-source security evidence; it is not the compiled Browser binary required by FR-013.

## Privacy-relevant source/runtime improvements since the older representative checkpoint

Current Browser source includes two material privacy-safety improvements:

1. Private-only startup defers creation of the normal persistent engine context. Browser-owned private sessions use non-persistent request contexts, and session teardown closes every Browser window bound to the session before destroying its ephemeral engine context.
2. CEF cleanup reporting fails closed. Unsupported aggregate site-data classes and unsupported origin-scoped authentication/permission cleanup do not report successful deletion.

These improvements strengthen supporting evidence for the `private-browsing-isolation`, `failure-modes`, and `engine-boundary` dimensions, but they do not make those dimensions accepted under the strict Privacy Shield evaluator.

## FR-013 dimension status

The strict Privacy Shield record still requires all ten dimensions to be independently evidenced as passed against one exact compiled Browser artifact.

| Dimension | Current evidence status |
| --- | --- |
| content-blocking | Open — no exact accepted compiled-artifact evidence set. |
| tracking-resistance | Open — no exact accepted compiled-artifact evidence set. |
| url-cleaning | Open — no exact accepted compiled-artifact evidence set. |
| privacy-status | Partial/source-level — Browser status surfaces exist, but no strict exact-artifact acceptance. |
| user-visible-exceptions | Open — no strict exact-artifact acceptance. |
| private-browsing-isolation | Improved supporting evidence; still incomplete because engine-level cookie/site-data/permission/authentication purge, private clipboard isolation, Close & Forget, and representative privacy acceptance remain open. |
| local-substitution | Open — no strict exact-artifact acceptance. |
| failure-modes | Improved supporting evidence from fail-closed cleanup reporting and bounded renderer-crash recovery; strict dimension acceptance remains absent. |
| accessibility-status-accuracy | Open — no strict exact-artifact acceptance. |
| engine-boundary | Improved supporting evidence from exact pinned CEF build/runtime exercises; strict dimension acceptance remains absent. |

## Acceptance boundary

Core #891 did not retain a governed compiled Browser binary with the exact SHA-256 and size required by `privacy-shield.browser-runtime-acceptance.v1`.

No record currently satisfies all of the following simultaneously:

- exact compiled Browser binary identity;
- ten passed dimension-level evidence sets;
- evidence freshness;
- independent review authority and accepted-for-runtime disposition;
- exact expected evidence-set binding.

Therefore this record cannot pass `runtime-adapter-acceptance`, cannot authorize production, cannot transfer Privacy Shield authority, and cannot establish Anchor or Stable status.
