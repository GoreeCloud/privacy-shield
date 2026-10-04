#!/usr/bin/env python3
"""Validate the pending Privacy Shield 2.0 release-evidence template."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "qualification" / "release-evidence.template.json"
CANDIDATE = ROOT / "qualification" / "seal-candidate.json"
READINESS = ROOT / "qualification" / "seal-readiness.json"


def fail(message: str) -> None:
    raise SystemExit(f"Privacy Shield release-evidence template validation failed: {message}")


def require_pending_object(record: dict, name: str) -> dict:
    value = record.get(name)
    if not isinstance(value, dict) or value.get("status") != "pending":
        fail(f"{name} must remain pending")
    return value


def main() -> None:
    record = json.loads(TEMPLATE.read_text())
    candidate = json.loads(CANDIDATE.read_text())
    readiness = json.loads(READINESS.read_text())

    if record.get("schema_version") != 1 or record.get("component") != "GoreeCloud Privacy Shield":
        fail("template identity/schema drifted")
    if record.get("version") != "2.0.0":
        fail("template version drifted")
    if record.get("candidate_id") != candidate.get("candidate_id"):
        fail("template candidate id must match the Seal candidate")
    source = record.get("candidate_source_revision")
    if source != candidate.get("source_revision") or not isinstance(source, str) or not re.fullmatch(r"[0-9a-f]{40}", source):
        fail("template source revision must match the exact Seal candidate")
    if record.get("status") != "pending":
        fail("template status must remain pending")
    if record.get("production_approved") is not False or record.get("authority_effect") != "none":
        fail("template must remain non-authorizing")

    release = require_pending_object(record, "published_release")
    for key in ("tag", "release_url", "published_at"):
        if release.get(key) is not None:
            fail(f"published_release.{key} must remain null")

    artifact = require_pending_object(record, "artifact")
    for key in ("name", "digest_sha256", "package_identity"):
        if artifact.get(key) is not None:
            fail(f"artifact.{key} must remain null")

    provenance = require_pending_object(record, "provenance")
    for part in ("sbom", "signing", "source_attestation"):
        item = provenance.get(part)
        if not isinstance(item, dict) or item.get("status") != "pending":
            fail(f"provenance.{part} must remain pending")
        if item.get("identity") is not None or item.get("digest_sha256") is not None:
            fail(f"provenance.{part} evidence fields must remain null")

    deployment = require_pending_object(record, "deployment")
    for key in ("revision", "identity", "environment", "observed_at"):
        if deployment.get(key) is not None:
            fail(f"deployment.{key} must remain null")

    rollback = require_pending_object(record, "rollback")
    if rollback.get("target_source_revision") != candidate.get("rollback_target"):
        fail("rollback target must match the candidate rollback target")
    if rollback.get("target_artifact_digest_sha256") is not None or rollback.get("observed_at") is not None:
        fail("rollback artifact and observation fields must remain null")
    if rollback.get("exercise_status") != "pending":
        fail("rollback exercise must remain pending")

    verification = require_pending_object(record, "verification")
    if verification.get("canonical_readback_status") != "pending" or verification.get("post_release_checks") != []:
        fail("verification fields must remain pending/empty")

    gate = next((g for g in readiness.get("gates", []) if g.get("id") == "hosting-observability-recovery-release"), None)
    if not gate or gate.get("state") != "blocked":
        fail("hosting-observability-recovery-release must remain blocked")
    if "qualification/release-evidence.template.json" not in gate.get("evidence", []):
        fail("readiness gate must cite the release-evidence template")

    print("Privacy Shield release-evidence template guard passed: pending evidence contract is fail-closed.")


if __name__ == "__main__":
    main()
