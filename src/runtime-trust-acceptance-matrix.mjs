const MATRIX_SCHEMA = "goreecloud.privacy-shield.runtime-trust-acceptance-matrix.v1";
const STAGE_STATES = new Set(["unknown", "pending", "passed", "failed"]);
const HEX40 = /^[0-9a-f]{40}$/;
const ID = /^[a-z0-9][a-z0-9-]*$/;
const CAPABILITY = /^[a-z0-9][a-z0-9._-]*$/;
const AUTHORITY = /^GoreeCloud\/[A-Za-z0-9._-]+$/;
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/;
const EXPLICIT_ZONE = /(?:Z|[+-]\d{2}:\d{2})$/;
const MAX_ENTRIES = 4096;
const MAX_EVIDENCE_REFERENCES = 256;
const MAX_LIMITATIONS = 128;
const INPUT_ENTRY_KEYS = new Set([
  "application_id",
  "adapter_id",
  "runtime_authority",
  "representative_target",
  "capability_id",
  "exact_source_revision",
  "source_tree_sha",
  "source",
  "runtime",
  "production",
  "limitations",
]);
const STAGE_KEYS = new Set(["state", "observed_at", "expires_at", "evidence_references"]);

function requireExactKeys(value, expected, name) {
  const keys = Object.keys(value);
  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) {
    throw new TypeError(`${name} has unsupported or missing fields`);
  }
}

function requireString(value, name, pattern, maxLength = 256) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.trim()
    || value.length > maxLength
    || CONTROL.test(value)
    || (pattern && !pattern.test(value))
  ) {
    throw new TypeError(`${name} is invalid`);
  }
  return value;
}

function parseTime(value, name) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.trim()
    || !EXPLICIT_ZONE.test(value)
    || CONTROL.test(value)
  ) {
    throw new TypeError(`${name} must be an explicit timezone-qualified date-time`);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new TypeError(`${name} must be an explicit timezone-qualified date-time`);
  }
  return time;
}

function normalizeReferences(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  if (value.length > MAX_EVIDENCE_REFERENCES) {
    throw new TypeError(`${name} exceeds the supported evidence-reference limit`);
  }
  const references = value.map((reference, index) =>
    requireString(reference, `${name}[${index}]`, null, 1000),
  );
  if (new Set(references).size !== references.length) {
    throw new TypeError(`${name} must not contain duplicates`);
  }
  return references;
}

function evaluateStage(stage, name, nowMs) {
  if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
    throw new TypeError(`${name} must be an object`);
  }
  requireExactKeys(stage, STAGE_KEYS, name);
  if (!STAGE_STATES.has(stage.state)) throw new TypeError(`${name}.state is invalid`);
  const evidenceReferences = normalizeReferences(stage.evidence_references, `${name}.evidence_references`);
  const observedMs = stage.observed_at === null ? null : parseTime(stage.observed_at, `${name}.observed_at`);
  const expiresMs = stage.expires_at === null ? null : parseTime(stage.expires_at, `${name}.expires_at`);
  if (observedMs !== null && observedMs > nowMs) {
    throw new TypeError(`${name}.observed_at cannot be in the future`);
  }
  if (observedMs !== null && expiresMs !== null && expiresMs <= observedMs) {
    throw new TypeError(`${name}.expires_at must follow observed_at`);
  }

  if (stage.state !== "passed") {
    return {
      state: stage.state,
      observed_at: observedMs === null ? null : new Date(observedMs).toISOString(),
      expires_at: expiresMs === null ? null : new Date(expiresMs).toISOString(),
      evidence_references: evidenceReferences,
      freshness: "unknown",
      usable: false,
    };
  }

  if (evidenceReferences.length === 0) {
    throw new TypeError(`${name} passed state requires evidence references`);
  }
  if (observedMs === null || expiresMs === null) {
    throw new TypeError(`${name} passed state requires observed_at and expires_at`);
  }
  const expired = expiresMs <= nowMs;
  return {
    state: stage.state,
    observed_at: new Date(observedMs).toISOString(),
    expires_at: new Date(expiresMs).toISOString(),
    evidence_references: evidenceReferences,
    freshness: expired ? "expired" : "current",
    usable: !expired,
  };
}

function normalizeLimitations(value) {
  if (!Array.isArray(value)) throw new TypeError("limitations must be an array");
  if (value.length > MAX_LIMITATIONS) throw new TypeError("limitations exceeds the supported limit");
  const limitations = value.map((item, index) => requireString(item, `limitations[${index}]`, null, 500));
  if (new Set(limitations).size !== limitations.length) {
    throw new TypeError("limitations must not contain duplicates");
  }
  return limitations;
}

function evaluateEntry(input, nowMs) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("matrix entry must be an object");
  }
  requireExactKeys(input, INPUT_ENTRY_KEYS, "matrix entry");

  const source = evaluateStage(input.source, "source", nowMs);
  const runtime = evaluateStage(input.runtime, "runtime", nowMs);
  const production = evaluateStage(input.production, "production", nowMs);
  let freshness = "unknown";
  let effectiveState = "unknown";

  const contradictory =
    (runtime.state === "passed" && source.state !== "passed") ||
    (production.state === "passed" && runtime.state !== "passed") ||
    (production.state === "passed" && source.state !== "passed");

  if (contradictory) {
    freshness = "conflicting";
  } else if ([source, runtime, production].some((stage) => stage.state === "failed")) {
    effectiveState = "failed";
    freshness = "current";
  } else if (source.state === "passed" && !source.usable) {
    freshness = "expired";
  } else if (source.usable) {
    effectiveState = "source-validated";
    freshness = "current";
    if (runtime.state === "passed" && !runtime.usable) {
      freshness = "expired";
    } else if (runtime.usable) {
      effectiveState = "runtime-validated";
      if (production.state === "passed" && !production.usable) {
        freshness = "expired";
      } else if (production.usable) {
        effectiveState = "production-accepted";
      }
    }
  }

  if (freshness === "conflicting") effectiveState = "unknown";

  return {
    application_id: requireString(input.application_id, "application_id", ID, 160),
    adapter_id: requireString(input.adapter_id, "adapter_id", ID, 160),
    runtime_authority: requireString(input.runtime_authority, "runtime_authority", AUTHORITY, 256),
    representative_target: requireString(input.representative_target, "representative_target", null, 200),
    capability_id: requireString(input.capability_id, "capability_id", CAPABILITY, 160),
    exact_source_revision: requireString(input.exact_source_revision, "exact_source_revision", HEX40, 40),
    source_tree_sha: requireString(input.source_tree_sha, "source_tree_sha", HEX40, 40),
    source: {
      state: source.state,
      observed_at: source.observed_at,
      expires_at: source.expires_at,
      evidence_references: source.evidence_references,
    },
    runtime: {
      state: runtime.state,
      observed_at: runtime.observed_at,
      expires_at: runtime.expires_at,
      evidence_references: runtime.evidence_references,
    },
    production: {
      state: production.state,
      observed_at: production.observed_at,
      expires_at: production.expires_at,
      evidence_references: production.evidence_references,
    },
    effective_state: effectiveState,
    freshness,
    limitations: normalizeLimitations(input.limitations),
  };
}

export function buildRuntimeTrustAcceptanceMatrix(entries, { now = new Date() } = {}) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  if (entries.length > MAX_ENTRIES) throw new TypeError("entries exceeds the supported matrix limit");
  const nowMs = now instanceof Date ? now.getTime() : parseTime(now, "now");
  if (!Number.isFinite(nowMs)) throw new TypeError("now must be a valid date-time");

  const normalized = [];
  const seen = new Set();
  for (const entry of entries) {
    const result = evaluateEntry(entry, nowMs);
    const key = [
      result.application_id,
      result.adapter_id,
      result.runtime_authority,
      result.representative_target,
      result.capability_id,
    ].join("\u0000");
    if (seen.has(key)) throw new TypeError("matrix contains duplicate capability acceptance rows");
    seen.add(key);
    normalized.push(result);
  }

  normalized.sort((a, b) =>
    [a.application_id, a.adapter_id, a.representative_target, a.capability_id]
      .join("\u0000")
      .localeCompare([b.application_id, b.adapter_id, b.representative_target, b.capability_id].join("\u0000")),
  );

  return {
    schema_version: MATRIX_SCHEMA,
    generated_at: new Date(nowMs).toISOString(),
    authorization_effect: false,
    authority_transfer: false,
    entries: normalized,
  };
}

export { MATRIX_SCHEMA };
