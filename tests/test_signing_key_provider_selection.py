from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "validate_signing_key_provider_selection.py"
SPEC = importlib.util.spec_from_file_location("validate_signing_key_provider_selection", MODULE_PATH)
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validator
SPEC.loader.exec_module(validator)


def base_record() -> dict:
    return {
        "schema_version": 1,
        "contract_id": validator.CONTRACT_ID,
        "decision_id": "provider-selection-test",
        "provider_id": "production-test-provider",
        "provider_name": "Production Test Provider",
        "integration_authority": "GoreeCloud/goreecloud-privacy-shield",
        "scope": {
            "service": "privacy-shield",
            "capability": "operation-bound-capability-signing",
            "producer_identity": "goreecloud-privacy-shield",
            "environments": ["production"],
        },
        "evaluation": {name: "passed" for name in validator.REQUIRED_EVALUATION},
        "governance": {
            "status": "approved",
            "implementation_authorized": True,
            "production_acceptance_authorized": False,
            "decision_reference": "https://example.invalid/decision/provider-selection-test",
            "decided_at": "2026-09-10T00:00:00Z",
            "review_by": "2099-01-01T00:00:00Z",
        },
        "privacy": {name: False for name in validator.REQUIRED_PRIVACY},
        "limitations": ["Test-only synthetic selection record."],
    }


class SigningKeyProviderSelectionTests(unittest.TestCase):
    def test_complete_approved_selection_passes(self) -> None:
        decision_id, provider_id, environments, authority = validator.validate_selection_record(
            Path("approved.json"), base_record()
        )
        self.assertEqual(decision_id, "provider-selection-test")
        self.assertEqual(provider_id, "production-test-provider")
        self.assertEqual(environments, {"production"})
        self.assertEqual(authority, "GoreeCloud/goreecloud-privacy-shield")

    def test_selection_can_never_authorize_production_acceptance(self) -> None:
        record = base_record()
        record["governance"]["production_acceptance_authorized"] = True
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("overreach.json"), record)

    def test_only_approved_selection_can_authorize_implementation(self) -> None:
        record = base_record()
        record["governance"]["status"] = "proposed"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("proposed.json"), record)

    def test_approved_selection_requires_all_evaluation_criteria_passed(self) -> None:
        record = base_record()
        record["evaluation"]["non_exportable_signing_material"] = "pending"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("pending-evaluation.json"), record)

    def test_stale_approved_selection_fails_closed(self) -> None:
        record = base_record()
        record["governance"]["review_by"] = "2026-09-10T00:00:01Z"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("stale.json"), record)

    def test_development_provider_cannot_be_approved(self) -> None:
        record = base_record()
        record["provider_id"] = "in-memory-development"
        record["provider_name"] = "InMemoryPrivacySigningKeyProvider"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("development.json"), record)

    def test_rejected_selection_must_not_authorize_implementation(self) -> None:
        record = base_record()
        record["governance"]["status"] = "rejected"
        record["governance"]["implementation_authorized"] = False
        validator.validate_selection_record(Path("rejected.json"), record)


if __name__ == "__main__":
    unittest.main()
