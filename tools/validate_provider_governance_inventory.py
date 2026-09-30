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

    if len(state) != 1 or state[0].get("evaluation_id") != "foundationdb-self-hosted-multihost-production":
        fail("state-provider candidate inventory must contain the one current FoundationDB evaluation")
    if state[0].get("governance", {}).get("status") != "failed":
        fail("FoundationDB candidate must remain explicitly failed unless a separately governed reevaluation replaces it")

    if len(signing) != 1 or signing[0].get("evaluation_id") != "ovhcloud-kms-hsm-production":
        fail("signing-provider candidate inventory must contain the one current OVHcloud evaluation")
    if signing[0].get("governance", {}).get("status") != "draft":
        fail("OVHcloud signing candidate must remain draft unless a separately governed evaluation changes it")

    for record in state + signing:
        if record.get("integration_authority") != CANONICAL_REPOSITORY:
            fail(f"{record.get('evaluation_id')}: integration_authority must use {CANONICAL_REPOSITORY}")

    if state_decisions or signing_decisions:
        fail("no provider selection decision is currently authorized by the active incomplete/failed evaluations")
    if state_acceptance or signing_acceptance:
        fail("no production provider acceptance record is currently valid without an approved selection")

    state_readme = (ROOT / "decisions" / "state-providers" / "README.md").read_text(encoding="utf-8")
    signing_readme = (ROOT / "decisions" / "signing-key-providers" / "README.md").read_text(encoding="utf-8")
    signing_doc = (ROOT / "docs" / "SIGNING-KEY-PROVIDER-SELECTION.md").read_text(encoding="utf-8")

    for phrase in [
        "one state-provider candidate evaluation record",
        "foundationdb-self-hosted-multihost-production",
        "explicitly **failed**",
        "zero approved state-provider selections",
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
        "(state candidates=1 failed; signing candidates=1 draft; selections=0; acceptance=0)."
    )


if __name__ == "__main__":
    main()
