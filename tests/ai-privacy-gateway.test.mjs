import assert from "node:assert/strict";
import test from "node:test";
import { AIPrivacyGateway } from "../src/ai-privacy-gateway.mjs";
import { PrivacyCapabilityAuthority } from "../src/capability-token.mjs";
import { ConsentAuthority } from "../src/consent-authority.mjs";
import { PrivacyDecisionPoint } from "../src/privacy-decision-point.mjs";
import { PrivacyEnforcementPoint } from "../src/privacy-enforcement-point.mjs";
import { PrivacyEvidenceLedger } from "../src/privacy-evidence.mjs";

function build(){ const consents=new ConsentAuthority(); consents.put({requester_id:"goreecloud.ai",resource_id:"drive:project-alpha",purpose:"answer-current-conversation",processing_zones:["local"],destinations:["goreecloud.ai"]}); const manifests=new Map([["goreecloud.ai",{resources:[{resource:"drive:project-alpha",purposes:["answer-current-conversation"],operations:["read"],processing_zones:["local"],destinations:["goreecloud.ai"]}]}]]); const pdp=new PrivacyDecisionPoint({manifests,consentAuthority:consents}); const pep=new PrivacyEnforcementPoint({decisionPoint:pdp,capabilityAuthority:new PrivacyCapabilityAuthority("0123456789abcdef0123456789abcdef"),evidenceLedger:new PrivacyEvidenceLedger()}); return new AIPrivacyGateway({enforcementPoint:pep}); }
function request(){return{request_id:"ai-1",requester:{id:"goreecloud.ai",type:"ai"},resource:{id:"drive:project-alpha",classification:"documents"},operation:"read",purpose:"answer-current-conversation",processing_zone:"local",destination:"goreecloud.ai",retention:{mode:"none"},external_disclosure:false};}

test("AI retrieval is scoped to approved model, zone and temporary single-use context",()=>{ const gateway=build(); const result=gateway.authorizeRetrieval({request:request(),model:{id:"ollama.local",processing_zone:"local",provider_type:"local"},conversation_id:"conversation-1",allowed_models:["ollama.local"]}); assert.ok(result.capability_token); assert.equal(result.context.no_training,true); assert.equal(gateway.consumeRetrieval(result.context.context_id).enforcement.authorized,true); assert.throws(()=>gateway.consumeRetrieval(result.context.context_id),/CAPABILITY_ALREADY_CONSUMED/); const disposed=gateway.disposeContext(result.context.context_id); assert.equal(disposed.disposed,true); assert.equal(disposed.capability_token,null); assert.throws(()=>gateway.consumeRetrieval(result.context.context_id),/AI_CONTEXT_DISPOSED/); });

test("AI gateway rejects unapproved model or processing-zone expansion",()=>{ const gateway=build(); assert.throws(()=>gateway.authorizeRetrieval({request:request(),model:{id:"external.model",processing_zone:"local",provider_type:"approved_external"},conversation_id:"c",allowed_models:["ollama.local"]}),/AI_MODEL_NOT_AUTHORIZED/); assert.throws(()=>gateway.authorizeRetrieval({request:request(),model:{id:"ollama.local",processing_zone:"external",provider_type:"local"},conversation_id:"c",allowed_models:["ollama.local"]}),/AI_MODEL_PROCESSING_ZONE_MISMATCH/); });
