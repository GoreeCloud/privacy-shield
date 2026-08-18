import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PrivacyShieldCore, hostMatchesDomain } from "../src/privacy-shield-core.mjs";

const config = JSON.parse(
  await readFile(new URL("../config/privacy-shield.v2.json", import.meta.url), "utf8")
);

function newShield() {
  return new PrivacyShieldCore(structuredClone(config));
}

test("domain matching is exact or subdomain-aware", () => {
  assert.equal(hostMatchesDomain("ads.doubleclick.net", "doubleclick.net"), true);
  assert.equal(hostMatchesDomain("notdoubleclick.net", "doubleclick.net"), false);
});

test("reviewed content hosts are blocked while first-party requests remain allowed", () => {
  const shield = newShield();
  assert.equal(shield.shouldBlockContent("ads.doubleclick.net", "example.org"), true);
  assert.equal(shield.shouldBlockContent("cdn.example.org", "example.org"), false);
  shield.addContentBlockingException("example.org");
  assert.equal(shield.shouldBlockContent("ads.doubleclick.net", "www.example.org"), false);
});

test("URL cleaning removes reviewed tracking parameters and preserves functional state", () => {
  const shield = newShield();
  const result = shield.cleanURL(
    "https://example.org/article?id=42&utm_source=newsletter&fbclid=abc#part"
  );
  const cleaned = new URL(result);
  assert.equal(cleaned.searchParams.get("id"), "42");
  assert.equal(cleaned.searchParams.has("utm_source"), false);
  assert.equal(cleaned.searchParams.has("fbclid"), false);
  assert.equal(cleaned.hash, "#part");
});

test("URL cleaning leaves exempt authentication hosts unchanged", () => {
  const shield = newShield();
  const original = "https://accounts.google.com/signin?utm_source=x&continue=https%3A%2F%2Fexample.org";
  assert.equal(shield.cleanURL(original), original);
});

test("behavioral tracker evidence requires signals across three distinct first parties", () => {
  const shield = newShield();
  assert.equal(shield.recordThirdPartyObservation("one.example", "tracker.test", true), false);
  assert.equal(shield.recordThirdPartyObservation("one.example", "tracker.test", true), false);
  assert.equal(shield.recordThirdPartyObservation("two.example", "tracker.test", true), false);
  assert.equal(shield.shouldBlockThirdParty("four.example", "tracker.test"), false);
  assert.equal(shield.recordThirdPartyObservation("three.example", "tracker.test", true), true);
  assert.equal(shield.shouldBlockThirdParty("four.example", "tracker.test"), true);
});

test("tracker exceptions suppress local learning and blocking", () => {
  const shield = newShield();
  shield.addTrackerException("example.org");
  assert.equal(shield.recordThirdPartyObservation("news.example.org", "tracker.test", true), false);
  assert.equal(shield.shouldBlockThirdParty("news.example.org", "tracker.test"), false);
});

test("local resource substitution is exact-match only and currently has no payloads", () => {
  const shield = newShield();
  assert.equal(shield.localResourceFor("https://cdn.example.org/library.js"), null);
});

test("non-http and invalid URLs are unchanged", () => {
  const shield = newShield();
  assert.equal(shield.cleanURL("mailto:privacy@example.org?utm_source=x"), "mailto:privacy@example.org?utm_source=x");
  assert.equal(shield.cleanURL("not a url"), "not a url");
});
