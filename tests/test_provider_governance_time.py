from __future__ import annotations

import importlib.util
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "validate_provider_governance_time.py"
SPEC = importlib.util.spec_from_file_location("validate_provider_governance_time", MODULE_PATH)
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validator
SPEC.loader.exec_module(validator)

NOW = datetime(2026, 9, 11, 23, 30, tzinfo=timezone.utc)


class ProviderGovernanceTemporalIntegrityTests(unittest.TestCase):
    def test_past_complete_evaluation_with_current_window_passes(self) -> None:
        validator.validate_evaluation(
            Path("evaluations/state-providers/test.json"),
            {
                "governance": {
                    "status": "complete",
                    "evaluated_at": "2026-09-11T22:00:00Z",
                    "valid_until": "2026-09-12T22:00:00Z",
                }
            },
            now=NOW,
        )

    def test_future_evaluation_timestamp_fails(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_evaluation(
                Path("evaluations/state-providers/future.json"),
                {
                    "governance": {
                        "status": "complete",
                        "evaluated_at": "2026-09-12T00:00:00Z",
                        "valid_until": "2026-09-13T00:00:00Z",
                    }
                },
                now=NOW,
            )

    def test_future_selection_decision_fails(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_selection(
                Path("decisions/signing-key-providers/future.json"),
                {
                    "governance": {
                        "status": "approved",
                        "decided_at": "2026-09-12T00:00:00Z",
                        "review_by": "2026-09-13T00:00:00Z",
                    }
                },
                now=NOW,
            )

    def test_stale_approved_selection_fails(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_selection(
                Path("decisions/state-providers/stale.json"),
                {
                    "governance": {
                        "status": "approved",
                        "decided_at": "2026-09-10T00:00:00Z",
                        "review_by": "2026-09-11T22:00:00Z",
                    }
                },
                now=NOW,
            )

    def test_future_evidence_review_timestamp_fails(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_review(
                Path("reviews/provider-evidence/future.json"),
                {
                    "review": {
                        "reviewed_at": "2026-09-12T00:00:00Z",
                        "valid_until": "2026-09-13T00:00:00Z",
                    },
                    "governance": {"status": "active"},
                },
                now=NOW,
            )

    def test_active_current_evidence_review_passes(self) -> None:
        validator.validate_review(
            Path("reviews/provider-evidence/current.json"),
            {
                "review": {
                    "reviewed_at": "2026-09-11T22:00:00Z",
                    "valid_until": "2026-09-12T22:00:00Z",
                },
                "governance": {"status": "active"},
            },
            now=NOW,
        )


if __name__ == "__main__":
    unittest.main()
