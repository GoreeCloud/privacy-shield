#!/usr/bin/env python3
"""Fail-closed validation for Privacy Shield production provider acceptance records."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
STATE_SCHEMA = ROOT / "contracts" / "privacy-shield.state-provider-acceptance.schema.json"
SIGNING_SCHEMA = ROOT / "contracts" / "privacy-shield.signing-key-provider-acceptance.schema.json"
STATE_DIR = ROOT / "acceptance" / "state-providers"
STATE_SELECTION_DIR = ROOT / "decisions" / "state-providers"
SIGNING_DIR = ROOT / "acceptance" / "signing-key-providers"

SLUG = re.compile(r"^[a-z0-9][a-z0-9-]*$")
REPO = re.compile(r"^GoreeCloud/[A-Za-z0-9._-]+$")
SHA40 = re.compile(r"^[0-9a-f]{40}$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")
EVIDENCE_REF = re.compile(r"^evidence\+sha256:([0-9a-f]{64}):\S+$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

STATE_QUALIFICATIONS = {
    "concurrent_writer_serialization",
    "atomic_commit_and_rollback",
    "partition_and_conflict_behavior",
    "restart_recovery",
    "corrupt_state_recovery",
    "backup_and_restore",
    "migration_and_rollback",
    "access_control_isolation",
    "operational_observability",
}
STATE_EVIDENCE_CATEGORIES = {
    "concurrency",
    "atomicity",
    "partition-conflict",
    "restart-recovery",
    "corrupt-state-recovery",
    "backup-restore",
    "migration-rollback",
    "access-control",
    "observability",
}
STATE_QUALIFICATION_TO_CATEGORY = {
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
SIGNING_QUALIFICATIONS = {
    "secure_key_generation",
    "non_exportability",
    "caller_authorization",
    "producer_identity_binding",
    "rotation",
    "retirement",
    "emergency_revocation",
    "stale_untrusted_rejection",
    "signing_audit",
    "outage_and_degraded_behavior",
    "recovery_and_continuity",
    "access_control_review",
    "exact_runtime_integration",
}
RESOLVED_RESULTS = {"passed", "failed"}
ACCEPTANCE_STATES = {"pending", "passed", "failed", "revoked"}


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield provider acceptance validation failed: {message}")


def load_json(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{label} is unreadable or invalid: {exc}")
    if not isinstance(value, dict):
        fail(f"{label} must be an object")
    return value


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def parse_time(value: Any, label: str) -> datetime:
    require(isinstance(value, str) and value and value == value.strip(), f"{label} must be canonical text")
    require(bool(re.search(r"(?:Z|[+-]\d{2}:\d{2})$", value)), f"{label} must be timezone-qualified")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        fail(f"{label} must be a valid date-time: {exc}")
    require(parsed.tzinfo is not None, f"{label} must be timezone-qualified")
    return parsed.astimezone(timezone.utc)


def load_state_selections() -> dict[str, dict[str, Any]]:
    selections: dict[str, dict[str, Any]] = {}
    if not STATE_SELECTION_DIR.exists():
        return selections
    for path in sorted(STATE_SELECTION_DIR.glob("*.json")):
        record = load_json(path, f"state selection {path}")
        decision_id = record.get("decision_id")
        require(
            isinstance(decision_id, str) and SLUG.fullmatch(decision_id) is not None,
            f"state selection {path}: invalid decision_id",
        )
        require(decision_id not in selections, f"duplicate state selection decision_id: {decision_id}")
        selections[decision_id] = record
    return selections


def validate_state_selection_binding(
    record: dict[str, Any],
    selections: dict[str, dict[str, Any]],
    *,
    now: datetime,
    valid_until: datetime,
    label: str,
) -> None:
    decision_id = record["selection_decision_id"]
    selection = selections.get(decision_id)
    require(selection is not None, f"{label}: selected state-provider decision does not exist")

    governance = selection.get("governance")
    require(isinstance(governance, dict), f"{label}: selection governance is invalid")
    require(governance.get("status") == "approved", f"{label}: selection is not approved")
    require(governance.get("implementation_authorized") is True, f"{label}: selection does not authorize implementation")
    require(
        governance.get("production_acceptance_authorized") is False,
        f"{label}: selection must not self-authorize production acceptance",
    )

    require(selection.get("provider_id") == record["provider_id"], f"{label}: selection provider_id mismatch")
    require(
        selection.get("provider_implementation") == record["provider_implementation"],
        f"{label}: selection provider_implementation mismatch",
    )
    require(
        selection.get("integration_authority") == record["provider_authority"],
        f"{label}: selection provider authority mismatch",
    )

    scope = selection.get("scope")
    require(isinstance(scope, dict), f"{label}: selection scope is invalid")
    require(scope.get("service") == "privacy-shield", f"{label}: selection service scope mismatch")
    require(
        scope.get("capability") == "durable-authorization-state",
        f"{label}: selection capability scope mismatch",
    )
    environments = scope.get("environments")
    require(
        isinstance(environments, list) and record["deployment"]["environment"] in environments,
        f"{label}: deployment environment is outside selection scope",
    )

    review_by = parse_time(governance.get("review_by"), f"{label}.selection.review_by")
    require(review_by > now, f"{label}: provider selection review boundary has expired")
    require(valid_until <= review_by, f"{label}: acceptance cannot outlive provider selection review boundary")


def content_addressed_reference(value: Any, label: str, explicit_sha: Any = None) -> None:
    require(isinstance(value, str) and value == value.strip(), f"{label} must be canonical text")
    match = EVIDENCE_REF.fullmatch(value)
    require(match is not None, f"{label} must be content-addressed evidence+sha256")
    if explicit_sha is not None:
        require(isinstance(explicit_sha, str) and SHA256.fullmatch(explicit_sha) is not None, f"{label} sha256 is invalid")
        require(match.group(1) == explicit_sha, f"{label} digest does not match sha256 field")


def validate_state_acceptance(record: dict[str, Any], *, now: datetime | None = None, label: str = "state acceptance", selections: dict[str, dict[str, Any]] | None = None) -> None:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    expected = {
        "schema_version","contract_id","selection_decision_id","provider_id","provider_implementation","provider_authority",
        "exact_source_revision","source_tree_sha","provider_version","deployment","capabilities",
        "qualification","privacy","acceptance","evidence","limitations",
    }
    require(set(record) == expected, f"{label}: top-level fields drifted")
    require(record["schema_version"] == 1, f"{label}: schema_version drifted")
    require(record["contract_id"] == "goreecloud.privacy-shield.state-provider-acceptance.v1", f"{label}: contract_id drifted")
    require(isinstance(record["selection_decision_id"], str) and SLUG.fullmatch(record["selection_decision_id"]) is not None, f"{label}: invalid selection_decision_id")
    require(isinstance(record["provider_id"], str) and SLUG.fullmatch(record["provider_id"]) is not None, f"{label}: invalid provider_id")
    require(isinstance(record["provider_implementation"], str) and record["provider_implementation"].strip(), f"{label}: provider_implementation required")
    require(isinstance(record["provider_authority"], str) and REPO.fullmatch(record["provider_authority"]) is not None, f"{label}: invalid provider_authority")
    require(isinstance(record["exact_source_revision"], str) and SHA40.fullmatch(record["exact_source_revision"]) is not None, f"{label}: invalid exact_source_revision")
    require(isinstance(record["source_tree_sha"], str) and SHA40.fullmatch(record["source_tree_sha"]) is not None, f"{label}: invalid source_tree_sha")
    require(isinstance(record["provider_version"], str) and record["provider_version"].strip(), f"{label}: provider_version required")

    deployment = record["deployment"]
    require(isinstance(deployment, dict) and set(deployment) == {"environment","topology_id","distributed","multi_writer","replica_count"}, f"{label}: deployment fields drifted")
    require(isinstance(deployment["environment"], str) and deployment["environment"].strip(), f"{label}: deployment.environment required")
    require(isinstance(deployment["topology_id"], str) and deployment["topology_id"].strip(), f"{label}: topology_id required")
    require(deployment["distributed"] is True and deployment["multi_writer"] is True, f"{label}: production state provider must be distributed multi-writer")
    require(isinstance(deployment["replica_count"], int) and not isinstance(deployment["replica_count"], bool) and deployment["replica_count"] >= 2, f"{label}: replica_count must be >=2")

    capabilities = record["capabilities"]
    required_capabilities = {"durable","restart_recovery","atomic_transactions","multi_writer_serializable","distributed","fail_closed_on_conflict"}
    require(isinstance(capabilities, dict) and set(capabilities) == required_capabilities, f"{label}: capability fields drifted")
    require(all(capabilities[name] is True for name in required_capabilities), f"{label}: all production capabilities must be true")

    qualification = record["qualification"]
    require(isinstance(qualification, dict) and set(qualification) == STATE_QUALIFICATIONS, f"{label}: qualification fields drifted")
    require(all(value in {"pending","passed","failed"} for value in qualification.values()), f"{label}: invalid qualification state")

    privacy = record["privacy"]
    require(isinstance(privacy, dict) and set(privacy) == {"raw_private_payloads_in_acceptance_evidence","secret_material_in_acceptance_evidence"}, f"{label}: privacy fields drifted")
    require(all(value is False for value in privacy.values()), f"{label}: acceptance evidence privacy boundary violated")

    acceptance = record["acceptance"]
    require(isinstance(acceptance, dict) and set(acceptance) == {"status","production_approved","exact_revision_required","observed_date","valid_until"}, f"{label}: acceptance fields drifted")
    require(acceptance["status"] in ACCEPTANCE_STATES, f"{label}: invalid acceptance.status")
    require(isinstance(acceptance["production_approved"], bool), f"{label}: production_approved must be boolean")
    require(acceptance["exact_revision_required"] is True, f"{label}: exact revision must remain required")
    require(isinstance(acceptance["observed_date"], str) and DATE.fullmatch(acceptance["observed_date"]) is not None, f"{label}: observed_date invalid")
    observed_date = datetime.strptime(acceptance["observed_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    require(observed_date.date() <= now.date(), f"{label}: observed_date cannot be future-dated")
    valid_until = parse_time(acceptance["valid_until"], f"{label}.acceptance.valid_until")
    if selections is not None:
        validate_state_selection_binding(
            record,
            selections,
            now=now,
            valid_until=valid_until,
            label=label,
        )

    evidence = record["evidence"]
    require(isinstance(evidence, list) and evidence, f"{label}: evidence must be non-empty")
    passed_categories: set[str] = set()
    for index, item in enumerate(evidence):
        require(isinstance(item, dict), f"{label}: evidence[{index}] must be an object")
        allowed = {"id","category","result","reference","sha256","detail"}
        require(set(item).issubset(allowed) and {"id","category","result","reference"}.issubset(item), f"{label}: evidence[{index}] fields drifted")
        require(isinstance(item["id"], str) and SLUG.fullmatch(item["id"]) is not None, f"{label}: evidence[{index}].id invalid")
        require(item["result"] in {"passed","failed","informational"}, f"{label}: evidence[{index}].result invalid")
        if item["result"] in RESOLVED_RESULTS:
            content_addressed_reference(item["reference"], f"{label}.evidence[{index}].reference", item.get("sha256"))
        if item["result"] == "passed":
            passed_categories.add(item["category"])

    status = acceptance["status"]
    if status == "passed":
        require(acceptance["production_approved"] is True, f"{label}: passed acceptance must set production_approved=true")
        require(all(value == "passed" for value in qualification.values()), f"{label}: passed acceptance requires every qualification passed")
        require(valid_until > now, f"{label}: passed acceptance is expired")
        for q, category in STATE_QUALIFICATION_TO_CATEGORY.items():
            require(category in passed_categories, f"{label}: passed acceptance lacks passed evidence for {q}")
    else:
        require(acceptance["production_approved"] is False, f"{label}: only passed acceptance may approve production")

    limitations = record["limitations"]
    require(isinstance(limitations, list) and all(isinstance(x, str) and x.strip() for x in limitations), f"{label}: limitations invalid")


def validate_signing_acceptance(record: dict[str, Any], *, now: datetime | None = None, label: str = "signing acceptance") -> None:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    expected = {
        "schema_version","contract_id","selection_decision_id","provider_id","provider_implementation","provider_authority",
        "provider_version","exact_source_revision","deployment","producer_identity","algorithms",
        "qualification","privacy","acceptance","evidence","limitations",
    }
    require(set(record) == expected, f"{label}: top-level fields drifted")
    require(record["schema_version"] == 1, f"{label}: schema_version drifted")
    require(record["contract_id"] == "goreecloud.privacy-shield.signing-key-provider-acceptance.v1", f"{label}: contract_id drifted")
    require(isinstance(record["selection_decision_id"], str) and SLUG.fullmatch(record["selection_decision_id"]) is not None, f"{label}: invalid selection_decision_id")
    require(isinstance(record["provider_id"], str) and SLUG.fullmatch(record["provider_id"]) is not None, f"{label}: invalid provider_id")
    require(isinstance(record["provider_implementation"], str) and record["provider_implementation"].strip(), f"{label}: provider_implementation required")
    require(isinstance(record["provider_authority"], str) and REPO.fullmatch(record["provider_authority"]) is not None, f"{label}: invalid provider_authority")
    require(isinstance(record["provider_version"], str) and record["provider_version"].strip(), f"{label}: provider_version required")
    require(isinstance(record["exact_source_revision"], str) and SHA40.fullmatch(record["exact_source_revision"]) is not None, f"{label}: invalid exact_source_revision")
    require(record["producer_identity"] == "goreecloud-privacy-shield", f"{label}: producer_identity must be goreecloud-privacy-shield")

    deployment = record["deployment"]
    require(isinstance(deployment, dict) and set(deployment) == {"environment","deployment_id"}, f"{label}: deployment fields drifted")
    require(all(isinstance(deployment[k], str) and deployment[k].strip() for k in deployment), f"{label}: deployment fields must be non-empty")

    algorithms = record["algorithms"]
    require(isinstance(algorithms, list) and algorithms and len(algorithms) == len(set(algorithms)), f"{label}: algorithms must be unique and non-empty")
    require(all(isinstance(x, str) and x.strip() for x in algorithms), f"{label}: algorithms invalid")

    qualification = record["qualification"]
    require(isinstance(qualification, dict) and set(qualification) == SIGNING_QUALIFICATIONS, f"{label}: qualification fields drifted")
    require(all(value in {"pending","passed","failed"} for value in qualification.values()), f"{label}: invalid qualification state")

    privacy = record["privacy"]
    expected_privacy = {"raw_private_payloads_in_acceptance_evidence","secret_material_in_acceptance_evidence","full_capability_tokens_in_acceptance_evidence"}
    require(isinstance(privacy, dict) and set(privacy) == expected_privacy, f"{label}: privacy fields drifted")
    require(all(value is False for value in privacy.values()), f"{label}: acceptance evidence privacy boundary violated")

    acceptance = record["acceptance"]
    require(isinstance(acceptance, dict) and set(acceptance) == {"status","production_approved","exact_revision_required","valid_until"}, f"{label}: acceptance fields drifted")
    require(acceptance["status"] in ACCEPTANCE_STATES, f"{label}: invalid acceptance.status")
    require(isinstance(acceptance["production_approved"], bool), f"{label}: production_approved must be boolean")
    require(acceptance["exact_revision_required"] is True, f"{label}: exact revision must remain required")
    valid_until = parse_time(acceptance["valid_until"], f"{label}.acceptance.valid_until")

    evidence = record["evidence"]
    require(isinstance(evidence, list) and evidence, f"{label}: evidence must be non-empty")
    passed_categories: set[str] = set()
    for index, item in enumerate(evidence):
        require(isinstance(item, dict) and set(item) == {"id","category","result","reference"}, f"{label}: evidence[{index}] fields drifted")
        require(isinstance(item["id"], str) and SLUG.fullmatch(item["id"]) is not None, f"{label}: evidence[{index}].id invalid")
        require(isinstance(item["category"], str) and item["category"].strip(), f"{label}: evidence[{index}].category invalid")
        require(item["result"] in {"passed","failed","informational"}, f"{label}: evidence[{index}].result invalid")
        if item["result"] in RESOLVED_RESULTS:
            content_addressed_reference(item["reference"], f"{label}.evidence[{index}].reference")
        if item["result"] == "passed":
            passed_categories.add(item["category"])

    status = acceptance["status"]
    if status == "passed":
        require(acceptance["production_approved"] is True, f"{label}: passed acceptance must set production_approved=true")
        require(all(value == "passed" for value in qualification.values()), f"{label}: passed acceptance requires every qualification passed")
        require(valid_until > now, f"{label}: passed acceptance is expired")
        missing = SIGNING_QUALIFICATIONS - passed_categories
        require(not missing, f"{label}: passed acceptance lacks passed evidence categories: {sorted(missing)}")
    else:
        require(acceptance["production_approved"] is False, f"{label}: only passed acceptance may approve production")

    limitations = record["limitations"]
    require(isinstance(limitations, list) and all(isinstance(x, str) and x.strip() for x in limitations), f"{label}: limitations invalid")


def validate_schema_boundaries() -> None:
    state = load_json(STATE_SCHEMA, "state acceptance schema")
    signing = load_json(SIGNING_SCHEMA, "signing acceptance schema")
    require(state.get("additionalProperties") is False, "state acceptance schema must remain closed")
    require(signing.get("additionalProperties") is False, "signing acceptance schema must remain closed")
    require("selection_decision_id" in state.get("required", []), "state acceptance must bind selection_decision_id")
    require("selection_decision_id" in signing.get("required", []), "signing acceptance must bind selection_decision_id")
    require(state.get("properties", {}).get("acceptance", {}).get("properties", {}).get("exact_revision_required", {}).get("const") is True, "state exact-revision requirement drifted")
    require(signing.get("properties", {}).get("acceptance", {}).get("properties", {}).get("exact_revision_required", {}).get("const") is True, "signing exact-revision requirement drifted")


def validate_repository() -> tuple[int, int]:
    validate_schema_boundaries()
    state_count = 0
    signing_count = 0
    state_selections = load_state_selections()
    if STATE_DIR.exists():
        for path in sorted(STATE_DIR.glob("*.json")):
            validate_state_acceptance(
                load_json(path, f"state acceptance {path}"),
                label=str(path),
                selections=state_selections,
            )
            state_count += 1
    if SIGNING_DIR.exists():
        for path in sorted(SIGNING_DIR.glob("*.json")):
            validate_signing_acceptance(load_json(path, f"signing acceptance {path}"), label=str(path))
            signing_count += 1
    return state_count, signing_count


def main() -> None:
    state_count, signing_count = validate_repository()
    print(
        "Privacy Shield provider production-acceptance gate passed "
        f"(state_records={state_count}, signing_records={signing_count}; "
        "no record is accepted merely because source validation passed)."
    )


if __name__ == "__main__":
    main()
