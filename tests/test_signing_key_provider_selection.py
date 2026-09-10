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


def base_evaluation() -> dict:
    return {
        "schema_version": 1,
        "contract_id": validator.EVALUATION_CONTRACT_ID,
        "evaluation_id": "signing-provider-evaluation",
        "provider_id": "production-test-provider",
        "provider_name": "Production Test Provider",
        "integration_authority": "GoreeCloud/goreecloud-privacy-shield",
        "scope": {
            "service": "privacy-shield",
            "capability": "operation-bound-capability-signing",
            "producer_identity": "goreecloud-privacy-shield",
            "environments": ["production"],
        },
        "criteria": {
            name: {"result": "passed", "evidence_refs": [f"evidence://signing/{name}"]}
            for name in validator.REQUIRED_EVALUATION
        },
        "governance": {
            "status": "complete",
            "authorizing": False,
            "production_acceptance_authorized": False,
            "evidence_reference": "GoreeCloud controlled signing-provider evaluation evidence",
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
        "decision_id": "provider-selection-test",
        "provider_id": evaluation["provider_id"],
        "provider_name": evaluation["provider_name"],
        "integration_authority": evaluation["integration_authority"],
        "evaluation_record_id": evaluation["evaluation_id"],
        "scope": evaluation["scope"].copy(),
        "evaluation": {name: item["result"] for name, item in evaluation["criteria"].items()},
        "governance": {
            "status": "approved",
            "implementation_authorized": True,
            "production_acceptance_authorized": False,
            "decision_reference": "GoreeCloud governed signing-provider selection decision",
            "decided_at": "2026-09-10T06:00:00Z",
            "review_by": "2099-01-01T00:00:00Z",
        },
        "privacy": {name: False for name in validator.REQUIRED_SELECTION_PRIVACY},
        "limitations": ["Test-only synthetic selection record."],
    }


def evaluation_map(record: dict | None = None) -> dict[str, dict]:
    record = record or base_evaluation()
    return {record["evaluation_id"]: record}


class SigningKeyProviderSelectionTests(unittest.TestCase):
    def test_complete_evaluation_is_non_authorizing_and_passes(self) -> None:
        result = validator.validate_evaluation_record(Path("evaluation.json"), base_evaluation())
        self.assertFalse(result["governance"]["authorizing"])
        self.assertFalse(result["governance"]["production_acceptance_authorized"])

    def test_resolved_evaluation_criterion_requires_evidence(self) -> None:
        record = base_evaluation()
        record["criteria"]["non_exportable_signing_material"]["evidence_refs"] = []
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_record(Path("missing-evidence.json"), record)

    def test_complete_evaluation_requires_every_criterion_passed(self) -> None:
        record = base_evaluation()
        record["criteria"]["access_control_isolation"]["result"] = "pending"
        record["criteria"]["access_control_isolation"]["evidence_refs"] = []
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_record(Path("incomplete.json"), record)

    def test_approved_selection_requires_matching_evaluation(self) -> None:
        decision_id, provider_id, environments, authority = validator.validate_selection_record(
            Path("approved.json"), base_record(), evaluation_map()
        )
        self.assertEqual(decision_id, "provider-selection-test")
        self.assertEqual(provider_id, "production-test-provider")
        self.assertEqual(environments, {"production"})
        self.assertEqual(authority, "GoreeCloud/goreecloud-privacy-shield")

    def test_selection_without_referenced_evaluation_fails(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("missing-evaluation.json"), base_record(), {})

    def test_selection_summary_must_match_evaluation_dossier(self) -> None:
        record = base_record()
        record["evaluation"]["privacy_safe_audit"] = "failed"
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

    def test_stale_evaluation_blocks_completion(self) -> None:
        evaluation = base_evaluation()
        evaluation["governance"]["valid_until"] = "2026-09-10T05:30:00Z"
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_record(Path("stale-evaluation.json"), evaluation)

    def test_selection_cannot_outlive_evaluation(self) -> None:
        evaluation = base_evaluation()
        evaluation["governance"]["valid_until"] = "2098-01-01T00:00:00Z"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("overlong-selection.json"), base_record(), evaluation_map(evaluation))

    def test_selection_can_never_authorize_production_acceptance(self) -> None:
        record = base_record()
        record["governance"]["production_acceptance_authorized"] = True
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("overreach.json"), record, evaluation_map())

    def test_only_approved_selection_can_authorize_implementation(self) -> None:
        record = base_record()
        record["governance"]["status"] = "proposed"
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("proposed.json"), record, evaluation_map())

    def test_development_provider_cannot_be_approved(self) -> None:
        evaluation = base_evaluation()
        evaluation["provider_id"] = "in-memory-development"
        evaluation["provider_name"] = "InMemoryPrivacySigningKeyProvider"
        record = base_record()
        record["provider_id"] = evaluation["provider_id"]
        record["provider_name"] = evaluation["provider_name"]
        with self.assertRaises(SystemExit):
            validator.validate_selection_record(Path("development.json"), record, evaluation_map(evaluation))

    def test_rejected_selection_must_not_authorize_implementation(self) -> None:
        record = base_record()
        record["governance"]["status"] = "rejected"
        record["governance"]["implementation_authorized"] = False
        validator.validate_selection_record(Path("rejected.json"), record, evaluation_map())


if __name__ == "__main__":
    unittest.main()
