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

Current `GoreeCloud/static-websites` authoritative main at this reconciliation checkpoint is `d708ae383ae1f7abee649ead32fc1342320eaaf9`, merged from PR #128 exact candidate `3bd8c1671b271949a6bc69e082c7223703b20f76`.

That exact PR candidate passed:

- Validate static website repository — run `35954891536`;
- Validate main GoreeCloud website — run `35954891637`;
- Verify main GoreeCloud production deployment — run `35954891626`.

Those checks establish exact-candidate repository/site/deployment verification for that website change. They do not transfer human Glaze UI consumer acceptance to later public bytes or establish Privacy Shield platform production acceptance.

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
