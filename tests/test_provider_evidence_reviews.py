from __future__ import annotations

import importlib.util
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))
MODULE_PATH = TOOLS / "validate_provider_evidence_reviews.py"
SPEC = importlib.util.spec_from_file_location("validate_provider_evidence_reviews", MODULE_PATH)
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validator
SPEC.loader.exec_module(validator)

packages = validator.packages
NOW = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
FUTURE = "2099-01-02T00:00:00Z"
EVIDENCE_DIGEST = "a" * 64
AUTHORITY_DIGEST = "d" * 64
REVIEW_DIGEST = "e" * 64


def state_scope() -> dict:
    return {
        "service": "privacy-shield",
        "capability": "durable-authorization-state",
        "authority_state": sorted(packages.STATE_AUTHORITY_STATE),
        "environments": ["production"],
    }


def evidence_ref() -> str:
    return f"evidence+sha256:{EVIDENCE_DIGEST}:artifact:state-evidence.json"


def reviewed_package(*, status: str = "reviewed") -> dict:
    reviewed_at = "2026-09-10T01:00:00Z" if status == "reviewed" else None
    return {
        "schema_version": 1,
        "contract_id": packages.CONTRACT_ID,
        "evidence_id": "state-evidence-package",
        "provider_class": "state-provider",
        "provider_id": "distributed-test-provider",
        "provider_name": "Distributed Test Provider",
        "provider_implementation": "DistributedTestProvider",
        "integration_authority": "GoreeCloud/goreecloud-privacy-shield",
        "scope": state_scope(),
        "evidence_ref": evidence_ref(),
        "artifact": {
            "digest_algorithm": "sha256",
            "digest": EVIDENCE_DIGEST,
            "locator": "artifact:state-evidence.json",
            "media_type": "application/json",
            "source_authority": "GoreeCloud controlled test evidence",
            "collected_at": "2026-09-10T00:00:00Z",
            "valid_until": FUTURE,
        },
        "supports": ["durability", "evaluation-summary"],
        "governance": {
            "status": status,
            "authorizing": False,
            "production_acceptance_authorized": False,
            "reviewed_at": reviewed_at,
        },
        "privacy": {name: False for name in packages.PRIVACY_FIELDS},
        "limitations": ["Synthetic test-only evidence package."],
    }


def accepted_review() -> dict:
    return {
        "schema_version": 1,
        "contract_id": validator.CONTRACT_ID,
        "review_id": "state-evidence-review",
        "evidence_id": "state-evidence-package",
        "evidence_ref": evidence_ref(),
        "provider_class": "state-provider",
        "provider_id": "distributed-test-provider",
        "provider_name": "Distributed Test Provider",
        "provider_implementation": "DistributedTestProvider",
        "integration_authority": "GoreeCloud/goreecloud-privacy-shield",
        "scope": state_scope(),
        "supports": ["durability", "evaluation-summary"],
        "review": {
            "decision": "accepted-for-evaluation",
            "review_authority": "GoreeCloud governed test review authority",
            "review_authority_reference": f"evidence+sha256:{AUTHORITY_DIGEST}:gdrive://authority-record",
            "review_evidence_reference": f"evidence+sha256:{REVIEW_DIGEST}:artifact:review-attestation.json",
            "reviewed_at": "2026-09-10T01:00:00Z",
            "valid_until": FUTURE,
        },
        "governance": {
            "status": "active",
            "authorizing": False,
            "provider_selection_authorized": False,
            "production_acceptance_authorized": False,
            "review_authority_validated_by_schema": False,
        },
        "privacy": {name: False for name in validator.PRIVACY_FIELDS},
        "limitations": ["Synthetic test-only review attestation."],
    }


class ProviderEvidenceReviewTests(unittest.TestCase):
    def test_valid_reviewed_package_binding_passes(self) -> None:
        package = reviewed_package()
        review = accepted_review()
        reviews = validator.review_map([(Path("review.json"), review)], now=NOW)
        validator.validate_package_review_binding(
            Path("package.json"), package, reviews, now=NOW
        )

    def test_reviewed_package_without_review_fails(self) -> None:
        with self.assertRaises(SystemExit):
            validator.validate_package_review_binding(
                Path("package.json"), reviewed_package(), {}, now=NOW
            )

    def test_captured_package_can_exist_without_completed_review(self) -> None:
        validator.validate_package_review_binding(
            Path("captured.json"), reviewed_package(status="captured"), {}, now=NOW
        )

    def test_rejected_review_cannot_support_reviewed_package(self) -> None:
        review = accepted_review()
        review["review"]["decision"] = "rejected"
        reviews = validator.review_map([(Path("rejected.json"), review)], now=NOW)
        with self.assertRaises(SystemExit):
            validator.validate_package_review_binding(
                Path("package.json"), reviewed_package(), reviews, now=NOW
            )

    def test_stale_active_review_fails_closed(self) -> None:
        review = accepted_review()
        review["review"]["valid_until"] = "2026-09-10T02:00:00Z"
        with self.assertRaises(SystemExit):
            validator.validate_review(Path("stale.json"), review, now=NOW)

    def test_scope_mismatch_fails(self) -> None:
        review = accepted_review()
        review["scope"] = {**review["scope"], "environments": ["staging"]}
        reviews = validator.review_map([(Path("scope.json"), review)], now=NOW)
        with self.assertRaises(SystemExit):
            validator.validate_package_review_binding(
                Path("package.json"), reviewed_package(), reviews, now=NOW
            )

    def test_supports_mismatch_fails(self) -> None:
        review = accepted_review()
        review["supports"] = ["evaluation-summary"]
        reviews = validator.review_map([(Path("supports.json"), review)], now=NOW)
        with self.assertRaises(SystemExit):
            validator.validate_package_review_binding(
                Path("package.json"), reviewed_package(), reviews, now=NOW
            )

    def test_review_timestamp_must_match_package(self) -> None:
        review = accepted_review()
        review["review"]["reviewed_at"] = "2026-09-10T01:30:00Z"
        reviews = validator.review_map([(Path("time.json"), review)], now=NOW)
        with self.assertRaises(SystemExit):
            validator.validate_package_review_binding(
                Path("package.json"), reviewed_package(), reviews, now=NOW
            )

    def test_review_cannot_outlive_artifact(self) -> None:
        package = reviewed_package()
        package["artifact"]["valid_until"] = "2098-01-01T00:00:00Z"
        review = accepted_review()
        reviews = validator.review_map([(Path("review.json"), review)], now=NOW)
        with self.assertRaises(SystemExit):
            validator.validate_package_review_binding(
                Path("package.json"), package, reviews, now=NOW
            )

    def test_authority_and_review_refs_must_be_distinct(self) -> None:
        review = accepted_review()
        review["review"]["review_evidence_reference"] = review["review"]["review_authority_reference"]
        with self.assertRaises(SystemExit):
            validator.validate_review(Path("duplicate-ref.json"), review, now=NOW)

    def test_review_cannot_authorize_selection(self) -> None:
        review = accepted_review()
        review["governance"]["provider_selection_authorized"] = True
        with self.assertRaises(SystemExit):
            validator.validate_review(Path("authority.json"), review, now=NOW)

    def test_schema_cannot_claim_real_authority_validation(self) -> None:
        review = accepted_review()
        review["governance"]["review_authority_validated_by_schema"] = True
        with self.assertRaises(SystemExit):
            validator.validate_review(Path("authority-validation.json"), review, now=NOW)

    def test_credential_like_review_reference_fails(self) -> None:
        review = accepted_review()
        review["review"]["review_evidence_reference"] = (
            f"evidence+sha256:{REVIEW_DIGEST}:https://example.test/review?token=secret"
        )
        with self.assertRaises(SystemExit):
            validator.validate_review(Path("secret-ref.json"), review, now=NOW)

    def test_active_accepted_review_requires_reviewed_package(self) -> None:
        review = accepted_review()
        package = reviewed_package(status="captured")
        with self.assertRaises(SystemExit):
            validator.validate_active_review_has_matching_package(
                evidence_ref(), review, {evidence_ref(): package}
            )

    def test_multiple_active_reviews_for_same_evidence_fail(self) -> None:
        first = accepted_review()
        second = accepted_review()
        second["review_id"] = "state-evidence-review-two"
        with self.assertRaises(SystemExit):
            validator.review_map(
                [(Path("first.json"), first), (Path("second.json"), second)], now=NOW
            )


if __name__ == "__main__":
    unittest.main()
