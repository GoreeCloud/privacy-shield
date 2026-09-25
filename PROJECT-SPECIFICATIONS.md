# GoreeCloud Privacy Shield — Project Specifications

**Repository:** `GoreeCloud/privacy-shield`  
**Project type:** First-party platform privacy, consent, minimization, transparency, lifecycle, and data-use authorization system  
**Lifecycle:** Development  
**Version:** `0.1` repository/platform-contract identity  
**License:** Mozilla Public License 2.0 (MPL-2.0); default secondary-license compatibility retained  
**User-facing surface:** Privacy Center  
**Current required Glaze UI target:** GLAZE UI V1.6 / `1.6.0`  
**Migration baseline:** `0ca65ca3152e4ab70da25e49fafe1e54b06cece8`  
**Canonical project record:** `PROJECT-RECORD.md`  
**Canonical authority:** This file becomes the long-lived project specification once accepted on the default branch.

## Migration and precedence

This file reconciles the active Google Drive **Project Specification — Privacy Shield.docx** (file ID `1RDKWArXibW7BuOAla416Uu4Tf3ZEFzyo`) with current repository authority.

The Drive source contains both normative requirements and extensive exact-revision Development history. Long-lived product requirements are consolidated here. Significant architecture, provider-governance, lifecycle, and migration history belongs in `PROJECT-RECORD.md`; detailed feature state and chronology remain in `IMPLEMENTED-FEATURES.md`, `PLANNED-FEATURES.md`, and `CHANGELOGS.md`.

Verified repository state controls current factual implementation claims. Historical Drive statements, older provider counts, former Glaze versions, candidate SHAs, or pre-integration branch state remain provenance and must not override accepted `main`.

## 1. Product role

Privacy Shield is GoreeCloud's platform-wide privacy authority for:
- consent;
- data-use authorization;
- purpose limitation;
- data minimization;
- retention and lifecycle obligations;
- privacy evidence and receipts;
- privacy transparency;
- user controls;
- privacy status;
- runtime-specific privacy capability contracts.

Privacy Center is the user-facing surface for understandable privacy state, decisions, controls, receipts, exceptions, and applicable explanations.

Privacy Shield is an enforced capability, not a visual badge. A component may claim a Privacy Shield capability only when the capability is actually implemented and accepted for the applicable runtime boundary.

## 2. Governing authorization principle

**Authorization travels with the operation—not merely with the identity requesting it.**

Authentication identifies an actor or service. It does not by itself authorize arbitrary data use.

The Privacy Decision Point evaluates a proposed operation against applicable:
- application declaration;
- policy;
- consent;
- purpose;
- processing zone;
- destination;
- retention mode;
- lifecycle obligations;
- capability scope;
- runtime/provider state.

Supported decision outcomes include:
- `ALLOW`;
- `DENY`;
- `ALLOW_WITH_CONSTRAINTS`;
- `REQUIRE_USER_DECISION`.

Constraints may only narrow authority already established by manifest, policy, consent, purpose, and runtime state. They must never broaden authority.

## 3. Distributed authority model

Privacy Shield is not a centralized privileged proxy.

The runtime that performs an operation remains responsible for technical execution. Privacy Shield supplies privacy authorization, evidence, shared contracts, and governed adapter boundaries.

Examples:
- Browser owns Firefox/Gecko-specific request interception and browser privacy execution.
- DNS owns DNS privacy-policy execution when an accepted adapter exists.
- Network owns privacy-relevant networking behavior when an accepted adapter exists.
- Applications own their storage/runtime implementation while using Privacy Shield for applicable authorization/evidence.
- Manager may consume bounded status but does not become privacy authority.
- Wardveil Security may provide security evidence and present bounded Privacy Shield state without replacing privacy authority.
- Everkeep consumes lifecycle obligations while retaining recovery/preservation authority.
- Identity authenticates actors/services without broadening privacy authority.
- Policy may supply policy decisions without becoming Privacy Shield consent or execution authority.
- Observability may receive minimized operational state only within an accepted contract.
- Mesh may transport minimized evidence with `authority_transfer=false`.

## 4. Privacy Decision and Enforcement Points

Privacy Shield should provide a first-party Privacy Decision Point and Privacy Enforcement Point.

The Decision Point must:
- evaluate declared operations against current privacy authority;
- fail closed on missing, invalid, stale, unsupported, or contradictory authority;
- preserve explicit reason codes and obligations;
- avoid manufacturing consent or capability state.

The Enforcement Point may issue or validate operation-bound capability material only within established authority.

A valid authorization decision must remain bound to the operation, resource/purpose scope, applicable identity, freshness, and lifecycle conditions.

## 5. Consent lifecycle

Consent must be:
- scoped;
- purpose-bound;
- understandable;
- revocable;
- expiration-aware;
- evidence-backed;
- fail-closed when state is unavailable or stale.

Where applicable, consent must support:
- grant;
- deny;
- revoke;
- expiration;
- session-scoped use;
- one-time use;
- supersession;
- exact authority-bearing identifiers;
- user-decision requirements.

Durable production consent state must not depend on volatile process memory or an unaccepted single-host development store.

## 6. Operation-bound capabilities

Privacy Shield capability mechanisms may use signed operation-bound tokens or opaque references.

Capabilities must preserve:
- exact scope;
- purpose;
- destination/processing constraints;
- expiration;
- signing-key identity where applicable;
- replay policy;
- revocation;
- rotation;
- retirement;
- fail-closed verification.

A capability does not grant more authority than the decision/consent/policy state from which it was derived.

Reusable secrets, private signing material, raw capability bodies, and full tokens must not be exposed through ordinary status, evidence, logs, or documentation.

## 7. Purpose and processing-zone integrity

Processing-zone and purpose names must be canonical, validated, and controlled by current Privacy Shield authority.

Inherited, caller-invented, stale, or unsupported processing-zone names must not silently become accepted authorization vocabulary.

Purpose/zone/destination/retention policy must remain exact enough for downstream enforcement and evidence review.

## 8. Privacy evidence and receipts

Privacy Shield should produce minimized evidence sufficient to explain:
- what decision occurred;
- why;
- which obligations applied;
- relevant freshness;
- bounded authority provenance;
- resulting user-visible receipt/state where appropriate.

Privacy receipts must not become a reason to retain private payloads.

Evidence should prefer:
- bounded derived state;
- reason codes;
- obligations;
- timestamps/freshness;
- opaque references;
- content-addressed digests where useful.

Evidence must avoid raw browsing history, DNS history, network flows, message bodies, files, prompts, retrieved document contents, credentials, full capability tokens, or similarly sensitive payloads unless an explicit protected requirement justifies them.

## 9. Data minimization and local-first operation

Privacy Shield must prefer local-first and minimum-necessary processing.

Routine privacy status, dashboards, coordination, and evidence must not collect private activity merely for presentation.

Remote tracker learning, remote tracker telemetry, advertising, profiling, or mandatory remote analysis are not default Privacy Shield requirements.

Every data flow should be justified by purpose, scope, retention, destination, and authority.

## 10. Browser privacy capability

GoreeCloud Browser remains a privileged runtime for Browser-specific Privacy Shield behavior.

Applicable Browser responsibilities may include:
- native ad/tracker request blocking;
- behavioral tracker protection;
- tracking-parameter cleanup;
- reviewed local-resource substitution;
- per-site exceptions;
- understandable protection reporting;
- native privacy controls.

Browser-specific runtime acceptance remains separate from portable Privacy Shield source validation.

Privacy Shield must not weaken Firefox/Gecko Safe Browsing, TLS/certificate validation, sandboxing, process isolation, site permissions, or update authority.

## 11. Runtime adapters

Every runtime adapter must declare an exact supported capability set from the canonical Privacy Shield capability registry.

Draft or downstream candidates must not be promoted centrally merely because they declare compatibility.

Each adapter retains independent gates for:
- source implementation;
- contract conformance;
- identity/authentication;
- runtime behavior;
- security/privacy failure handling;
- evidence minimization;
- target-environment validation;
- production acceptance.

A global Privacy Shield badge or shared contract does not establish adapter acceptance.

## 12. Durable authorization state

Production privacy authority requires durable, fail-closed state for applicable:
- consent;
- policy;
- capability replay;
- revocation;
- evidence;
- lifecycle metadata.

Built-in memory and file stores may support Development, testing, migration, or bounded acceptance work but are not by themselves distributed production state authorities.

A production state provider must satisfy exact provider/deployment acceptance including, where applicable:
- durability;
- atomic transactions;
- concurrent/multi-writer correctness;
- distributed topology;
- isolation/access control;
- restart/conflict behavior;
- backup/restore;
- migration/rollback;
- observability;
- operational ownership;
- performance under the claimed load;
- failure/recovery behavior.

## 13. Signing-key custody

Production signing must use an accepted custody provider with controlled key generation, storage, use, rotation, retirement, and emergency revocation.

The Development in-memory signing provider is not production eligible.

Production custody acceptance must cover:
- secure generation;
- non-exportability where required;
- caller authorization;
- producer identity binding;
- supported algorithm;
- rotation;
- retirement;
- emergency revocation;
- stale/untrusted key rejection;
- signing audit;
- outage/degraded behavior;
- recovery/continuity;
- access-control review;
- exact runtime integration;
- exact provider/version/deployment identity.

Raw signing secrets must never be stored in repository evidence.

## 14. Provider evaluation, selection, and acceptance

Provider governance has three separate states:

1. **Candidate evaluation** — evidence-backed and non-authorizing.
2. **Provider selection** — governed decision that may authorize bounded provider-specific implementation only.
3. **Production acceptance** — fresh exact-provider/exact-deployment evidence required before production use.

These stages must never be collapsed.

Provider evidence must remain:
- content-addressed where required;
- attributable to a governed review record;
- current/fresh;
- exact-provider and exact-scope;
- privacy-minimized;
- non-authorizing until the appropriate decision stage.

A failed evaluation must not be promoted because other criteria passed.

Billable/proprietary provider use requires any separate cost/order/exception governance before a purchase or production action.

## 15. Current provider boundary

Historical Drive records include evaluation work for FoundationDB self-hosted multi-host state and OVHcloud KMS HSM-backed signing.

Those evaluations are provenance, not permanent selections.

At the migration baseline:
- no provider is production-authorized merely because it appears in historical evidence;
- provider selection remains governed and explicit;
- current acceptance must be read from repository evaluation/decision/acceptance records;
- no production database, KMS/HSM, Vault, PKCS#11 device, topology, credential, or signing secret may be inferred from Development source.

## 16. Privacy Center

Privacy Center should make privacy authority understandable without collecting private activity for the UI itself.

Applicable surfaces may present:
- decisions;
- consent state;
- receipts;
- exceptions;
- purposes;
- lifecycle/retention obligations;
- runtime capability status;
- unavailable/stale/unaccepted state;
- user controls.

UI state must remain evidence-backed and must not visually promote Development or stale state to accepted privacy authority.

## 17. Glaze UI

The current required shared design-system target is GLAZE UI V1.6 / `1.6.0`.

Historical Privacy Center Glaze UI 2.1.0 source/deployment evidence remains provenance only.

A current Glaze claim requires a separately reviewed exact-revision migration and application-specific acceptance covering applicable:
- rendering;
- responsiveness;
- accessibility;
- resilience;
- large text/reflow;
- interaction;
- performance;
- rollback;
- current consumer acceptance.

Glaze UI presents privacy truth but cannot create or upgrade it.

## 18. Security and authority separation

Privacy Shield does not replace:
- Wardveil Security;
- GoreeCloud Identity;
- VPN/private networking;
- DNS;
- firewalls;
- malware scanning;
- vulnerability management;
- authentication;
- backup/recovery.

Security evidence may constrain privacy decisions but does not replace privacy authority.

Privacy evidence must not expose reusable secrets, credentials, private keys, or raw sensitive content.

## 19. Integral Platform Systems

Privacy Shield must evaluate exactly the nine Integral Platform Systems. The repository currently retains Contract 0.4 semantics pending an explicit evidence-backed migration to canonical Platform Contract 2.0; lifecycle values must not be mechanically translated:

- GoreeCloud Manager;
- Privacy Shield;
- Wardveil Security;
- Everkeep;
- Glaze UI;
- GoreeCloud Mesh;
- GoreeCloud Identity;
- GoreeCloud Policy;
- GoreeCloud Observability.

Privacy Shield itself may be `not-applicable-justified` for a Privacy-Shield-to-Privacy-Shield integration because this repository implements that authority.

GoreeCloud Sync remains separately governed and is not a tenth Integral Platform System.

Source adoption or documentation alone does not establish runtime/system acceptance.

## 20. Manager, Mesh, Identity, Policy, and Observability

### Manager
Manager may consume privacy-safe read-only state. It must not receive raw private activity or become privacy authority.

### Mesh
Mesh may transport minimized privacy evidence and registry state with authority transfer disabled. Production use requires accepted delivery/authentication.

### Identity
Identity supplies authenticated actor/service state. Privacy Shield must use narrowly scoped credentials and preserve independent data-use authorization.

### Policy
Policy decisions may inform Privacy Shield decisions. A Policy `allow` is not automatically Privacy Shield consent, capability, or execution authority.

### Observability
Operational signals must be privacy-minimized. Live authenticated publication, retention, freshness/completeness, alerting, and production acceptance remain separately governed.

## 21. Everkeep and recovery

Everkeep is the resilience/preservation authority for applicable backup, restore, export, deletion, retention, and succession effects.

Privacy Shield production dependence requires accepted recovery for authorization state.

Restore must preserve:
- consent semantics;
- policy state;
- replay/revocation integrity;
- evidence integrity;
- version/migration compatibility.

Backup existence alone does not prove recovery.

## 22. Failure behavior

Privacy authority must fail closed when required state is:
- missing;
- malformed;
- stale;
- future-dated where disallowed;
- revoked;
- unsupported;
- untrusted;
- mismatched to provider/deployment;
- ambiguous;
- inconsistent;
- unavailable.

Unknown, stale, degraded, unsupported, unaccepted, and unavailable must remain distinguishable from accepted/allowed.

## 23. Production acceptance

Production acceptance is runtime- and capability-specific.

Source tests, CI, UI deployment, contract validation, provider evaluation, branding, or documentation do not independently authorize production data use.

Production acceptance requires exact evidence for the claimed runtime/provider/deployment/capability boundary, including applicable:
- identity/authentication;
- privacy enforcement;
- durable state;
- key custody;
- failure behavior;
- recovery;
- minimization;
- policy;
- provider acceptance;
- runtime tests;
- target environment;
- rollback.

Privacy Shield remains Development until governed lifecycle authority says otherwise.

## 24. Current accepted source boundary

Current `main` includes substantial Development source foundations including:
- Browser privacy core and contracts;
- PDP/PEP authorization path;
- policy intersection;
- consent lifecycle foundations;
- operation-bound capability controls;
- evidence/receipt foundations;
- bounded durable single-host state;
- provider evaluation/selection/acceptance governance;
- provider evidence packaging/review boundaries;
- external access-control assessment integrity;
- Mesh and Platform Registry delivery source boundaries;
- Policy v1 source request/decision contracts;
- Observability v1 privacy-minimized signal construction;
- repository-native feature/change governance.

These capabilities do not establish overall platform production acceptance.

## 25. Current open acceptance boundary

Open work includes, as applicable:
- accepted production distributed state;
- accepted production signing-key custody;
- accepted Everkeep recovery;
- deployed Identity issuance/JWKS trust and credential lifecycle;
- live Mesh delivery;
- current Glaze UI 1.6.0 Privacy Center migration/acceptance;
- compiled Browser runtime acceptance;
- DNS/Network/application adapter acceptance;
- Policy live decision exchange/freshness/obligations/enforcement;
- Observability live producer/publication/retention/alerting acceptance;
- target failure-mode and recovery evidence;
- explicit production approval;
- any future release/Stable qualification.

## 26. Documentation governance

Repository authority is separated deliberately:

- `PROJECT-SPECIFICATIONS.md` — long-lived product requirements.
- `PROJECT-RECORD.md` — significant project decisions/history.
- `IMPLEMENTED-FEATURES.md` — verified implemented source capability inventory.
- `PLANNED-FEATURES.md` — open/planned/acceptance obligations.
- `CHANGELOGS.md` — meaningful implementation/governance chronology.
- `goreecloud.platform.yaml` — machine-readable platform/conformance state.
- provider evaluation/decision/acceptance records — exact provider authority.

Historical Drive documents are migration inputs and must not remain a competing project specification after accepted migration/readback.

## 27. Maintenance principle

Privacy Shield must remain understandable, portable, privacy-minimized, fail-closed, and replaceable at each dependency boundary.

Do not:
- manufacture consent;
- infer production provider acceptance;
- turn identity into privacy authority;
- collect private content for dashboards;
- collapse provider evaluation into selection;
- collapse selection into production acceptance;
- present Development source as production privacy truth.
