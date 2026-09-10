#!/usr/bin/env python3
"""Fail-closed validation for Privacy Shield state-provider selection governance."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "privacy-shield.state-provider.json"
SCHEMA = ROOT / "contracts" / "privacy-shield.state-provider-selection.schema.json"
SELECTION_DIR = ROOT / "decisions" / "state-providers"
ACCEPTANCE_DIR = ROOT / "acceptance" / "state-providers"

CONTRACT_ID = "goreecloud.privacy-shield.state-provider-selection.v1"
STATE_CONTRACT_ID = "goreecloud.privacy-shield.state-provider.v1"
REQUIRED_AUTHORITY_STATE = {
    "consent",
    "policy_versions_and_active_pointer",
    "capability_revocation",
    "single_use_capability_consumption",
    "privacy_evidence_and_chain_head",
}
REQUIRED_EVALUATION = {
    "durability",
    "restart_recovery",
    "atomic_transactions",
    "multi_writer_serializability",
    "distributed_topology",
    "fail_closed_conflict_behavior",
    "backup_restore",
    "migration_rollback",
    "access_control_isolation",
    "privacy_safe_observability",
    "operational_ownership",
}
REQUIRED_PRIVACY = {
    "credentials_in_decision_record",
    "raw_private_payloads_in_decision_record",
    "secret_material_in_decision_record",
}
BUILT_IN_NON_PRODUCTION = {
    "MemoryPrivacyStateStore",
    "FilePrivacyStateStore",
}
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]*$")
REPO = re.compile(r"^GoreeCloud/[A-Za-z0-9._-]+$")


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield state-provider selection validation failed: {message}")


def load_json(path: Path, label: str) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{label} is unreadable or invalid: {exc}")
    if not isinstance(value, dict):
        fail(f"{label} must be a JSON object")
    return value


def parse_time(value: object, path: Path, field: str) -> datetime:
    if not isinstance(value, str):
        fail(f"{path}: {field} must be an offset-aware date-time")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        fail(f"{path}: {field} is not a valid date-time")
    if parsed.tzinfo is None:
        fail(f"{path}: {field} must include a timezone offset")
    return parsed.astimezone(timezone.utc)


def validate_schema(schema: dict) -> None:
    properties = schema.get("properties", {})
    if properties.get("schema_version", {}).get("const") != 1:
        fail("selection schema version drifted")
    if properties.get("contract_id", {}).get("const") != CONTRACT_ID:
        fail("selection contract id drifted")

    scope = properties.get("scope", {}).get("properties", {})
    if scope.get("service", {}).get("const") != "privacy-shield":
        fail("selection service scope drifted")
    if scope.get("capability", {}).get("const") != "durable-authorization-state":
        fail("selection capability scope drifted")
    authority_state = scope.get("authority_state", {}).get("items", {}).get("enum", [])
    if set(authority_state) != REQUIRED_AUTHORITY_STATE:
        fail("selection authority-state vocabulary drifted")

    evaluation = properties.get("evaluation", {}).get("properties", {})
    if set(evaluation) != REQUIRED_EVALUATION:
        fail("selection evaluation vocabulary drifted")

    privacy = properties.get("privacy", {}).get("properties", {})
    if set(privacy) != REQUIRED_PRIVACY:
        fail("selection privacy vocabulary drifted")
    for key in REQUIRED_PRIVACY:
        if privacy.get(key, {}).get("const") is not False:
            fail(f"selection privacy boundary weakened: {key}")

    governance = properties.get("governance", {}).get("properties", {})
    if governance.get("production_acceptance_authorized", {}).get("const") is not False:
        fail("state-provider selection must never authorize production acceptance")


def validate_contract(contract: dict) -> None:
    if contract.get("contract_id") != STATE_CONTRACT_ID:
        fail("state-provider contract identity drifted")
    boundary = contract.get("release_boundary", {})
    expected = {
        "provider_selection_required": True,
        "provider_selection_schema": "contracts/privacy-shield.state-provider-selection.schema.json",
        "provider_selection_records": "decisions/state-providers/*.json",
        "provider_selection_is_production_acceptance": False,
    }
    for key, value in expected.items():
        if boundary.get(key) != value:
            fail(f"state-provider release boundary {key} drifted")


def validate_selection_record(path: Path, record: dict) -> tuple[str, str, str, set[str], dict]:
    required = {
        "schema_version",
        "contract_id",
        "decision_id",
        "provider_id",
        "provider_name",
        "provider_implementation",
        "integration_authority",
        "scope",
        "evaluation",
        "governance",
        "privacy",
        "limitations",
    }
    if set(record) != required:
        fail(f"{path}: top-level fields drifted")
    if record.get("schema_version") != 1 or record.get("contract_id") != CONTRACT_ID:
        fail(f"{path}: selection schema identity mismatch")

    decision_id = record.get("decision_id")
    provider_id = record.get("provider_id")
    provider_name = record.get("provider_name")
    implementation = record.get("provider_implementation")
    authority = record.get("integration_authority")
    if not isinstance(decision_id, str) or not SLUG.fullmatch(decision_id):
        fail(f"{path}: invalid decision_id")
    if not isinstance(provider_id, str) or not SLUG.fullmatch(provider_id):
        fail(f"{path}: invalid provider_id")
    if not isinstance(provider_name, str) or not provider_name.strip():
        fail(f"{path}: provider_name must be non-empty")
    if not isinstance(implementation, str) or not implementation.strip():
        fail(f"{path}: provider_implementation must be non-empty")
    if not isinstance(authority, str) or not REPO.fullmatch(authority):
        fail(f"{path}: invalid integration_authority")

    scope = record.get("scope")
    if not isinstance(scope, dict) or set(scope) != {"service", "capability", "authority_state", "environments"}:
        fail(f"{path}: scope fields drifted")
    if scope.get("service") != "privacy-shield":
        fail(f"{path}: scope.service must be privacy-shield")
    if scope.get("capability") != "durable-authorization-state":
        fail(f"{path}: scope.capability drifted")
    authority_state = scope.get("authority_state")
    if not isinstance(authority_state, list) or set(authority_state) != REQUIRED_AUTHORITY_STATE or len(authority_state) != len(REQUIRED_AUTHORITY_STATE):
        fail(f"{path}: authority_state must contain the complete exact authority-state set")
    environments = scope.get("environments")
    if not isinstance(environments, list) or not environments:
        fail(f"{path}: scope.environments must be non-empty")
    if any(not isinstance(item, str) or not SLUG.fullmatch(item) for item in environments):
        fail(f"{path}: invalid environment")
    if len(set(environments)) != len(environments):
        fail(f"{path}: duplicate environment")

    evaluation = record.get("evaluation")
    if not isinstance(evaluation, dict) or set(evaluation) != REQUIRED_EVALUATION:
        fail(f"{path}: evaluation set drifted")
    if any(value not in {"pending", "passed", "failed"} for value in evaluation.values()):
        fail(f"{path}: invalid evaluation result")

    governance = record.get("governance")
    if not isinstance(governance, dict) or set(governance) != {
        "status", "implementation_authorized", "production_acceptance_authorized",
        "decision_reference", "decided_at", "review_by"
    }:
        fail(f"{path}: governance fields drifted")
    status = governance.get("status")
    if status not in {"proposed", "approved", "rejected", "superseded", "revoked"}:
        fail(f"{path}: invalid governance.status")
    implementation_authorized = governance.get("implementation_authorized")
    if not isinstance(implementation_authorized, bool):
        fail(f"{path}: implementation_authorized must be boolean")
    if governance.get("production_acceptance_authorized") is not False:
        fail(f"{path}: state-provider selection cannot authorize production acceptance")
    decision_reference = governance.get("decision_reference")
    if not isinstance(decision_reference, str) or not decision_reference.strip():
        fail(f"{path}: decision_reference must be non-empty")
    decided_at = parse_time(governance.get("decided_at"), path, "governance.decided_at")
    review_by = parse_time(governance.get("review_by"), path, "governance.review_by")
    if review_by <= decided_at:
        fail(f"{path}: review_by must be later than decided_at")

    privacy = record.get("privacy")
    if not isinstance(privacy, dict) or set(privacy) != REQUIRED_PRIVACY:
        fail(f"{path}: privacy fields drifted")
    if any(privacy.get(key) is not False for key in REQUIRED_PRIVACY):
        fail(f"{path}: decision record privacy boundary violated")

    limitations = record.get("limitations")
    if not isinstance(limitations, list) or any(not isinstance(item, str) or not item.strip() for item in limitations):
        fail(f"{path}: limitations must be a list of non-empty strings")

    if status == "approved":
        if implementation_authorized is not True:
            fail(f"{path}: approved selection must authorize implementation")
        if any(result != "passed" for result in evaluation.values()):
            fail(f"{path}: approved selection requires every evaluation criterion passed")
        if review_by <= datetime.now(timezone.utc):
            fail(f"{path}: approved selection is stale and requires review")
        if implementation in BUILT_IN_NON_PRODUCTION:
            fail(f"{path}: built-in non-production provider cannot be approved for production integration")
    elif implementation_authorized:
        fail(f"{path}: only an approved selection may authorize implementation")

    return decision_id, provider_id, implementation, set(environments), record


def main() -> None:
    contract = load_json(CONTRACT, "state-provider contract")
    schema = load_json(SCHEMA, "state-provider selection schema")
    validate_contract(contract)
    validate_schema(schema)

    records: list[tuple[str, str, str, set[str], dict]] = []
    decision_ids: set[str] = set()
    active_environment: dict[str, str] = {}
    if SELECTION_DIR.exists():
        for path in sorted(SELECTION_DIR.glob("*.json")):
            record = load_json(path, f"state-provider selection record {path}")
            entry = validate_selection_record(path, record)
            decision_id, _, _, environments, selected_record = entry
            if decision_id in decision_ids:
                fail(f"{path}: duplicate decision_id {decision_id}")
            decision_ids.add(decision_id)
            records.append(entry)
            if selected_record["governance"]["status"] == "approved":
                for environment in environments:
                    prior = active_environment.get(environment)
                    if prior is not None:
                        fail(f"{path}: multiple approved state providers for environment {environment}: {prior}, {decision_id}")
                    active_environment[environment] = decision_id

    approved = [entry for entry in records if entry[4]["governance"]["status"] == "approved"]

    if ACCEPTANCE_DIR.exists():
        for path in sorted(ACCEPTANCE_DIR.glob("*.json")):
            acceptance = load_json(path, f"state-provider acceptance record {path}")
            provider_id = acceptance.get("provider_id")
            implementation = acceptance.get("provider_implementation")
            authority = acceptance.get("provider_authority")
            deployment = acceptance.get("deployment")
            environment = deployment.get("environment") if isinstance(deployment, dict) else None
            match = any(
                selected_provider == provider_id
                and selected_implementation == implementation
                and selected_record["integration_authority"] == authority
                and environment in selected_environments
                for _, selected_provider, selected_implementation, selected_environments, selected_record in approved
            )
            if not match:
                fail(f"{path}: state-provider acceptance lacks a matching active approved provider selection")

    print(
        "Privacy Shield state-provider selection validation passed "
        f"(records={len(records)}, approved={len(approved)}, acceptance_authority=false)."
    )


if __name__ == "__main__":
    main()
