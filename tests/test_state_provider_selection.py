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


def base_evaluation() -> dict:
    return {
        "schema_version": 1,
        "contract_id": validator.EVALUATION_CONTRACT_ID,
        "evaluation_id": "distributed-state-provider-evaluation",
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
        "criteria": {
            name: {"result": "passed", "evidence_refs": [f"evidence://state/{name}"]}
            for name in validator.REQUIRED_EVALUATION
        },
        "governance": {
            "status": "complete",
            "authorizing": False,
            "production_acceptance_authorized": False,
            "evidence_reference": "GoreeCloud controlled state-provider evaluation evidence",
            "evaluated_at": "2026-09-10T05:00:00Z",
            "valid_until": "2099-01-02T00:00:00Z",
        },
        "privacy": {name: False for name in validator.REQUIRED_EVALUATION_PRIVACY},
        "limitations": ["Synthetic test-only evaluation."],
    }


def base_record() -> dict:
    evaluation = base_evaluation()
    return {
        "schema_version": 1,
        "contract_id": validator.CONTRACT_ID,
        "decision_id": "distributed-state-provider-production",
        "provider_id": evaluation["provider_id"],
        "provider_name": evaluation["provider_name"],
        "provider_implementation": evaluation["provider_implementation"],
        "integration_authority": evaluation["integration_authority"],
        "evaluation_record_id": evaluation["evaluation_id"],
        "scope": evaluation["scope"].copy(),
        "evaluation": {name: item["result"] for name, item in evaluation["criteria"].items()},
        "governance": {
            "status": "approved",
            "implementation_authorized": True,
            "production_acceptance_authorized": False,
            "decision_reference": "GoreeCloud governed provider-selection decision",
            "decided_at": "2026-09-10T06:00:00Z",
            "review_by": "2099-01-01T00:00:00Z",
        },
        "privacy": {name: False for name in validator.REQUIRED_SELECTION_PRIVACY},
        "limitations": [],
    }


def evaluation_map(record: dict | None = None) -> dict[str, dict]:
    record = record or base_evaluation()
    return {record["evaluation_id"]: record}


class StateProviderSelectionTests(unittest.TestCase):
    def test_complete_evaluation_is_non_authorizing_and_passes(self) -> None:
        result = validator.validate_evaluation_record(Path("evaluation.json"), base_evaluation())
        self.assertFalse(result["governance"]["authorizing"])
        self.assertFalse(result["governance"]["production_acceptance_authorized"])

    def test_resolved_evaluation_criterion_requires_evidence(self) -> None:
        record = base_evaluation()
        record["criteria"]["backup_restore"]["evidence_refs"] = []
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_record(Path("missing-evidence.json"), record)

    def test_complete_evaluation_requires_every_criterion_passed(self) -> None:
        record = base_evaluation()
        record["criteria"]["backup_restore"]["result"] = "pending"
        record["criteria"]["backup_restore"]["evidence_refs"] = []
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_record(Path("incomplete.json"), record)

    def test_approved_selection_requires_matching_evaluation(self) -> None:
        result = validator.validate_selection_record(Path("approved.json"), base_record(), evaluation_map())
        self.assertEqual(result[0], "distributed-state-provider-production")
        self.assertFalse(result[4]["governance"]["production_acceptance_authorized"])

    def test_selection_without_referenced_evaluation_fails(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("missing-evaluation.json"), base_record(), {})

    def test_selection_summary_must_match_evaluation_dossier(self) -> None:
        record = base_record()
        record["evaluation"]["backup_restore"] = "failed"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("summary-mismatch.json"), record, evaluation_map())

    def test_selection_provider_identity_must_match_evaluation(self) -> None:
        record = base_record()
        record["provider_id"] = "other-provider"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("provider-mismatch.json"), record, evaluation_map())

    def test_selection_scope_must_match_evaluation(self) -> None:
        record = base_record()
        record["scope"] = {**record["scope"], "environments": ["staging"]}
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("scope-mismatch.json"), record, evaluation_map())

    def test_stale_evaluation_blocks_approved_selection(self) -> None:
        evaluation = base_evaluation()
        evaluation["governance"]["valid_until"] = "2026-09-10T05:30:00Z"
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_record(Path("stale-evaluation.json"), evaluation)

    def test_selection_cannot_outlive_evaluation(self) -> None:
        evaluation = base_evaluation()
        evaluation["governance"]["valid_until"] = "2098-01-01T00:00:00Z"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("overlong-selection.json"), base_record(), evaluation_map(evaluation))

    def test_nonapproved_selection_cannot_authorize_implementation(self) -> None:
        record = base_record()
        record["governance"]["status"] = "proposed"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("proposed.json"), record, evaluation_map())

    def test_selection_can_never_authorize_production_acceptance(self) -> None:
        record = base_record()
        record["governance"]["production_acceptance_authorized"] = True
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("production-authority.json"), record, evaluation_map())

    def test_built_in_file_provider_cannot_be_selected_for_production_integration(self) -> None:
        evaluation = base_evaluation()
        evaluation["provider_implementation"] = "FilePrivacyStateStore"
        record = base_record()
        record["provider_implementation"] = "FilePrivacyStateStore"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("file-provider.json"), record, evaluation_map(evaluation))

    def test_built_in_memory_provider_cannot_be_selected_for_production_integration(self) -> None:
        evaluation = base_evaluation()
        evaluation["provider_implementation"] = "MemoryPrivacyStateStore"
        record = base_record()
        record["provider_implementation"] = "MemoryPrivacyStateStore"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("memory-provider.json"), record, evaluation_map(evaluation))

    def test_proposed_record_is_allowed_when_non_authorizing(self) -> None:
        record = base_record()
        record["governance"]["status"] = "proposed"
        record["governance"]["implementation_authorized"] = False
        validator.validate_selection_record(Path("proposal.json"), record, evaluation_map())


if __name__ == "__main__":
    unittest.main()
