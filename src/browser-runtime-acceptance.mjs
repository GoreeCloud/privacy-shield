const SCHEMA_VERSION = "goreecloud.privacy-shield.browser-runtime-acceptance.v1";
const BROWSER_REPOSITORY = "GoreeCloud/browser";
const PRIVACY_SHIELD_REPOSITORY = "GoreeCloud/privacy-shield";
const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const EVIDENCE_REFERENCE = /^evidence\+sha256:([0-9a-f]{64}):(.{1,700})$/;
const EVIDENCE_LOCATOR = /^(?:[A-Za-z0-9._-][A-Za-z0-9._/-]*|[A-Za-z0-9._-]+:[A-Za-z0-9._-][A-Za-z0-9._/-]*)$/;
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/;

const ROOT_FIELDS = new Set([
  "schema_version",
  "browser_repository",
  "privacy_shield_repository",
  "browser_source_revision",
  "browser_source_tree_sha",
  "privacy_shield_source_revision",
  "artifact",
  "target",
  "observed_at",
  "valid_until",
  "dimensions",
  "review",
  "authorization_effect",
  "authority_transfer",
  "production_approved",
]);
const ARTIFACT_FIELDS = new Set([
  "kind",
  "name",
  "sha256",
  "size_bytes",
  "runtime_version",
  "package_version",
  "build_provenance_reference",
]);
const TARGET_FIELDS = new Set([
  "platform",
  "os_name",
  "os_version",
  "device_class",
  "engine_family",
  "engine_version",
]);
const DIMENSION_FIELDS = new Set(["id", "status", "evidence_references"]);
const REVIEW_FIELDS = new Set(["authority", "disposition", "reviewed_at", "evidence_reference"]);
const REQUIRED_DIMENSIONS = Object.freeze([
  "content-blocking",
  "tracking-resistance",
  "url-cleaning",
  "privacy-status",
  "user-visible-exceptions",
  "private-browsing-isolation",
  "local-substitution",
  "failure-modes",
  "accessibility-status-accuracy",
  "engine-boundary",
]);
const ARTIFACT_KINDS = new Set([
  "android-apk",
  "linux-binary",
  "windows-binary",
  "macos-bundle",
  "other-compiled-artifact",
]);
const ARTIFACT_PLATFORM = new Map([
  ["android-apk", "android"],
  ["linux-binary", "linux"],
  ["windows-binary", "windows"],
  ["macos-bundle", "macos"],
]);
const PLATFORMS = new Set(["android", "linux", "windows", "macos", "other"]);
const ENGINE_FAMILIES = new Set([
  "android-system-webview-chromium",
  "chromium-cef",
  "firefox-gecko",
  "other-mature-engine",
]);

function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

function closed(value, allowed, name) {
  const keys = Object.keys(value);
  for (const key of keys) {
    if (!allowed.has(key)) throw new Error(`${name}.${key} is unsupported`);
  }
  if (keys.length !== allowed.size) throw new Error(`${name} is incomplete`);
}

function text(value, name, maximum) {
  if (
    typeof value !== "string" ||
    !value ||
    value !== value.trim() ||
    value.length > maximum ||
    CONTROL.test(value)
  ) {
    throw new Error(`${name} must be bounded canonical text`);
  }
  return value;
}

function sha40(value, name) {
  if (typeof value !== "string" || !SHA40.test(value)) {
    throw new Error(`${name} must be a lowercase immutable 40-character revision`);
  }
  return value;
}

function sha256(value, name) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new Error(`${name} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function evidenceReference(value, name) {
  text(value, name, 800);
  const match = EVIDENCE_REFERENCE.exec(value);
  const locator = match?.[2];
  if (
    !match ||
    !EVIDENCE_LOCATOR.test(locator) ||
    locator.startsWith("/") ||
    locator.endsWith("/") ||
    locator.split(":").length > 2 ||
    locator.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`${name} must be a content-addressed evidence+sha256 reference with a credential-safe logical locator`);
  }
  return value;
}

function timestamp(value, name) {
  text(value, name, 40);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error(`${name} must include an explicit timezone`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(`${name} must be a valid timestamp`);
  return milliseconds;
}

function positiveDuration(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer duration in milliseconds`);
  }
  return value;
}

function exactExpectedRevision(value, name) {
  if (value == null) throw new Error(`${name} is required for exact-source acceptance`);
  return sha40(value, name);
}

function exactExpectedArtifactDigest(value) {
  if (value == null) throw new Error("expectedArtifactSha256 is required for exact-artifact acceptance");
  return sha256(value, "expectedArtifactSha256");
}

function exactExpectedReviewAuthority(value) {
  if (value == null) throw new Error("expectedReviewAuthority is required for independent-review acceptance");
  return text(value, "expectedReviewAuthority", 200);
}

function exactExpectedEvidenceReferences(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 256) {
    throw new Error("expectedEvidenceReferences must contain 1-256 exact evidence references");
  }
  const references = value.map((item, index) =>
    evidenceReference(item, `expectedEvidenceReferences[${index}]`)
  );
  if (new Set(references).size !== references.length) {
    throw new Error("expectedEvidenceReferences must not contain duplicates");
  }
  return new Set(references);
}

/**
 * Evaluate one compiled GoreeCloud Browser artifact against the Privacy Shield
 * FR-013 runtime-acceptance boundary.
 *
 * This evaluator accepts source/runtime evidence only. It cannot grant data-use
 * authorization, transfer authority, approve production, or establish Stable.
 */
export function assessBrowserRuntimeAcceptance(record, {
  expectedBrowserRevision,
  expectedBrowserTreeSha,
  expectedPrivacyShieldRevision,
  expectedArtifactSha256,
  expectedReviewAuthority,
  expectedEvidenceReferences,
  now = new Date(),
  maxEvidenceAgeMs,
} = {}) {
  record = object(record, "Browser runtime acceptance record");
  closed(record, ROOT_FIELDS, "Browser runtime acceptance record");

  const browserRevision = exactExpectedRevision(expectedBrowserRevision, "expectedBrowserRevision");
  const browserTreeSha = exactExpectedRevision(expectedBrowserTreeSha, "expectedBrowserTreeSha");
  const privacyShieldRevision = exactExpectedRevision(expectedPrivacyShieldRevision, "expectedPrivacyShieldRevision");
  const artifactDigest = exactExpectedArtifactDigest(expectedArtifactSha256);
  const reviewAuthority = exactExpectedReviewAuthority(expectedReviewAuthority);
  const expectedEvidence = exactExpectedEvidenceReferences(expectedEvidenceReferences);
  const usedEvidence = new Set();
  const bindEvidence = (value, name) => {
    const reference = evidenceReference(value, name);
    if (!expectedEvidence.has(reference)) {
      throw new Error(`${name} is not present in the independently expected evidence set`);
    }
    usedEvidence.add(reference);
    return reference;
  };
  const maxAge = positiveDuration(maxEvidenceAgeMs, "maxEvidenceAgeMs");
  const nowMs = now instanceof Date ? now.getTime() : timestamp(now, "now");
  if (!Number.isFinite(nowMs)) throw new Error("now must be a valid timestamp");

  if (record.schema_version !== SCHEMA_VERSION) throw new Error("unsupported Browser runtime acceptance schema version");
  if (record.browser_repository !== BROWSER_REPOSITORY) throw new Error("Browser repository binding mismatch");
  if (record.privacy_shield_repository !== PRIVACY_SHIELD_REPOSITORY) throw new Error("Privacy Shield repository binding mismatch");
  const recordBrowserRevision = sha40(record.browser_source_revision, "browser_source_revision");
  const recordBrowserTree = sha40(record.browser_source_tree_sha, "browser_source_tree_sha");
  const recordPrivacyRevision = sha40(record.privacy_shield_source_revision, "privacy_shield_source_revision");
  if (recordBrowserRevision !== browserRevision) throw new Error("Browser source revision binding mismatch");
  if (recordBrowserTree !== browserTreeSha) throw new Error("Browser source tree binding mismatch");
  if (recordPrivacyRevision !== privacyShieldRevision) throw new Error("Privacy Shield source revision binding mismatch");

  const artifact = object(record.artifact, "artifact");
  closed(artifact, ARTIFACT_FIELDS, "artifact");
  if (!ARTIFACT_KINDS.has(artifact.kind)) throw new Error("artifact.kind is unsupported");
  text(artifact.name, "artifact.name", 240);
  const recordArtifactDigest = sha256(artifact.sha256, "artifact.sha256");
  if (recordArtifactDigest !== artifactDigest) throw new Error("compiled Browser artifact digest mismatch");
  if (!Number.isSafeInteger(artifact.size_bytes) || artifact.size_bytes <= 0 || artifact.size_bytes > 1_099_511_627_776) {
    throw new Error("artifact.size_bytes is invalid");
  }
  text(artifact.runtime_version, "artifact.runtime_version", 120);
  if (artifact.package_version != null) text(artifact.package_version, "artifact.package_version", 120);
  bindEvidence(artifact.build_provenance_reference, "artifact.build_provenance_reference");

  const target = object(record.target, "target");
  closed(target, TARGET_FIELDS, "target");
  if (!PLATFORMS.has(target.platform)) throw new Error("target.platform is unsupported");
  if (!ENGINE_FAMILIES.has(target.engine_family)) throw new Error("target.engine_family is unsupported");
  const requiredPlatform = ARTIFACT_PLATFORM.get(artifact.kind);
  if (requiredPlatform && target.platform !== requiredPlatform) {
    throw new Error(`artifact kind ${artifact.kind} requires target platform ${requiredPlatform}`);
  }
  text(target.os_name, "target.os_name", 120);
  text(target.os_version, "target.os_version", 120);
  text(target.device_class, "target.device_class", 160);
  text(target.engine_version, "target.engine_version", 160);

  const observedAt = timestamp(record.observed_at, "observed_at");
  const validUntil = timestamp(record.valid_until, "valid_until");
  if (observedAt > nowMs) throw new Error("Browser runtime acceptance evidence cannot be future-dated");
  if (validUntil <= observedAt) throw new Error("valid_until must be later than observed_at");
  if (validUntil <= nowMs) throw new Error("Browser runtime acceptance evidence is expired");
  if (nowMs - observedAt > maxAge) throw new Error("Browser runtime acceptance evidence exceeds caller freshness policy");

  if (!Array.isArray(record.dimensions) || record.dimensions.length !== REQUIRED_DIMENSIONS.length) {
    throw new Error(`dimensions must contain exactly ${REQUIRED_DIMENSIONS.length} required Browser privacy dimensions`);
  }
  const seen = new Set();
  for (const [index, value] of record.dimensions.entries()) {
    const dimension = object(value, `dimensions[${index}]`);
    closed(dimension, DIMENSION_FIELDS, `dimensions[${index}]`);
    if (!REQUIRED_DIMENSIONS.includes(dimension.id)) throw new Error(`dimensions[${index}].id is unsupported`);
    if (seen.has(dimension.id)) throw new Error(`duplicate Browser privacy dimension: ${dimension.id}`);
    seen.add(dimension.id);
    if (dimension.status !== "passed") throw new Error(`Browser privacy dimension ${dimension.id} has not passed`);
    if (!Array.isArray(dimension.evidence_references) || dimension.evidence_references.length < 1 || dimension.evidence_references.length > 20) {
      throw new Error(`Browser privacy dimension ${dimension.id} requires 1-20 evidence references`);
    }
    const refs = dimension.evidence_references.map((item, refIndex) =>
      bindEvidence(item, `dimensions[${index}].evidence_references[${refIndex}]`)
    );
    if (new Set(refs).size !== refs.length) throw new Error(`Browser privacy dimension ${dimension.id} contains duplicate evidence references`);
  }
  if (seen.size !== REQUIRED_DIMENSIONS.length || REQUIRED_DIMENSIONS.some((id) => !seen.has(id))) {
    throw new Error("Browser runtime acceptance is missing one or more required privacy dimensions");
  }

  const review = object(record.review, "review");
  closed(review, REVIEW_FIELDS, "review");
  const recordReviewAuthority = text(review.authority, "review.authority", 200);
  if (recordReviewAuthority !== reviewAuthority) throw new Error("Browser runtime acceptance reviewer authority binding mismatch");
  if (review.disposition !== "accepted-for-runtime") throw new Error("Browser runtime acceptance review has not been accepted");
  const reviewedAt = timestamp(review.reviewed_at, "review.reviewed_at");
  if (reviewedAt < observedAt) throw new Error("Browser runtime acceptance review predates the runtime observation");
  if (reviewedAt > nowMs) throw new Error("Browser runtime acceptance review cannot be future-dated");
  if (reviewedAt >= validUntil) throw new Error("Browser runtime acceptance review is outside the evidence validity window");
  bindEvidence(review.evidence_reference, "review.evidence_reference");
  if (usedEvidence.size !== expectedEvidence.size) {
    throw new Error("independently expected evidence set contains unreferenced items");
  }

  if (record.authorization_effect !== false) throw new Error("Browser runtime acceptance cannot create authorization");
  if (record.authority_transfer !== false) throw new Error("Browser runtime acceptance cannot transfer authority");
  if (record.production_approved !== false) throw new Error("FR-013 source/runtime acceptance cannot self-approve production");

  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    browser_source_revision: recordBrowserRevision,
    browser_source_tree_sha: recordBrowserTree,
    privacy_shield_source_revision: recordPrivacyRevision,
    artifact_sha256: recordArtifactDigest,
    review_authority: recordReviewAuthority,
    evidence_reference_count: usedEvidence.size,
    engine_family: target.engine_family,
    accepted_for_runtime: true,
    accepted_for_production: false,
    authorization_effect: false,
    authority_transfer: false,
    required_dimensions: REQUIRED_DIMENSIONS,
  });
}

/**
 * Describe collection gaps in a draft Browser runtime-acceptance dimension set.
 *
 * This helper does not validate source/artifact identity, evidence trust,
 * timestamps, reviewer authority, or runtime truth. It never grants runtime or
 * production acceptance and exists only to guide evidence collection before
 * the strict assessor is invoked.
 */
export function describeBrowserRuntimeAcceptanceDimensionGaps(dimensions) {
  const values = Array.isArray(dimensions) ? dimensions : [];
  const counts = new Map();
  const passed = new Set();
  const evidencePresent = new Set();

  for (const value of values) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    if (!REQUIRED_DIMENSIONS.includes(value.id)) continue;
    counts.set(value.id, (counts.get(value.id) || 0) + 1);
    if (value.status === "passed") passed.add(value.id);
    if (Array.isArray(value.evidence_references) && value.evidence_references.length > 0) {
      evidencePresent.add(value.id);
    }
  }

  const missingDimensionIds = REQUIRED_DIMENSIONS.filter((id) => !counts.has(id));
  const duplicateDimensionIds = REQUIRED_DIMENSIONS.filter((id) => (counts.get(id) || 0) > 1);
  const nonPassingDimensionIds = REQUIRED_DIMENSIONS.filter((id) => counts.has(id) && !passed.has(id));
  const missingEvidenceDimensionIds = REQUIRED_DIMENSIONS.filter((id) => counts.has(id) && !evidencePresent.has(id));

  return Object.freeze({
    requiredDimensionIds: REQUIRED_DIMENSIONS,
    missingDimensionIds: Object.freeze(missingDimensionIds),
    duplicateDimensionIds: Object.freeze(duplicateDimensionIds),
    nonPassingDimensionIds: Object.freeze(nonPassingDimensionIds),
    missingEvidenceDimensionIds: Object.freeze(missingEvidenceDimensionIds),
    collectionGapCount:
      missingDimensionIds.length +
      duplicateDimensionIds.length +
      nonPassingDimensionIds.length +
      missingEvidenceDimensionIds.length,
    strictAssessmentRequired: true,
    acceptedForRuntime: false,
    acceptedForProduction: false,
    authorizationEffect: false,
    authorityTransfer: false,
  });
}

export const BROWSER_RUNTIME_ACCEPTANCE_DIMENSIONS = REQUIRED_DIMENSIONS;
