from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "validate_provider_evaluation_evidence.py"
SPEC = importlib.util.spec_from_file_location("validate_provider_evaluation_evidence", MODULE_PATH)
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validator
SPEC.loader.exec_module(validator)


def evidence_ref(locator: str = "artifact:provider-evaluation/test") -> str:
    return f"evidence+sha256:{'a' * 64}:{locator}"


def record(result: str = "passed", refs: list[str] | None = None) -> dict:
    refs = [evidence_ref()] if refs is None else refs
    return {
        "criteria": {
            "example": {
                "result": result,
                "evidence_refs": refs,
            }
        },
        "governance": {
            "evidence_reference": evidence_ref("artifact:provider-evaluation/summary"),
        },
    }


class ProviderEvaluationEvidenceTests(unittest.TestCase):
    def test_content_addressed_reference_passes(self) -> None:
        self.assertEqual(
            validator.validate_reference(evidence_ref(), "test"),
            evidence_ref(),
        )

    def test_unhashed_freeform_reference_fails_closed(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_reference("evidence://state/durability", "test")

    def test_all_zero_digest_fails_closed(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_reference(
                f"evidence+sha256:{'0' * 64}:artifact:provider-evaluation/test",
                "test",
            )

    def test_credential_bearing_locator_fails_closed(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_reference(
                evidence_ref("https://example.invalid/report?token=secret"),
                "test",
            )

    def test_resolved_criterion_requires_content_addressed_evidence(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_record(Path("evaluation.json"), record(refs=[]))

    def test_pending_criterion_may_have_no_evidence_yet(self) -> None:
        validator.validate_evaluation_record(Path("evaluation.json"), record(result="pending", refs=[]))

    def test_governance_evidence_reference_is_also_content_addressed(self) -> None:
        value = record()
        value["governance"]["evidence_reference"] = "GoreeCloud evaluation evidence"
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_record(Path("evaluation.json"), value)

    def test_duplicate_references_fail_closed(self) -> None:
        ref = evidence_ref()
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_record(Path("evaluation.json"), record(refs=[ref, ref]))


if __name__ == "__main__":
    unittest.main()
