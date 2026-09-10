#!/usr/bin/env python3
"""Fail-closed validation for Privacy Shield state-provider operational qualification."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "privacy-shield.state-provider-qualification.json"
PROVIDER_CONTRACT = ROOT / "contracts" / "privacy-shield.state-provider.json"
ACCEPTANCE_SCHEMA = ROOT / "contracts" / "privacy-shield.state-provider-acceptance.schema.json"
HARNESS = ROOT / "src" / "state-provider-qualification.mjs"
TESTS = ROOT / "tests" / "state-provider-qualification.test.mjs"

CONTRACT_ID = "goreecloud.privacy-shield.state-provider-qualification.v1"
CONTROLLER_CONTRACT_ID = "goreecloud.privacy-shield.state-provider-qualification-controller.v1"
REQUIRED_PROVIDER_METHODS = {"get", "set", "delete", "list", "transaction", "stateProviderCapabilities"}
REQUIRED_CONTROLLER_METHODS = {
    "qualificationCapabilities",
    "concurrentWriterProbe",
    "partitionConflictProbe",
    "restartRecoveryProbe",
    "corruptStateRecoveryProbe",
    "backupRestoreProbe",
    "migrationRollbackProbe",
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
    "concurrent_writer_serialization",
    "atomic_commit_and_rollback",
    "partition_and_conflict_behavior",
    "restart_recovery",
    "corrupt_state_recovery",
    "backup_and_restore",
    "migration_and_rollback",
    "operational_observability",
}
EXTERNAL = {"access_control_isolation"}
ALL_QUALIFICATIONS = AUTOMATED | EXTERNAL
RESULT_STATES = {"passed", "failed", "not_run", "requires_external_evidence"}
PRIVACY_FIELDS = {
    "raw_private_payloads_in_qualification_evidence",
    "secret_material_in_qualification_evidence",
    "credentials_in_qualification_evidence",
    "user_content_in_qualification_evidence",
}


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield state-provider qualification validation failed: {message}")


def load(path: Path, label: str) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{label} is unreadable or invalid: {exc}")
    if not isinstance(value, dict):
        fail(f"{label} must be an object")
    return value


def main() -> None:
    contract = load(CONTRACT, "qualification contract")
    provider_contract = load(PROVIDER_CONTRACT, "state-provider contract")
    acceptance_schema = load(ACCEPTANCE_SCHEMA, "state-provider acceptance schema")

    if contract.get("schema_version") != 1:
        fail("qualification schema version drifted")
    if contract.get("contract_id") != CONTRACT_ID:
        fail("qualification contract id drifted")
    if contract.get("controller_contract_id") != CONTROLLER_CONTRACT_ID:
        fail("qualification controller contract id drifted")
    if contract.get("authorizing") is not False:
        fail("qualification runs must remain non-authorizing")

    if set(contract.get("required_provider_methods", [])) != REQUIRED_PROVIDER_METHODS:
        fail("qualification provider method set drifted")
    if set(contract.get("required_controller_methods", [])) != REQUIRED_CONTROLLER_METHODS:
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

    acceptance_required = set(
        acceptance_schema.get("properties", {})
        .get("qualification", {})
        .get("required", [])
    )
    if acceptance_required != ALL_QUALIFICATIONS:
        fail("operational qualification vocabulary no longer matches state-provider acceptance qualifications")

    privacy = contract.get("privacy")
    if not isinstance(privacy, dict) or set(privacy) != PRIVACY_FIELDS:
        fail("qualification privacy boundary fields drifted")
    if any(privacy.get(field) is not False for field in PRIVACY_FIELDS):
        fail("qualification evidence privacy boundary weakened")

    boundary = contract.get("release_boundary")
    if not isinstance(boundary, dict):
        fail("qualification release boundary is missing")
    for forbidden in (
        "qualification_run_is_candidate_evaluation",
        "qualification_run_is_provider_selection",
        "qualification_run_is_production_acceptance",
        "source_test_provider_is_production_evidence",
    ):
        if boundary.get(forbidden) is not False:
            fail(f"release boundary {forbidden} must remain false")
    for required in (
        "candidate_evaluation_still_required",
        "governed_provider_selection_still_required",
        "external_evidence_still_required",
        "fresh_exact_provider_acceptance_record_still_required",
        "exact_source_revision_binding_required",
        "exact_provider_version_binding_required",
        "exact_deployment_binding_required",
        "exact_topology_binding_required",
    ):
        if boundary.get(required) is not True:
            fail(f"release boundary {required} must remain required")

    provider_boundary = provider_contract.get("release_boundary", {})
    expected_provider_boundary = {
        "provider_operational_qualification_contract": "contracts/privacy-shield.state-provider-qualification.json",
        "provider_operational_qualification_is_candidate_evaluation": False,
        "provider_operational_qualification_is_provider_selection": False,
        "provider_operational_qualification_is_production_acceptance": False,
    }
    for key, value in expected_provider_boundary.items():
        if provider_boundary.get(key) != value:
            fail(f"state-provider release boundary {key} drifted")

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
        "credentials_in_qualification_evidence: false",
        "user_content_in_qualification_evidence: false",
        "A fresh exact-provider/exact-deployment acceptance record is still required",
    ):
        if marker not in harness:
            fail(f"qualification harness is missing {marker!r}")

    for qualification in ALL_QUALIFICATIONS:
        if f'"{qualification}"' not in harness:
            fail(f"qualification harness is missing {qualification}")

    for marker in (
        "state qualification harness produces non-authorizing minimized operational evidence",
        "state qualification controller must explicitly authorize disruptive exercises",
        "atomic rollback failure is recorded as a failed qualification",
        "observability evidence with forbidden private payload fields fails",
        "runtime integration probe is exact-revision and exact-topology bound",
    ):
        if marker not in tests:
            fail(f"qualification regression tests are missing {marker!r}")

    print(
        "Privacy Shield state-provider qualification contract is consistent; operational "
        "exercise evidence remains minimized, explicitly non-authorizing, and unable "
        "to substitute for candidate evaluation, provider selection, external evidence, "
        "or fresh exact-provider production acceptance."
    )


if __name__ == "__main__":
    main()
