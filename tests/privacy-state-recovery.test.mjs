import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JsonFilePrivacyStateStore } from "../src/privacy-state-store.mjs";

async function statePath() {
  const directory = await mkdtemp(join(tmpdir(), "privacy-shield-state-"));
  return join(directory, "state.json");
}

test("durable state rejects unsupported versions instead of silently widening semantics", async () => {
  const filePath = await statePath();
  await writeFile(filePath, JSON.stringify({
    version: 999,
    consentGrants: {},
    usedCapabilityIds: {},
    revokedCapabilityIds: {},
    evidenceRecords: [],
  }));
  await assert.rejects(
    JsonFilePrivacyStateStore.open(filePath),
    /refusing to continue without a validated primary or backup state/,
  );
});

test("durable state rejects malformed primary and backup state", async () => {
  const filePath = await statePath();
  await writeFile(filePath, "{truncated");
  await writeFile(`${filePath}.bak`, "[]");
  await assert.rejects(
    JsonFilePrivacyStateStore.open(filePath),
    /refusing to continue without a validated primary or backup state/,
  );
});

test("durable state recovers the last validated backup after a torn primary write", async () => {
  const filePath = await statePath();
  const first = await JsonFilePrivacyStateStore.open(filePath);
  await first.putConsentGrant({ id: "grant-1", purpose: "sync" });
  await first.putConsentGrant({ id: "grant-2", purpose: "export" });

  const backupBeforeCorruption = JSON.parse(await readFile(`${filePath}.bak`, "utf8"));
  assert.equal(backupBeforeCorruption.consentGrants["grant-1"].purpose, "sync");
  assert.equal(backupBeforeCorruption.consentGrants["grant-2"], undefined);

  await writeFile(filePath, "{\"version\":1,\"consentGrants\":");
  const recovered = await JsonFilePrivacyStateStore.open(filePath);
  assert.equal((await recovered.readConsentGrant("grant-1")).purpose, "sync");
  assert.equal(await recovered.readConsentGrant("grant-2"), null);

  const repairedPrimary = JSON.parse(await readFile(filePath, "utf8"));
  assert.equal(repairedPrimary.version, 1);
  assert.equal(repairedPrimary.consentGrants["grant-1"].purpose, "sync");
});

test("durable state rejects unexpected fields", async () => {
  const filePath = await statePath();
  await writeFile(filePath, JSON.stringify({
    version: 1,
    consentGrants: {},
    usedCapabilityIds: {},
    revokedCapabilityIds: {},
    evidenceRecords: [],
    implicitAuthority: true,
  }));
  await assert.rejects(JsonFilePrivacyStateStore.open(filePath));
});
