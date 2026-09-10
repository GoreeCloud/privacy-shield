#!/usr/bin/env python3
"""Fail-closed validation for Privacy Shield state-provider evaluation and selection governance."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "privacy-shield.state-provider.json"
EVALUATION_SCHEMA = ROOT / "contracts" / "privacy-shield.state-provider-evaluation.schema.json"
SELECTION_SCHEMA = ROOT / "contracts" / "privacy-shield.state-provider-selection.schema.json"
EVALUATION_DIR = ROOT / "evaluations" / "state-providers"
SELECTION_DIR = ROOT / "decisions" / "state-providers"
ACCEPTANCE_DIR = ROOT / "acceptance" / "state-providers"

EVALUATION_CONTRACT_ID = "goreecloud.privacy-shield.state-provider-evaluation.v1"
SELECTION_CONTRACT_ID = "goreecloud.privacy-shield.state-provider-selection.v1"
CONTRACT_ID = SELECTION_CONTRACT_ID
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
REQUIRED_EVALUATION_PRIVACY = {
    "credentials_in_evaluation_record",
    "raw_private_payloads_in_evaluation_record",
    "secret_material_in_evaluation_record",
}
REQUIRED_SELECTION_PRIVACY = {
    "credentials_in_decision_record",
    "raw_private_payloads_in_decision_record",
    "secret_material_in_decision_record",
}
REQUIRED_PRIVACY = REQUIRED_SELECTION_PRIVACY
BUILT_IN_NON_PRODUCTION = {"MemoryPrivacyStateStore", "FilePrivacyStateStore"}
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


def validate_schemas(evaluation_schema: dict, selection_schema: dict) -> None:
    eval_properties = evaluation_schema.get("properties", {})
    if eval_properties.get("schema_version", {}).get("const") != 1:
        fail("evaluation schema version drifted")
    if eval_properties.get("contract_id", {}).get("const") != EVALUATION_CONTRACT_ID:
        fail("evaluation contract id drifted")
    eval_scope = eval_properties.get("scope", {}).get("properties", {})
    if eval_scope.get("service", {}).get("const") != "privacy-shield":
        fail("evaluation service scope drifted")
    if eval_scope.get("capability", {}).get("const") != "durable-authorization-state":
        fail("evaluation capability scope drifted")
    if set(eval_scope.get("authority_state", {}).get("items", {}).get("enum", [])) != REQUIRED_AUTHORITY_STATE:
        fail("evaluation authority-state vocabulary drifted")
    if set(eval_properties.get("criteria", {}).get("properties", {})) != REQUIRED_EVALUATION:
        fail("evaluation criteria vocabulary drifted")
    eval_privacy = eval_properties.get("privacy", {}).get("properties", {})
    if set(eval_privacy) != REQUIRED_EVALUATION_PRIVACY:
        fail("evaluation privacy vocabulary drifted")
    if any(eval_privacy.get(key, {}).get("const") is not False for key in REQUIRED_EVALUATION_PRIVACY):
        fail("evaluation privacy boundary weakened")
    eval_governance = eval_properties.get("governance", {}).get("properties", {})
    if eval_governance.get("authorizing", {}).get("const") is not False:
        fail("provider evaluation must never authorize implementation")
    if eval_governance.get("production_acceptance_authorized", {}).get("const") is not False:
        fail("provider evaluation must never authorize production acceptance")

    properties = selection_schema.get("properties", {})
    if properties.get("schema_version", {}).get("const") != 1:
        fail("selection schema version drifted")
    if properties.get("contract_id", {}).get("const") != SELECTION_CONTRACT_ID:
        fail("selection contract id drifted")
    if "evaluation_record_id" not in selection_schema.get("required", []):
        fail("selection schema must require evaluation_record_id")
    scope = properties.get("scope", {}).get("properties", {})
    if scope.get("service", {}).get("const") != "privacy-shield":
        fail("selection service scope drifted")
    if scope.get("capability", {}).get("const") != "durable-authorization-state":
        fail("selection capability scope drifted")
    if set(scope.get("authority_state", {}).get("items", {}).get("enum", [])) != REQUIRED_AUTHORITY_STATE:
        fail("selection authority-state vocabulary drifted")
    if set(properties.get("evaluation", {}).get("properties", {})) != REQUIRED_EVALUATION:
        fail("selection evaluation vocabulary drifted")
    privacy = properties.get("privacy", {}).get("properties", {})
    if set(privacy) != REQUIRED_SELECTION_PRIVACY:
        fail("selection privacy vocabulary drifted")
    if any(privacy.get(key, {}).get("const") is not False for key in REQUIRED_SELECTION_PRIVACY):
        fail("selection privacy boundary weakened")
    governance = properties.get("governance", {}).get("properties", {})
    if governance.get("production_acceptance_authorized", {}).get("const") is not False:
        fail("state-provider selection must never authorize production acceptance")


def validate_contract(contract: dict) -> None:
    if contract.get("contract_id") != STATE_CONTRACT_ID:
        fail("state-provider contract identity drifted")
    boundary = contract.get("release_boundary", {})
    expected = {
        "provider_evaluation_required_before_selection": True,
        "provider_evaluation_schema": "contracts/privacy-shield.state-provider-evaluation.schema.json",
        "provider_evaluation_records": "evaluations/state-providers/*.json",
        "provider_evaluation_is_selection": False,
        "provider_evaluation_is_production_acceptance": False,
        "provider_selection_required": True,
        "provider_selection_schema": "contracts/privacy-shield.state-provider-selection.schema.json",
        "provider_selection_records": "decisions/state-providers/*.json",
        "provider_selection_is_production_acceptance": False,
    }
    for key, value in expected.items():
        if boundary.get(key) != value:
            fail(f"state-provider release boundary {key} drifted")


def validate_evaluation_record(path: Path, record: dict) -> dict:
    required = {
        "schema_version", "contract_id", "evaluation_id", "provider_id", "provider_name",
        "provider_implementation", "integration_authority", "scope", "criteria",
        "governance", "privacy", "limitations",
    }
    if set(record) != required:
        fail(f"{path}: evaluation top-level fields drifted")
    if record.get("schema_version") != 1 or record.get("contract_id") != EVALUATION_CONTRACT_ID:
        fail(f"{path}: evaluation schema identity mismatch")
    evaluation_id = record.get("evaluation_id")
    provider_id = record.get("provider_id")
    provider_name = record.get("provider_name")
    implementation = record.get("provider_implementation")
    authority = record.get("integration_authority")
    if not isinstance(evaluation_id, str) or not SLUG.fullmatch(evaluation_id):
        fail(f"{path}: invalid evaluation_id")
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
        fail(f"{path}: evaluation scope fields drifted")
    if scope.get("service") != "privacy-shield" or scope.get("capability") != "durable-authorization-state":
        fail(f"{path}: evaluation scope identity drifted")
    authority_state = scope.get("authority_state")
    if not isinstance(authority_state, list) or set(authority_state) != REQUIRED_AUTHORITY_STATE or len(authority_state) != len(REQUIRED_AUTHORITY_STATE):
        fail(f"{path}: evaluation authority_state must contain the complete exact set")
    environments = scope.get("environments")
    if not isinstance(environments, list) or not environments or len(set(environments)) != len(environments):
        fail(f"{path}: evaluation environments must be unique and non-empty")
    if any(not isinstance(item, str) or not SLUG.fullmatch(item) for item in environments):
        fail(f"{path}: invalid evaluation environment")

    criteria = record.get("criteria")
    if not isinstance(criteria, dict) or set(criteria) != REQUIRED_EVALUATION:
        fail(f"{path}: evaluation criteria set drifted")
    results: dict[str, str] = {}
    for name, criterion in criteria.items():
        if not isinstance(criterion, dict) or set(criterion) != {"result", "evidence_refs"}:
            fail(f"{path}: criterion {name} fields drifted")
        result = criterion.get("result")
        refs = criterion.get("evidence_refs")
        if result not in {"pending", "passed", "failed"}:
            fail(f"{path}: invalid result for {name}")
        if not isinstance(refs, list) or len(set(refs)) != len(refs) or any(not isinstance(ref, str) or not ref.strip() for ref in refs):
            fail(f"{path}: invalid evidence_refs for {name}")
        if result in {"passed", "failed"} and not refs:
            fail(f"{path}: resolved criterion {name} requires evidence_refs")
        results[name] = result

    governance = record.get("governance")
    if not isinstance(governance, dict) or set(governance) != {"status", "authorizing", "production_acceptance_authorized", "evidence_reference", "evaluated_at", "valid_until"}:
        fail(f"{path}: evaluation governance fields drifted")
    status = governance.get("status")
    if status not in {"draft", "complete", "failed", "superseded"}:
        fail(f"{path}: invalid evaluation status")
    if governance.get("authorizing") is not False or governance.get("production_acceptance_authorized") is not False:
        fail(f"{path}: provider evaluation cannot authorize implementation or production acceptance")
    if not isinstance(governance.get("evidence_reference"), str) or not governance["evidence_reference"].strip():
        fail(f"{path}: evidence_reference must be non-empty")
    evaluated_at = parse_time(governance.get("evaluated_at"), path, "governance.evaluated_at")
    valid_until = parse_time(governance.get("valid_until"), path, "governance.valid_until")
    if valid_until <= evaluated_at:
        fail(f"{path}: evaluation valid_until must be later than evaluated_at")
    if status == "complete":
        if any(result != "passed" for result in results.values()):
            fail(f"{path}: complete evaluation requires every criterion passed")
        if valid_until <= datetime.now(timezone.utc):
            fail(f"{path}: complete evaluation is stale")
    if status == "failed" and "failed" not in results.values():
        fail(f"{path}: failed evaluation requires at least one failed criterion")

    privacy = record.get("privacy")
    if not isinstance(privacy, dict) or set(privacy) != REQUIRED_EVALUATION_PRIVACY or any(privacy.get(key) is not False for key in REQUIRED_EVALUATION_PRIVACY):
        fail(f"{path}: evaluation privacy boundary violated")
    limitations = record.get("limitations")
    if not isinstance(limitations, list) or any(not isinstance(item, str) or not item.strip() for item in limitations):
        fail(f"{path}: evaluation limitations must be non-empty strings")
    return record


def validate_selection_record(path: Path, record: dict, evaluations: dict[str, dict] | None = None) -> tuple[str, str, str, set[str], dict]:
    required = {
        "schema_version", "contract_id", "decision_id", "provider_id", "provider_name",
        "provider_implementation", "integration_authority", "evaluation_record_id", "scope",
        "evaluation", "governance", "privacy", "limitations",
    }
    if set(record) != required:
        fail(f"{path}: top-level fields drifted")
    if record.get("schema_version") != 1 or record.get("contract_id") != SELECTION_CONTRACT_ID:
        fail(f"{path}: selection schema identity mismatch")

    decision_id = record.get("decision_id")
    provider_id = record.get("provider_id")
    provider_name = record.get("provider_name")
    implementation = record.get("provider_implementation")
    authority = record.get("integration_authority")
    evaluation_record_id = record.get("evaluation_record_id")
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
    if not isinstance(evaluation_record_id, str) or not SLUG.fullmatch(evaluation_record_id):
        fail(f"{path}: invalid evaluation_record_id")

    scope = record.get("scope")
    if not isinstance(scope, dict) or set(scope) != {"service", "capability", "authority_state", "environments"}:
        fail(f"{path}: scope fields drifted")
    if scope.get("service") != "privacy-shield" or scope.get("capability") != "durable-authorization-state":
        fail(f"{path}: selection scope identity drifted")
    authority_state = scope.get("authority_state")
    if not isinstance(authority_state, list) or set(authority_state) != REQUIRED_AUTHORITY_STATE or len(authority_state) != len(REQUIRED_AUTHORITY_STATE):
        fail(f"{path}: authority_state must contain the complete exact set")
    environments = scope.get("environments")
    if not isinstance(environments, list) or not environments or len(set(environments)) != len(environments):
        fail(f"{path}: scope.environments must be unique and non-empty")
    if any(not isinstance(item, str) or not SLUG.fullmatch(item) for item in environments):
        fail(f"{path}: invalid environment")

    evaluation = record.get("evaluation")
    if not isinstance(evaluation, dict) or set(evaluation) != REQUIRED_EVALUATION:
        fail(f"{path}: evaluation set drifted")
    if any(value not in {"pending", "passed", "failed"} for value in evaluation.values()):
        fail(f"{path}: invalid evaluation result")

    governance = record.get("governance")
    if not isinstance(governance, dict) or set(governance) != {"status", "implementation_authorized", "production_acceptance_authorized", "decision_reference", "decided_at", "review_by"}:
        fail(f"{path}: governance fields drifted")
    status = governance.get("status")
    if status not in {"proposed", "approved", "rejected", "superseded", "revoked"}:
        fail(f"{path}: invalid governance.status")
    implementation_authorized = governance.get("implementation_authorized")
    if not isinstance(implementation_authorized, bool):
        fail(f"{path}: implementation_authorized must be boolean")
    if governance.get("production_acceptance_authorized") is not False:
        fail(f"{path}: state-provider selection cannot authorize production acceptance")
    if not isinstance(governance.get("decision_reference"), str) or not governance["decision_reference"].strip():
        fail(f"{path}: decision_reference must be non-empty")
    decided_at = parse_time(governance.get("decided_at"), path, "governance.decided_at")
    review_by = parse_time(governance.get("review_by"), path, "governance.review_by")
    if review_by <= decided_at:
        fail(f"{path}: review_by must be later than decided_at")

    privacy = record.get("privacy")
    if not isinstance(privacy, dict) or set(privacy) != REQUIRED_SELECTION_PRIVACY or any(privacy.get(key) is not False for key in REQUIRED_SELECTION_PRIVACY):
        fail(f"{path}: decision record privacy boundary violated")
    limitations = record.get("limitations")
    if not isinstance(limitations, list) or any(not isinstance(item, str) or not item.strip() for item in limitations):
        fail(f"{path}: limitations must be non-empty strings")

    evaluations = evaluations or {}
    candidate = evaluations.get(evaluation_record_id)
    if candidate is None:
        fail(f"{path}: selection lacks referenced state-provider evaluation {evaluation_record_id}")
    if candidate.get("provider_id") != provider_id or candidate.get("provider_name") != provider_name:
        fail(f"{path}: selection provider identity does not match evaluation")
    if candidate.get("provider_implementation") != implementation or candidate.get("integration_authority") != authority:
        fail(f"{path}: selection implementation authority does not match evaluation")
    if candidate.get("scope") != scope:
        fail(f"{path}: selection scope does not exactly match evaluation")
    candidate_results = {name: item["result"] for name, item in candidate["criteria"].items()}
    if evaluation != candidate_results:
        fail(f"{path}: selection evaluation summary does not match referenced evidence dossier")

    eval_governance = candidate["governance"]
    evaluated_at = parse_time(eval_governance["evaluated_at"], path, "evaluation.governance.evaluated_at")
    evaluation_valid_until = parse_time(eval_governance["valid_until"], path, "evaluation.governance.valid_until")
    if decided_at < evaluated_at:
        fail(f"{path}: selection decision predates its evaluation")
    if review_by > evaluation_valid_until:
        fail(f"{path}: selection review period cannot outlive supporting evaluation")

    if status == "approved":
        if implementation_authorized is not True:
            fail(f"{path}: approved selection must authorize implementation")
        if eval_governance.get("status") != "complete":
            fail(f"{path}: approved selection requires a complete evaluation")
        if evaluation_valid_until <= datetime.now(timezone.utc):
            fail(f"{path}: approved selection references a stale evaluation")
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
    evaluation_schema = load_json(EVALUATION_SCHEMA, "state-provider evaluation schema")
    selection_schema = load_json(SELECTION_SCHEMA, "state-provider selection schema")
    validate_contract(contract)
    validate_schemas(evaluation_schema, selection_schema)

    evaluations: dict[str, dict] = {}
    if EVALUATION_DIR.exists():
        for path in sorted(EVALUATION_DIR.glob("*.json")):
            record = validate_evaluation_record(path, load_json(path, f"state-provider evaluation record {path}"))
            evaluation_id = record["evaluation_id"]
            if evaluation_id in evaluations:
                fail(f"{path}: duplicate evaluation_id {evaluation_id}")
            evaluations[evaluation_id] = record

    records: list[tuple[str, str, str, set[str], dict]] = []
    decision_ids: set[str] = set()
    active_environment: dict[str, str] = {}
    if SELECTION_DIR.exists():
        for path in sorted(SELECTION_DIR.glob("*.json")):
            entry = validate_selection_record(path, load_json(path, f"state-provider selection record {path}"), evaluations)
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

    complete_evaluations = sum(record["governance"]["status"] == "complete" for record in evaluations.values())
    print(
        "Privacy Shield state-provider evaluation/selection validation passed "
        f"(evaluations={len(evaluations)}, complete={complete_evaluations}, selections={len(records)}, approved={len(approved)}, acceptance_authority=false)."
    )


if __name__ == "__main__":
    main()
