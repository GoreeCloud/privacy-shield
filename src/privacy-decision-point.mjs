import crypto from "node:crypto";

export const PrivacyDecision = Object.freeze({
  ALLOW: "ALLOW",
  DENY: "DENY",
  ALLOW_WITH_CONSTRAINTS: "ALLOW_WITH_CONSTRAINTS",
  REQUIRE_USER_DECISION: "REQUIRE_USER_DECISION"
});

const ZONE_RANK = Object.freeze({
  local: 0,
  private_goreecloud: 1,
  trusted_service: 2,
  external: 3
});

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function deny(request, reasonCode, policyReferences = []) {
  return {
    decision_id: id("psd"),
    request_id: request.request_id,
    outcome: PrivacyDecision.DENY,
    reason_code: reasonCode,
    effective_scope: null,
    permitted_operations: [],
    processing_zone: request.processing_zone,
    permitted_destinations: [],
    retention: { mode: "none" },
    expires_at: null,
    consent_required: false,
    obligations: ["record_privacy_evidence"],
    policy_references: policyReferences,
    capability_token_reference: null,
    evidence_reference: id("pse")
  };
}

function requiresUserDecision(request, reasonCode, policyReferences = []) {
  return {
    decision_id: id("psd"),
    request_id: request.request_id,
    outcome: PrivacyDecision.REQUIRE_USER_DECISION,
    reason_code: reasonCode,
    effective_scope: request.resource?.scope ?? null,
    permitted_operations: [],
    processing_zone: request.processing_zone,
    permitted_destinations: [],
    retention: { mode: "none" },
    expires_at: null,
    consent_required: true,
    obligations: ["obtain_explicit_consent", "record_privacy_evidence"],
    policy_references: policyReferences,
    capability_token_reference: null,
    evidence_reference: id("pse")
  };
}

function validateRequest(request) {
  const required = ["request_id", "requester", "resource", "operation", "purpose", "processing_zone", "destination", "retention"];
  for (const key of required) {
    if (request?.[key] === undefined || request?.[key] === null) {
      throw new TypeError(`Privacy Shield decision request is missing ${key}`);
    }
  }
  if (!(request.processing_zone in ZONE_RANK)) {
    throw new TypeError("Unknown Privacy Shield processing zone");
  }
}

export class PrivacyDecisionPoint {
  constructor({ manifests = new Map(), consents = new Map(), policies = [] } = {}) {
    this.manifests = manifests;
    this.consents = consents;
    this.policies = policies;
  }

  evaluate(request) {
    validateRequest(request);

    const manifest = this.manifests.get(request.requester.id);
    if (!manifest) {
      return deny(request, "MANIFEST_NOT_FOUND", ["core.manifest-required"]);
    }

    const declaration = manifest.resources?.find(entry => entry.resource === request.resource.id || entry.resource === request.resource.classification);
    if (!declaration) {
      return deny(request, "RESOURCE_NOT_DECLARED", ["core.manifest-resource"]);
    }

    if (!declaration.purposes?.includes(request.purpose)) {
      return deny(request, "PURPOSE_NOT_DECLARED", ["core.purpose-limitation"]);
    }

    if (!declaration.operations?.includes(request.operation)) {
      return deny(request, "OPERATION_NOT_DECLARED", ["core.operation-scope"]);
    }

    if (!declaration.processing_zones?.includes(request.processing_zone)) {
      return deny(request, "PROCESSING_ZONE_NOT_PERMITTED", ["core.processing-zone"]);
    }

    const permittedDestinations = declaration.destinations ?? [];
    if (permittedDestinations.length && !permittedDestinations.includes(request.destination)) {
      return deny(request, "DESTINATION_NOT_PERMITTED", ["core.destination-limitation"]);
    }

    if (request.external_disclosure && ZONE_RANK[request.processing_zone] < ZONE_RANK.trusted_service) {
      return deny(request, "EXTERNAL_DISCLOSURE_ZONE_MISMATCH", ["core.external-disclosure"]);
    }

    const consentKey = request.consent_reference ?? `${request.requester.id}:${request.resource.id}:${request.purpose}`;
    const consent = this.consents.get(consentKey);
    if (!consent) {
      return requiresUserDecision(request, "CONSENT_REQUIRED", ["core.consent"]);
    }

    if (consent.revoked === true) {
      return deny(request, "CONSENT_REVOKED", ["core.consent"]);
    }

    if (consent.expires_at && Date.parse(consent.expires_at) <= Date.now()) {
      return deny(request, "CONSENT_EXPIRED", ["core.consent"]);
    }

    if (consent.purpose && consent.purpose !== request.purpose) {
      return deny(request, "CONSENT_PURPOSE_MISMATCH", ["core.purpose-limitation"]);
    }

    if (consent.processing_zones && !consent.processing_zones.includes(request.processing_zone)) {
      return deny(request, "CONSENT_ZONE_MISMATCH", ["core.processing-zone"]);
    }

    if (consent.destinations && !consent.destinations.includes(request.destination)) {
      return deny(request, "CONSENT_DESTINATION_MISMATCH", ["core.destination-limitation"]);
    }

    const obligations = ["record_privacy_evidence", "generate_privacy_receipt"];
    let outcome = PrivacyDecision.ALLOW;

    if (request.processing_zone !== "local" || request.retention?.mode !== "none") {
      outcome = PrivacyDecision.ALLOW_WITH_CONSTRAINTS;
      obligations.push("enforce_processing_zone", "enforce_retention");
    }

    return {
      decision_id: id("psd"),
      request_id: request.request_id,
      outcome,
      reason_code: outcome === PrivacyDecision.ALLOW ? "AUTHORIZED" : "AUTHORIZED_WITH_CONSTRAINTS",
      effective_scope: request.resource.scope ?? null,
      permitted_operations: [request.operation],
      processing_zone: request.processing_zone,
      permitted_destinations: permittedDestinations.length ? permittedDestinations : [request.destination],
      retention: request.retention,
      expires_at: consent.expires_at ?? null,
      consent_required: false,
      obligations,
      policy_references: ["core.manifest", "core.consent", "core.purpose-limitation"],
      capability_token_reference: id("psc"),
      evidence_reference: id("pse")
    };
  }
}

export { validateRequest };
