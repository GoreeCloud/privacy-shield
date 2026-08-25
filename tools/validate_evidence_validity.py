#!/usr/bin/env python3
"""Fail-closed validation for Privacy Shield status evidence validity."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "contracts" / "privacy-shield.status.schema.json"
DOC = ROOT / "docs" / "EVIDENCE-VALIDITY.md"


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield evidence-validity validation failed: {message}")


def load(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{path.relative_to(ROOT)} is unreadable or invalid JSON: {exc}")
    if not isinstance(value, dict):
        fail(f"{path.relative_to(ROOT)} must contain an object")
    return value


def main() -> None:
    schema = load(SCHEMA)
    properties = schema.get("properties", {})
    if properties.get("generated_at", {}).get("format") != "date-time":
        fail("generated_at must remain a date-time")
    if properties.get("valid_until", {}).get("format") != "date-time":
        fail("valid_until must be a date-time")

    rules = schema.get("allOf")
    if not isinstance(rules, list) or len(rules) < 2:
        fail("status schema must contain protected and production-approved validity rules")
    serialized = json.dumps(rules, sort_keys=True)
    for marker in ('"protected"', '"production_approved"', '"valid_until"'):
        if marker not in serialized:
            fail(f"status validity rules are missing {marker}")
    if serialized.count('"valid_until"') < 2:
        fail("both favorable status paths must require valid_until")

    try:
        documentation = DOC.read_text(encoding="utf-8").lower()
    except OSError as exc:
        fail(f"missing evidence-validity documentation: {exc}")
    for phrase in ("valid_until", "fail", "producer", "mesh", "extend"):
        if phrase not in documentation:
            fail(f"evidence-validity documentation is missing required concept: {phrase}")

    print("Privacy Shield evidence-validity contract validation passed.")


if __name__ == "__main__":
    main()
