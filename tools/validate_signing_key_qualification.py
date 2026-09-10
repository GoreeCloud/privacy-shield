#!/usr/bin/env python3
"""Fail-closed validation for Privacy Shield signing-key operational qualification."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "privacy-shield.signing-key-qualification.json"
HARNESS = ROOT / "src" / "signing-key-qualification.mjs"
TESTS = ROOT / "tests" / "signing-key-qualification.test.mjs"

CONTRACT_ID = "goreecloud.privacy-shield.signing-key-qualification.v1"
CONTROLLER_CONTRACT_ID = "goreecloud.privacy-shield.signing-key-qualification-controller.v1"
REQUIRED_METHODS = {
    "qualificationCapabilities",
    "attemptUnauthorizedSign",
    "rotate",
    "retire",
    "revoke",
    "setAvailability",
    "recover",
    "readAuditEvents",
    "runtimeIntegrationProbe",
}
REQUIRED_CONTROLLER_CAPABILITIES = {
    "controlled_environment": True,
    "disruptive_operations_authorized": True,
    "evidence_minimized": True,
    "acceptance_authority": False,
}
AUTOMATED = {
    "caller_authorization",
    "producer_identity_binding",
    "rotation",
    "retirement",
    "emergency_revocation",
    "stale_untrusted_rejection",
    "signing_audit",
    "outage_and_degraded_behavior",
    "recovery_and_continuity",
    "exact_runtime_integration",
}
EXTERNAL = {
    "secure_key_generation",
    "non_exportability",
    "access_control_review",
}
ALL_QUALIFICATIONS = AUTOMATED | EXTERNAL
RESULT_STATES = {
    "passed",
    "failed",
    "not_run",
    "requires_external_evidence",
}
PRIVACY_FIELDS = {
    "raw_private_payloads_in_qualification_evidence",
    "secret_material_in_qualification_evidence",
    "full_capability_tokens_in_qualification_evidence",
    "raw_capability_claims_in_qualification_evidence",
}


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield signing-key qualification validation failed: {message}")


def main() -> None:
    try:
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"qualification contract is unreadable or invalid: {exc}")

    if contract.get("schema_version") != 1:
        fail("qualification schema version drifted")
    if contract.get("contract_id") != CONTRACT_ID:
        fail("qualification contract id drifted")
    if contract.get("controller_contract_id") != CONTROLLER_CONTRACT_ID:
        fail("qualification controller contract id drifted")
    if contract.get("authorizing") is not False:
        fail("qualification runs must remain non-authorizing")

    if set(contract.get("required_controller_methods", [])) != REQUIRED_METHODS:
        fail("qualification controller method set drifted")
    if contract.get("required_controller_capabilities") != REQUIRED_CONTROLLER_CAPABILITIES:
        fail("qualification controller capability boundary drifted")

    automated = set(contract.get("automated_qualifications", []))
    external = set(contract.get("external_evidence_qualifications", []))
    if automated != AUTOMATED:
        fail("automated qualification vocabulary drifted")
    if external != EXTERNAL:
        fail("external-evidence qualification vocabulary drifted")
    if automated & external:
        fail("qualification cannot be both automated and external-only")
    if automated | external != ALL_QUALIFICATIONS:
        fail("qualification coverage is incomplete")
    if set(contract.get("result_states", [])) != RESULT_STATES:
        fail("qualification result-state vocabulary drifted")

    privacy = contract.get("privacy")
    if not isinstance(privacy, dict) or set(privacy) != PRIVACY_FIELDS:
        fail("qualification privacy boundary fields drifted")
    if any(privacy.get(field) is not False for field in PRIVACY_FIELDS):
        fail("qualification evidence privacy boundary weakened")

    boundary = contract.get("release_boundary")
    if not isinstance(boundary, dict):
        fail("qualification release boundary is missing")
    if boundary.get("qualification_run_is_production_acceptance") is not False:
        fail("qualification run must not equal production acceptance")
    if boundary.get("source_test_provider_is_production_evidence") is not False:
        fail("source test provider must not count as production evidence")
    for required in (
        "external_evidence_still_required",
        "fresh_exact_provider_acceptance_record_still_required",
        "exact_source_revision_binding_required",
        "exact_provider_version_binding_required",
        "exact_deployment_binding_required",
    ):
        if boundary.get(required) is not True:
            fail(f"release boundary {required} must remain required")

    harness = HARNESS.read_text(encoding="utf-8")
    tests = TESTS.read_text(encoding="utf-8")
    for marker in (
        CONTRACT_ID,
        CONTROLLER_CONTRACT_ID,
        "acceptance_authority !== false",
        "disruptive_operations_authorized",
        "authorizing: false",
        "requires_external_evidence",
        "raw_private_payloads_in_qualification_evidence: false",
        "secret_material_in_qualification_evidence: false",
        "full_capability_tokens_in_qualification_evidence: false",
        "raw_capability_claims_in_qualification_evidence: false",
        "A fresh exact-provider acceptance record is still required",
    ):
        if marker not in harness:
            fail(f"qualification harness is missing {marker!r}")

    for qualification in ALL_QUALIFICATIONS:
        if f'"{qualification}"' not in harness:
            fail(f"qualification harness is missing {qualification}")

    for marker in (
        "qualification harness produces non-authorizing minimized operational evidence",
        "qualification controller must explicitly authorize disruptive exercises",
        "unauthorized signing acceptance is recorded as a failed qualification",
        "audit evidence with forbidden private payload fields fails",
        "runtime integration probe is exact-revision and exact-deployment bound",
    ):
        if marker not in tests:
            fail(f"qualification regression tests are missing {marker!r}")

    print(
        "Privacy Shield signing-key qualification contract is consistent; operational "
        "exercise evidence remains minimized, explicitly non-authorizing, and unable "
        "to substitute for external custody evidence or fresh exact-provider acceptance."
    )


if __name__ == "__main__":
    main()
