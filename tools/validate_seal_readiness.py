#!/usr/bin/env python3
"""Validate Privacy Shield's exact Seal candidate while keeping Anchor qualification fail closed."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECORD = ROOT / "qualification" / "seal-readiness.json"
CANDIDATE = ROOT / "qualification" / "seal-candidate.json"
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
    raise SystemExit(f"Privacy Shield Seal/Anchor readiness validation failed: {message}")


def json_records(path: Path) -> list[Path]:
    return sorted(path.glob("*.json"))


def main() -> None:
    record = json.loads(RECORD.read_text())
    candidate = json.loads(CANDIDATE.read_text())
    manifest = MANIFEST.read_text()
    state_eval = json.loads(STATE_EVAL.read_text())
    signing_eval = json.loads(SIGNING_EVAL.read_text())
    runtime_http = RUNTIME_HTTP.read_text()

    if set(record) != {
        "schema_version", "component", "lifecycle", "next_gate",
        "seal_candidate_declared", "anchor_promotion_authorized", "candidate", "gates",
    }:
        fail("record top-level fields drifted")
    if record["schema_version"] != 2 or record["component"] != "GoreeCloud Privacy Shield":
        fail("readiness record identity/schema drifted")
    if record["lifecycle"] != "seal" or record["next_gate"] != "anchor":
        fail("readiness record must describe the current Seal -> Anchor boundary")
    if record["seal_candidate_declared"] is not True:
        fail("Seal lifecycle requires a declared exact candidate")
    if record["anchor_promotion_authorized"] is not False:
        fail("Anchor promotion must remain unauthorized while qualification blockers remain")
    if record["candidate"] != "qualification/seal-candidate.json":
        fail("readiness record must bind the canonical Seal candidate record")

    if candidate.get("schema_version") != 1 or candidate.get("component") != "GoreeCloud Privacy Shield":
        fail("candidate identity drifted")
    if candidate.get("candidate_id") != "privacy-shield-2.0.0-seal.1":
        fail("unexpected Privacy Shield Seal candidate id")
    if candidate.get("lifecycle") != "seal" or candidate.get("candidate_version") != "2.0.0":
        fail("candidate lifecycle/version drifted")
    source_revision = candidate.get("source_revision")
    if not isinstance(source_revision, str) or not re.fullmatch(r"[0-9a-f]{40}", source_revision):
        fail("candidate source_revision must be an exact commit SHA")
    if candidate.get("production_approved") is not False or candidate.get("authority_effect") != "none":
        fail("Seal candidate must remain non-authorizing before Anchor qualification")
    validations = candidate.get("source_validation")
    if not isinstance(validations, list) or len(validations) < 1 or any(v.get("result") != "success" for v in validations):
        fail("candidate must retain successful exact-source validation evidence")

    if not isinstance(record["gates"], list) or {gate.get("id") for gate in record["gates"]} != EXPECTED_GATES:
        fail("gate inventory drifted")
    for gate in record["gates"]:
        if set(gate) != {"id", "state", "evidence", "reason"}:
            fail(f"{gate.get('id')}: gate fields drifted")
        if gate["state"] not in {"blocked", "passed"}:
            fail(f"{gate['id']}: unsupported state")
        if not gate["evidence"] or not gate["reason"]:
            fail(f"{gate['id']}: evidence and reason are required")

    lifecycle_match = re.search(r"(?m)^lifecycle:\s*([a-z-]+)\s*$", manifest)
    source_match = re.search(r"(?m)^\s{4}source_revision:\s*([0-9a-f]{40})\s*$", manifest)
    next_gate_match = re.search(r"(?m)^\s{2}next_gate:\s*([a-z-]+)\s*$", manifest)
    qualification_match = re.search(r"(?m)^\s{2}qualification_state:\s*([a-z-]+)\s*$", manifest)
    if not lifecycle_match or lifecycle_match.group(1) != "seal":
        fail("manifest lifecycle must be Seal")
    if not source_match or source_match.group(1) != source_revision:
        fail("manifest candidate source revision must match qualification/seal-candidate.json")
    if not next_gate_match or next_gate_match.group(1) != "anchor":
        fail("Seal manifest next_gate must be Anchor")
    if not qualification_match or qualification_match.group(1) not in {"blocked", "in-progress"}:
        fail("Seal qualification must remain blocked or in-progress until Anchor acceptance")

    migration_required = len(re.findall(r"(?m)^\s{4}result:\s*applicable-migration-required\s*$", manifest))
    release_empty = re.search(r"(?m)^\s{2}release:\s*\[\]\s*$", manifest) is not None
    if migration_required != 8:
        fail(f"expected exactly eight external migration-required platform systems, found {migration_required}")

    if state_eval.get("governance", {}).get("status") != "failed":
        fail("FoundationDB candidate must remain failed unless a governed replacement/re-evaluation changes the record")
    if signing_eval.get("governance", {}).get("status") != "draft":
        fail("OVHcloud signing candidate must remain draft unless a governed evaluation changes the record")
    if json_records(STATE_DECISIONS) or json_records(SIGNING_DECISIONS):
        fail("provider selection records require explicit candidate-bound qualification reconciliation")
    if json_records(STATE_ACCEPTANCE) or json_records(SIGNING_ACCEPTANCE):
        fail("production provider acceptance records require explicit candidate-bound qualification reconciliation")

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
        fail("published release evidence must not be declared before Anchor qualification")

    blocked = [gate["id"] for gate in record["gates"] if gate["state"] != "passed"]
    if not blocked:
        fail("no Anchor blockers remain; perform a separate exact-candidate Anchor transition instead")

    print(
        "Privacy Shield Seal candidate guard passed: privacy-shield-2.0.0-seal.1 is frozen; "
        f"Anchor qualification remains blocked by {len(blocked)} gate groups."
    )


if __name__ == "__main__":
    main()
