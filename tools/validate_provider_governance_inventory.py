#!/usr/bin/env python3
"""Validate Privacy Shield provider-governance inventory and canonical provenance."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANONICAL_REPOSITORY = "GoreeCloud/privacy-shield"


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield provider-governance inventory validation failed: {message}")


def load_records(directory: Path) -> list[dict]:
    records = []
    for path in sorted(directory.glob("*.json")):
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            fail(f"{path.relative_to(ROOT)} unreadable: {exc}")
        if not isinstance(value, dict):
            fail(f"{path.relative_to(ROOT)} must be an object")
        records.append(value)
    return records


def main() -> None:
    state = load_records(ROOT / "evaluations" / "state-providers")
    signing = load_records(ROOT / "evaluations" / "signing-key-providers")
    state_decisions = load_records(ROOT / "decisions" / "state-providers")
    signing_decisions = load_records(ROOT / "decisions" / "signing-key-providers")
    state_acceptance = load_records(ROOT / "acceptance" / "state-providers")
    signing_acceptance = load_records(ROOT / "acceptance" / "signing-key-providers")

    state_by_id = {record.get("evaluation_id"): record for record in state}
    expected_state = {
        "foundationdb-self-hosted-multihost-production": "failed",
        "etcd-self-hosted-multimember-production": "complete",
    }
    if len(state_by_id) != len(state) or set(state_by_id) != set(expected_state):
        fail("state-provider candidate inventory must contain exactly the current FoundationDB and etcd evaluations")
    for evaluation_id, expected_status in expected_state.items():
        actual_status = state_by_id[evaluation_id].get("governance", {}).get("status")
        if actual_status != expected_status:
            fail(
                f"{evaluation_id} must remain {expected_status!r} unless a separately governed reevaluation replaces it"
            )

    if len(signing) != 1 or signing[0].get("evaluation_id") != "ovhcloud-kms-hsm-production":
        fail("signing-provider candidate inventory must contain the one current OVHcloud evaluation")
    if signing[0].get("governance", {}).get("status") != "draft":
        fail("OVHcloud signing candidate must remain draft unless a separately governed evaluation changes it")

    for record in state + signing:
        if record.get("integration_authority") != CANONICAL_REPOSITORY:
            fail(f"{record.get('evaluation_id')}: integration_authority must use {CANONICAL_REPOSITORY}")

    if signing_decisions:
        fail("no signing-key provider selection decision is currently authorized")
    state_decisions_by_id = {record.get("decision_id"): record for record in state_decisions}
    expected_decision_id = "etcd-self-hosted-multimember-production-selection"
    if len(state_decisions_by_id) != 1 or set(state_decisions_by_id) != {expected_decision_id}:
        fail("state-provider selection inventory must contain exactly the approved etcd integration selection")
    selected = state_decisions_by_id[expected_decision_id]
    if (
        selected.get("provider_id") != "etcd-self-hosted-multimember"
        or selected.get("evaluation_record_id") != "etcd-self-hosted-multimember-production"
        or selected.get("integration_authority") != CANONICAL_REPOSITORY
        or selected.get("governance", {}).get("status") != "approved"
        or selected.get("governance", {}).get("implementation_authorized") is not True
        or selected.get("governance", {}).get("production_acceptance_authorized") is not False
    ):
        fail("etcd state-provider selection must remain approved for implementation only and non-authorizing for production acceptance")
    if state_acceptance or signing_acceptance:
        fail("no production provider acceptance record is currently authorized")

    state_readme = (ROOT / "decisions" / "state-providers" / "README.md").read_text(encoding="utf-8")
    signing_readme = (ROOT / "decisions" / "signing-key-providers" / "README.md").read_text(encoding="utf-8")
    signing_doc = (ROOT / "docs" / "SIGNING-KEY-PROVIDER-SELECTION.md").read_text(encoding="utf-8")

    for phrase in [
        "two state-provider candidate evaluation records",
        "foundationdb-self-hosted-multihost-production",
        "explicitly **failed**",
        "etcd-self-hosted-multimember-production",
        "complete, non-authorizing",
        "one approved state-provider selection",
        "zero production-approved state-provider acceptance records",
    ]:
        if phrase.lower() not in state_readme.lower():
            fail(f"state-provider README inventory missing: {phrase}")

    for phrase in [
        "one signing-key provider candidate evaluation record",
        "ovhcloud-kms-hsm-production",
        "draft and non-authorizing",
        "zero approved signing-key provider selections",
        "zero production-approved signing-key provider acceptance records",
    ]:
        if phrase.lower() not in signing_readme.lower():
            fail(f"signing-provider README inventory missing: {phrase}")

    if "two passed criteria" not in signing_doc.lower():
        fail("signing-key selection documentation must reflect the two currently passed candidate criteria")
    if "all evaluation criteria remain pending" in signing_doc.lower():
        fail("signing-key selection documentation retains stale all-pending wording")

    print(
        "Privacy Shield provider-governance inventory valid "
        "(state candidates=2: 1 failed, 1 complete; signing candidates=1 draft; state selections=1 approved-for-implementation; acceptance=0)."
    )


if __name__ == "__main__":
    main()
