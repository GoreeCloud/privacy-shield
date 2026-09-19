from __future__ import annotations

import copy
import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "validate_state_provider.py"
SPEC = importlib.util.spec_from_file_location("validate_state_provider", MODULE_PATH)
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validator
SPEC.loader.exec_module(validator)


def base_record() -> dict:
    qualification = {name: "passed" for name in validator.REQUIRED_QUALIFICATIONS}
    evidence = []
    for index, category in enumerate(validator.REQUIRED_QUALIFICATIONS.values(), start=1):
        evidence.append(
            {
                "id": f"evidence-{index}",
                "category": category,
                "result": "passed",
                "reference": f"https://example.invalid/evidence/{index}",
            }
        )
    return {
        "schema_version": 1,
        "contract_id": validator.ACCEPTANCE_CONTRACT_ID,
        "selection_decision_id": "distributed-state-provider-production",
        "provider_id": "distributed-test-provider",
        "provider_implementation": "DistributedTestProvider",
        "provider_authority": "GoreeCloud/goreecloud-privacy-shield",
        "exact_source_revision": "1" * 40,
        "source_tree_sha": "2" * 40,
        "provider_version": "1.0.0",
        "deployment": {
            "environment": "production-test",
            "topology_id": "topology-a",
            "distributed": True,
            "multi_writer": True,
            "replica_count": 3,
        },
        "capabilities": {name: True for name in validator.REQUIRED_CAPABILITIES},
        "qualification": qualification,
        "privacy": {
            "raw_private_payloads_in_acceptance_evidence": False,
            "secret_material_in_acceptance_evidence": False,
        },
        "acceptance": {
            "status": "passed",
            "production_approved": True,
            "exact_revision_required": True,
            "observed_date": "2026-09-09",
            "valid_until": "2099-01-01T00:00:00Z",
        },
        "evidence": evidence,
        "limitations": [],
    }


class StateProviderAcceptanceTests(unittest.TestCase):
    def test_complete_production_acceptance_record_passes(self) -> None:
        target = validator.validate_acceptance_record(Path("accepted.json"), base_record())
        self.assertEqual(target, ("distributed-test-provider", "production-test", "topology-a"))

    def test_selection_decision_id_is_required(self) -> None:
        record = base_record()
        del record["selection_decision_id"]
        with self.assertRaises(SystemExit):
            validator.validate_acceptance_record(Path("missing-selection.json"), record)

    def test_built_in_file_provider_cannot_be_production_accepted(self) -> None:
        record = base_record()
        record["provider_implementation"] = "FilePrivacyStateStore"
        with self.assertRaises(SystemExit):
            validator.validate_acceptance_record(Path("file-provider.json"), record)

    def test_production_approval_requires_every_qualification_to_pass(self) -> None:
        record = base_record()
        record["qualification"]["backup_and_restore"] = "pending"
        with self.assertRaises(SystemExit):
            validator.validate_acceptance_record(Path("pending-backup.json"), record)

    def test_production_approval_requires_category_evidence(self) -> None:
        record = base_record()
        record["evidence"] = [
            entry for entry in record["evidence"] if entry["category"] != "partition-conflict"
        ]
        with self.assertRaises(SystemExit):
            validator.validate_acceptance_record(Path("missing-partition-evidence.json"), record)

    def test_stale_production_acceptance_fails_closed(self) -> None:
        record = base_record()
        record["acceptance"]["valid_until"] = "2026-01-01T00:00:00Z"
        with self.assertRaises(SystemExit):
            validator.validate_acceptance_record(Path("stale.json"), record)

    def test_pending_record_cannot_claim_passed_status(self) -> None:
        record = base_record()
        record["acceptance"]["production_approved"] = False
        with self.assertRaises(SystemExit):
            validator.validate_acceptance_record(Path("contradictory.json"), record)

    def test_pending_record_is_allowed_without_production_approval(self) -> None:
        record = base_record()
        record["acceptance"]["status"] = "pending"
        record["acceptance"]["production_approved"] = False
        record["qualification"]["backup_and_restore"] = "pending"
        target = validator.validate_acceptance_record(Path("pending.json"), record)
        self.assertEqual(target, ("distributed-test-provider", "production-test", "topology-a"))


if __name__ == "__main__":
    unittest.main()
