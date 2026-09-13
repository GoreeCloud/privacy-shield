import assert from "node:assert/strict";
import test from "node:test";

import {
  assessBrowserRuntimeAcceptance,
  BROWSER_RUNTIME_ACCEPTANCE_DIMENSIONS,
} from "../src/browser-runtime-acceptance.mjs";

const browserRevision = "1".repeat(40);
const browserTreeSha = "2".repeat(40);
const privacyShieldRevision = "3".repeat(40);
const artifactSha256 = "4".repeat(64);
const now = new Date("2026-09-12T23:45:00.000Z");
const evidenceSeeds = ["a", "b", "c", "d", "e", "f", "0", "1", "2", "3"];

function ref(seed, locator) {
  return `evidence+sha256:${seed.repeat(64)}:${locator}`;
}

function record(overrides = {}) {
  return {
    schema_version: "goreecloud.privacy-shield.browser-runtime-acceptance.v1",
    browser_repository: "GoreeCloud/goreecloud-browser",
    privacy_shield_repository: "GoreeCloud/goreecloud-privacy-shield",
    browser_source_revision: browserRevision,
    browser_source_tree_sha: browserTreeSha,
    privacy_shield_source_revision: privacyShieldRevision,
    artifact: {
      kind: "android-apk",
      name: "GoreeCloudBrowser-debug.apk",
      sha256: artifactSha256,
      size_bytes: 12_345_678,
      runtime_version: "0.1.0-beta.1",
      package_version: "0.1.0-beta.1",
      build_provenance_reference: ref("a", "browser-build-provenance"),
    },
    target: {
      platform: "android",
      os_name: "Android",
      os_version: "16",
      device_class: "representative-phone",
      engine_family: "android-system-webview-chromium",
      engine_version: "representative-webview-build",
    },
    observed_at: "2026-09-12T23:40:00.000Z",
    valid_until: "2026-09-13T00:10:00.000Z",
    dimensions: BROWSER_RUNTIME_ACCEPTANCE_DIMENSIONS.map((id, index) => ({
      id,
      status: "passed",
      evidence_references: [ref(evidenceSeeds[index], `browser-${id}`)],
    })),
    review: {
      authority: "Privacy Shield Browser runtime qualification reviewer",
      disposition: "accepted-for-runtime",
      reviewed_at: "2026-09-12T23:44:00.000Z",
      evidence_reference: ref("f", "browser-runtime-review"),
    },
    authorization_effect: false,
    authority_transfer: false,
    production_approved: false,
    ...overrides,
  };
}

function assessmentOptions(overrides = {}) {
  return {
    expectedBrowserRevision: browserRevision,
    expectedBrowserTreeSha: browserTreeSha,
    expectedPrivacyShieldRevision: privacyShieldRevision,
    expectedArtifactSha256: artifactSha256,
    now,
    maxEvidenceAgeMs: 10 * 60 * 1000,
    ...overrides,
  };
}

test("FR-013 accepts only an exact compiled Browser artifact with every required privacy dimension passed", () => {
  const result = assessBrowserRuntimeAcceptance(record(), assessmentOptions());
  assert.equal(result.accepted_for_runtime, true);
  assert.equal(result.accepted_for_production, false);
  assert.equal(result.authorization_effect, false);
  assert.equal(result.authority_transfer, false);
  assert.equal(result.artifact_sha256, artifactSha256);
  assert.deepEqual([...result.required_dimensions], [...BROWSER_RUNTIME_ACCEPTANCE_DIMENSIONS]);
});

test("FR-013 requires independent exact source, tree, Privacy Shield, and artifact expectations", () => {
  const missing = [
    "expectedBrowserRevision",
    "expectedBrowserTreeSha",
    "expectedPrivacyShieldRevision",
    "expectedArtifactSha256",
  ];
  for (const key of missing) {
    const options = assessmentOptions();
    delete options[key];
    assert.throws(() => assessBrowserRuntimeAcceptance(record(), options), /required for exact-|required for exact-artifact/);
  }

  assert.throws(
    () => assessBrowserRuntimeAcceptance(record(), assessmentOptions({expectedBrowserRevision: "9".repeat(40)})),
    /Browser source revision binding mismatch/,
  );
  assert.throws(
    () => assessBrowserRuntimeAcceptance(record(), assessmentOptions({expectedBrowserTreeSha: "8".repeat(40)})),
    /Browser source tree binding mismatch/,
  );
  assert.throws(
    () => assessBrowserRuntimeAcceptance(record(), assessmentOptions({expectedPrivacyShieldRevision: "7".repeat(40)})),
    /Privacy Shield source revision binding mismatch/,
  );
  assert.throws(
    () => assessBrowserRuntimeAcceptance(record(), assessmentOptions({expectedArtifactSha256: "6".repeat(64)})),
    /compiled Browser artifact digest mismatch/,
  );
});

test("FR-013 binds known compiled artifact kinds to the matching target platform", () => {
  const androidOnWindows = record();
  androidOnWindows.target.platform = "windows";
  androidOnWindows.target.os_name = "Windows";
  assert.throws(
    () => assessBrowserRuntimeAcceptance(androidOnWindows, assessmentOptions()),
    /artifact kind android-apk requires target platform android/,
  );

  const linuxOnAndroid = record();
  linuxOnAndroid.artifact.kind = "linux-binary";
  assert.throws(
    () => assessBrowserRuntimeAcceptance(linuxOnAndroid, assessmentOptions()),
    /artifact kind linux-binary requires target platform linux/,
  );
});

test("FR-013 fails closed when any required Browser privacy dimension is missing, duplicated, or not passed", () => {
  const missing = record();
  missing.dimensions = missing.dimensions.slice(1);
  assert.throws(
    () => assessBrowserRuntimeAcceptance(missing, assessmentOptions()),
    /dimensions must contain exactly/,
  );

  const duplicate = record();
  duplicate.dimensions[1] = structuredClone(duplicate.dimensions[0]);
  assert.throws(
    () => assessBrowserRuntimeAcceptance(duplicate, assessmentOptions()),
    /duplicate Browser privacy dimension|missing one or more required/,
  );

  const failed = record();
  failed.dimensions[0].status = "failed";
  assert.throws(
    () => assessBrowserRuntimeAcceptance(failed, assessmentOptions()),
    /has not passed/,
  );
});

test("FR-013 requires content-addressed build, dimension, and review evidence", () => {
  const badBuild = record();
  badBuild.artifact.build_provenance_reference = "artifact:latest";
  assert.throws(
    () => assessBrowserRuntimeAcceptance(badBuild, assessmentOptions()),
    /content-addressed evidence\+sha256 reference/,
  );

  const badDimension = record();
  badDimension.dimensions[0].evidence_references = ["browser-test-log"];
  assert.throws(
    () => assessBrowserRuntimeAcceptance(badDimension, assessmentOptions()),
    /content-addressed evidence\+sha256 reference/,
  );

  const badReview = record();
  badReview.review.evidence_reference = "review:latest";
  assert.throws(
    () => assessBrowserRuntimeAcceptance(badReview, assessmentOptions()),
    /content-addressed evidence\+sha256 reference/,
  );
});

test("FR-013 rejects future, expired, and caller-age-expired runtime evidence", () => {
  const future = record({observed_at: "2026-09-12T23:46:00.000Z"});
  assert.throws(
    () => assessBrowserRuntimeAcceptance(future, assessmentOptions()),
    /cannot be future-dated/,
  );

  const expired = record({valid_until: "2026-09-12T23:44:59.000Z"});
  assert.throws(
    () => assessBrowserRuntimeAcceptance(expired, assessmentOptions()),
    /evidence is expired/,
  );

  const staleByPolicy = record({observed_at: "2026-09-12T23:20:00.000Z"});
  assert.throws(
    () => assessBrowserRuntimeAcceptance(staleByPolicy, assessmentOptions()),
    /exceeds caller freshness policy/,
  );
});

test("FR-013 rejects invalid review timing and non-accepted review disposition", () => {
  const beforeObservation = record();
  beforeObservation.review.reviewed_at = "2026-09-12T23:39:59.000Z";
  assert.throws(
    () => assessBrowserRuntimeAcceptance(beforeObservation, assessmentOptions()),
    /review predates the runtime observation/,
  );

  const futureReview = record();
  futureReview.review.reviewed_at = "2026-09-12T23:46:00.000Z";
  assert.throws(
    () => assessBrowserRuntimeAcceptance(futureReview, assessmentOptions()),
    /review cannot be future-dated/,
  );

  const rejected = record();
  rejected.review.disposition = "rejected";
  assert.throws(
    () => assessBrowserRuntimeAcceptance(rejected, assessmentOptions()),
    /review has not been accepted/,
  );
});

test("FR-013 cannot manufacture authorization, transfer authority, or self-approve production", () => {
  for (const [field, expected] of [
    ["authorization_effect", /cannot create authorization/],
    ["authority_transfer", /cannot transfer authority/],
    ["production_approved", /cannot self-approve production/],
  ]) {
    const value = record();
    value[field] = true;
    assert.throws(() => assessBrowserRuntimeAcceptance(value, assessmentOptions()), expected);
  }
});

test("FR-013 remains closed to unsupported fields and unsupported engine claims", () => {
  const extra = record();
  extra.stable = true;
  assert.throws(() => assessBrowserRuntimeAcceptance(extra, assessmentOptions()), /stable is unsupported/);

  const engine = record();
  engine.target.engine_family = "unknown-engine";
  assert.throws(() => assessBrowserRuntimeAcceptance(engine, assessmentOptions()), /engine_family is unsupported/);
});
