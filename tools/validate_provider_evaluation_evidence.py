#!/usr/bin/env python3
"""Validate content-addressed Privacy Shield provider-evaluation evidence references."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE_CONTRACT = ROOT / "contracts" / "privacy-shield.state-provider.json"
SIGNING_CONTRACT = ROOT / "contracts" / "privacy-shield.signing-key-provider.json"
STATE_SCHEMA = ROOT / "contracts" / "privacy-shield.state-provider-evaluation.schema.json"
SIGNING_SCHEMA = ROOT / "contracts" / "privacy-shield.signing-key-provider-evaluation.schema.json"
STATE_DIR = ROOT / "evaluations" / "state-providers"
SIGNING_DIR = ROOT / "evaluations" / "signing-key-providers"
STATE_README = STATE_DIR / "README.md"
SIGNING_README = SIGNING_DIR / "README.md"

EVIDENCE_FORMAT = "evidence+sha256:<64-lowercase-hex>:<locator>"
EVIDENCE_PATTERN = (
    r"^evidence\+sha256:[0-9a-f]{64}:"
    r"(?:https://|github://|gdrive://|qualification-run:|artifact:)[^\s]+$"
)
EVIDENCE_REF = re.compile(EVIDENCE_PATTERN)
FORBIDDEN_REFERENCE_MATERIAL = re.compile(
    r"(?:[?&](?:token|access_token|credential|password|secret|signature|sig)=|"
    r"private[_-]?key|bearer(?:%20|\s))",
    re.IGNORECASE,
)


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield provider-evaluation evidence validation failed: {message}")


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{path.relative_to(ROOT)} is unreadable or invalid JSON: {exc}")
    if not isinstance(value, dict):
        fail(f"{path.relative_to(ROOT)} must contain a JSON object")
    return value


def validate_reference(value: object, label: str) -> str:
    if not isinstance(value, str) or not EVIDENCE_REF.fullmatch(value):
        fail(
            f"{label} must use evidence+sha256:<64-lowercase-hex>:<locator> with an approved locator scheme"
        )
    digest, locator = value[len("evidence+sha256:"):].split(":", 1)
    if digest == "0" * 64:
        fail(f"{label} cannot use an all-zero evidence digest")
    if FORBIDDEN_REFERENCE_MATERIAL.search(locator):
        fail(f"{label} contains credential-like or secret-bearing locator material")
    return value


def validate_release_contract(path: Path) -> None:
    contract = load_json(path)
    boundary = contract.get("release_boundary")
    if not isinstance(boundary, dict):
        fail(f"{path.name}: release_boundary is missing")
    if boundary.get("provider_evaluation_evidence_content_addressed") is not True:
        fail(f"{path.name}: provider evaluation evidence must remain content-addressed")
    if boundary.get("provider_evaluation_evidence_reference_format") != EVIDENCE_FORMAT:
        fail(f"{path.name}: provider evaluation evidence reference format drifted")
    if boundary.get("provider_evaluation_is_production_acceptance") is not False:
        fail(f"{path.name}: provider evaluation must not authorize production acceptance")


def validate_schema(path: Path) -> None:
    schema = load_json(path)
    definitions = schema.get("$defs")
    if not isinstance(definitions, dict):
        fail(f"{path.name}: $defs is missing")
    evidence = definitions.get("evidence_ref")
    if not isinstance(evidence, dict):
        fail(f"{path.name}: evidence_ref definition is missing")
    if evidence.get("type") != "string" or evidence.get("pattern") != EVIDENCE_PATTERN:
        fail(f"{path.name}: evidence_ref must enforce the canonical content-addressed pattern")
    if evidence.get("minLength") != 85 or evidence.get("maxLength") != 1200:
        fail(f"{path.name}: evidence_ref length boundary drifted")

    criterion = definitions.get("criterion")
    try:
        item_ref = criterion["properties"]["evidence_refs"]["items"]["$ref"]
    except (KeyError, TypeError):
        fail(f"{path.name}: criterion evidence_refs is not bound to evidence_ref")
    if item_ref != "#/$defs/evidence_ref":
        fail(f"{path.name}: criterion evidence_refs must use #/$defs/evidence_ref")

    governance = schema.get("properties", {}).get("governance", {}).get("properties", {})
    if governance.get("evidence_reference") != {"$ref": "#/$defs/evidence_ref"}:
        fail(f"{path.name}: governance evidence_reference must be content-addressed")


def validate_evaluation_record(path: Path, record: dict) -> None:
    criteria = record.get("criteria")
    if not isinstance(criteria, dict) or not criteria:
        fail(f"{path}: criteria must be a non-empty object")
    for name, criterion in criteria.items():
        if not isinstance(criterion, dict):
            fail(f"{path}: criterion {name} must be an object")
        result = criterion.get("result")
        refs = criterion.get("evidence_refs")
        if result not in {"pending", "passed", "failed"}:
            fail(f"{path}: criterion {name} has an invalid result")
        if not isinstance(refs, list) or any(not isinstance(ref, str) for ref in refs):
            fail(f"{path}: criterion {name} evidence_refs must be a string list")
        if len(set(refs)) != len(refs):
            fail(f"{path}: criterion {name} evidence_refs must be unique")
        if result in {"passed", "failed"} and not refs:
            fail(f"{path}: resolved criterion {name} requires content-addressed evidence")
        for index, ref in enumerate(refs):
            validate_reference(ref, f"{path}: criterion {name} evidence_refs[{index}]")

    governance = record.get("governance")
    if not isinstance(governance, dict):
        fail(f"{path}: governance must be an object")
    validate_reference(governance.get("evidence_reference"), f"{path}: governance.evidence_reference")


def validate_documentation(path: Path) -> None:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        fail(f"{path.relative_to(ROOT)} is unreadable: {exc}")
    for marker in ("evidence+sha256:", "content-addressed", "does not prove"):
        if marker not in text:
            fail(f"{path.relative_to(ROOT)} is missing evidence-provenance guidance: {marker}")


def main() -> None:
    for contract in (STATE_CONTRACT, SIGNING_CONTRACT):
        validate_release_contract(contract)
    for schema in (STATE_SCHEMA, SIGNING_SCHEMA):
        validate_schema(schema)
    for directory in (STATE_DIR, SIGNING_DIR):
        for path in sorted(directory.glob("*.json")):
            validate_evaluation_record(path, load_json(path))
    for readme in (STATE_README, SIGNING_README):
        validate_documentation(readme)
    print(
        "Privacy Shield provider-evaluation evidence references are content-addressed, "
        "privacy-safe at the locator boundary, and remain non-authorizing provenance pointers."
    )


if __name__ == "__main__":
    main()
