import assert from "node:assert/strict";
import test from "node:test";
import { ConsentAuthority } from "../src/consent-authority.mjs";
import { PrivacyDecision, PrivacyDecisionPoint } from "../src/privacy-decision-point.mjs";
import { PrivacyPolicyStore } from "../src/privacy-policy-store.mjs";

function request() { return { request_id:"live-1", requester:{id:"app.notes",type:"app"}, resource:{id:"note:1",classification:"documents"}, operation:"read", purpose:"summarize", processing_zone:"local", destination:"app.notes", retention:{mode:"none"}, external_disclosure:false }; }
function manifests() { return new Map([["app.notes",{resources:[{resource:"note:1",purposes:["summarize"],operations:["read"],processing_zones:["local"],destinations:["app.notes"]}]}]]); }

test("PDP observes consent revocation without manual state refresh", () => {
  const consentAuthority=new ConsentAuthority(); consentAuthority.put({requester_id:"app.notes",resource_id:"note:1",purpose:"summarize",processing_zones:["local"],destinations:["app.notes"]});
  const pdp=new PrivacyDecisionPoint({manifests:manifests(),consentAuthority});
  assert.equal(pdp.evaluate(request()).outcome,PrivacyDecision.ALLOW);
  consentAuthority.revoke({requester_id:"app.notes",resource_id:"note:1",purpose:"summarize"});
  const denied=pdp.evaluate({...request(),request_id:"live-2"}); assert.equal(denied.outcome,PrivacyDecision.DENY); assert.equal(denied.reason_code,"CONSENT_REVOKED");
});

test("PDP observes active policy changes without reconstruction", () => {
  const consentAuthority=new ConsentAuthority(); consentAuthority.put({requester_id:"app.notes",resource_id:"note:1",purpose:"summarize"});
  const policyStore=new PrivacyPolicyStore(); policyStore.publish({policy_id:"notes",version:"1",rules:[]});
  const pdp=new PrivacyDecisionPoint({manifests:manifests(),consentAuthority,policyStore});
  assert.equal(pdp.evaluate(request()).outcome,PrivacyDecision.ALLOW);
  policyStore.publish({policy_id:"notes",version:"2",status:"draft",rules:[{id:"notes.block-summary",effect:"DENY",when:{purposes:["summarize"]}}]}); policyStore.activate("notes","2");
  const denied=pdp.evaluate({...request(),request_id:"live-3"}); assert.equal(denied.outcome,PrivacyDecision.DENY); assert.ok(denied.policy_references.includes("notes.block-summary"));
});
