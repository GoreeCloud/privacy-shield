#!/usr/bin/env python3
"""Fail-closed temporal-integrity validation for Privacy Shield 2.0 provider governance records.

This gate is deliberately separate from provider qualification, evidence review,
selection, and production acceptance. It only rejects repository governance
records whose authoritative timestamps are internally inconsistent, stale where
current authority is claimed, or dated in the future relative to validation.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
EVALUATION_DIRS = (
    ROOT / "evaluations" / "state-providers",
    ROOT / "evaluations" / "signing-key-providers",
)
SELECTION_DIRS = (
    ROOT / "decisions" / "state-providers",
    ROOT / "decisions" / "signing-key-providers",
)
PACKAGE_DIR = ROOT / "evidence" / "provider-evaluations"
REVIEW_DIR = ROOT / "reviews" / "provider-evidence"


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield provider governance temporal validation failed: {message}")


def display_path(path: Path) -> Path:
    """Return a stable repository-relative label when possible, otherwise the input path."""
    try:
        return path.resolve().relative_to(ROOT)
    except (OSError, ValueError):
        return path


def parse_time(value: object, *, label: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        fail(f"{label} must be a non-empty offset-aware date-time")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        fail(f"{label} is not a valid date-time")
    if parsed.tzinfo is None:
        fail(f"{label} must include a timezone offset")
    return parsed.astimezone(timezone.utc)


def load_json(path: Path) -> dict:
    label = display_path(path)
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{label} is unreadable or invalid JSON: {exc}")
    if not isinstance(value, dict):
        fail(f"{label} must contain a JSON object")
    return value


def _governance(record: dict, path: Path) -> dict:
    value = record.get("governance")
    if not isinstance(value, dict):
        fail(f"{display_path(path)}: governance must be an object")
    return value


def validate_evaluation(path: Path, record: dict, *, now: datetime) -> None:
    label = display_path(path)
    governance = _governance(record, path)
    evaluated_at = parse_time(
        governance.get("evaluated_at"),
        label=f"{label} governance.evaluated_at",
    )
    valid_until = parse_time(
        governance.get("valid_until"),
        label=f"{label} governance.valid_until",
    )
    if evaluated_at > now:
        fail(f"{label}: evaluation timestamp is in the future")
    if valid_until <= evaluated_at:
        fail(f"{label}: evaluation validity window is invalid")
    if governance.get("status") == "complete" and valid_until <= now:
        fail(f"{label}: complete evaluation is stale")


def validate_selection(path: Path, record: dict, *, now: datetime) -> None:
    label = display_path(path)
    governance = _governance(record, path)
    decided_at = parse_time(
        governance.get("decided_at"),
        label=f"{label} governance.decided_at",
    )
    review_by = parse_time(
        governance.get("review_by"),
        label=f"{label} governance.review_by",
    )
    if decided_at > now:
        fail(f"{label}: provider-selection decision timestamp is in the future")
    if review_by <= decided_at:
        fail(f"{label}: selection review window is invalid")
    if governance.get("status") == "approved" and review_by <= now:
        fail(f"{label}: approved provider selection is stale")


def validate_package(path: Path, record: dict, *, now: datetime) -> None:
    label = display_path(path)
    artifact = record.get("artifact")
    if not isinstance(artifact, dict):
        fail(f"{label}: artifact must be an object")
    collected_at = parse_time(
        artifact.get("collected_at"),
        label=f"{label} artifact.collected_at",
    )
    valid_until = parse_time(
        artifact.get("valid_until"),
        label=f"{label} artifact.valid_until",
    )
    if collected_at > now:
        fail(f"{label}: provider-evidence collection timestamp is in the future")
    if valid_until <= collected_at:
        fail(f"{label}: provider-evidence validity window is invalid")

    governance = _governance(record, path)
    if governance.get("status") == "reviewed":
        reviewed_at = parse_time(
            governance.get("reviewed_at"),
            label=f"{label} governance.reviewed_at",
        )
        if reviewed_at > now:
            fail(f"{label}: provider-evidence package review timestamp is in the future")
        if reviewed_at < collected_at:
            fail(f"{label}: provider-evidence package review predates collection")
        if reviewed_at >= valid_until:
            fail(f"{label}: provider-evidence package review is outside the evidence validity window")
        if valid_until <= now:
            fail(f"{label}: reviewed provider-evidence package is stale")


def validate_review(path: Path, record: dict, *, now: datetime) -> None:
    label = display_path(path)
    review = record.get("review")
    if not isinstance(review, dict):
        fail(f"{label}: review must be an object")
    reviewed_at = parse_time(
        review.get("reviewed_at"),
        label=f"{label} review.reviewed_at",
    )
    valid_until = parse_time(
        review.get("valid_until"),
        label=f"{label} review.valid_until",
    )
    if reviewed_at > now:
        fail(f"{label}: evidence-review timestamp is in the future")
    if valid_until <= reviewed_at:
        fail(f"{label}: evidence-review validity window is invalid")
    governance = record.get("governance")
    if isinstance(governance, dict) and governance.get("status") == "active" and valid_until <= now:
        fail(f"{label}: active evidence review is stale")


def json_records(directories: Iterable[Path]) -> Iterable[Path]:
    for directory in directories:
        if not directory.exists():
            continue
        yield from sorted(directory.glob("*.json"))


def validate_repository(*, now: datetime | None = None) -> None:
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        fail("validation time must be timezone-aware")
    now = now.astimezone(timezone.utc)

    for path in json_records(EVALUATION_DIRS):
        validate_evaluation(path, load_json(path), now=now)
    for path in json_records(SELECTION_DIRS):
        validate_selection(path, load_json(path), now=now)
    for path in json_records((PACKAGE_DIR,)):
        validate_package(path, load_json(path), now=now)
    for path in json_records((REVIEW_DIR,)):
        validate_review(path, load_json(path), now=now)


def main() -> None:
    validate_repository()
    print("Privacy Shield provider governance temporal-integrity validation passed")


if __name__ == "__main__":
    main()
