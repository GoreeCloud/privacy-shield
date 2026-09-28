# Privacy Center — Current Static-Site and Glaze UI Authority

**Status:** Current source-authority reconciliation  
**Privacy authority:** GoreeCloud Privacy Shield  
**Static-site repository:** `GoreeCloud/static-websites`  
**Current public website:** `https://www.goreecloud.com`  
**Current Privacy route:** `https://www.goreecloud.com/privacy/`  
**Current Glaze UI consumer target:** GLAZE UI V1.6 / `1.6.0`

## Current source authority

The current GoreeCloud public-web authority is the single retained website in `GoreeCloud/static-websites`. Its URL namespace identifies `sites/main/privacy/index.html` as the canonical `/privacy/` source. The former standalone `sites/privacy` package and the `GoreeCloud/privacy-shield/website` copy are migration/retirement or legacy deployment material, not current public-site source authority.

The current canonical Privacy route declares:

- `data-glaze-version="1.6.0"`;
- `goreecloud-glaze-ui=1.6.0`;
- consumer state `migration-candidate-unaccepted`;
- the GoreeCloud Privacy Shield canonical identity;
- explicit separation between Privacy Shield privacy authority and application/service runtime authority.

This establishes current source adoption of the shared Stable Glaze UI `1.6.0` target for the canonical Privacy Center route. It does not establish downstream consumer acceptance, production Privacy Shield runtime acceptance, or Stable qualification.

## Exact repository evidence

Current `GoreeCloud/static-websites` authoritative main at this reconciliation checkpoint is `5d05997e2759989db7018e91e8a7a017acfde1d4`. The canonical `sites/main/privacy/index.html` blob is `b00a52523efcb4cfb9ba4cfa081706a62dade117` and still declares Glaze UI `1.6.0` with consumer state `migration-candidate-unaccepted`.

Current static-websites main `5d05997e2759989db7018e91e8a7a017acfde1d4` has successful `retained-public-site` and `Cloudflare Pages` checks. Historical PR #128 candidate `3bd8c1671b271949a6bc69e082c7223703b20f76` and its repository/main-site/production-deployment checks remain provenance for the original V1.6 source migration, but they do not validate later website commits by inheritance.

The current checks establish that the present canonical source and Pages integration are non-failing at this revision. They do not transfer human Glaze UI consumer acceptance, establish Privacy Shield runtime production acceptance, or authorize privacy behavior.

The website's retained Glaze UI V1.6 consumer-acceptance record remains exact-revision scoped and currently requires fresh human acceptance for the current public presentation. Historical accepted revisions remain historical evidence only.

## Legacy Privacy Shield website copy

`GoreeCloud/privacy-shield/website` remains a protected legacy/transitional deployment copy and intentionally retains its historical Glaze UI 2.1.0 source/build validator while that legacy contract exists. It must not be relabeled as a V1.6 implementation without actually rebuilding and accepting those bytes.

The current Privacy Shield Platform Contract must therefore distinguish:

1. **Canonical Privacy Center source:** V1.6 / 1.6.0 in `GoreeCloud/static-websites/sites/main/privacy/index.html`.
2. **Legacy/transitional copy:** historical 2.1.0 source in this repository.
3. **Consumer acceptance:** still migration-required until exact-current rendered, accessibility, performance/resilience, rollback, and human acceptance obligations are satisfied.
4. **Privacy Shield runtime/production acceptance:** separate and unaffected by website presentation state.

## Authority boundary

Glaze UI is presentation authority only. A source migration, rendered website, successful deployment check, favorable visual state, or consumer record cannot create consent, authorize data use, upgrade privacy evidence, grant a runtime capability, or establish Privacy Shield production acceptance.
