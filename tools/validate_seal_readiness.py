#!/usr/bin/env python3
"""Fail closed if Privacy Shield lifecycle promotion outruns accepted providers/runtime evidence."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECORD = ROOT / "qualification" / "seal-readiness.json"
MANIFEST = ROOT / "goreecloud.platform.yaml"
STATE_EVAL = ROOT / "evaluations" / "state-providers" / "foundationdb-self-hosted-multihost-production.json"
SIGNING_EVAL = ROOT / "evaluations" / "signing-key-providers" / "ovhcloud-kms-hsm-production.json"
STATE_DECISIONS = ROOT / "decisions" / "state-providers"
SIGNING_DECISIONS = ROOT / "decisions" / "signing-key-providers"
STATE_ACCEPTANCE = ROOT / "acceptance" / "state-providers"
SIGNING_ACCEPTANCE = ROOT / "acceptance" / "signing-key-providers"
RUNTIME_HTTP = ROOT / "src" / "runtime-http.mjs"

EXPECTED_GATES = {
    "production-state-provider",
    "production-signing-key-provider",
    "platform-system-runtime-acceptance",
    "identity-authenticated-runtime",
    "everkeep-recovery",
    "runtime-adapter-acceptance",
    "privacy-center-glaze-acceptance",
    "hosting-observability-recovery-release",
}


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield Seal readiness validation failed: {message}")


def json_records(path: Path) -> list[Path]:
    return sorted(path.glob("*.json"))


def main() -> None:
    record = json.loads(RECORD.read_text())
    manifest = MANIFEST.read_text()
    state_eval = json.loads(STATE_EVAL.read_text())
    signing_eval = json.loads(SIGNING_EVAL.read_text())
    runtime_http = RUNTIME_HTTP.read_text()

    if set(record) != {
        "schema_version", "component", "lifecycle", "next_gate",
        "seal_candidate_declared", "promotion_authorized", "gates",
    }:
        fail("record top-level fields drifted")
    if record["schema_version"] != 1 or record["component"] != "GoreeCloud Privacy Shield":
        fail("record identity drifted")
    if not isinstance(record["gates"], list) or {
        gate.get("id") for gate in record["gates"]
    } != EXPECTED_GATES:
        fail("gate inventory drifted")
    for gate in record["gates"]:
        if set(gate) != {"id", "state", "evidence", "reason"}:
            fail(f"{gate.get('id')}: gate fields drifted")
        if gate["state"] not in {"blocked", "passed"}:
            fail(f"{gate['id']}: unsupported state")
        if not gate["evidence"] or not gate["reason"]:
            fail(f"{gate['id']}: evidence and reason are required")

    lifecycle_match = re.search(r"(?m)^lifecycle:\s*([a-z-]+)\s*$", manifest)
    if not lifecycle_match:
        fail("manifest lifecycle is unreadable")
    lifecycle = lifecycle_match.group(1)
    candidate_null = re.search(r"(?m)^\s{2}candidate_identity:\s*null\s*$", manifest) is not None
    release_empty = re.search(r"(?m)^\s{2}release:\s*\[\]\s*$", manifest) is not None
    migration_required = len(re.findall(r"(?m)^\s{4}result:\s*applicable-migration-required\s*$", manifest))

    if record["promotion_authorized"] is not False or record["seal_candidate_declared"] is not False:
        fail("current blocked Weave record must not authorize or declare a Seal candidate")
    if record["lifecycle"] != "weave" or record["next_gate"] != "seal":
        fail("readiness record must describe current Weave -> Seal boundary")
    if lifecycle != "weave" or not candidate_null:
        fail("manifest must remain Weave with candidate_identity null while readiness is blocked")
    if migration_required != 8:
        fail(f"expected exactly eight external migration-required platform systems, found {migration_required}")

    if state_eval.get("governance", {}).get("status") != "failed":
        fail("current FoundationDB candidate must remain failed unless a governed replacement/re-evaluation changes the record")
    if signing_eval.get("governance", {}).get("status") != "draft":
        fail("current OVHcloud signing candidate must remain draft unless a governed evaluation changes the record")
    if json_records(STATE_DECISIONS) or json_records(SIGNING_DECISIONS):
        fail("current blocked readiness record is incompatible with provider selection records")
    if json_records(STATE_ACCEPTANCE) or json_records(SIGNING_ACCEPTANCE):
        fail("current blocked readiness record is incompatible with production provider acceptance records")

    for token in (
        'export const PRIVACY_RUNTIME_HEALTH_PATH = "/healthz";',
        'export const PRIVACY_RUNTIME_READINESS_PATH = "/readyz";',
        'productionMode',
        'stateProviderAccepted',
        'signingProviderAccepted',
        'runtimeProbePassed',
    ):
        if token not in runtime_http:
            fail(f"runtime HTTP fail-closed readiness invariant missing: {token}")

    if not release_empty:
        fail("no release evidence may be declared while the current Seal-readiness record is blocked")
    blocked = [gate["id"] for gate in record["gates"] if gate["state"] != "passed"]
    if not blocked:
        fail("current record unexpectedly has no blockers; a separate exact-candidate transition is required")
    if lifecycle in {"seal", "anchor"}:
        fail("promotion is prohibited while this readiness record remains blocked")

    print("Privacy Shield Seal readiness guard passed: Weave remains fail-closed with 8 blocked release-critical gates.")


if __name__ == "__main__":
    main()
