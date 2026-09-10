#!/usr/bin/env python3
"""Fail-closed validation for Privacy Shield signing-key provider selection governance."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "contracts" / "privacy-shield.signing-key-provider-selection.schema.json"
SELECTION_DIR = ROOT / "decisions" / "signing-key-providers"
ACCEPTANCE_DIR = ROOT / "acceptance" / "signing-key-providers"

CONTRACT_ID = "goreecloud.privacy-shield.signing-key-provider-selection.v1"
REQUIRED_EVALUATION = {
    "digest_only_signing",
    "non_exportable_signing_material",
    "opaque_key_references",
    "stable_key_identifiers",
    "rotation_retirement_revocation",
    "producer_identity_binding",
    "privacy_safe_audit",
    "fail_closed_untrusted_state",
    "outage_degraded_behavior",
    "recovery_continuity",
    "access_control_isolation",
    "operational_ownership",
}
REQUIRED_PRIVACY = {
    "secret_material_in_decision_record",
    "credentials_in_decision_record",
    "raw_private_payloads_in_decision_record",
    "full_capability_tokens_in_decision_record",
}
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]*$")
REPO = re.compile(r"^GoreeCloud/[A-Za-z0-9._-]+$")


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield signing-key selection validation failed: {message}")


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
        fail("provider selection must never authorize production acceptance")


def validate_selection_record(path: Path, record: dict) -> tuple[str, str, set[str], str]:
    required = {
        "schema_version",
        "contract_id",
        "decision_id",
        "provider_id",
        "provider_name",
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
    authority = record.get("integration_authority")
    if not isinstance(decision_id, str) or not SLUG.fullmatch(decision_id):
        fail(f"{path}: invalid decision_id")
    if not isinstance(provider_id, str) or not SLUG.fullmatch(provider_id):
        fail(f"{path}: invalid provider_id")
    if not isinstance(provider_name, str) or not provider_name.strip():
        fail(f"{path}: provider_name must be non-empty")
    if not isinstance(authority, str) or not REPO.fullmatch(authority):
        fail(f"{path}: invalid integration_authority")

    scope = record.get("scope")
    if not isinstance(scope, dict) or set(scope) != {"service", "capability", "producer_identity", "environments"}:
        fail(f"{path}: scope fields drifted")
    if scope.get("service") != "privacy-shield":
        fail(f"{path}: scope.service must be privacy-shield")
    if scope.get("capability") != "operation-bound-capability-signing":
        fail(f"{path}: scope.capability drifted")
    producer = scope.get("producer_identity")
    if producer != "goreecloud-privacy-shield":
        fail(f"{path}: scope.producer_identity drifted")
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
        fail(f"{path}: provider selection cannot authorize production acceptance")
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
        if provider_id == "in-memory-development" or provider_name == "InMemoryPrivacySigningKeyProvider":
            fail(f"{path}: development provider cannot be approved for production integration")
    elif implementation_authorized:
        fail(f"{path}: only an approved selection may authorize implementation")

    return decision_id, provider_id, set(environments), authority


def main() -> None:
    schema = load_json(SCHEMA, "signing-key provider selection schema")
    validate_schema(schema)

    records: list[tuple[str, str, set[str], str, dict]] = []
    decision_ids: set[str] = set()
    active_environment: dict[str, str] = {}
    if SELECTION_DIR.exists():
        for path in sorted(SELECTION_DIR.glob("*.json")):
            record = load_json(path, f"provider selection record {path}")
            decision_id, provider_id, environments, authority = validate_selection_record(path, record)
            if decision_id in decision_ids:
                fail(f"{path}: duplicate decision_id {decision_id}")
            decision_ids.add(decision_id)
            records.append((decision_id, provider_id, environments, authority, record))
            if record["governance"]["status"] == "approved":
                for environment in environments:
                    prior = active_environment.get(environment)
                    if prior is not None:
                        fail(f"{path}: multiple approved providers for environment {environment}: {prior}, {decision_id}")
                    active_environment[environment] = decision_id

    approved = [entry for entry in records if entry[4]["governance"]["status"] == "approved"]

    if ACCEPTANCE_DIR.exists():
        for path in sorted(ACCEPTANCE_DIR.glob("*.json")):
            acceptance = load_json(path, f"signing-key acceptance record {path}")
            provider_id = acceptance.get("provider_id")
            authority = acceptance.get("provider_authority")
            deployment = acceptance.get("deployment")
            environment = deployment.get("environment") if isinstance(deployment, dict) else None
            producer = acceptance.get("producer_identity")
            match = any(
                selected_provider == provider_id
                and selected_authority == authority
                and environment in selected_environments
                and selected_record["scope"]["producer_identity"] == producer
                for _, selected_provider, selected_environments, selected_authority, selected_record in approved
            )
            if not match:
                fail(f"{path}: signing-key acceptance lacks a matching active approved provider selection")

    print(
        "Privacy Shield signing-key provider selection validation passed "
        f"(records={len(records)}, approved={len(approved)}, acceptance_authority=false)."
    )


if __name__ == "__main__":
    main()
