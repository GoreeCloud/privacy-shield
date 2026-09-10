from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "validate_state_provider_selection.py"
SPEC = importlib.util.spec_from_file_location("validate_state_provider_selection", MODULE_PATH)
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validator
SPEC.loader.exec_module(validator)


def base_record() -> dict:
    return {
        "schema_version": 1,
        "contract_id": validator.CONTRACT_ID,
        "decision_id": "distributed-state-provider-production",
        "provider_id": "distributed-test-provider",
        "provider_name": "Distributed Test Provider",
        "provider_implementation": "DistributedTestProvider",
        "integration_authority": "GoreeCloud/goreecloud-privacy-shield",
        "scope": {
            "service": "privacy-shield",
            "capability": "durable-authorization-state",
            "authority_state": sorted(validator.REQUIRED_AUTHORITY_STATE),
            "environments": ["production"],
        },
        "evaluation": {name: "passed" for name in validator.REQUIRED_EVALUATION},
        "governance": {
            "status": "approved",
            "implementation_authorized": True,
            "production_acceptance_authorized": False,
            "decision_reference": "GoreeCloud governed provider-selection decision",
            "decided_at": "2026-09-10T00:00:00-05:00",
            "review_by": "2099-01-01T00:00:00Z",
        },
        "privacy": {name: False for name in validator.REQUIRED_PRIVACY},
        "limitations": [],
    }


class StateProviderSelectionTests(unittest.TestCase):
    def test_complete_approved_selection_passes_without_acceptance_authority(self) -> None:
        decision_id, provider_id, implementation, environments, record = validator.validate_selection_record(
            Path("approved.json"), base_record()
        )
        self.assertEqual(decision_id, "distributed-state-provider-production")
        self.assertEqual(provider_id, "distributed-test-provider")
        self.assertEqual(implementation, "DistributedTestProvider")
        self.assertEqual(environments, {"production"})
        self.assertFalse(record["governance"]["production_acceptance_authorized"])

    def test_approved_selection_requires_every_evaluation_passed(self) -> None:
        record = base_record()
        record["evaluation"]["backup_restore"] = "pending"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("pending-backup.json"), record)

    def test_nonapproved_selection_cannot_authorize_implementation(self) -> None:
        record = base_record()
        record["governance"]["status"] = "proposed"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("proposed.json"), record)

    def test_selection_can_never_authorize_production_acceptance(self) -> None:
        record = base_record()
        record["governance"]["production_acceptance_authorized"] = True
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("production-authority.json"), record)

    def test_built_in_file_provider_cannot_be_selected_for_production_integration(self) -> None:
        record = base_record()
        record["provider_implementation"] = "FilePrivacyStateStore"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("file-provider.json"), record)

    def test_built_in_memory_provider_cannot_be_selected_for_production_integration(self) -> None:
        record = base_record()
        record["provider_implementation"] = "MemoryPrivacyStateStore"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("memory-provider.json"), record)

    def test_approved_selection_must_cover_complete_authority_state(self) -> None:
        record = base_record()
        record["scope"]["authority_state"] = record["scope"]["authority_state"][:-1]
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("partial-authority.json"), record)

    def test_stale_approved_selection_fails_closed(self) -> None:
        record = base_record()
        record["governance"]["review_by"] = "2026-01-01T00:00:00Z"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("stale.json"), record)

    def test_proposed_record_is_allowed_when_it_does_not_authorize_implementation(self) -> None:
        record = base_record()
        record["governance"]["status"] = "proposed"
        record["governance"]["implementation_authorized"] = False
        record["evaluation"]["operational_ownership"] = "pending"
        result = validator.validate_selection_record(Path("proposal.json"), record)
        self.assertEqual(result[0], "distributed-state-provider-production")


if __name__ == "__main__":
    unittest.main()
