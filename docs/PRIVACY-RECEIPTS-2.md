# Privacy Shield 2.0 — Privacy Receipts, Explanations, and Preview

**Lifecycle:** Development source candidate  
**Roadmap:** FR-008  
**Authority boundary:** Receipts and previews explain Privacy Shield decisions; they do not create, widen, or transfer authorization.

## Purpose

Privacy Receipts 2.0 provide a minimized, evidence-bound record of a significant Privacy Shield decision without retaining the private content involved in that decision. The same source slice also provides deterministic explanations and a non-authorizing decision-preview surface.

This implementation does not establish production receipt persistence, production signing-key custody, application/runtime adoption, or Privacy Center acceptance.

## Receipt contract

The canonical source contract is `goreecloud.privacy-shield.privacy-receipt.v2`.

A receipt binds to the exact request ID, decision ID, evidence ID, evidence digest, and evidence timestamp. Receipt construction fails closed when the evidence does not bind to the same request and decision or when the evidence timestamp is future-dated relative to receipt creation.

Authority- and provenance-bearing receipt strings are exact-bound rather than silently normalized. Required identifiers reject leading/trailing whitespace, control characters, empty values, and oversized values. Evidence, retention, consent, and decision timestamps must be explicit timezone-qualified timestamps; timezone-ambiguous local timestamps are rejected rather than interpreted implicitly.

Receipts contain only bounded privacy metadata needed to explain the decision:

- requesting application or service identity;
- data classification when the request supplies one;
- declared purpose and operation;
- decision outcome and reason code;
- processing-zone and destination **classification**, not the raw destination;
- retention obligation;
- decision obligations and policy references;
- minimized consent basis when supplied;
- explicitly supplied lifecycle obligations;
- evidence ID, digest, timestamp, and measured age;
- expiration when established by the decision or consent basis; and
- a deterministic explanation derived from the same bound decision/evidence.

The receipt deliberately does not copy resource IDs, raw destinations, prompts, document/file/message content, credentials, tokens, cookies, browsing or DNS history, network-flow payloads, or arbitrary request context.

## Receipt persistence

`PrivacyReceiptLedger` writes receipts through the injected Privacy Shield state-provider boundary under the `privacy_receipt` namespace. This means receipt durability is exactly the durability of the selected state provider.

The default memory provider remains development-only. The single-host file provider and any future distributed provider retain their independent production-acceptance requirements. FR-008 does not promote a state provider or establish production persistence.

## Receipt signatures

The compatibility helper retains HMAC-SHA256 signing for development/source validation and marks that signature profile `development-only`.

Production receipt signing must use the governed Privacy Shield production signing-key provider and its independently accepted custody, rotation, revocation, trust, and audit evidence. A development HMAC receipt is not production signing evidence.

## Explainable decisions

`buildPrivacyExplanation()` derives its outcome, reason code, purpose, processing zone, destination classification, retention, obligations, and policy references from the evaluated Privacy Shield decision and request. For non-preview explanations, the function requires evidence bound to the same request and decision.

The human-readable message is selected deterministically from the actual reason code, with a generic outcome-level fallback for reason codes that do not yet have a specialized explanation string. Privacy Center must not replace these evidence-derived facts with a more favorable claim.

## Decision preview

`previewPrivacyDecision()` evaluates a request for explanation only and returns `goreecloud.privacy-shield.decision-preview.v1`.

Every preview is explicitly marked:

- `authorization_effect: false`;
- `records_evidence: false`;
- `creates_capability: false`;
- `consumes_consent: false`; and
- `requires_runtime_re_evaluation: true`.

The preview strips runtime decision IDs, capability references, evidence references, exact destination values, and private request payloads. Even an `ALLOW` preview cannot be used as execution authority. The runtime must evaluate the operation again through the normal authorization/enforcement path.

## Current acceptance boundary

This FR-008 source slice is not proof of:

- real user consent;
- production state-provider durability;
- production receipt signing;
- Privacy Center UI adoption;
- application/runtime adoption;
- external receipt export or portability;
- production acceptance; or
- Stable qualification.

Those remain separately governed evidence and acceptance gates.
