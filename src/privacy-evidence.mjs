import crypto from "node:crypto";

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export class PrivacyEvidenceLedger {
  constructor() {
    this.events = [];
  }

  record({ request, decision, capability = null, metadata = {} }) {
    const event = {
      evidence_id: decision?.evidence_reference ?? id("pse"),
      recorded_at: new Date().toISOString(),
      request_id: request?.request_id ?? null,
      decision_id: decision?.decision_id ?? null,
      requester_id: request?.requester?.id ?? null,
      resource_id: request?.resource?.id ?? null,
      purpose: request?.purpose ?? null,
      operation: request?.operation ?? null,
      processing_zone: decision?.processing_zone ?? request?.processing_zone ?? null,
      destination: request?.destination ?? null,
      outcome: decision?.outcome ?? null,
      reason_code: decision?.reason_code ?? null,
      policy_references: decision?.policy_references ?? [],
      obligations: decision?.obligations ?? [],
      capability_jti: capability?.jti ?? null,
      metadata
    };
    this.events.push(event);
    return structuredClone(event);
  }

  list({ request_id, requester_id, resource_id } = {}) {
    return this.events.filter(event =>
      (!request_id || event.request_id === request_id) &&
      (!requester_id || event.requester_id === requester_id) &&
      (!resource_id || event.resource_id === resource_id)
    ).map(structuredClone);
  }
}

export function createPrivacyReceipt({ request, decision, evidence }) {
  return {
    receipt_id: `psr_${crypto.randomUUID()}`,
    schema_version: 1,
    created_at: new Date().toISOString(),
    request_id: request.request_id,
    decision_id: decision.decision_id,
    evidence_id: evidence.evidence_id,
    requester: request.requester.id,
    resource: request.resource.id,
    purpose: request.purpose,
    operation: request.operation,
    outcome: decision.outcome,
    processing_zone: decision.processing_zone,
    destination: request.destination,
    retention: decision.retention,
    external_disclosure: Boolean(request.external_disclosure),
    policy_references: decision.policy_references,
    explanation: decision.reason_code
  };
}
