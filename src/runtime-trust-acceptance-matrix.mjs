const MATRIX_SCHEMA = "goreecloud.privacy-shield.runtime-trust-acceptance-matrix.v1";
const STAGE_STATES = new Set(["unknown", "pending", "passed", "failed"]);
const HEX40 = /^[0-9a-f]{40}$/;
const ID = /^[a-z0-9][a-z0-9-]*$/;
const CAPABILITY = /^[a-z0-9][a-z0-9._-]*$/;
const AUTHORITY = /^GoreeCloud\/[A-Za-z0-9._-]+$/;

function requireString(value, name, pattern) {
  if (typeof value !== "string" || value.length === 0 || (pattern && !pattern.test(value))) {
    throw new TypeError(`${name} is invalid`);
  }
  return value;
}

function parseTime(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} is required`);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new TypeError(`${name} must be an ISO date-time`);
  }
  return time;
}

function normalizeReferences(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const references = value.map((reference, index) =>
    requireString(reference, `${name}[${index}]`),
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
  if (!STAGE_STATES.has(stage.state)) throw new TypeError(`${name}.state is invalid`);
  const evidenceReferences = normalizeReferences(stage.evidence_references ?? [], `${name}.evidence_references`);

  if (stage.state !== "passed") {
    if (stage.observed_at !== null && stage.observed_at !== undefined) {
      parseTime(stage.observed_at, `${name}.observed_at`);
    }
    if (stage.expires_at !== null && stage.expires_at !== undefined) {
      parseTime(stage.expires_at, `${name}.expires_at`);
    }
    return {
      state: stage.state,
      observed_at: stage.observed_at ?? null,
      expires_at: stage.expires_at ?? null,
      evidence_references: evidenceReferences,
      freshness: "unknown",
      usable: false,
    };
  }

  if (evidenceReferences.length === 0) {
    throw new TypeError(`${name} passed state requires evidence references`);
  }
  const observedMs = parseTime(stage.observed_at, `${name}.observed_at`);
  const expiresMs = parseTime(stage.expires_at, `${name}.expires_at`);
  if (observedMs > nowMs) throw new TypeError(`${name}.observed_at cannot be in the future`);
  if (expiresMs <= observedMs) throw new TypeError(`${name}.expires_at must follow observed_at`);
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
  const limitations = value.map((item, index) => requireString(item, `limitations[${index}]`));
  if (new Set(limitations).size !== limitations.length) {
    throw new TypeError("limitations must not contain duplicates");
  }
  return limitations;
}

function evaluateEntry(input, nowMs) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("matrix entry must be an object");
  }

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
    application_id: requireString(input.application_id, "application_id", ID),
    adapter_id: requireString(input.adapter_id, "adapter_id", ID),
    runtime_authority: requireString(input.runtime_authority, "runtime_authority", AUTHORITY),
    representative_target: requireString(input.representative_target, "representative_target"),
    capability_id: requireString(input.capability_id, "capability_id", CAPABILITY),
    exact_source_revision: requireString(input.exact_source_revision, "exact_source_revision", HEX40),
    source_tree_sha: requireString(input.source_tree_sha, "source_tree_sha", HEX40),
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
    limitations: normalizeLimitations(input.limitations ?? []),
  };
}

export function buildRuntimeTrustAcceptanceMatrix(entries, { now = new Date() } = {}) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
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
