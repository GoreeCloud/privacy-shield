import assert from "node:assert/strict";
import test from "node:test";
import { MemoryPrivacyStateStore } from "../src/privacy-state-store.mjs";
import { PrivacyEvidenceLedger, createPrivacyReceipt, verifyPrivacyReceipt } from "../src/privacy-evidence.mjs";

function input(n) { return { request:{request_id:`req-${n}`,requester:{id:"app.notes"},resource:{id:`note:${n}`},purpose:"summarize",operation:"read",destination:"local",external_disclosure:false}, decision:{decision_id:`dec-${n}`,evidence_reference:`pse-${n}`,outcome:"ALLOW",reason_code:"AUTHORIZED",processing_zone:"local",retention:{mode:"none"},policy_references:[],obligations:[]} }; }

test("evidence records form a verifiable hash chain",()=>{ const ledger=new PrivacyEvidenceLedger(); ledger.record(input(1)); ledger.record(input(2)); const result=ledger.verifyIntegrity(); assert.equal(result.valid,true); assert.equal(result.count,2); assert.ok(result.head_hash); assert.equal(ledger.checkpoint().event_count,2); });

test("evidence mutation is detected",()=>{ const store=new MemoryPrivacyStateStore(); const ledger=new PrivacyEvidenceLedger({store}); const event=ledger.record(input(1)); store.set("evidence",event.evidence_id,{...event,purpose:"different-purpose"}); const result=ledger.verifyIntegrity(); assert.equal(result.valid,false); assert.equal(result.reason,"EVIDENCE_HASH_MISMATCH"); });

test("signed privacy receipt verifies and tampering fails",()=>{ const secret="0123456789abcdef0123456789abcdef"; const ledger=new PrivacyEvidenceLedger(); const data=input(1); const evidence=ledger.record(data); const receipt=createPrivacyReceipt({...data,evidence,signing_secret:secret}); assert.equal(receipt.schema_version,2); assert.equal(verifyPrivacyReceipt(receipt,secret).valid,true); const changed={...receipt,purpose:"train-model"}; assert.equal(verifyPrivacyReceipt(changed,secret).valid,false); });
