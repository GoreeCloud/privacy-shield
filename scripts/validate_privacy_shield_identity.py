#!/usr/bin/env python3
"""Validate GoreeCloud Privacy Shield identity and showcase state."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "contracts" / "privacy-shield.identity.json"
PLATFORM_CONTRACT = ROOT / "contracts" / "privacy-shield.platform.json"
CANONICAL_ICON = ROOT / "branding" / "privacy-shield" / "privacy-shield-icon.svg"
APPROVAL_RECORD = ROOT / "docs" / "APPROVED-ICON.md"


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield identity validation failed: {message}")


def main() -> None:
    if not CONTRACT_PATH.is_file():
        fail("missing contracts/privacy-shield.identity.json")

    try:
        contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"identity contract is unreadable or invalid JSON: {exc}")

    if contract.get("schema_version") != 2:
        fail("unsupported identity schema version")

    product = contract.get("product", {})
    visual = contract.get("visual_identity", {})
    implementation = contract.get("implementation", {})

    if product.get("canonical_name") != "GoreeCloud Privacy Shield":
        fail("canonical product name drifted")
    if product.get("short_name") != "Privacy Shield":
        fail("short product name drifted")
    if product.get("scope") != "goreecloud-platform-privacy-protection":
        fail("platform-wide identity scope drifted")
    if product.get("design_language") != "Glaze UI":
        fail("Glaze UI must remain the design language")

    expected_asset = "branding/privacy-shield/privacy-shield-icon.svg"
    if visual.get("canonical_asset") != expected_asset:
        fail("canonical icon path drifted")
    if visual.get("temporary_icon_substitution_allowed") is not False:
        fail("temporary icon substitution must remain disabled")

    icon_exists = CANONICAL_ICON.is_file()
    visual_status = visual.get("canonical_visual_identity_status")
    showcase_status = visual.get("showcase_status")

    if not icon_exists:
        if visual_status != "pending-canonical-icon":
            fail("missing icon requires pending-canonical-icon status")
        if showcase_status != "blocked-pending-canonical-icon":
            fail("missing icon requires blocked-pending-canonical-icon showcase status")
    else:
        if visual_status != "approved-canonical-icon":
            fail("canonical icon requires approved-canonical-icon status")
        if showcase_status != "approved":
            fail("approved canonical icon requires approved showcase status")
        if visual.get("explicit_approval_required") is not True:
            fail("explicit artwork approval must remain required")
        if visual.get("explicit_approval_satisfied") is not True:
            fail("canonical icon requires recorded explicit approval")
        if visual.get("approval_date") != "2026-08-19":
            fail("canonical icon approval date is missing or incorrect")
        if visual.get("approval_record") != "docs/APPROVED-ICON.md":
            fail("canonical icon approval record path drifted")
        if not APPROVAL_RECORD.is_file():
            fail("missing docs/APPROVED-ICON.md approval evidence")
        for key in (
            "small_size_review_satisfied",
            "monochrome_review_satisfied",
            "light_dark_glaze_review_satisfied",
            "identity_distinction_review_satisfied",
        ):
            if visual.get(key) is not True:
                fail(f"approved icon requires {key}=true")

    if implementation.get("platform_contract_authority") != "GoreeCloud/goreecloud-privacy-shield":
        fail("platform contract authority drifted")
    if implementation.get("platform_contract_path") != "contracts/privacy-shield.platform.json":
        fail("platform contract path drifted")
    if not PLATFORM_CONTRACT.is_file():
        fail("missing platform-wide Privacy Shield contract")
    if implementation.get("browser_privileged_runtime_authority") != "GoreeCloud/goreecloud-browser":
        fail("Browser privileged runtime authority drifted")
    if implementation.get("component_specific_runtime_acceptance_required") is not True:
        fail("component-specific runtime acceptance must remain required")
    if implementation.get("production_ready") is not False:
        fail("repository must not claim platform-wide production readiness")

    print("Privacy Shield identity contract is consistent.")


if __name__ == "__main__":
    main()
