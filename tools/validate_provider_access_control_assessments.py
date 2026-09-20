#!/usr/bin/env python3
"""Validate Privacy Shield external provider access-control assessments."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "contracts" / "privacy-shield.provider-access-control-assessment.schema.json"
ASSESSMENT_DIR = ROOT / "reviews" / "provider-access-control"
STATE_QUALIFICATION = ROOT / "contracts" / "privacy-shield.state-provider-qualification.json"
SIGNING_QUALIFICATION = ROOT / "contracts" / "privacy-shield.signing-key-qualification.json"
README = ASSESSMENT_DIR / "README.md"

CONTRACT_ID = "goreecloud.privacy-shield.provider-access-control-assessment.v1"
SCHEMA_PATH = "contracts/privacy-shield.provider-access-control-assessment.schema.json"
RECORD_PATH = "reviews/provider-access-control/*.json"
SHA40 = re.compile(r"^[0-9a-f]{40}$")
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]*$")
REPO = re.compile(r"^GoreeCloud/[A-Za-z0-9._-]+$")
EVIDENCE = re.compile(r"^evidence\+sha256:[0-9a-f]{64}:(?:https://|github://|gdrive://|qualification-run:|artifact:)\S+$")
CONTROLS = {
    "boundary_exclusivity",
    "workload_identity",
    "least_privilege_authorization",
    "credential_lifecycle",
    "direct_bypass_prevention",
    "fail_closed_unauthorized_access",
    "administrative_access_governance",
    "privacy_safe_audit",
    "production_grade_controls_only",
}
PRIVACY_FIELDS = {
    "credentials_in_assessment_record",
    "secret_material_in_assessment_record",
    "raw_private_payloads_in_assessment_record",
    "full_capability_tokens_in_assessment_record",
}
PROVIDER_TYPES = {
    "state-provider": "durable-authorization-state",
    "signing-key-provider": "operation-bound-capability-signing",
}


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield provider access-control assessment validation failed: {message}")


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def load_json(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{label} is unreadable or invalid JSON: {exc}")
    require(isinstance(value, dict), f"{label} must be a JSON object")
    return value


def parse_time(value: Any, label: str) -> datetime:
    require(isinstance(value, str) and value == value.strip(), f"{label} must be canonical text")
    require(bool(re.search(r"(?:Z|[+-]\d{2}:\d{2})$", value)), f"{label} must be timezone-qualified")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        fail(f"{label} must be a valid date-time: {exc}")
    require(parsed.tzinfo is not None, f"{label} must be timezone-qualified")
    return parsed.astimezone(timezone.utc)


def validate_record(record: dict[str, Any], *, label: str, now: datetime | None = None) -> None:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    expected = {
        "schema_version", "contract_id", "assessment_id", "provider_type", "provider_id",
        "provider_implementation", "provider_authority", "provider_version",
        "exact_source_revision", "source_tree_sha", "deployment", "scope", "controls",
        "governance", "privacy", "limitations",
    }
    require(set(record) == expected, f"{label}: top-level fields drifted")
    require(record["schema_version"] == 1, f"{label}: schema_version drifted")
    require(record["contract_id"] == CONTRACT_ID, f"{label}: contract_id drifted")
    require(isinstance(record["assessment_id"], str) and SLUG.fullmatch(record["assessment_id"]) is not None, f"{label}: invalid assessment_id")
    provider_type = record["provider_type"]
    require(provider_type in PROVIDER_TYPES, f"{label}: invalid provider_type")
    require(isinstance(record["provider_id"], str) and SLUG.fullmatch(record["provider_id"]) is not None, f"{label}: invalid provider_id")
    require(isinstance(record["provider_implementation"], str) and record["provider_implementation"].strip(), f"{label}: provider_implementation required")
    require(isinstance(record["provider_authority"], str) and REPO.fullmatch(record["provider_authority"]) is not None, f"{label}: invalid provider_authority")
    require(isinstance(record["provider_version"], str) and record["provider_version"].strip(), f"{label}: provider_version required")
    require(isinstance(record["exact_source_revision"], str) and SHA40.fullmatch(record["exact_source_revision"]) is not None, f"{label}: exact_source_revision must be immutable")
    require(isinstance(record["source_tree_sha"], str) and SHA40.fullmatch(record["source_tree_sha"]) is not None, f"{label}: source_tree_sha must be immutable")

    deployment = record["deployment"]
    require(isinstance(deployment, dict) and set(deployment) == {"environment", "boundary_id"}, f"{label}: deployment fields drifted")
    require(isinstance(deployment["environment"], str) and SLUG.fullmatch(deployment["environment"]) is not None, f"{label}: deployment.environment invalid")
    require(isinstance(deployment["boundary_id"], str) and deployment["boundary_id"].strip(), f"{label}: deployment.boundary_id required")

    scope = record["scope"]
    require(isinstance(scope, dict) and set(scope) == {"service", "capability", "allowed_runtime_identity", "direct_provider_access_by_end_users"}, f"{label}: scope fields drifted")
    require(scope["service"] == "privacy-shield", f"{label}: scope.service drifted")
    require(scope["capability"] == PROVIDER_TYPES[provider_type], f"{label}: provider_type/capability mismatch")
    require(isinstance(scope["allowed_runtime_identity"], str) and scope["allowed_runtime_identity"].strip(), f"{label}: allowed_runtime_identity required")
    require(scope["direct_provider_access_by_end_users"] is False, f"{label}: direct provider access by end users is forbidden")

    controls = record["controls"]
    require(isinstance(controls, dict) and set(controls) == CONTROLS, f"{label}: control vocabulary drifted")
    resolved = 0
    failed = 0
    for name, criterion in controls.items():
        require(isinstance(criterion, dict) and set(criterion) == {"result", "evidence_refs"}, f"{label}: {name} fields drifted")
        result = criterion["result"]
        refs = criterion["evidence_refs"]
        require(result in {"pending", "passed", "failed"}, f"{label}: invalid result for {name}")
        require(isinstance(refs, list) and len(refs) == len(set(refs)), f"{label}: {name} evidence_refs must be a unique list")
        require(all(isinstance(ref, str) and EVIDENCE.fullmatch(ref) is not None for ref in refs), f"{label}: {name} has invalid evidence reference")
        if result != "pending":
            resolved += 1
            require(bool(refs), f"{label}: resolved control {name} requires evidence")
        if result == "failed":
            failed += 1

    governance = record["governance"]
    require(isinstance(governance, dict) and set(governance) == {"status", "authorizing", "production_acceptance_authorized", "assessed_at", "valid_until"}, f"{label}: governance fields drifted")
    status = governance["status"]
    require(status in {"draft", "complete", "failed", "superseded"}, f"{label}: invalid governance.status")
    require(governance["authorizing"] is False, f"{label}: assessment must remain non-authorizing")
    require(governance["production_acceptance_authorized"] is False, f"{label}: assessment cannot authorize production acceptance")
    assessed_at = parse_time(governance["assessed_at"], f"{label}.governance.assessed_at")
    valid_until = parse_time(governance["valid_until"], f"{label}.governance.valid_until")
    require(assessed_at <= now, f"{label}: assessed_at cannot be future-dated")
    require(valid_until > assessed_at, f"{label}: valid_until must be after assessed_at")

    if status == "complete":
        require(all(item["result"] == "passed" for item in controls.values()), f"{label}: complete assessment requires all controls passed")
        require(valid_until > now, f"{label}: complete assessment is stale")
    elif status == "failed":
        require(failed > 0, f"{label}: failed assessment requires at least one failed control")
    elif status == "draft":
        require(not all(item["result"] == "passed" for item in controls.values()), f"{label}: fully passed assessment must be complete, not draft")

    privacy = record["privacy"]
    require(isinstance(privacy, dict) and set(privacy) == PRIVACY_FIELDS, f"{label}: privacy fields drifted")
    require(all(privacy[field] is False for field in PRIVACY_FIELDS), f"{label}: assessment privacy boundary violated")

    limitations = record["limitations"]
    require(isinstance(limitations, list) and len(limitations) == len(set(limitations)), f"{label}: limitations must be a unique list")
    require(all(isinstance(item, str) and item.strip() for item in limitations), f"{label}: limitations must contain non-empty strings")


def validate_record_identity(record: dict[str, Any], *, path: Path, seen_ids: set[str]) -> None:
    assessment_id = record.get("assessment_id")
    require(
        isinstance(assessment_id, str) and SLUG.fullmatch(assessment_id) is not None,
        f"{path}: invalid assessment_id",
    )
    require(path.stem == assessment_id, f"{path}: filename must match assessment_id")
    require(assessment_id not in seen_ids, f"{path}: duplicate assessment_id: {assessment_id}")
    seen_ids.add(assessment_id)


def validate_schema() -> None:
    schema = load_json(SCHEMA, "access-control assessment schema")
    require(schema.get("additionalProperties") is False, "schema must remain closed")
    require(schema.get("properties", {}).get("contract_id", {}).get("const") == CONTRACT_ID, "schema contract id drifted")
    control_props = schema.get("properties", {}).get("controls", {}).get("properties", {})
    require(set(control_props) == CONTROLS, "schema control vocabulary drifted")
    require(set(schema.get("properties", {}).get("controls", {}).get("required", [])) == CONTROLS, "schema required controls drifted")
    privacy_props = schema.get("properties", {}).get("privacy", {}).get("properties", {})
    require(set(privacy_props) == PRIVACY_FIELDS, "schema privacy vocabulary drifted")
    require(all(privacy_props[field].get("const") is False for field in PRIVACY_FIELDS), "schema privacy boundary weakened")


def validate_qualification_binding(path: Path, label: str) -> None:
    contract = load_json(path, label)
    boundary = contract.get("release_boundary")
    require(isinstance(boundary, dict), f"{label}: release_boundary missing")
    require(boundary.get("external_access_control_assessment_schema") == SCHEMA_PATH, f"{label}: assessment schema binding drifted")
    require(boundary.get("external_access_control_assessment_records") == RECORD_PATH, f"{label}: assessment record path drifted")
    require(boundary.get("external_access_control_assessment_is_provider_selection") is False, f"{label}: assessment cannot equal provider selection")
    require(boundary.get("external_access_control_assessment_is_production_acceptance") is False, f"{label}: assessment cannot equal production acceptance")
    require(boundary.get("external_access_control_assessment_exact_provider_deployment_bound") is True, f"{label}: assessment must remain exact-provider/deployment bound")


def main() -> None:
    validate_schema()
    validate_qualification_binding(STATE_QUALIFICATION, "state qualification contract")
    validate_qualification_binding(SIGNING_QUALIFICATION, "signing qualification contract")

    count = 0
    seen_ids: set[str] = set()
    if ASSESSMENT_DIR.exists():
        for path in sorted(ASSESSMENT_DIR.glob("*.json")):
            record = load_json(path, str(path))
            validate_record_identity(record, path=path, seen_ids=seen_ids)
            validate_record(record, label=str(path))
            count += 1

    text = README.read_text(encoding="utf-8")
    normalized = text.lower().replace("**", "")
    for marker in ("not a provider selection", "not production acceptance", "non-authorizing", "no provider access-control assessment records"):
        require(marker in normalized, f"assessment README missing boundary marker: {marker}")

    print(
        "Privacy Shield provider access-control assessment boundary is consistent; "
        f"records={count}. External isolation evidence remains exact-provider/deployment-bound, "
        "privacy-minimized, non-authorizing, and unable to substitute for provider selection or production acceptance."
    )


if __name__ == "__main__":
    main()
