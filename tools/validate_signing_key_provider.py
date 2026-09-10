#!/usr/bin/env python3
"""Fail-closed validation for the Privacy Shield signing-key custody boundary."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "privacy-shield.signing-key-provider.json"
PROVIDER = ROOT / "src" / "privacy-signing-key-provider.mjs"
CAPABILITY_AUTHORITY = ROOT / "src" / "capability-token.mjs"
RUNTIME = ROOT / "src" / "privacy-runtime.mjs"

CONTRACT_ID = "goreecloud.privacy-shield.signing-key-provider.v1"
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
    "producer_identity",
    "algorithm",
    "status",
}


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield signing-key validation failed: {message}")


def main() -> None:
    try:
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"signing-key contract is unreadable or invalid: {exc}")

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
    for required in (
        "exact_provider_runtime_acceptance_required",
        "key_generation_and_custody_evidence_required",
        "rotation_retirement_revocation_exercises_required",
        "producer_identity_binding_evidence_required",
        "signing_audit_evidence_required",
        "private_material_export_forbidden",
    ):
        if boundary.get(required) is not True:
            fail(f"release boundary {required} must remain required")

    provider_source = PROVIDER.read_text(encoding="utf-8")
    authority_source = CAPABILITY_AUTHORITY.read_text(encoding="utf-8")
    runtime_source = RUNTIME.read_text(encoding="utf-8")

    for marker in (
        CONTRACT_ID,
        "#keys = new Map()",
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
    ):
        if marker not in authority_source:
            fail(f"capability authority is missing custody marker {marker!r}")

    for marker in (
        "capability_key_provider",
        "PRODUCTION_CAPABILITY_KEY_PROVIDER_REQUIRED",
        "production,",
    ):
        if marker not in runtime_source:
            fail(f"runtime is missing signing-provider gate marker {marker!r}")

    print(
        "Privacy Shield signing-key custody contract is consistent; production "
        "requires an opaque production-eligible provider and raw signing material "
        "remains outside the capability authority."
    )


if __name__ == "__main__":
    main()
