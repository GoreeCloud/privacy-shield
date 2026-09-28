import crypto from "node:crypto";
import { PrivacyPolicyEngine, policyConstraintViolation } from "./privacy-policy-engine.mjs";

export const PrivacyDecision = Object.freeze({
  ALLOW: "ALLOW",
  DENY: "DENY",
  ALLOW_WITH_CONSTRAINTS: "ALLOW_WITH_CONSTRAINTS",
  REQUIRE_USER_DECISION: "REQUIRE_USER_DECISION"
});

const ZONE_RANK = Object.freeze({ local: 0, private_goreecloud: 1, trusted_service: 2, external: 3 });
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function deny(request, reasonCode, policyReferences = []) { return { decision_id:id("psd"), request_id:request.request_id, outcome:PrivacyDecision.DENY, reason_code:reasonCode, effective_scope:null, permitted_operations:[], processing_zone:request.processing_zone, permitted_destinations:[], retention:{mode:"none"}, expires_at:null, consent_required:false, obligations:["record_privacy_evidence"], policy_references:policyReferences, max_capability_ttl_seconds:null, capability_token_reference:null, evidence_reference:id("pse") }; }
function requiresUserDecision(request, reasonCode, policyReferences = []) { return { decision_id:id("psd"), request_id:request.request_id, outcome:PrivacyDecision.REQUIRE_USER_DECISION, reason_code:reasonCode, effective_scope:request.resource?.scope??null, permitted_operations:[], processing_zone:request.processing_zone, permitted_destinations:[], retention:{mode:"none"}, expires_at:null, consent_required:true, obligations:["obtain_explicit_consent","record_privacy_evidence"], policy_references:policyReferences, max_capability_ttl_seconds:null, capability_token_reference:null, evidence_reference:id("pse") }; }
function validateRequest(request) { for (const key of ["request_id","requester","resource","operation","purpose","processing_zone","destination","retention"]) if (request?.[key]===undefined||request?.[key]===null) throw new TypeError(`Privacy Shield decision request is missing ${key}`); if (typeof request.processing_zone !== "string" || !Object.hasOwn(ZONE_RANK, request.processing_zone)) throw new TypeError("Unknown Privacy Shield processing zone"); }
function canonicalConsentText(value) { return typeof value==="string"&&value!==""&&value===value.trim()&&!/[\u0000-\u001F\u007F-\u009F]/.test(value); }
function validLegacyConsentList(value) { return value===undefined||(Array.isArray(value)&&value.every(canonicalConsentText)); }
function legacyConsentInvalid(consent) {
  if(!consent||typeof consent!=="object"||Array.isArray(consent))return true;
  const proto=Object.getPrototypeOf(consent);
  if(proto!==Object.prototype&&proto!==null)return true;
  for(const key of ["revoked","purpose","processing_zones","destinations","expires_at"]) {
    if(key in consent&&!Object.hasOwn(consent,key))return true;
  }
  if(consent.revoked!==undefined&&typeof consent.revoked!=="boolean")return true;
  if(consent.purpose!==undefined&&!canonicalConsentText(consent.purpose))return true;
  if(!validLegacyConsentList(consent.processing_zones)||!validLegacyConsentList(consent.destinations))return true;
  return false;
}

export class PrivacyDecisionPoint {
  constructor({ manifests = new Map(), consents = new Map(), consentAuthority = null, policies = [], policyStore = null } = {}) {
    this.manifests = manifests;
    this.consents = consents;
    this.consentAuthority = consentAuthority;
    this.policyStore = policyStore;
    this.policyEngine = policies instanceof PrivacyPolicyEngine ? policies : new PrivacyPolicyEngine(policies);
  }

  currentPolicyEngine() {
    return this.policyStore ? new PrivacyPolicyEngine(this.policyStore.activeRules()) : this.policyEngine;
  }

  resolveConsent(request) {
    if (this.consentAuthority) return this.consentAuthority.get({ requester_id: request.requester.id, resource_id: request.resource.id, purpose: request.purpose });
    const consentKey = request.consent_reference ?? `${request.requester.id}:${request.resource.id}:${request.purpose}`;
    return this.consents.get(consentKey);
  }

  evaluate(request) {
    validateRequest(request);
    const manifest=this.manifests.get(request.requester.id); if(!manifest)return deny(request,"MANIFEST_NOT_FOUND",["core.manifest-required"]);
    const declaration=manifest.resources?.find(entry=>entry.resource===request.resource.id||entry.resource===request.resource.classification); if(!declaration)return deny(request,"RESOURCE_NOT_DECLARED",["core.manifest-resource"]);
    if(!declaration.purposes?.includes(request.purpose))return deny(request,"PURPOSE_NOT_DECLARED",["core.purpose-limitation"]);
    if(!declaration.operations?.includes(request.operation))return deny(request,"OPERATION_NOT_DECLARED",["core.operation-scope"]);
    if(!declaration.processing_zones?.includes(request.processing_zone))return deny(request,"PROCESSING_ZONE_NOT_PERMITTED",["core.processing-zone"]);
    const manifestDestinations=declaration.destinations??[]; if(manifestDestinations.length&&!manifestDestinations.includes(request.destination))return deny(request,"DESTINATION_NOT_PERMITTED",["core.destination-limitation"]);
    if(request.external_disclosure&&ZONE_RANK[request.processing_zone]<ZONE_RANK.trusted_service)return deny(request,"EXTERNAL_DISCLOSURE_ZONE_MISMATCH",["core.external-disclosure"]);

    const policy=this.currentPolicyEngine().evaluate(request); if(policy.effect==="DENY")return deny(request,policy.reason_code,policy.policy_references); if(policy.effect==="REQUIRE_USER_DECISION")return requiresUserDecision(request,policy.reason_code,policy.policy_references); const policyViolation=policyConstraintViolation(policy,request); if(policyViolation)return deny(request,policyViolation,policy.policy_references);
    const consent=this.resolveConsent(request); if(consent===undefined||consent===null)return requiresUserDecision(request,"CONSENT_REQUIRED",["core.consent",...policy.policy_references]);
    if(!this.consentAuthority&&legacyConsentInvalid(consent))return deny(request,"CONSENT_INVALID",["core.consent",...policy.policy_references]);
    if(this.consentAuthority ? !this.consentAuthority.isEffective(consent) : consent.revoked===true)return deny(request,consent.revoked?"CONSENT_REVOKED":"CONSENT_EXPIRED",["core.consent",...policy.policy_references]);
    if(consent.expires_at!==undefined&&consent.expires_at!==null){
      const value=consent.expires_at;
      const canonical=typeof value==="string"&&value!==""&&value===value.trim()&&/(?:Z|[+-]\d{2}:\d{2})$/.test(value);
      const expiry=canonical?Date.parse(value):NaN;
      if(!Number.isFinite(expiry)||expiry<=Date.now())return deny(request,"CONSENT_EXPIRED",["core.consent",...policy.policy_references]);
    }
    if(consent.purpose&&consent.purpose!==request.purpose)return deny(request,"CONSENT_PURPOSE_MISMATCH",["core.purpose-limitation",...policy.policy_references]);
    if(consent.processing_zones&&!consent.processing_zones.includes(request.processing_zone))return deny(request,"CONSENT_ZONE_MISMATCH",["core.processing-zone",...policy.policy_references]);
    if(consent.destinations&&!consent.destinations.includes(request.destination))return deny(request,"CONSENT_DESTINATION_MISMATCH",["core.destination-limitation",...policy.policy_references]);

    const obligations=["record_privacy_evidence","generate_privacy_receipt",...policy.obligations]; let outcome=PrivacyDecision.ALLOW;
    if(request.processing_zone!=="local"||request.retention?.mode!=="none"||policy.effect==="CONSTRAIN"){outcome=PrivacyDecision.ALLOW_WITH_CONSTRAINTS;if(request.processing_zone!=="local"&&!obligations.includes("enforce_processing_zone"))obligations.push("enforce_processing_zone");if(request.retention?.mode!=="none"&&!obligations.includes("enforce_retention"))obligations.push("enforce_retention");}
    const policyDestinations=policy.constraints.allowed_destinations; const permittedDestinations=policyDestinations?policyDestinations.filter(destination=>!manifestDestinations.length||manifestDestinations.includes(destination)):manifestDestinations.length?manifestDestinations:[request.destination];
    return { decision_id:id("psd"), request_id:request.request_id, outcome, reason_code:outcome===PrivacyDecision.ALLOW?"AUTHORIZED":"AUTHORIZED_WITH_CONSTRAINTS", effective_scope:request.resource.scope??null, permitted_operations:[request.operation], processing_zone:request.processing_zone, permitted_destinations:permittedDestinations, retention:request.retention, expires_at:consent.expires_at??null, consent_required:false, obligations:[...new Set(obligations)], policy_references:["core.manifest","core.consent","core.purpose-limitation",...policy.policy_references], max_capability_ttl_seconds:policy.constraints.max_capability_ttl_seconds, capability_token_reference:null, evidence_reference:id("pse") };
  }
}
export { validateRequest };
