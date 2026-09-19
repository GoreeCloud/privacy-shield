#!/usr/bin/env python3
"""Fail-closed validation for Privacy Shield signing-key custody and acceptance."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "privacy-shield.signing-key-provider.json"
ACCEPTANCE_SCHEMA = ROOT / "contracts" / "privacy-shield.signing-key-provider-acceptance.schema.json"
ACCEPTANCE_DIR = ROOT / "acceptance" / "signing-key-providers"
PROVIDER = ROOT / "src" / "privacy-signing-key-provider.mjs"
CAPABILITY_AUTHORITY = ROOT / "src" / "capability-token.mjs"
ACCEPTANCE_RUNTIME = ROOT / "src" / "signing-key-acceptance.mjs"
RUNTIME = ROOT / "src" / "privacy-runtime.mjs"

CONTRACT_ID = "goreecloud.privacy-shield.signing-key-provider.v1"
ACCEPTANCE_CONTRACT_ID = "goreecloud.privacy-shield.signing-key-provider-acceptance.v1"
REQUIRED_METHODS = {
    "activeKey",
    "describeKey",
    "signDigest",
    "verifyDigest",
    "keyProviderCapabilities",
}
REQUIRED_CAPABILITIES = {
    "non_exportable_signing_material",
    "opaque_key_references",
    "digest_only_signing",
    "key_identifiers",
    "rotation",
    "retirement",
    "revocation",
    "producer_identity_binding",
    "auditable_signing",
    "fail_closed_on_untrusted_state",
}
REQUIRED_METADATA = {
    "key_id",
    "provider_id",
    "provider_version",
    "producer_identity",
    "algorithm",
    "status",
}
REQUIRED_QUALIFICATIONS = {
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
SHA40 = re.compile(r"^[0-9a-f]{40}$")
PROVIDER_ID = re.compile(r"^[a-z0-9][a-z0-9-]*$")
PROVIDER_AUTHORITY = re.compile(r"^GoreeCloud/[A-Za-z0-9._-]+$")


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield signing-key validation failed: {message}")


def load_json(path: Path, label: str) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{label} is unreadable or invalid: {exc}")
    if not isinstance(value, dict):
        fail(f"{label} must be a JSON object")
    return value


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


def validate_acceptance_schema(schema: dict) -> None:
    properties = schema.get("properties", {})
    if properties.get("schema_version", {}).get("const") != 1:
        fail("signing-key acceptance schema version drifted")
    if properties.get("contract_id", {}).get("const") != ACCEPTANCE_CONTRACT_ID:
        fail("signing-key acceptance contract id drifted")
    if "selection_decision_id" not in schema.get("required", []):
        fail("signing-key acceptance must require selection_decision_id")
    if properties.get("selection_decision_id", {}).get("pattern") != "^[a-z0-9][a-z0-9-]*$":
        fail("signing-key selection_decision_id pattern drifted")

    qualification = properties.get("qualification", {}).get("properties", {})
    if set(qualification) != REQUIRED_QUALIFICATIONS:
        fail("signing-key acceptance qualification vocabulary drifted")

    privacy = properties.get("privacy", {}).get("properties", {})
    for key in (
        "raw_private_payloads_in_acceptance_evidence",
        "secret_material_in_acceptance_evidence",
        "full_capability_tokens_in_acceptance_evidence",
    ):
        if privacy.get(key, {}).get("const") is not False:
            fail(f"acceptance evidence privacy boundary weakened: {key}")

    acceptance = properties.get("acceptance", {}).get("properties", {})
    if acceptance.get("exact_revision_required", {}).get("const") is not True:
        fail("signing-key acceptance must remain exact-revision bound")
    if "valid_until" not in acceptance:
        fail("signing-key acceptance must remain freshness-bounded")


def validate_acceptance_record(path: Path, record: dict) -> tuple[str, str, str]:
    required = {
        "schema_version",
        "contract_id",
        "selection_decision_id",
        "provider_id",
        "provider_implementation",
        "provider_authority",
        "provider_version",
        "exact_source_revision",
        "deployment",
        "producer_identity",
        "algorithms",
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
    provider_version = record.get("provider_version")
    implementation = record.get("provider_implementation")
    authority = record.get("provider_authority")
    if not isinstance(provider_id, str) or not PROVIDER_ID.fullmatch(provider_id):
        fail(f"{path}: invalid provider_id")
    if provider_id == "in-memory-development" or implementation == "InMemoryPrivacySigningKeyProvider":
        fail(f"{path}: development provider cannot receive production acceptance")
    if not isinstance(provider_version, str) or not provider_version.strip():
        fail(f"{path}: provider_version must be non-empty")
    if not isinstance(implementation, str) or not implementation.strip():
        fail(f"{path}: provider_implementation must be non-empty")
    if not isinstance(authority, str) or not PROVIDER_AUTHORITY.fullmatch(authority):
        fail(f"{path}: invalid provider_authority")

    revision = record.get("exact_source_revision")
    if not isinstance(revision, str) or not SHA40.fullmatch(revision):
        fail(f"{path}: exact_source_revision must be an exact lowercase 40-character Git SHA")

    deployment = record.get("deployment")
    if not isinstance(deployment, dict) or set(deployment) != {"environment", "deployment_id"}:
        fail(f"{path}: deployment fields drifted")
    environment = deployment.get("environment")
    deployment_id = deployment.get("deployment_id")
    if not isinstance(environment, str) or not environment.strip():
        fail(f"{path}: deployment.environment must be non-empty")
    if not isinstance(deployment_id, str) or not deployment_id.strip():
        fail(f"{path}: deployment.deployment_id must be non-empty")

    producer_identity = record.get("producer_identity")
    if not isinstance(producer_identity, str) or not producer_identity.strip():
        fail(f"{path}: producer_identity must be non-empty")
    algorithms = record.get("algorithms")
    if not isinstance(algorithms, list) or not algorithms or any(
        not isinstance(item, str) or not item.strip() for item in algorithms
    ):
        fail(f"{path}: algorithms must contain non-empty strings")
    if len(set(algorithms)) != len(algorithms):
        fail(f"{path}: algorithms must be unique")

    qualification = record.get("qualification")
    if not isinstance(qualification, dict) or set(qualification) != REQUIRED_QUALIFICATIONS:
        fail(f"{path}: qualification set drifted")
    for key, result in qualification.items():
        if result not in {"pending", "passed", "failed"}:
            fail(f"{path}: invalid qualification result for {key}")

    privacy = record.get("privacy")
    if not isinstance(privacy, dict):
        fail(f"{path}: privacy must be an object")
    for key in (
        "raw_private_payloads_in_acceptance_evidence",
        "secret_material_in_acceptance_evidence",
        "full_capability_tokens_in_acceptance_evidence",
    ):
        if privacy.get(key) is not False:
            fail(f"{path}: acceptance evidence privacy boundary violated: {key}")

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
    passing_categories: set[str] = set()
    evidence_ids: set[str] = set()
    for entry in evidence:
        if not isinstance(entry, dict) or set(entry) != {"id", "category", "result", "reference"}:
            fail(f"{path}: evidence fields drifted")
        evidence_id = entry.get("id")
        category = entry.get("category")
        result = entry.get("result")
        reference = entry.get("reference")
        if not isinstance(evidence_id, str) or not PROVIDER_ID.fullmatch(evidence_id):
            fail(f"{path}: invalid evidence id")
        if evidence_id in evidence_ids:
            fail(f"{path}: duplicate evidence id {evidence_id}")
        evidence_ids.add(evidence_id)
        if not isinstance(category, str) or not category.strip():
            fail(f"{path}: evidence category must be non-empty")
        if result not in {"passed", "failed", "informational"}:
            fail(f"{path}: invalid evidence result")
        if not isinstance(reference, str) or not reference.strip():
            fail(f"{path}: evidence reference must be non-empty")
        if result == "passed":
            passing_categories.add(category)

    limitations = record.get("limitations")
    if not isinstance(limitations, list) or any(
        not isinstance(item, str) or not item.strip() for item in limitations
    ):
        fail(f"{path}: limitations must be a list of non-empty strings")

    if approved:
        if status != "passed":
            fail(f"{path}: production_approved requires acceptance.status=passed")
        if valid_until <= datetime.now(timezone.utc):
            fail(f"{path}: production acceptance is stale or expired")
        for requirement in REQUIRED_QUALIFICATIONS:
            if qualification.get(requirement) != "passed":
                fail(f"{path}: production approval requires {requirement}=passed")
            if requirement not in passing_categories:
                fail(f"{path}: production approval lacks passing {requirement} evidence")
    elif status == "passed":
        fail(f"{path}: acceptance.status=passed cannot coexist with production_approved=false")

    return provider_id, provider_version, deployment_id


def main() -> None:
    contract = load_json(CONTRACT, "signing-key contract")
    schema = load_json(ACCEPTANCE_SCHEMA, "signing-key acceptance schema")

    if contract.get("schema_version") != 1:
        fail("unsupported signing-key contract schema version")
    if contract.get("contract_id") != CONTRACT_ID:
        fail("signing-key contract id drifted")
    if set(contract.get("required_methods", [])) != REQUIRED_METHODS:
        fail("required signing-provider methods drifted")

    signing_input = contract.get("signing_input", {})
    if signing_input.get("type") != "sha256-digest":
        fail("provider signing input must remain SHA-256 digest only")
    if signing_input.get("raw_capability_payload_visible_to_provider") is not False:
        fail("raw capability payload must not be sent to the signing provider")

    capabilities = contract.get("required_production_capabilities")
    if not isinstance(capabilities, dict) or set(capabilities) != REQUIRED_CAPABILITIES:
        fail("production signing-provider capability vocabulary drifted")
    if any(capabilities.get(key) is not True for key in REQUIRED_CAPABILITIES):
        fail("every production signing-provider capability must remain required")

    if set(contract.get("required_key_metadata", [])) != REQUIRED_METADATA:
        fail("required signing-key metadata drifted")

    development = contract.get("source_providers", {}).get(
        "InMemoryPrivacySigningKeyProvider", {}
    )
    if development.get("production_eligible") is not False:
        fail("InMemoryPrivacySigningKeyProvider must remain non-production")

    boundary = contract.get("release_boundary", {})
    if boundary.get("provider_capability_declaration_is_production_acceptance") is not False:
        fail("provider capability declaration must not equal production acceptance")
    if boundary.get("source_validation_is_key_custody_acceptance") is not False:
        fail("source validation must not equal key-custody acceptance")
    if boundary.get("production_acceptance_record_required") is not True:
        fail("production signing providers must require an independent acceptance record")
    if boundary.get("production_acceptance_schema") != "contracts/privacy-shield.signing-key-provider-acceptance.schema.json":
        fail("production signing-key acceptance schema path drifted")
    if boundary.get("production_acceptance_records") != "acceptance/signing-key-providers/*.json":
        fail("production signing-key acceptance record path drifted")
    for required in (
        "exact_provider_runtime_acceptance_required",
        "exact_provider_version_binding_required",
        "exact_source_revision_binding_required",
        "exact_deployment_binding_required",
        "acceptance_freshness_required",
        "key_generation_and_custody_evidence_required",
        "rotation_retirement_revocation_exercises_required",
        "producer_identity_binding_evidence_required",
        "signing_audit_evidence_required",
        "private_material_export_forbidden",
    ):
        if boundary.get(required) is not True:
            fail(f"release boundary {required} must remain required")

    validate_acceptance_schema(schema)

    accepted_targets: set[tuple[str, str, str]] = set()
    record_count = 0
    approved_count = 0
    if ACCEPTANCE_DIR.exists():
        for path in sorted(ACCEPTANCE_DIR.glob("*.json")):
            record = load_json(path, f"signing-key acceptance record {path}")
            target = validate_acceptance_record(path, record)
            if target in accepted_targets:
                fail(f"{path}: duplicate provider/version/deployment acceptance target")
            accepted_targets.add(target)
            record_count += 1
            if record["acceptance"]["production_approved"] is True:
                approved_count += 1

    provider_source = PROVIDER.read_text(encoding="utf-8")
    authority_source = CAPABILITY_AUTHORITY.read_text(encoding="utf-8")
    acceptance_source = ACCEPTANCE_RUNTIME.read_text(encoding="utf-8")
    runtime_source = RUNTIME.read_text(encoding="utf-8")

    for marker in (
        CONTRACT_ID,
        "#keys = new Map()",
        "#providerVersion",
        "signDigest({ key_id, digest })",
        "verifyDigest({ key_id, digest, signature })",
        "requireProductionSigningKeyProvider",
        "production_eligible: false",
        "private_material_export: false",
    ):
        if marker not in provider_source:
            fail(f"signing-provider source is missing {marker!r}")

    if "createHmac" in authority_source:
        fail("capability authority must not perform private-key/HMAC signing directly")
    for marker in (
        "signingDigest(body)",
        "this.keyProvider.signDigest",
        "this.keyProvider.verifyDigest",
        "CAPABILITY_PRODUCER_IDENTITY_MISMATCH",
        "CAPABILITY_KEY_PROVIDER_MISMATCH",
        "CAPABILITY_KEY_PROVIDER_VERSION_MISMATCH",
        "CAPABILITY_SIGNING_KEY_TRUST_STATE",
        "VERIFYING_KEY_STATES",
        "key_provider_version",
    ):
        if marker not in authority_source:
            fail(f"capability authority is missing custody marker {marker!r}")

    for marker in (
        ACCEPTANCE_CONTRACT_ID,
        "SIGNING_KEY_ACCEPTANCE_SOURCE_REVISION_MISMATCH",
        "SIGNING_KEY_ACCEPTANCE_PROVIDER_VERSION_MISMATCH",
        "SIGNING_KEY_ACCEPTANCE_DEPLOYMENT_MISMATCH",
        "SIGNING_KEY_ACCEPTANCE_EXPIRED",
    ):
        if marker not in acceptance_source:
            fail(f"signing-key acceptance runtime is missing {marker!r}")

    for marker in (
        "capability_key_provider",
        "capability_key_acceptance",
        "capability_key_deployment_id",
        "runtime_revision",
        "requireSigningKeyProviderAcceptance",
        "PRODUCTION_CAPABILITY_KEY_PROVIDER_REQUIRED",
    ):
        if marker not in runtime_source:
            fail(f"runtime is missing signing-provider acceptance gate marker {marker!r}")

    print(
        "Privacy Shield signing-key custody and acceptance contracts are consistent; "
        f"records={record_count}, production_approved={approved_count}. Production "
        "requires a fresh exact-revision/provider-version/deployment acceptance record, "
        "and no source declaration alone establishes custody acceptance."
    )


if __name__ == "__main__":
    main()
