import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { PrivacyPolicyStore } from "../src/privacy-policy-store.mjs";
import { FilePrivacyStateStore } from "../src/privacy-state-store.mjs";

function storeFor(file) {
  return new PrivacyPolicyStore({ store: new FilePrivacyStateStore(file) });
}

test("active policy survives restart and activating a new version retires the previous version", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "privacy-shield-policy-"));
  const file = path.join(directory, "state.json");
  let policies = storeFor(file);
  policies.publish({ policy_id: "core-ai", version: "1.0.0", rules: [{ id: "deny-training", effect: "DENY", when: { purposes: ["train-model"] } }] });

  policies = storeFor(file);
  assert.equal(policies.active("core-ai").version, "1.0.0");
  policies.publish({ policy_id: "core-ai", version: "1.1.0", status: "draft", rules: [{ id: "deny-external", effect: "DENY", when: { external_disclosure: true } }] });
  policies.activate("core-ai", "1.1.0");

  policies = storeFor(file);
  assert.equal(policies.active("core-ai").version, "1.1.0");
  assert.equal(policies.get("core-ai", "1.0.0").status, "retired");
  assert.equal(policies.activeRules()[0].id, "deny-external");
});

test("published policy versions are immutable", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "privacy-shield-policy-"));
  const policies = storeFor(path.join(directory, "state.json"));
  policies.publish({ policy_id: "core", version: "1", rules: [] });
  assert.throws(() => policies.publish({ policy_id: "core", version: "1", rules: [] }), /PRIVACY_POLICY_VERSION_EXISTS/);
});
