#!/usr/bin/env python3
"""Fail-closed validation for the platform-wide Privacy Shield contract."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLATFORM = ROOT / "contracts" / "privacy-shield.platform.json"
SCHEMA = ROOT / "contracts" / "privacy-shield.adapter.schema.json"
ADAPTERS = ROOT / "adapters"

ALLOWED_CAPABILITIES = {
    "content-blocking", "tracking-resistance", "url-cleaning", "dns-privacy",
    "network-privacy", "telemetry-minimization", "data-minimization",
    "retention-controls", "deletion-controls", "portable-export",
    "privacy-status", "user-visible-exceptions",
}


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield platform validation failed: {message}")


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{path.relative_to(ROOT)} is unreadable or invalid JSON: {exc}")


def main() -> None:
    platform = load(PLATFORM)
    load(SCHEMA)  # Syntax and source-presence gate; semantic checks remain dependency-free below.

    if platform.get("schema_version") != 1:
        fail("unsupported platform schema version")
    if platform.get("platform", {}).get("scope") != "platform-wide-privacy-foundation":
        fail("platform scope drifted")

    model = platform.get("adapter_model", {})
    if model.get("application_adapters_required") is not True:
        fail("application adapters must remain required")
    if model.get("adapters_must_declare_capabilities") is not True:
        fail("adapters must declare capabilities")
    if model.get("adapters_must_not_claim_unimplemented_protection") is not True:
        fail("unimplemented protection claims must remain prohibited")

    principles = platform.get("privacy_principles", {})
    required_true = ("local_first", "data_minimization_required", "purpose_bound_collection_required", "retention_limits_required", "user_visible_exceptions_required")
    for key in required_true:
        if principles.get(key) is not True:
            fail(f"privacy principle {key} must remain true")
    for key in ("remote_tracker_learning_allowed", "remote_tracker_telemetry_allowed"):
        if principles.get(key) is not False:
            fail(f"privacy principle {key} must remain false")

    release = platform.get("release_boundary", {})
    if release.get("shared_contract_validation_is_runtime_acceptance") is not False:
        fail("shared validation must not equal runtime acceptance")
    if release.get("adapter_specific_acceptance_required") is not True:
        fail("adapter-specific acceptance must remain required")
    if release.get("production_ready") is not False:
        fail("platform foundation must not claim production readiness yet")

    files = sorted(ADAPTERS.glob("*.json"))
    if not files:
        fail("at least one adapter declaration is required")

    ids: set[str] = set()
    for path in files:
        adapter = load(path)
        if adapter.get("schema_version") != 1:
            fail(f"{path.name}: unsupported schema version")
        metadata = adapter.get("adapter", {})
        adapter_id = metadata.get("id")
        if not adapter_id or adapter_id in ids:
            fail(f"{path.name}: missing or duplicate adapter id")
        ids.add(adapter_id)
        authority = metadata.get("runtime_authority", "")
        if not authority.startswith("GoreeCloud/"):
            fail(f"{path.name}: invalid runtime authority")
        capabilities = adapter.get("capabilities")
        if not isinstance(capabilities, list) or not capabilities:
            fail(f"{path.name}: capabilities must be a non-empty list")
        unknown = set(capabilities) - ALLOWED_CAPABILITIES
        if unknown:
            fail(f"{path.name}: unsupported capabilities: {sorted(unknown)}")
        if len(capabilities) != len(set(capabilities)):
            fail(f"{path.name}: duplicate capability declarations")
        privacy = adapter.get("privacy", {})
        if privacy.get("local_first") is not True:
            fail(f"{path.name}: local_first must be true")
        if privacy.get("raw_private_activity_exported_for_status") is not False:
            fail(f"{path.name}: raw private activity must not be exported for status")
        if privacy.get("remote_tracker_learning") is not False or privacy.get("remote_tracker_telemetry") is not False:
            fail(f"{path.name}: remote tracker learning/telemetry is prohibited")
        acceptance = adapter.get("acceptance", {})
        if acceptance.get("runtime_acceptance_required") is not True:
            fail(f"{path.name}: runtime acceptance must remain required")
        if not isinstance(acceptance.get("production_approved"), bool):
            fail(f"{path.name}: production_approved must be boolean")

    print(f"Privacy Shield platform contract is consistent; validated {len(files)} adapter declaration(s).")


if __name__ == "__main__":
    main()
