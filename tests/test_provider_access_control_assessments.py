from __future__ import annotations

import importlib.util
import sys
import unittest
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "validate_provider_access_control_assessments.py"
SPEC = importlib.util.spec_from_file_location("validate_provider_access_control_assessments", MODULE_PATH)
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validator
SPEC.loader.exec_module(validator)

NOW = datetime(2026, 9, 19, 21, 0, tzinfo=timezone.utc)
DIGEST = "a" * 64
REF = f"evidence+sha256:{DIGEST}:artifact:provider-access-control/test"


def record(status: str = "complete") -> dict:
    controls = {
        name: {"result": "passed", "evidence_refs": [REF]}
        for name in validator.CONTROLS
    }
    if status == "draft":
        controls["privacy_safe_audit"] = {"result": "pending", "evidence_refs": []}
    if status == "failed":
        controls["direct_bypass_prevention"] = {"result": "failed", "evidence_refs": [REF]}
    return {
        "schema_version": 1,
        "contract_id": validator.CONTRACT_ID,
        "assessment_id": "provider-access-control-test",
        "provider_type": "state-provider",
        "provider_id": "example-state",
        "provider_implementation": "ExampleStateProvider behind accepted isolation boundary",
        "provider_authority": "GoreeCloud/goreecloud-privacy-shield",
        "provider_version": "1.0.0",
        "exact_source_revision": "1" * 40,
        "source_tree_sha": "2" * 40,
        "deployment": {
            "environment": "production",
            "boundary_id": "privacy-state-production-boundary-a",
        },
        "scope": {
            "service": "privacy-shield",
            "capability": "durable-authorization-state",
            "allowed_runtime_identity": "goreecloud-privacy-shield",
            "direct_provider_access_by_end_users": False,
        },
        "controls": controls,
        "governance": {
            "status": status,
            "authorizing": False,
            "production_acceptance_authorized": False,
            "assessed_at": "2026-09-19T20:00:00Z",
            "valid_until": "2026-10-19T20:00:00Z",
        },
        "privacy": {
            "credentials_in_assessment_record": False,
            "secret_material_in_assessment_record": False,
            "raw_private_payloads_in_assessment_record": False,
            "full_capability_tokens_in_assessment_record": False,
        },
        "limitations": [],
    }


class ProviderAccessControlAssessmentTests(unittest.TestCase):
    def test_complete_fresh_assessment_passes(self) -> None:
        validator.validate_record(record(), label="test", now=NOW)

    def test_complete_assessment_requires_every_control_passed(self) -> None:
        value = record()
        value["controls"]["workload_identity"] = {"result": "pending", "evidence_refs": []}
        with self.assertRaises(SystemExit):
            validator.validate_record(value, label="test", now=NOW)

    def test_failed_assessment_requires_a_failed_control(self) -> None:
        value = record()
        value["governance"]["status"] = "failed"
        with self.assertRaises(SystemExit):
            validator.validate_record(value, label="test", now=NOW)

    def test_resolved_control_requires_content_addressed_evidence(self) -> None:
        value = record()
        value["controls"]["boundary_exclusivity"]["evidence_refs"] = []
        with self.assertRaises(SystemExit):
            validator.validate_record(value, label="test", now=NOW)

    def test_provider_type_and_capability_must_match(self) -> None:
        value = record()
        value["provider_type"] = "signing-key-provider"
        with self.assertRaises(SystemExit):
            validator.validate_record(value, label="test", now=NOW)

    def test_direct_provider_access_by_end_users_is_forbidden(self) -> None:
        value = record()
        value["scope"]["direct_provider_access_by_end_users"] = True
        with self.assertRaises(SystemExit):
            validator.validate_record(value, label="test", now=NOW)

    def test_assessment_cannot_authorize_production(self) -> None:
        value = record()
        value["governance"]["production_acceptance_authorized"] = True
        with self.assertRaises(SystemExit):
            validator.validate_record(value, label="test", now=NOW)

    def test_stale_complete_assessment_fails_closed(self) -> None:
        value = record()
        value["governance"]["valid_until"] = "2026-09-19T20:30:00Z"
        with self.assertRaises(SystemExit):
            validator.validate_record(value, label="test", now=NOW)


if __name__ == "__main__":
    unittest.main()
