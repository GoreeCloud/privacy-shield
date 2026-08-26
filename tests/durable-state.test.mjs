import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { PrivacyCapabilityAuthority } from "../src/capability-token.mjs";
import { ConsentAuthority } from "../src/consent-authority.mjs";
import { PrivacyEvidenceLedger } from "../src/privacy-evidence.mjs";
import { FilePrivacyStateStore } from "../src/privacy-state-store.mjs";

function temporaryStateFile() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "privacy-shield-state-"));
  return path.join(directory, "state.json");
}

test("consent survives authority restart and revocation remains effective", () => {
  const file = temporaryStateFile();
  let authority = new ConsentAuthority([], { store: new FilePrivacyStateStore(file) });
  authority.put({ requester_id: "app.notes", resource_id: "note:1", purpose: "summarize" });

  authority = new ConsentAuthority([], { store: new FilePrivacyStateStore(file) });
  const restored = authority.get({ requester_id: "app.notes", resource_id: "note:1", purpose: "summarize" });
  assert.equal(authority.isEffective(restored), true);

  authority.revoke({ requester_id: "app.notes", resource_id: "note:1", purpose: "summarize" });
  authority = new ConsentAuthority([], { store: new FilePrivacyStateStore(file) });
  assert.equal(authority.isEffective(authority.get({ requester_id: "app.notes", resource_id: "note:1", purpose: "summarize" })), false);
});

test("privacy evidence survives ledger restart", () => {
  const file = temporaryStateFile();
  let ledger = new PrivacyEvidenceLedger({ store: new FilePrivacyStateStore(file) });
  ledger.record({
    request: { request_id: "req-1", requester: { id: "app.notes" }, resource: { id: "note:1" }, purpose: "summarize", operation: "read", destination: "local" },
    decision: { decision_id: "dec-1", outcome: "ALLOW", reason_code: "AUTHORIZED", processing_zone: "local", policy_references: [], obligations: [] }
  });

  ledger = new PrivacyEvidenceLedger({ store: new FilePrivacyStateStore(file) });
  const events = ledger.list({ request_id: "req-1" });
  assert.equal(events.length, 1);
  assert.equal(events[0].decision_id, "dec-1");
});

test("capability revocation survives authority restart", () => {
  const file = temporaryStateFile();
  const secret = "0123456789abcdef0123456789abcdef";
  let authority = new PrivacyCapabilityAuthority(secret, { store: new FilePrivacyStateStore(file) });
  const token = authority.issue({ requester_id: "app.notes", resource_id: "note:1", purpose: "summarize" });
  authority.revoke(token);

  authority = new PrivacyCapabilityAuthority(secret, { store: new FilePrivacyStateStore(file) });
  assert.throws(() => authority.verify(token), /CAPABILITY_REVOKED/);
});

test("single-use capability consumption survives authority restart", () => {
  const file = temporaryStateFile();
  const secret = "0123456789abcdef0123456789abcdef";
  let authority = new PrivacyCapabilityAuthority(secret, { store: new FilePrivacyStateStore(file) });
  const token = authority.issue({ requester_id: "app.notes", resource_id: "note:1", purpose: "summarize" }, { replay_policy: "single_use" });
  authority.consume(token, { requester_id: "app.notes" });

  authority = new PrivacyCapabilityAuthority(secret, { store: new FilePrivacyStateStore(file) });
  assert.throws(() => authority.verify(token), /CAPABILITY_ALREADY_CONSUMED/);
});
