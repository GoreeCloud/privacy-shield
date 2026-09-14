#!/usr/bin/env python3
"""Fail-closed validation for Privacy Shield provider-evaluation evidence packages."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE_SCHEMA = ROOT / "contracts" / "privacy-shield.provider-evidence-package.schema.json"
PACKAGE_DIR = ROOT / "evidence" / "provider-evaluations"
STATE_EVALUATION_DIR = ROOT / "evaluations" / "state-providers"
SIGNING_EVALUATION_DIR = ROOT / "evaluations" / "signing-key-providers"
STATE_CONTRACT = ROOT / "contracts" / "privacy-shield.state-provider.json"
SIGNING_CONTRACT = ROOT / "contracts" / "privacy-shield.signing-key-provider.json"
README = PACKAGE_DIR / "README.md"

CONTRACT_ID = "goreecloud.privacy-shield.provider-evidence-package.v1"
EVIDENCE_FORMAT = "evidence+sha256:<64-lowercase-hex>:<locator>"
EVIDENCE_PATTERN = (
    r"^evidence\+sha256:[0-9a-f]{64}:"
    r"(?:https://|github://|gdrive://|qualification-run:|artifact:)[^\s]+$"
)
EVIDENCE_REF = re.compile(EVIDENCE_PATTERN)
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]*$")
REPO = re.compile(r"^GoreeCloud/[A-Za-z0-9._-]+$")
FORBIDDEN_REFERENCE_MATERIAL = re.compile(
    r"(?:[?&](?:token|access_token|credential|password|secret|signature|sig)=|"
    r"private[_-]?key|bearer(?:%20|\s))",
    re.IGNORECASE,
)

STATE_AUTHORITY_STATE = {
    "consent",
    "policy_versions_and_active_pointer",
    "capability_revocation",
    "single_use_capability_consumption",
    "privacy_evidence_and_chain_head",
}
STATE_CRITERIA = {
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
SIGNING_CRITERIA = {
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
PRIVACY_FIELDS = {
    "credentials_in_package",
    "secret_material_in_package",
    "raw_private_payloads_in_package",
    "full_capability_tokens_in_package",
}


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield provider evidence-package validation failed: {message}")


def load_json(path: Path, label: str | None = None) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{label or path.relative_to(ROOT)} is unreadable or invalid JSON: {exc}")
    if not isinstance(value, dict):
        fail(f"{label or path.relative_to(ROOT)} must contain a JSON object")
    return value


def parse_time(value: object, label: str) -> datetime:
    if not isinstance(value, str):
        fail(f"{label} must be an offset-aware date-time")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        fail(f"{label} is not a valid date-time")
    if parsed.tzinfo is None:
        fail(f"{label} must include a timezone offset")
    return parsed.astimezone(timezone.utc)


def parse_evidence_ref(value: object, label: str) -> tuple[str, str]:
    if not isinstance(value, str) or not EVIDENCE_REF.fullmatch(value):
        fail(f"{label} must use {EVIDENCE_FORMAT} with an approved locator scheme")
    digest, locator = value[len("evidence+sha256:"):].split(":", 1)
    if digest == "0" * 64:
        fail(f"{label} cannot use an all-zero evidence digest")
    if FORBIDDEN_REFERENCE_MATERIAL.search(locator):
        fail(f"{label} contains credential-like or secret-bearing locator material")
    return digest, locator


def validate_schema(schema: dict) -> None:
    properties = schema.get("properties", {})
    if properties.get("schema_version", {}).get("const") != 1:
        fail("provider evidence-package schema version drifted")
    if properties.get("contract_id", {}).get("const") != CONTRACT_ID:
        fail("provider evidence-package contract id drifted")
    if set(properties.get("provider_class", {}).get("enum", [])) != {"state-provider", "signing-key-provider"}:
        fail("provider evidence-package class vocabulary drifted")
    evidence = schema.get("$defs", {}).get("evidence_ref", {})
    if evidence.get("pattern") != EVIDENCE_PATTERN:
        fail("provider evidence-package content-addressed reference pattern drifted")
    governance = properties.get("governance", {}).get("properties", {})
    if governance.get("authorizing", {}).get("const") is not False:
        fail("provider evidence packages must remain non-authorizing")
    if governance.get("production_acceptance_authorized", {}).get("const") is not False:
        fail("provider evidence packages must not authorize production acceptance")
    privacy = properties.get("privacy", {}).get("properties", {})
    if set(privacy) != PRIVACY_FIELDS or any(privacy.get(key, {}).get("const") is not False for key in PRIVACY_FIELDS):
        fail("provider evidence-package privacy boundary drifted")


def validate_release_contract(path: Path) -> None:
    contract = load_json(path)
    boundary = contract.get("release_boundary")
    if not isinstance(boundary, dict):
        fail(f"{path.name}: release_boundary is missing")
    expected = {
        "provider_evaluation_evidence_package_required": True,
        "provider_evaluation_evidence_package_schema": "contracts/privacy-shield.provider-evidence-package.schema.json",
        "provider_evaluation_evidence_package_records": "evidence/provider-evaluations/*.json",
        "provider_evaluation_evidence_package_is_candidate_evaluation": False,
        "provider_evaluation_evidence_package_is_provider_selection": False,
        "provider_evaluation_evidence_package_is_production_acceptance": False,
    }
    for key, value in expected.items():
        if boundary.get(key) != value:
            fail(f"{path.name}: release boundary {key} drifted")


def validate_package(path: Path, record: dict, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    required = {
        "schema_version", "contract_id", "evidence_id", "provider_class", "provider_id",
        "provider_name", "integration_authority", "scope", "evidence_ref", "artifact",
        "supports", "governance", "privacy", "limitations",
    }
    allowed = required | {"provider_implementation"}
    if not required.issubset(record) or not set(record).issubset(allowed):
        fail(f"{path}: package top-level fields drifted")
    if record.get("schema_version") != 1 or record.get("contract_id") != CONTRACT_ID:
        fail(f"{path}: package schema identity mismatch")

    evidence_id = record.get("evidence_id")
    provider_class = record.get("provider_class")
    provider_id = record.get("provider_id")
    provider_name = record.get("provider_name")
    authority = record.get("integration_authority")
    if not isinstance(evidence_id, str) or not SLUG.fullmatch(evidence_id):
        fail(f"{path}: invalid evidence_id")
    if provider_class not in {"state-provider", "signing-key-provider"}:
        fail(f"{path}: invalid provider_class")
    if not isinstance(provider_id, str) or not SLUG.fullmatch(provider_id):
        fail(f"{path}: invalid provider_id")
    if not isinstance(provider_name, str) or not provider_name.strip():
        fail(f"{path}: provider_name must be non-empty")
    if not isinstance(authority, str) or not REPO.fullmatch(authority):
        fail(f"{path}: invalid integration_authority")

    scope = record.get("scope")
    if not isinstance(scope, dict):
        fail(f"{path}: scope must be an object")
    environments = scope.get("environments")
    if not isinstance(environments, list) or not environments or len(set(environments)) != len(environments):
        fail(f"{path}: scope.environments must be unique and non-empty")
    if any(not isinstance(item, str) or not SLUG.fullmatch(item) for item in environments):
        fail(f"{path}: invalid environment")

    if provider_class == "state-provider":
        if set(scope) != {"service", "capability", "authority_state", "environments"}:
            fail(f"{path}: state-provider scope fields drifted")
        if scope.get("service") != "privacy-shield" or scope.get("capability") != "durable-authorization-state":
            fail(f"{path}: state-provider scope identity drifted")
        authority_state = scope.get("authority_state")
        if not isinstance(authority_state, list) or set(authority_state) != STATE_AUTHORITY_STATE or len(authority_state) != len(STATE_AUTHORITY_STATE):
            fail(f"{path}: state-provider authority_state must contain the complete exact set")
        implementation = record.get("provider_implementation")
        if not isinstance(implementation, str) or not implementation.strip():
            fail(f"{path}: state-provider package requires provider_implementation")
        supported_vocabulary = STATE_CRITERIA | {"evaluation-summary"}
    else:
        if "provider_implementation" in record:
            fail(f"{path}: signing-key package must not declare provider_implementation")
        if set(scope) != {"service", "capability", "producer_identity", "environments"}:
            fail(f"{path}: signing-key scope fields drifted")
        if (
            scope.get("service") != "privacy-shield"
            or scope.get("capability") != "operation-bound-capability-signing"
            or scope.get("producer_identity") != "goreecloud-privacy-shield"
        ):
            fail(f"{path}: signing-key scope identity drifted")
        supported_vocabulary = SIGNING_CRITERIA | {"evaluation-summary"}

    evidence_ref = record.get("evidence_ref")
    digest, locator = parse_evidence_ref(evidence_ref, f"{path}: evidence_ref")
    artifact = record.get("artifact")
    required_artifact = {
        "digest_algorithm", "digest", "locator", "media_type", "source_authority",
        "collected_at", "valid_until",
    }
    if not isinstance(artifact, dict) or set(artifact) != required_artifact:
        fail(f"{path}: artifact fields drifted")
    if artifact.get("digest_algorithm") != "sha256":
        fail(f"{path}: artifact.digest_algorithm must be sha256")
    if artifact.get("digest") != digest or artifact.get("locator") != locator:
        fail(f"{path}: evidence_ref must exactly match artifact digest and locator")
    if not isinstance(artifact.get("media_type"), str) or not artifact["media_type"].strip():
        fail(f"{path}: artifact.media_type must be non-empty")
    if not isinstance(artifact.get("source_authority"), str) or not artifact["source_authority"].strip():
        fail(f"{path}: artifact.source_authority must be non-empty")
    collected_at = parse_time(artifact.get("collected_at"), f"{path}: artifact.collected_at")
    valid_until = parse_time(artifact.get("valid_until"), f"{path}: artifact.valid_until")
    if collected_at > now:
        fail(f"{path}: artifact.collected_at cannot be future-dated")
    if valid_until <= collected_at:
        fail(f"{path}: artifact.valid_until must be later than collected_at")

    supports = record.get("supports")
    if not isinstance(supports, list) or not supports or len(set(supports)) != len(supports):
        fail(f"{path}: supports must be unique and non-empty")
    if any(not isinstance(item, str) or item not in supported_vocabulary for item in supports):
        fail(f"{path}: supports contains a criterion outside the provider-class vocabulary")

    governance = record.get("governance")
    if not isinstance(governance, dict) or set(governance) != {
        "status", "authorizing", "production_acceptance_authorized", "reviewed_at"
    }:
        fail(f"{path}: governance fields drifted")
    status = governance.get("status")
    if status not in {"captured", "reviewed", "rejected", "superseded"}:
        fail(f"{path}: invalid governance.status")
    if governance.get("authorizing") is not False or governance.get("production_acceptance_authorized") is not False:
        fail(f"{path}: provider evidence package cannot authorize implementation or production acceptance")
    reviewed_at_value = governance.get("reviewed_at")
    if status == "reviewed":
        reviewed_at = parse_time(reviewed_at_value, f"{path}: governance.reviewed_at")
        if reviewed_at > now:
            fail(f"{path}: governance.reviewed_at cannot be future-dated")
        if reviewed_at < collected_at:
            fail(f"{path}: reviewed_at cannot predate artifact collection")
        if reviewed_at >= valid_until:
            fail(f"{path}: reviewed_at must fall before artifact valid_until")
        if valid_until <= now:
            fail(f"{path}: reviewed evidence package is stale")
    elif reviewed_at_value is not None:
        fail(f"{path}: only reviewed packages may set governance.reviewed_at")

    privacy = record.get("privacy")
    if not isinstance(privacy, dict) or set(privacy) != PRIVACY_FIELDS or any(privacy.get(key) is not False for key in PRIVACY_FIELDS):
        fail(f"{path}: provider evidence-package privacy boundary violated")
    limitations = record.get("limitations")
    if not isinstance(limitations, list) or any(not isinstance(item, str) or not item.strip() for item in limitations):
        fail(f"{path}: limitations must contain only non-empty strings")
    return record


def package_map(records: list[tuple[Path, dict]], now: datetime | None = None) -> dict[str, dict]:
    by_reference: dict[str, dict] = {}
    evidence_ids: set[str] = set()
    for path, raw in records:
        record = validate_package(path, raw, now=now)
        evidence_id = record["evidence_id"]
        reference = record["evidence_ref"]
        if evidence_id in evidence_ids:
            fail(f"{path}: duplicate evidence_id {evidence_id}")
        if reference in by_reference:
            fail(f"{path}: duplicate evidence_ref {reference}")
        evidence_ids.add(evidence_id)
        by_reference[reference] = record
    return by_reference


def _require_matching_package(
    path: Path,
    evaluation: dict,
    package: dict,
    provider_class: str,
    criterion: str,
    require_reviewed: bool,
    now: datetime,
) -> None:
    if package.get("provider_class") != provider_class:
        fail(f"{path}: evidence package provider_class mismatch for {criterion}")
    for field in ("provider_id", "provider_name", "integration_authority"):
        if package.get(field) != evaluation.get(field):
            fail(f"{path}: evidence package {field} mismatch for {criterion}")
    if package.get("scope") != evaluation.get("scope"):
        fail(f"{path}: evidence package scope mismatch for {criterion}")
    if provider_class == "state-provider" and package.get("provider_implementation") != evaluation.get("provider_implementation"):
        fail(f"{path}: evidence package provider_implementation mismatch for {criterion}")
    if criterion not in package.get("supports", []):
        fail(f"{path}: evidence package does not support {criterion}")
    if require_reviewed:
        governance = package.get("governance", {})
        if governance.get("status") != "reviewed":
            fail(f"{path}: resolved claim {criterion} requires a reviewed evidence package")
        valid_until = parse_time(package.get("artifact", {}).get("valid_until"), f"{path}: package valid_until")
        if valid_until <= now:
            fail(f"{path}: resolved claim {criterion} references stale evidence")


def validate_evaluation_bindings(
    path: Path,
    evaluation: dict,
    packages: dict[str, dict],
    provider_class: str,
    now: datetime | None = None,
) -> None:
    now = now or datetime.now(timezone.utc)
    criteria = evaluation.get("criteria")
    if not isinstance(criteria, dict):
        fail(f"{path}: evaluation criteria must be an object")
    for criterion, detail in criteria.items():
        if not isinstance(detail, dict):
            fail(f"{path}: evaluation criterion {criterion} must be an object")
        result = detail.get("result")
        refs = detail.get("evidence_refs")
        if result not in {"pending", "passed", "failed"}:
            fail(f"{path}: invalid evaluation result for {criterion}")
        if not isinstance(refs, list):
            fail(f"{path}: evidence_refs for {criterion} must be a list")
        for reference in refs:
            package = packages.get(reference)
            if package is None:
                fail(f"{path}: evidence reference for {criterion} has no governed evidence package")
            _require_matching_package(
                path, evaluation, package, provider_class, criterion,
                require_reviewed=result in {"passed", "failed"}, now=now,
            )

    governance = evaluation.get("governance")
    if not isinstance(governance, dict):
        fail(f"{path}: evaluation governance must be an object")
    summary_reference = governance.get("evidence_reference")
    summary_package = packages.get(summary_reference)
    if summary_package is None:
        fail(f"{path}: evaluation governance evidence_reference has no governed evidence package")
    status = governance.get("status")
    _require_matching_package(
        path, evaluation, summary_package, provider_class, "evaluation-summary",
        require_reviewed=status in {"complete", "failed"}, now=now,
    )


def validate_documentation() -> None:
    try:
        text = README.read_text(encoding="utf-8")
    except OSError as exc:
        fail(f"missing provider evidence-package documentation: {exc}")
    for marker in (
        "not** a candidate evaluation",
        "evidence+sha256:",
        "evaluation-summary",
        "independently rejects future collection and review timestamps",
        "zero provider evidence package JSON records",
    ):
        if marker not in text:
            fail(f"provider evidence-package documentation is missing required concept: {marker}")


def main() -> None:
    validate_schema(load_json(PACKAGE_SCHEMA))
    for contract in (STATE_CONTRACT, SIGNING_CONTRACT):
        validate_release_contract(contract)

    records = [
        (path, load_json(path))
        for path in sorted(PACKAGE_DIR.glob("*.json"))
    ]
    packages = package_map(records)

    for path in sorted(STATE_EVALUATION_DIR.glob("*.json")):
        validate_evaluation_bindings(path, load_json(path), packages, "state-provider")
    for path in sorted(SIGNING_EVALUATION_DIR.glob("*.json")):
        validate_evaluation_bindings(path, load_json(path), packages, "signing-key-provider")

    validate_documentation()
    print(
        "Privacy Shield provider evidence-package validation passed: "
        f"packages={len(packages)}; packages remain non-authorizing and do not create provider selection or production acceptance."
    )


if __name__ == "__main__":
    main()
