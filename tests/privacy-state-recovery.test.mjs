import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FilePrivacyStateStore } from "../src/privacy-state-store.mjs";

function statePath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "privacy-shield-state-"));
  return path.join(directory, "state.json");
}

test("durable state rejects unsupported versions instead of silently widening semantics", () => {
  const filePath = statePath();
  fs.writeFileSync(filePath, JSON.stringify({ version: 999, entries: {} }));
  assert.throws(
    () => new FilePrivacyStateStore(filePath),
    /refusing to continue without a validated primary or backup state/,
  );
});

test("durable state rejects malformed primary and backup state", () => {
  const filePath = statePath();
  fs.writeFileSync(filePath, "{truncated");
  fs.writeFileSync(`${filePath}.bak`, "[]");
  assert.throws(
    () => new FilePrivacyStateStore(filePath),
    /refusing to continue without a validated primary or backup state/,
  );
});

test("durable state recovers the last validated backup after a torn primary write", () => {
  const filePath = statePath();
  const first = new FilePrivacyStateStore(filePath);
  first.set("consent", "grant-1", { purpose: "sync" });
  first.set("consent", "grant-2", { purpose: "export" });

  const backupBeforeCorruption = JSON.parse(fs.readFileSync(`${filePath}.bak`, "utf8"));
  assert.equal(backupBeforeCorruption.entries["consent:grant-1"].purpose, "sync");
  assert.equal(backupBeforeCorruption.entries["consent:grant-2"], undefined);

  fs.writeFileSync(filePath, "{\"version\":1,\"entries\":");
  const recovered = new FilePrivacyStateStore(filePath);
  assert.equal(recovered.get("consent", "grant-1").purpose, "sync");
  assert.equal(recovered.get("consent", "grant-2"), null);

  const repairedPrimary = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assert.equal(repairedPrimary.version, 1);
  assert.equal(repairedPrimary.entries["consent:grant-1"].purpose, "sync");
});

test("durable state reads legacy flat-map state and upgrades it on write", () => {
  const filePath = statePath();
  fs.writeFileSync(filePath, JSON.stringify({ "consent:legacy": { purpose: "sync" } }));
  const store = new FilePrivacyStateStore(filePath);
  assert.equal(store.get("consent", "legacy").purpose, "sync");
  store.set("consent", "new", { purpose: "export" });
  const upgraded = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assert.equal(upgraded.version, 1);
  assert.equal(upgraded.entries["consent:legacy"].purpose, "sync");
});

test("durable state rejects unexpected versioned wrapper fields", () => {
  const filePath = statePath();
  fs.writeFileSync(filePath, JSON.stringify({ version: 1, entries: {}, implicitAuthority: true }));
  assert.throws(() => new FilePrivacyStateStore(filePath));
});
