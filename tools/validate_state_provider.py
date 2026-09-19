#!/usr/bin/env python3
"""Fail-closed validation for the Privacy Shield production state-provider boundary."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "privacy-shield.state-provider.json"
ACCEPTANCE_SCHEMA = ROOT / "contracts" / "privacy-shield.state-provider-acceptance.schema.json"
ACCEPTANCE_DIR = ROOT / "acceptance" / "state-providers"
STATE_STORE = ROOT / "src" / "privacy-state-store.mjs"
STATE_ACCEPTANCE_RUNTIME = ROOT / "src" / "state-provider-acceptance.mjs"
RUNTIME = ROOT / "src" / "privacy-runtime.mjs"
TRANSACTIONAL_AUTHORITIES = (
    ROOT / "src" / "consent-authority.mjs",
    ROOT / "src" / "capability-token.mjs",
    ROOT / "src" / "privacy-policy-store.mjs",
    ROOT / "src" / "privacy-evidence.mjs",
)

CONTRACT_ID = "goreecloud.privacy-shield.state-provider.v1"
ACCEPTANCE_CONTRACT_ID = "goreecloud.privacy-shield.state-provider-acceptance.v1"
REQUIRED_METHODS = {
    "get",
    "set",
    "delete",
    "list",
    "transaction",
    "stateProviderCapabilities",
}
REQUIRED_CAPABILITIES = {
    "durable",
    "restart_recovery",
    "atomic_transactions",
    "multi_writer_serializable",
    "distributed",
    "fail_closed_on_conflict",
}
REQUIRED_IDENTITY_METADATA = {
    "provider_id",
    "provider_version",
    "provider_implementation",
    "provider_authority",
}
REQUIRED_QUALIFICATIONS = {
    "concurrent_writer_serialization": "concurrency",
    "atomic_commit_and_rollback": "atomicity",
    "partition_and_conflict_behavior": "partition-conflict",
    "restart_recovery": "restart-recovery",
    "corrupt_state_recovery": "corrupt-state-recovery",
    "backup_and_restore": "backup-restore",
    "migration_and_rollback": "migration-rollback",
    "access_control_isolation": "access-control",
    "operational_observability": "observability",
}
BUILT_IN_NON_PRODUCTION_PROVIDERS = {
    "MemoryPrivacyStateStore",
    "FilePrivacyStateStore",
}
SHA40 = re.compile(r"^[0-9a-f]{40}$")
PROVIDER_ID = re.compile(r"^[a-z0-9][a-z0-9-]*$")
PROVIDER_AUTHORITY = re.compile(r"^GoreeCloud/[A-Za-z0-9._-]+$")


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield state-provider validation failed: {message}")


def load_json(path: Path, label: str) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{label} is unreadable or invalid: {exc}")
    if not isinstance(value, dict):
        fail(f"{label} must be a JSON object")
    return value


def validate_acceptance_schema(schema: dict) -> None:
    properties = schema.get("properties", {})
    if properties.get("schema_version", {}).get("const") != 1:
        fail("state-provider acceptance schema version drifted")
    if properties.get("contract_id", {}).get("const") != ACCEPTANCE_CONTRACT_ID:
        fail("state-provider acceptance contract id drifted")
    if "selection_decision_id" not in schema.get("required", []):
        fail("state-provider acceptance must require selection_decision_id")
    if properties.get("selection_decision_id", {}).get("pattern") != "^[a-z0-9][a-z0-9-]*$":
        fail("state-provider selection_decision_id pattern drifted")

    capability_properties = properties.get("capabilities", {}).get("properties", {})
    if set(capability_properties) != REQUIRED_CAPABILITIES:
        fail("state-provider acceptance capability vocabulary drifted")
    if any(capability_properties.get(key, {}).get("const") is not True for key in REQUIRED_CAPABILITIES):
        fail("accepted state providers must require every production capability")

    deployment = properties.get("deployment", {}).get("properties", {})
    if deployment.get("distributed", {}).get("const") is not True:
        fail("accepted state-provider deployments must remain distributed")
    if deployment.get("multi_writer", {}).get("const") is not True:
        fail("accepted state-provider deployments must remain multi-writer")
    if deployment.get("replica_count", {}).get("minimum") != 2:
        fail("accepted state-provider deployments must require at least two replicas")

    qualification = properties.get("qualification", {}).get("properties", {})
    if set(qualification) != set(REQUIRED_QUALIFICATIONS):
        fail("state-provider qualification vocabulary drifted")

    privacy = properties.get("privacy", {}).get("properties", {})
    for key in (
        "raw_private_payloads_in_acceptance_evidence",
        "secret_material_in_acceptance_evidence",
    ):
        if privacy.get(key, {}).get("const") is not False:
            fail(f"acceptance evidence privacy boundary weakened: {key}")

    acceptance = properties.get("acceptance", {}).get("properties", {})
    if acceptance.get("exact_revision_required", {}).get("const") is not True:
        fail("state-provider production acceptance must remain exact-revision bound")
    if "valid_until" not in acceptance:
        fail("state-provider production acceptance must remain freshness-bounded")


def parse_valid_until(value: object, path: Path) -> datetime:
    if not isinstance(value, str):
        fail(f"{path}: acceptance.valid_until must be an offset-aware date-time")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        fail(f"{path}: acceptance.valid_until is not a valid date-time")
    if parsed.tzinfo is None:
        fail(f"{path}: acceptance.valid_until must include a timezone offset")
    return parsed.astimezone(timezone.utc)


def validate_acceptance_record(path: Path, record: dict) -> tuple[str, str, str]:
    required = {
        "schema_version",
        "contract_id",
        "selection_decision_id",
        "provider_id",
        "provider_implementation",
        "provider_authority",
        "exact_source_revision",
        "source_tree_sha",
        "provider_version",
        "deployment",
        "capabilities",
        "qualification",
        "privacy",
        "acceptance",
        "evidence",
        "limitations",
    }
    if set(record) != required:
        missing = sorted(required - set(record))
        extra = sorted(set(record) - required)
        fail(f"{path}: top-level fields drifted (missing={missing}, extra={extra})")
    if record.get("schema_version") != 1:
        fail(f"{path}: unsupported schema_version")
    if record.get("contract_id") != ACCEPTANCE_CONTRACT_ID:
        fail(f"{path}: contract_id mismatch")

    selection_decision_id = record.get("selection_decision_id")
    if not isinstance(selection_decision_id, str) or not PROVIDER_ID.fullmatch(selection_decision_id):
        fail(f"{path}: invalid selection_decision_id")
    provider_id = record.get("provider_id")
    implementation = record.get("provider_implementation")
    authority = record.get("provider_authority")
    if not isinstance(provider_id, str) or not PROVIDER_ID.fullmatch(provider_id):
        fail(f"{path}: invalid provider_id")
    if not isinstance(implementation, str) or not implementation.strip():
        fail(f"{path}: provider_implementation must be non-empty")
    if implementation in BUILT_IN_NON_PRODUCTION_PROVIDERS:
        fail(f"{path}: built-in provider {implementation} cannot receive production acceptance")
    if not isinstance(authority, str) or not PROVIDER_AUTHORITY.fullmatch(authority):
        fail(f"{path}: invalid provider_authority")

    for key in ("exact_source_revision", "source_tree_sha"):
        value = record.get(key)
        if not isinstance(value, str) or not SHA40.fullmatch(value):
            fail(f"{path}: {key} must be an exact lowercase 40-character Git SHA")

    deployment = record.get("deployment")
    if not isinstance(deployment, dict):
        fail(f"{path}: deployment must be an object")
    if deployment.get("distributed") is not True or deployment.get("multi_writer") is not True:
        fail(f"{path}: accepted deployment must be distributed and multi-writer")
    replica_count = deployment.get("replica_count")
    if not isinstance(replica_count, int) or isinstance(replica_count, bool) or replica_count < 2:
        fail(f"{path}: accepted deployment must have replica_count >= 2")
    environment = deployment.get("environment")
    topology_id = deployment.get("topology_id")
    if not isinstance(environment, str) or not environment.strip():
        fail(f"{path}: deployment.environment must be non-empty")
    if not isinstance(topology_id, str) or not topology_id.strip():
        fail(f"{path}: deployment.topology_id must be non-empty")

    capabilities = record.get("capabilities")
    if not isinstance(capabilities, dict) or set(capabilities) != REQUIRED_CAPABILITIES:
        fail(f"{path}: production capability set drifted")
    if any(capabilities.get(key) is not True for key in REQUIRED_CAPABILITIES):
        fail(f"{path}: all production capabilities must be true")

    qualification = record.get("qualification")
    if not isinstance(qualification, dict) or set(qualification) != set(REQUIRED_QUALIFICATIONS):
        fail(f"{path}: qualification set drifted")
    for key, result in qualification.items():
        if result not in {"pending", "passed", "failed"}:
            fail(f"{path}: invalid qualification result for {key}")

    privacy = record.get("privacy")
    if not isinstance(privacy, dict):
        fail(f"{path}: privacy must be an object")
    if privacy.get("raw_private_payloads_in_acceptance_evidence") is not False:
        fail(f"{path}: acceptance evidence must exclude raw private payloads")
    if privacy.get("secret_material_in_acceptance_evidence") is not False:
        fail(f"{path}: acceptance evidence must exclude secret material")

    acceptance = record.get("acceptance")
    if not isinstance(acceptance, dict):
        fail(f"{path}: acceptance must be an object")
    status = acceptance.get("status")
    if status not in {"pending", "passed", "failed", "revoked"}:
        fail(f"{path}: invalid acceptance.status")
    approved = acceptance.get("production_approved")
    if not isinstance(approved, bool):
        fail(f"{path}: acceptance.production_approved must be boolean")
    if acceptance.get("exact_revision_required") is not True:
        fail(f"{path}: acceptance must remain exact-revision bound")
    valid_until = parse_valid_until(acceptance.get("valid_until"), path)

    evidence = record.get("evidence")
    if not isinstance(evidence, list) or not evidence:
        fail(f"{path}: at least one evidence entry is required")
    evidence_categories: dict[str, list[str]] = {}
    evidence_ids: set[str] = set()
    for entry in evidence:
        if not isinstance(entry, dict):
            fail(f"{path}: every evidence entry must be an object")
        evidence_id = entry.get("id")
        category = entry.get("category")
        result = entry.get("result")
        reference = entry.get("reference")
        if not isinstance(evidence_id, str) or not PROVIDER_ID.fullmatch(evidence_id):
            fail(f"{path}: invalid evidence id")
        if evidence_id in evidence_ids:
            fail(f"{path}: duplicate evidence id {evidence_id}")
        evidence_ids.add(evidence_id)
        if not isinstance(category, str):
            fail(f"{path}: evidence category must be a string")
        if result not in {"passed", "failed", "informational"}:
            fail(f"{path}: invalid evidence result")
        if not isinstance(reference, str) or not reference.strip():
            fail(f"{path}: evidence reference must be non-empty")
        evidence_categories.setdefault(category, []).append(result)

    limitations = record.get("limitations")
    if not isinstance(limitations, list) or any(not isinstance(item, str) or not item.strip() for item in limitations):
        fail(f"{path}: limitations must be a list of non-empty strings")

    if approved:
        if status != "passed":
            fail(f"{path}: production_approved requires acceptance.status=passed")
        if valid_until <= datetime.now(timezone.utc):
            fail(f"{path}: production acceptance is stale or expired")
        for qualification_name, category in REQUIRED_QUALIFICATIONS.items():
            if qualification.get(qualification_name) != "passed":
                fail(f"{path}: production approval requires {qualification_name}=passed")
            if "passed" not in evidence_categories.get(category, []):
                fail(f"{path}: production approval lacks passing {category} evidence")
    elif status == "passed":
        fail(f"{path}: acceptance.status=passed cannot coexist with production_approved=false")

    return provider_id, environment, topology_id


def main() -> None:
    contract = load_json(CONTRACT, "state-provider contract")
    schema = load_json(ACCEPTANCE_SCHEMA, "state-provider acceptance schema")

    if contract.get("schema_version") != 1:
        fail("unsupported state-provider contract schema version")
    if contract.get("contract_id") != CONTRACT_ID:
        fail("state-provider contract id drifted")
    if set(contract.get("required_methods", [])) != REQUIRED_METHODS:
        fail("required state-provider methods drifted")

    identity_metadata = contract.get("required_production_identity_metadata")
    if not isinstance(identity_metadata, list) or set(identity_metadata) != REQUIRED_IDENTITY_METADATA:
        fail("production state-provider identity metadata vocabulary drifted")

    capabilities = contract.get("required_production_capabilities")
    if not isinstance(capabilities, dict) or set(capabilities) != REQUIRED_CAPABILITIES:
        fail("production capability vocabulary drifted")
    if any(capabilities.get(key) is not True for key in REQUIRED_CAPABILITIES):
        fail("every production state-provider capability must remain required")

    providers = contract.get("source_providers", {})
    for provider in BUILT_IN_NON_PRODUCTION_PROVIDERS:
        if providers.get(provider, {}).get("production_eligible") is not False:
            fail(f"{provider} must remain non-production")

    boundary = contract.get("release_boundary", {})
    if boundary.get("capability_declaration_is_production_acceptance") is not False:
        fail("capability declaration must not equal production acceptance")
    if boundary.get("source_validation_is_provider_acceptance") is not False:
        fail("source validation must not equal provider acceptance")
    if boundary.get("production_acceptance_record_required") is not True:
        fail("production state providers must require an independent acceptance record")
    if boundary.get("production_acceptance_schema") != "contracts/privacy-shield.state-provider-acceptance.schema.json":
        fail("production acceptance schema path drifted")
    if boundary.get("production_acceptance_records") != "acceptance/state-providers/*.json":
        fail("production acceptance record path drifted")
    for required in (
        "exact_provider_runtime_acceptance_required",
        "failure_and_recovery_exercises_required",
        "operational_backup_and_restore_acceptance_required",
        "production_acceptance_selection_decision_binding_required",
    ):
        if boundary.get(required) is not True:
            fail(f"release boundary {required} must remain required")

    validate_acceptance_schema(schema)

    accepted_targets: set[tuple[str, str, str]] = set()
    record_count = 0
    approved_count = 0
    if ACCEPTANCE_DIR.exists():
        for path in sorted(ACCEPTANCE_DIR.glob("*.json")):
            record = load_json(path, f"state-provider acceptance record {path}")
            target = validate_acceptance_record(path, record)
            if target in accepted_targets:
                fail(f"{path}: duplicate provider/environment/topology acceptance target")
            accepted_targets.add(target)
            record_count += 1
            if record["acceptance"]["production_approved"] is True:
                approved_count += 1

    state_source = STATE_STORE.read_text(encoding="utf-8")
    acceptance_runtime_source = STATE_ACCEPTANCE_RUNTIME.read_text(encoding="utf-8")
    runtime_source = RUNTIME.read_text(encoding="utf-8")
    for marker in (CONTRACT_ID, "transaction(mutation)", "stateProviderCapabilities()"):
        if marker not in state_source:
            fail(f"state-store source is missing {marker!r}")
    for capability in REQUIRED_CAPABILITIES:
        if capability not in state_source or capability not in runtime_source:
            fail(f"runtime/source capability marker missing: {capability}")
    for marker in (
        ACCEPTANCE_CONTRACT_ID,
        "requireStateProviderAcceptance",
        "PRODUCTION_STATE_PROVIDER_ACCEPTANCE_REQUIRED",
        "STATE_PROVIDER_ACCEPTANCE_SOURCE_REVISION_MISMATCH",
        "STATE_PROVIDER_ACCEPTANCE_SOURCE_TREE_MISMATCH",
        "STATE_PROVIDER_ACCEPTANCE_TOPOLOGY_MISMATCH",
    ):
        if marker not in acceptance_runtime_source:
            fail(f"state-provider runtime acceptance gate is missing {marker!r}")
    for marker in (
        "state_provider_acceptance",
        "state_provider_environment",
        "state_provider_topology_id",
        "runtime_tree_sha",
        "requireStateProviderAcceptance",
        "state_acceptance: stateAcceptance",
    ):
        if marker not in runtime_source:
            fail(f"production runtime is missing state-provider acceptance binding: {marker}")
    if "production: true" not in runtime_source:
        fail("runtime must document the explicit production state-provider path")
    if "Production Privacy Shield state provider must implement transaction()" not in runtime_source:
        fail("production runtime must fail closed without transaction support")
    if "FilePrivacyStateStore is single-host only" not in runtime_source:
        fail("file-backed source must remain explicitly non-production")

    for authority in TRANSACTIONAL_AUTHORITIES:
        source = authority.read_text(encoding="utf-8")
        if "mutatePrivacyState" not in source:
            fail(f"{authority.name} does not use the shared transactional mutation boundary")

    print(
        "Privacy Shield state-provider boundary is consistent; production requires durable distributed "
        f"serializable transactions plus independent exact-deployment acceptance (records={record_count}, "
        f"production_approved={approved_count}). Built-in source providers remain bounded/non-production."
    )


if __name__ == "__main__":
    main()
