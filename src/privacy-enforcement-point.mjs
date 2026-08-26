import { PrivacyDecision } from "./privacy-decision-point.mjs";
import { createPrivacyReceipt } from "./privacy-evidence.mjs";

export class PrivacyEnforcementPoint {
  constructor({ decisionPoint, capabilityAuthority, evidenceLedger }) {
    if (!decisionPoint || !capabilityAuthority || !evidenceLedger) {
      throw new TypeError("Privacy Enforcement Point requires decisionPoint, capabilityAuthority, and evidenceLedger");
    }
    this.decisionPoint = decisionPoint;
    this.capabilityAuthority = capabilityAuthority;
    this.evidenceLedger = evidenceLedger;
  }

  authorize(request, { capability_ttl_seconds = 300, replay_policy = "reusable" } = {}) {
    const decision = this.decisionPoint.evaluate(request);
    let token = null;
    let claims = null;

    if (decision.outcome === PrivacyDecision.ALLOW || decision.outcome === PrivacyDecision.ALLOW_WITH_CONSTRAINTS) {
      const effectiveTtl = decision.max_capability_ttl_seconds
        ? Math.min(capability_ttl_seconds, decision.max_capability_ttl_seconds)
        : capability_ttl_seconds;
      token = this.capabilityAuthority.issue({
        decision_id: decision.decision_id,
        request_id: request.request_id,
        requester_id: request.requester.id,
        resource_id: request.resource.id,
        purpose: request.purpose,
        operation: request.operation,
        processing_zone: decision.processing_zone,
        destination: request.destination,
        retention_mode: decision.retention?.mode ?? "none"
      }, { ttl_seconds: effectiveTtl, replay_policy });
      claims = this.capabilityAuthority.verify(token);
      decision.capability_token_reference = claims.jti;
    }

    const evidence = this.evidenceLedger.record({ request, decision, capability: claims });
    const receipt = decision.obligations?.includes("generate_privacy_receipt")
      ? createPrivacyReceipt({ request, decision, evidence })
      : null;

    return { decision, capability_token: token, evidence, receipt };
  }

  constraintsFor(claims) {
    return {
      processing_zone: claims.processing_zone,
      destination: claims.destination,
      retention_mode: claims.retention_mode
    };
  }

  enforce(token, expected) {
    const claims = this.capabilityAuthority.verify(token, expected);
    return { authorized: true, claims, constraints: this.constraintsFor(claims) };
  }

  enforceOnce(token, expected) {
    const claims = this.capabilityAuthority.consume(token, expected);
    return { authorized: true, claims, constraints: this.constraintsFor(claims) };
  }

  revokeCapability(tokenOrJti) {
    return this.capabilityAuthority.revoke(tokenOrJti);
  }
}
