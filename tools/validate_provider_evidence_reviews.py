#!/usr/bin/env python3
"""Fail-closed validation for Privacy Shield provider-evidence review attestations."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import validate_provider_evidence_packages as packages

ROOT = Path(__file__).resolve().parents[1]
REVIEW_SCHEMA = ROOT / "contracts" / "privacy-shield.provider-evidence-review.schema.json"
REVIEW_DIR = ROOT / "reviews" / "provider-evidence"
REVIEW_README = REVIEW_DIR / "README.md"
PACKAGE_DIR = ROOT / "evidence" / "provider-evaluations"
STATE_CONTRACT = ROOT / "contracts" / "privacy-shield.state-provider.json"
SIGNING_CONTRACT = ROOT / "contracts" / "privacy-shield.signing-key-provider.json"

CONTRACT_ID = "goreecloud.privacy-shield.provider-evidence-review.v1"
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

STATE_AUTHORITY_STATE = packages.STATE_AUTHORITY_STATE
STATE_CRITERIA = packages.STATE_CRITERIA
SIGNING_CRITERIA = packages.SIGNING_CRITERIA
PRIVACY_FIELDS = {
    "credentials_in_review",
    "secret_material_in_review",
    "raw_private_payloads_in_review",
    "full_capability_tokens_in_review",
}


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield provider evidence-review validation failed: {message}")


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
        fail("provider evidence-review schema version drifted")
    if properties.get("contract_id", {}).get("const") != CONTRACT_ID:
        fail("provider evidence-review contract id drifted")
    if set(properties.get("provider_class", {}).get("enum", [])) != {
        "state-provider", "signing-key-provider"
    }:
        fail("provider evidence-review class vocabulary drifted")
    evidence = schema.get("$defs", {}).get("evidence_ref", {})
    if evidence.get("pattern") != EVIDENCE_PATTERN:
        fail("provider evidence-review content-addressed reference pattern drifted")
    governance = properties.get("governance", {}).get("properties", {})
    for field in ("authorizing", "provider_selection_authorized", "production_acceptance_authorized"):
        if governance.get(field, {}).get("const") is not False:
            fail(f"provider evidence-review {field} must remain false")
    if governance.get("review_authority_validated_by_schema", {}).get("const") is not False:
        fail("schema must not claim to validate real GoreeCloud review authority")
    privacy = properties.get("privacy", {}).get("properties", {})
    if set(privacy) != PRIVACY_FIELDS or any(
        privacy.get(key, {}).get("const") is not False for key in PRIVACY_FIELDS
    ):
        fail("provider evidence-review privacy boundary drifted")


def validate_release_contract(path: Path) -> None:
    contract = load_json(path)
    boundary = contract.get("release_boundary")
    if not isinstance(boundary, dict):
        fail(f"{path.name}: release_boundary is missing")
    expected = {
        "provider_evaluation_evidence_review_required": True,
        "provider_evaluation_evidence_review_schema": "contracts/privacy-shield.provider-evidence-review.schema.json",
        "provider_evaluation_evidence_review_records": "reviews/provider-evidence/*.json",
        "provider_evaluation_evidence_review_is_candidate_evaluation": False,
        "provider_evaluation_evidence_review_is_provider_selection": False,
        "provider_evaluation_evidence_review_is_production_acceptance": False,
        "provider_evaluation_evidence_review_authority_validated_by_schema": False,
    }
    for key, value in expected.items():
        if boundary.get(key) != value:
            fail(f"{path.name}: release boundary {key} drifted")


def validate_review(path: Path, record: dict, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    required = {
        "schema_version", "contract_id", "review_id", "evidence_id", "evidence_ref",
        "provider_class", "provider_id", "provider_name", "integration_authority", "scope",
        "supports", "review", "governance", "privacy", "limitations",
    }
    allowed = required | {"provider_implementation"}
    if not required.issubset(record) or not set(record).issubset(allowed):
        fail(f"{path}: review top-level fields drifted")
    if record.get("schema_version") != 1 or record.get("contract_id") != CONTRACT_ID:
        fail(f"{path}: review schema identity mismatch")

    review_id = record.get("review_id")
    evidence_id = record.get("evidence_id")
    provider_class = record.get("provider_class")
    provider_id = record.get("provider_id")
    provider_name = record.get("provider_name")
    authority = record.get("integration_authority")
    if not isinstance(review_id, str) or not SLUG.fullmatch(review_id):
        fail(f"{path}: invalid review_id")
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
            fail(f"{path}: state-provider review requires provider_implementation")
        supported_vocabulary = STATE_CRITERIA | {"evaluation-summary"}
    else:
        if "provider_implementation" in record:
            fail(f"{path}: signing-key review must not declare provider_implementation")
        if set(scope) != {"service", "capability", "producer_identity", "environments"}:
            fail(f"{path}: signing-key scope fields drifted")
        if (
            scope.get("service") != "privacy-shield"
            or scope.get("capability") != "operation-bound-capability-signing"
            or scope.get("producer_identity") != "goreecloud-privacy-shield"
        ):
            fail(f"{path}: signing-key scope identity drifted")
        supported_vocabulary = SIGNING_CRITERIA | {"evaluation-summary"}

    supports = record.get("supports")
    if not isinstance(supports, list) or not supports or len(set(supports)) != len(supports):
        fail(f"{path}: supports must be unique and non-empty")
    if any(not isinstance(item, str) or item not in supported_vocabulary for item in supports):
        fail(f"{path}: supports contains a criterion outside the provider-class vocabulary")

    evidence_ref = record.get("evidence_ref")
    parse_evidence_ref(evidence_ref, f"{path}: evidence_ref")
    review = record.get("review")
    required_review = {
        "decision", "review_authority", "review_authority_reference",
        "review_evidence_reference", "reviewed_at", "valid_until",
    }
    if not isinstance(review, dict) or set(review) != required_review:
        fail(f"{path}: review fields drifted")
    decision = review.get("decision")
    if decision not in {"accepted-for-evaluation", "rejected", "needs-more-evidence"}:
        fail(f"{path}: invalid review.decision")
    review_authority = review.get("review_authority")
    if not isinstance(review_authority, str) or not review_authority.strip():
        fail(f"{path}: review.review_authority must be non-empty")
    authority_ref = review.get("review_authority_reference")
    review_ref = review.get("review_evidence_reference")
    parse_evidence_ref(authority_ref, f"{path}: review.review_authority_reference")
    parse_evidence_ref(review_ref, f"{path}: review.review_evidence_reference")
    if len({evidence_ref, authority_ref, review_ref}) != 3:
        fail(f"{path}: evidence, review-authority, and review-evidence references must be distinct")
    reviewed_at = parse_time(review.get("reviewed_at"), f"{path}: review.reviewed_at")
    valid_until = parse_time(review.get("valid_until"), f"{path}: review.valid_until")
    if valid_until <= reviewed_at:
        fail(f"{path}: review.valid_until must be later than reviewed_at")

    governance = record.get("governance")
    required_governance = {
        "status", "authorizing", "provider_selection_authorized",
        "production_acceptance_authorized", "review_authority_validated_by_schema",
    }
    if not isinstance(governance, dict) or set(governance) != required_governance:
        fail(f"{path}: governance fields drifted")
    status = governance.get("status")
    if status not in {"active", "superseded"}:
        fail(f"{path}: invalid governance.status")
    if (
        governance.get("authorizing") is not False
        or governance.get("provider_selection_authorized") is not False
        or governance.get("production_acceptance_authorized") is not False
        or governance.get("review_authority_validated_by_schema") is not False
    ):
        fail(f"{path}: review attestation cannot grant authority or claim authority validation")
    if status == "active" and valid_until <= now:
        fail(f"{path}: active review attestation is stale")

    privacy = record.get("privacy")
    if not isinstance(privacy, dict) or set(privacy) != PRIVACY_FIELDS or any(
        privacy.get(key) is not False for key in PRIVACY_FIELDS
    ):
        fail(f"{path}: provider evidence-review privacy boundary violated")
    limitations = record.get("limitations")
    if not isinstance(limitations, list) or any(
        not isinstance(item, str) or not item.strip() for item in limitations
    ):
        fail(f"{path}: limitations must contain only non-empty strings")
    return record


def review_map(records: list[tuple[Path, dict]], now: datetime | None = None) -> dict[str, dict]:
    active_by_evidence: dict[str, dict] = {}
    review_ids: set[str] = set()
    for path, raw in records:
        record = validate_review(path, raw, now=now)
        review_id = record["review_id"]
        if review_id in review_ids:
            fail(f"{path}: duplicate review_id {review_id}")
        review_ids.add(review_id)
        if record["governance"]["status"] == "active":
            reference = record["evidence_ref"]
            if reference in active_by_evidence:
                fail(f"{path}: multiple active review attestations target the same evidence_ref")
            active_by_evidence[reference] = record
    return active_by_evidence


def validate_package_review_binding(
    path: Path,
    package: dict,
    reviews: dict[str, dict],
    now: datetime | None = None,
) -> None:
    now = now or datetime.now(timezone.utc)
    governance = package.get("governance", {})
    if governance.get("status") != "reviewed":
        return
    reference = package.get("evidence_ref")
    review = reviews.get(reference)
    if review is None:
        fail(f"{path}: reviewed package requires an active review attestation")
    if review.get("evidence_id") != package.get("evidence_id"):
        fail(f"{path}: review evidence_id mismatch")
    for field in ("provider_class", "provider_id", "provider_name", "integration_authority"):
        if review.get(field) != package.get(field):
            fail(f"{path}: review {field} mismatch")
    if review.get("scope") != package.get("scope"):
        fail(f"{path}: review scope mismatch")
    if package.get("provider_class") == "state-provider" and review.get("provider_implementation") != package.get("provider_implementation"):
        fail(f"{path}: review provider_implementation mismatch")
    if set(review.get("supports", [])) != set(package.get("supports", [])) or len(review.get("supports", [])) != len(package.get("supports", [])):
        fail(f"{path}: review supports must exactly match package supports")
    review_fields = review.get("review", {})
    if review_fields.get("decision") != "accepted-for-evaluation":
        fail(f"{path}: reviewed package requires accepted-for-evaluation review decision")
    reviewed_at = parse_time(review_fields.get("reviewed_at"), f"{path}: review.reviewed_at")
    package_reviewed_at = parse_time(governance.get("reviewed_at"), f"{path}: package governance.reviewed_at")
    collected_at = parse_time(package.get("artifact", {}).get("collected_at"), f"{path}: artifact.collected_at")
    artifact_valid_until = parse_time(package.get("artifact", {}).get("valid_until"), f"{path}: artifact.valid_until")
    review_valid_until = parse_time(review_fields.get("valid_until"), f"{path}: review.valid_until")
    if reviewed_at != package_reviewed_at:
        fail(f"{path}: review timestamp must exactly match package governance.reviewed_at")
    if reviewed_at < collected_at:
        fail(f"{path}: review cannot predate evidence artifact collection")
    if review_valid_until > artifact_valid_until:
        fail(f"{path}: review cannot remain current beyond the evidence artifact")
    if review_valid_until <= now:
        fail(f"{path}: review attestation is stale")


def validate_active_review_has_matching_package(
    reference: str,
    review: dict,
    package_by_reference: dict[str, dict],
) -> None:
    if review.get("review", {}).get("decision") != "accepted-for-evaluation":
        return
    package = package_by_reference.get(reference)
    if package is None:
        fail(f"active accepted review {review.get('review_id')} has no matching evidence package")
    if package.get("governance", {}).get("status") != "reviewed":
        fail(f"active accepted review {review.get('review_id')} targets a package not marked reviewed")


def validate_documentation(path: Path) -> None:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        fail(f"{path.relative_to(ROOT)} is unreadable: {exc}")
    for marker in (
        "accepted-for-evaluation",
        "review_authority_reference",
        "review_evidence_reference",
        "not",
        "provider evidence review-attestation JSON records",
    ):
        if marker not in text:
            fail(f"{path.relative_to(ROOT)} is missing review-attestation guidance: {marker}")


def main() -> None:
    schema = load_json(REVIEW_SCHEMA)
    validate_schema(schema)
    for contract in (STATE_CONTRACT, SIGNING_CONTRACT):
        validate_release_contract(contract)

    review_records = [
        (path, load_json(path)) for path in sorted(REVIEW_DIR.glob("*.json"))
    ]
    reviews = review_map(review_records)

    package_records = [
        (path, load_json(path)) for path in sorted(PACKAGE_DIR.glob("*.json"))
    ]
    package_by_reference: dict[str, dict] = {}
    now = datetime.now(timezone.utc)
    for path, raw in package_records:
        package = packages.validate_package(path, raw, now=now)
        reference = package["evidence_ref"]
        if reference in package_by_reference:
            fail(f"{path}: duplicate package evidence_ref {reference}")
        package_by_reference[reference] = package
        validate_package_review_binding(path, package, reviews, now=now)

    for reference, review in reviews.items():
        validate_active_review_has_matching_package(reference, review, package_by_reference)

    validate_documentation(REVIEW_README)
    print(
        "Privacy Shield provider evidence reviews are attributable, content-addressed, "
        "scope-bound, freshness-bounded, privacy-minimized, and non-authorizing; "
        "schema validation does not establish real GoreeCloud reviewer authority."
    )


if __name__ == "__main__":
    main()
