import assert from "node:assert/strict";
import test from "node:test";

import { buildRuntimeTrustAcceptanceMatrix } from "../src/runtime-trust-acceptance-matrix.mjs";

const REVISION = "a".repeat(40);
const TREE = "b".repeat(40);
const NOW = new Date("2026-09-12T04:45:00.000Z");

function stage(state, observed = null, expires = null, evidence = []) {
  return {
    state,
    observed_at: observed,
    expires_at: expires,
    evidence_references: evidence,
  };
}

function entry(overrides = {}) {
  return {
    application_id: "goreecloud-drive",
    adapter_id: "drive-privacy",
    runtime_authority: "GoreeCloud/goreecloud-drive",
    representative_target: "linux-production",
    capability_id: "privacy.readiness",
    exact_source_revision: REVISION,
    source_tree_sha: TREE,
    source: stage("passed", "2026-09-12T04:00:00Z", "2026-09-13T04:00:00Z", ["evidence+sha256:source"]),
    runtime: stage("pending"),
    production: stage("pending"),
    limitations: ["production runtime acceptance pending"],
    ...overrides,
  };
}

test("source evidence cannot manufacture runtime or production acceptance", () => {
  const matrix = buildRuntimeTrustAcceptanceMatrix([entry()], { now: NOW });
  assert.equal(matrix.authorization_effect, false);
  assert.equal(matrix.authority_transfer, false);
  assert.equal(matrix.entries[0].effective_state, "source-validated");
  assert.equal(matrix.entries[0].freshness, "current");
});

test("fresh independently evidenced stages advance only in order", () => {
  const matrix = buildRuntimeTrustAcceptanceMatrix([
    entry({
      runtime: stage("passed", "2026-09-12T04:10:00Z", "2026-09-12T10:10:00Z", ["evidence+sha256:runtime"]),
      production: stage("passed", "2026-09-12T04:20:00Z", "2026-09-12T08:20:00Z", ["evidence+sha256:production"]),
    }),
  ], { now: NOW });
  assert.equal(matrix.entries[0].effective_state, "production-accepted");
  assert.equal(matrix.entries[0].freshness, "current");
});

test("expired source evidence fails closed instead of remaining source validated", () => {
  const matrix = buildRuntimeTrustAcceptanceMatrix([
    entry({
      source: stage("passed", "2026-09-11T04:00:00Z", "2026-09-12T04:30:00Z", ["evidence+sha256:source"]),
    }),
  ], { now: NOW });
  assert.equal(matrix.entries[0].effective_state, "unknown");
  assert.equal(matrix.entries[0].freshness, "expired");
});

test("expired runtime evidence cannot preserve runtime validation", () => {
  const matrix = buildRuntimeTrustAcceptanceMatrix([
    entry({
      runtime: stage("passed", "2026-09-11T04:00:00Z", "2026-09-12T04:30:00Z", ["evidence+sha256:runtime"]),
    }),
  ], { now: NOW });
  assert.equal(matrix.entries[0].effective_state, "source-validated");
  assert.equal(matrix.entries[0].freshness, "expired");
});

test("out-of-order stronger acceptance is conflicting and cannot upgrade authority", () => {
  const matrix = buildRuntimeTrustAcceptanceMatrix([
    entry({
      source: stage("pending"),
      runtime: stage("passed", "2026-09-12T04:10:00Z", "2026-09-12T10:10:00Z", ["evidence+sha256:runtime"]),
    }),
  ], { now: NOW });
  assert.equal(matrix.entries[0].effective_state, "unknown");
  assert.equal(matrix.entries[0].freshness, "conflicting");
});

test("failed evidence is visible and never collapsed into unknown success", () => {
  const matrix = buildRuntimeTrustAcceptanceMatrix([
    entry({ runtime: stage("failed", "2026-09-12T04:10:00Z", null, ["evidence+sha256:failure"]) }),
  ], { now: NOW });
  assert.equal(matrix.entries[0].effective_state, "failed");
});

test("passed evidence must be bounded by current evidence references and expiry", () => {
  assert.throws(
    () => buildRuntimeTrustAcceptanceMatrix([
      entry({ source: stage("passed", "2026-09-12T04:00:00Z", "2026-09-13T04:00:00Z", []) }),
    ], { now: NOW }),
    /requires evidence references/,
  );
  assert.throws(
    () => buildRuntimeTrustAcceptanceMatrix([
      entry({ source: stage("passed", "2026-09-12T05:00:00Z", "2026-09-13T05:00:00Z", ["future"]) }),
    ], { now: NOW }),
    /cannot be in the future/,
  );
});

test("duplicate capability rows are rejected rather than silently merged", () => {
  assert.throws(
    () => buildRuntimeTrustAcceptanceMatrix([entry(), entry()], { now: NOW }),
    /duplicate capability acceptance rows/,
  );
});
