import assert from "node:assert/strict";
import test from "node:test";

import {
  assessBrowserRuntimeAcceptance,
  BROWSER_RUNTIME_ACCEPTANCE_DIMENSIONS,
  describeBrowserRuntimeAcceptanceDimensionGaps,
} from "../src/browser-runtime-acceptance.mjs";

const browserRevision = "1".repeat(40);
const browserTreeSha = "2".repeat(40);
const privacyShieldRevision = "3".repeat(40);
const artifactSha256 = "4".repeat(64);
const reviewAuthority = "Privacy Shield Browser runtime qualification reviewer";
const now = new Date("2026-09-12T23:45:00.000Z");
const evidenceSeeds = ["a", "b", "c", "d", "e", "f", "0", "1", "2", "3"];

function ref(seed, locator) {
  return `evidence+sha256:${seed.repeat(64)}:${locator}`;
}

function record(overrides = {}) {
  return {
    schema_version: "goreecloud.privacy-shield.browser-runtime-acceptance.v1",
    browser_repository: "GoreeCloud/browser",
    privacy_shield_repository: "GoreeCloud/privacy-shield",
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
      authority: reviewAuthority,
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

function recordEvidenceReferences(value = record()) {
  return [
    value.artifact.build_provenance_reference,
    ...value.dimensions.flatMap((dimension) => dimension.evidence_references),
    value.review.evidence_reference,
  ];
}

function assessmentOptions(overrides = {}) {
  return {
    expectedBrowserRevision: browserRevision,
    expectedBrowserTreeSha: browserTreeSha,
    expectedPrivacyShieldRevision: privacyShieldRevision,
    expectedArtifactSha256: artifactSha256,
    expectedReviewAuthority: reviewAuthority,
    expectedEvidenceReferences: recordEvidenceReferences(),
    now,
    maxEvidenceAgeMs: 10 * 60 * 1000,
    ...overrides,
  };
}

test("FR-013 draft gap reporting identifies missing, duplicate, non-passing, and evidence-empty dimensions without granting acceptance", () => {
  const dimensions = record().dimensions.map((item) => structuredClone(item));
  dimensions.shift();
  dimensions[0].status = "failed";
  dimensions[1].evidence_references = [];
  dimensions.push(structuredClone(dimensions[2]));

  const result = describeBrowserRuntimeAcceptanceDimensionGaps(dimensions);

  assert.deepEqual(result.missingDimensionIds, ["content-blocking"]);
  assert.deepEqual(result.nonPassingDimensionIds, ["tracking-resistance"]);
  assert.deepEqual(result.missingEvidenceDimensionIds, ["url-cleaning"]);
  assert.deepEqual(result.duplicateDimensionIds, [dimensions[2].id]);
  assert.equal(result.collectionGapCount, 4);
  assert.equal(result.strictAssessmentRequired, true);
  assert.equal(result.acceptedForRuntime, false);
  assert.equal(result.acceptedForProduction, false);
  assert.equal(result.authorizationEffect, false);
  assert.equal(result.authorityTransfer, false);
});

test("FR-013 draft gap reporting never substitutes for strict runtime assessment", () => {
  const completeLooking = record().dimensions.map((item) => structuredClone(item));
  const result = describeBrowserRuntimeAcceptanceDimensionGaps(completeLooking);

  assert.equal(result.collectionGapCount, 0);
  assert.deepEqual(result.missingDimensionIds, []);
  assert.equal(result.strictAssessmentRequired, true);
  assert.equal(result.acceptedForRuntime, false);
  assert.equal(result.acceptedForProduction, false);
});

test("FR-013 accepts only an exact compiled Browser artifact with every required privacy dimension passed", () => {
  const result = assessBrowserRuntimeAcceptance(record(), assessmentOptions());
  assert.equal(result.accepted_for_runtime, true);
  assert.equal(result.accepted_for_production, false);
  assert.equal(result.authorization_effect, false);
  assert.equal(result.authority_transfer, false);
  assert.equal(result.artifact_sha256, artifactSha256);
  assert.equal(result.evidence_reference_count, recordEvidenceReferences().length);
  assert.deepEqual([...result.required_dimensions], [...BROWSER_RUNTIME_ACCEPTANCE_DIMENSIONS]);
});

test("FR-013 rejects historical Browser and Privacy Shield repository identities", () => {
  const historicalBrowser = record({browser_repository: "GoreeCloud/goreecloud-browser"});
  assert.throws(
    () => assessBrowserRuntimeAcceptance(historicalBrowser, assessmentOptions()),
    /Browser repository binding mismatch/,
  );

  const historicalPrivacyShield = record({privacy_shield_repository: "GoreeCloud/goreecloud-privacy-shield"});
  assert.throws(
    () => assessBrowserRuntimeAcceptance(historicalPrivacyShield, assessmentOptions()),
    /Privacy Shield repository binding mismatch/,
  );
});

test("FR-013 requires independent exact source, tree, Privacy Shield, and artifact expectations", () => {
  const missing = [
    "expectedBrowserRevision",
    "expectedBrowserTreeSha",
    "expectedPrivacyShieldRevision",
    "expectedArtifactSha256",
    "expectedReviewAuthority",
    "expectedEvidenceReferences",
  ];
  for (const key of missing) {
    const options = assessmentOptions();
    delete options[key];
    assert.throws(
      () => assessBrowserRuntimeAcceptance(record(), options),
      /required for exact-|required for exact-artifact|required for independent-review|expectedEvidenceReferences/,
    );
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

test("FR-013 requires an independent exact evidence-reference set", () => {
  const value = record();
  const exact = recordEvidenceReferences(value);

  const accepted = assessBrowserRuntimeAcceptance(
    value,
    assessmentOptions({expectedEvidenceReferences: exact}),
  );
  assert.equal(accepted.evidence_reference_count, exact.length);

  assert.throws(
    () => assessBrowserRuntimeAcceptance(
      value,
      assessmentOptions({expectedEvidenceReferences: exact.slice(1)}),
    ),
    /not present in the independently expected evidence set/,
  );

  assert.throws(
    () => assessBrowserRuntimeAcceptance(
      value,
      assessmentOptions({expectedEvidenceReferences: [...exact, ref("9", "unreferenced-evidence")]}),
    ),
    /contains unreferenced items/,
  );

  assert.throws(
    () => assessBrowserRuntimeAcceptance(
      value,
      assessmentOptions({expectedEvidenceReferences: [...exact, exact[0]]}),
    ),
    /must not contain duplicates/,
  );
});

test("FR-013 requires independent reviewer authority binding", () => {
  const mismatched = record();
  mismatched.review.authority = "Self-asserted runtime reviewer";

  assert.throws(
    () => assessBrowserRuntimeAcceptance(mismatched, assessmentOptions()),
    /reviewer authority binding mismatch/,
  );

  const accepted = assessBrowserRuntimeAcceptance(record(), assessmentOptions());
  assert.equal(accepted.review_authority, reviewAuthority);
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

test("FR-013 rejects secret-bearing or transport-style evidence locators", () => {
  const unsafeLocators = [
    "https://example.test/runtime-log",
    "https://example.test/runtime-log?token=secret",
    "reports/runtime.json?signature=secret",
    "reports/runtime.json#fragment",
    "reports/%2e%2e/secret",
    "review@authority",
    "reports/runtime=accepted",
    "/absolute/private/path",
    "reports/../secret",
  ];

  for (const locator of unsafeLocators) {
    const value = record();
    value.artifact.build_provenance_reference = ref("a", locator);
    assert.throws(
      () => assessBrowserRuntimeAcceptance(value, assessmentOptions()),
      /credential-safe logical locator/,
      locator,
    );
  }
});

test("FR-013 accepts credential-safe logical evidence locators", () => {
  const value = record();
  value.artifact.build_provenance_reference = ref("a", "reports/browser/build-provenance.json");
  value.review.evidence_reference = ref("f", "review:browser-runtime");
  const result = assessBrowserRuntimeAcceptance(value, assessmentOptions());
  assert.equal(result.accepted_for_runtime, true);
  assert.equal(result.accepted_for_production, false);
});

test("FR-013 requires an explicit timezone when the caller clock is supplied as text", () => {
  assert.throws(
    () => assessBrowserRuntimeAcceptance(record(), assessmentOptions({now: "2026-09-12T23:45:00"})),
    /now must include an explicit timezone/,
  );

  const accepted = assessBrowserRuntimeAcceptance(
    record(),
    assessmentOptions({now: "2026-09-12T23:45:00.000Z"}),
  );
  assert.equal(accepted.accepted_for_runtime, true);
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
