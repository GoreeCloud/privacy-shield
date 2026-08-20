#!/usr/bin/env python3
"""Fail-closed validation for the platform-wide Privacy Shield contract."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLATFORM = ROOT / "contracts" / "privacy-shield.platform.json"
SCHEMA = ROOT / "contracts" / "privacy-shield.adapter.schema.json"
CAPABILITY_REGISTRY = ROOT / "contracts" / "privacy-shield.capabilities.json"
ADOPTION_DOC = ROOT / "docs" / "PLATFORM-ADOPTION.md"
ADAPTERS = ROOT / "adapters"


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield platform validation failed: {message}")


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{path.relative_to(ROOT)} is unreadable or invalid JSON: {exc}")


def capability_registry() -> set[str]:
    registry = load(CAPABILITY_REGISTRY)
    if registry.get("schema_version") != 1:
        fail("unsupported capability registry schema version")
    capabilities = registry.get("capabilities")
    if not isinstance(capabilities, dict) or not capabilities:
        fail("capability registry must contain a non-empty capabilities object")

    result: set[str] = set()
    for capability_id, definition in capabilities.items():
        if not isinstance(capability_id, str) or not capability_id:
            fail("capability registry contains an invalid capability id")
        if capability_id in result:
            fail(f"duplicate capability id: {capability_id}")
        if not isinstance(definition, dict):
            fail(f"capability {capability_id} definition must be an object")
        for required in ("domain", "description", "initial_runtime"):
            if required not in definition:
                fail(f"capability {capability_id} is missing {required}")
        if not isinstance(definition.get("domain"), str) or not definition["domain"]:
            fail(f"capability {capability_id} has invalid domain")
        if not isinstance(definition.get("description"), str) or not definition["description"]:
            fail(f"capability {capability_id} has invalid description")
        runtime = definition.get("initial_runtime")
        if runtime is not None and (not isinstance(runtime, str) or not runtime.startswith("GoreeCloud/")):
            fail(f"capability {capability_id} has invalid initial_runtime")
        result.add(capability_id)

    governance = registry.get("governance", {})
    for key in ("adapter_declaration_required", "runtime_acceptance_required", "capability_additions_require_contract_review"):
        if governance.get(key) is not True:
            fail(f"capability registry governance {key} must remain true")
    if governance.get("branding_alone_is_adoption") is not False:
        fail("branding alone must not qualify as Privacy Shield adoption")
    return result


def schema_capabilities(schema: dict) -> set[str]:
    try:
        values = schema["properties"]["capabilities"]["items"]["enum"]
    except (KeyError, TypeError):
        fail("adapter schema capability enum is missing")
    if not isinstance(values, list) or not values or not all(isinstance(item, str) for item in values):
        fail("adapter schema capability enum is invalid")
    if len(values) != len(set(values)):
        fail("adapter schema capability enum contains duplicates")
    return set(values)


def validate_adoption_doc(capabilities: set[str]) -> None:
    if not ADOPTION_DOC.is_file():
        fail("missing docs/PLATFORM-ADOPTION.md")
    text = ADOPTION_DOC.read_text(encoding="utf-8")
    for capability in capabilities:
        if f"`{capability}`" not in text:
            fail(f"adoption documentation does not name canonical capability {capability}")
    stale = (
        "`content.request-blocking`",
        "`tracking.behavioral-local`",
        "`tracking.parameter-cleaning`",
        "`dns.tracker-filtering`",
        "`telemetry.minimized`",
        "`telemetry.opt-in`",
        "`retention.bounded`",
        "`deletion.user-controlled`",
        "`metadata.minimized`",
        "`exceptions.user-visible`",
        "`privacy-status.local`",
        "`state.portable-export`",
    )
    for identifier in stale:
        if identifier in text:
            fail(f"adoption documentation contains retired capability identifier {identifier}")


def main() -> None:
    platform = load(PLATFORM)
    schema = load(SCHEMA)
    allowed_capabilities = capability_registry()
    schema_values = schema_capabilities(schema)
    if schema_values != allowed_capabilities:
        fail(
            "adapter schema capability enum does not exactly match capability registry: "
            f"schema_only={sorted(schema_values - allowed_capabilities)}, "
            f"registry_only={sorted(allowed_capabilities - schema_values)}"
        )
    validate_adoption_doc(allowed_capabilities)

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
        unknown = set(capabilities) - allowed_capabilities
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

    print(
        "Privacy Shield platform contract is consistent; "
        f"validated {len(files)} adapter declaration(s) and {len(allowed_capabilities)} canonical capabilities."
    )


if __name__ == "__main__":
    main()
