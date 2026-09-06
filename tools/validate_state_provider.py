#!/usr/bin/env python3
"""Fail-closed validation for the Privacy Shield production state-provider boundary."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "privacy-shield.state-provider.json"
STATE_STORE = ROOT / "src" / "privacy-state-store.mjs"
RUNTIME = ROOT / "src" / "privacy-runtime.mjs"
TRANSACTIONAL_AUTHORITIES = (
    ROOT / "src" / "consent-authority.mjs",
    ROOT / "src" / "capability-token.mjs",
    ROOT / "src" / "privacy-policy-store.mjs",
    ROOT / "src" / "privacy-evidence.mjs",
)

CONTRACT_ID = "goreecloud.privacy-shield.state-provider.v1"
REQUIRED_METHODS = {
    "get",
    "set",
    "delete",
    "list",
    "transaction",
    "stateProviderCapabilities",
}
REQUIRED_CAPABILITIES = {
    "durable",
    "restart_recovery",
    "atomic_transactions",
    "multi_writer_serializable",
    "distributed",
    "fail_closed_on_conflict",
}


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield state-provider validation failed: {message}")


def main() -> None:
    try:
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"state-provider contract is unreadable or invalid: {exc}")

    if contract.get("schema_version") != 1:
        fail("unsupported state-provider contract schema version")
    if contract.get("contract_id") != CONTRACT_ID:
        fail("state-provider contract id drifted")
    if set(contract.get("required_methods", [])) != REQUIRED_METHODS:
        fail("required state-provider methods drifted")

    capabilities = contract.get("required_production_capabilities")
    if not isinstance(capabilities, dict) or set(capabilities) != REQUIRED_CAPABILITIES:
        fail("production capability vocabulary drifted")
    if any(capabilities.get(key) is not True for key in REQUIRED_CAPABILITIES):
        fail("every production state-provider capability must remain required")

    providers = contract.get("source_providers", {})
    for provider in ("MemoryPrivacyStateStore", "FilePrivacyStateStore"):
        if providers.get(provider, {}).get("production_eligible") is not False:
            fail(f"{provider} must remain non-production")

    boundary = contract.get("release_boundary", {})
    if boundary.get("capability_declaration_is_production_acceptance") is not False:
        fail("capability declaration must not equal production acceptance")
    if boundary.get("source_validation_is_provider_acceptance") is not False:
        fail("source validation must not equal provider acceptance")
    for required in (
        "exact_provider_runtime_acceptance_required",
        "failure_and_recovery_exercises_required",
        "operational_backup_and_restore_acceptance_required",
    ):
        if boundary.get(required) is not True:
            fail(f"release boundary {required} must remain required")

    state_source = STATE_STORE.read_text(encoding="utf-8")
    runtime_source = RUNTIME.read_text(encoding="utf-8")
    for marker in (CONTRACT_ID, "transaction(mutation)", "stateProviderCapabilities()"):
        if marker not in state_source:
            fail(f"state-store source is missing {marker!r}")
    for capability in REQUIRED_CAPABILITIES:
        if capability not in state_source or capability not in runtime_source:
            fail(f"runtime/source capability marker missing: {capability}")
    if "production: true" not in runtime_source:
        fail("runtime must document the explicit production state-provider path")
    if "Production Privacy Shield state provider must implement transaction()" not in runtime_source:
        fail("production runtime must fail closed without transaction support")
    if "FilePrivacyStateStore is single-host only" not in runtime_source:
        fail("file-backed source must remain explicitly non-production")

    for authority in TRANSACTIONAL_AUTHORITIES:
        source = authority.read_text(encoding="utf-8")
        if "mutatePrivacyState" not in source:
            fail(f"{authority.name} does not use the shared transactional mutation boundary")

    print(
        "Privacy Shield state-provider contract is consistent; production requires "
        "durable distributed serializable transactions and source providers remain bounded/non-production."
    )


if __name__ == "__main__":
    main()
