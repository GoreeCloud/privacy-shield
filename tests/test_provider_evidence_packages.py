from __future__ import annotations

import importlib.util
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "validate_provider_evidence_packages.py"
SPEC = importlib.util.spec_from_file_location("validate_provider_evidence_packages", MODULE_PATH)
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validator
SPEC.loader.exec_module(validator)

NOW = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
FUTURE = "2099-01-02T00:00:00Z"
STATE_DIGEST = "a" * 64
SIGNING_DIGEST = "b" * 64
SUMMARY_DIGEST = "c" * 64


def state_scope() -> dict:
    return {
        "service": "privacy-shield",
        "capability": "durable-authorization-state",
        "authority_state": sorted(validator.STATE_AUTHORITY_STATE),
        "environments": ["production"],
    }


def signing_scope() -> dict:
    return {
        "service": "privacy-shield",
        "capability": "operation-bound-capability-signing",
        "producer_identity": "goreecloud-privacy-shield",
        "environments": ["production"],
    }


def state_package(*, digest: str = STATE_DIGEST, locator: str = "artifact:state-evidence.json", supports: list[str] | None = None) -> dict:
    reference = f"evidence+sha256:{digest}:{locator}"
    return {
        "schema_version": 1,
        "contract_id": validator.CONTRACT_ID,
        "evidence_id": "state-evidence-package",
        "provider_class": "state-provider",
        "provider_id": "distributed-test-provider",
        "provider_name": "Distributed Test Provider",
        "provider_implementation": "DistributedTestProvider",
        "integration_authority": "GoreeCloud/goreecloud-privacy-shield",
        "scope": state_scope(),
        "evidence_ref": reference,
        "artifact": {
            "digest_algorithm": "sha256",
            "digest": digest,
            "locator": locator,
            "media_type": "application/json",
            "source_authority": "GoreeCloud controlled test evidence",
            "collected_at": "2026-09-10T00:00:00Z",
            "valid_until": FUTURE,
        },
        "supports": supports or ["durability", "evaluation-summary"],
        "governance": {
            "status": "reviewed",
            "authorizing": False,
            "production_acceptance_authorized": False,
            "reviewed_at": "2026-09-10T01:00:00Z",
        },
        "privacy": {name: False for name in validator.PRIVACY_FIELDS},
        "limitations": ["Synthetic test-only evidence package."],
    }


def signing_package() -> dict:
    locator = "artifact:signing-evidence.json"
    reference = f"evidence+sha256:{SIGNING_DIGEST}:{locator}"
    return {
        "schema_version": 1,
        "contract_id": validator.CONTRACT_ID,
        "evidence_id": "signing-evidence-package",
        "provider_class": "signing-key-provider",
        "provider_id": "signing-test-provider",
        "provider_name": "Signing Test Provider",
        "integration_authority": "GoreeCloud/goreecloud-privacy-shield",
        "scope": signing_scope(),
        "evidence_ref": reference,
        "artifact": {
            "digest_algorithm": "sha256",
            "digest": SIGNING_DIGEST,
            "locator": locator,
            "media_type": "application/json",
            "source_authority": "GoreeCloud controlled test evidence",
            "collected_at": "2026-09-10T00:00:00Z",
            "valid_until": FUTURE,
        },
        "supports": ["digest_only_signing", "evaluation-summary"],
        "governance": {
            "status": "reviewed",
            "authorizing": False,
            "production_acceptance_authorized": False,
            "reviewed_at": "2026-09-10T01:00:00Z",
        },
        "privacy": {name: False for name in validator.PRIVACY_FIELDS},
        "limitations": ["Synthetic test-only evidence package."],
    }


def state_evaluation(reference: str) -> dict:
    return {
        "provider_id": "distributed-test-provider",
        "provider_name": "Distributed Test Provider",
        "provider_implementation": "DistributedTestProvider",
        "integration_authority": "GoreeCloud/goreecloud-privacy-shield",
        "scope": state_scope(),
        "criteria": {
            "durability": {"result": "passed", "evidence_refs": [reference]},
        },
        "governance": {
            "status": "complete",
            "evidence_reference": reference,
        },
    }


class ProviderEvidencePackageTests(unittest.TestCase):
    def test_reviewed_state_package_passes(self) -> None:
        record = state_package()
        result = validator.validate_package(Path("state-package.json"), record, now=NOW)
        self.assertEqual(result["provider_class"], "state-provider")
        self.assertFalse(result["governance"]["authorizing"])

    def test_reviewed_signing_package_passes(self) -> None:
        result = validator.validate_package(Path("signing-package.json"), signing_package(), now=NOW)
        self.assertEqual(result["scope"]["producer_identity"], "goreecloud-privacy-shield")
        self.assertNotIn("provider_implementation", result)

    def test_digest_or_locator_mismatch_fails(self) -> None:
        record = state_package()
        record["artifact"]["digest"] = "d" * 64
        with self.assertRaises(SystemExit):
            validator.validate_package(Path("digest-mismatch.json"), record, now=NOW)

    def test_resolved_criterion_requires_governed_package(self) -> None:
        record = state_package()
        evaluation = state_evaluation(record["evidence_ref"])
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_bindings(
                Path("evaluation.json"), evaluation, {}, "state-provider", now=NOW
            )

    def test_unreviewed_package_cannot_support_resolved_claim(self) -> None:
        record = state_package()
        record["governance"]["status"] = "captured"
        record["governance"]["reviewed_at"] = None
        packages = validator.package_map([(Path("captured.json"), record)], now=NOW)
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_bindings(
                Path("evaluation.json"), state_evaluation(record["evidence_ref"]),
                packages, "state-provider", now=NOW
            )

    def test_stale_reviewed_package_fails_closed(self) -> None:
        record = state_package()
        record["artifact"]["valid_until"] = "2026-09-10T02:00:00Z"
        with self.assertRaises(SystemExit):
            validator.validate_package(Path("stale.json"), record, now=NOW)

    def test_future_collection_fails_closed(self) -> None:
        record = state_package()
        record["artifact"]["collected_at"] = "2026-09-10T12:00:01Z"
        with self.assertRaises(SystemExit):
            validator.validate_package(Path("future-collection.json"), record, now=NOW)

    def test_future_review_fails_closed(self) -> None:
        record = state_package()
        record["governance"]["reviewed_at"] = "2026-09-10T12:00:01Z"
        with self.assertRaises(SystemExit):
            validator.validate_package(Path("future-review.json"), record, now=NOW)

    def test_provider_scope_mismatch_fails(self) -> None:
        record = state_package()
        packages = validator.package_map([(Path("state.json"), record)], now=NOW)
        evaluation = state_evaluation(record["evidence_ref"])
        evaluation["scope"] = {**evaluation["scope"], "environments": ["staging"]}
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_bindings(
                Path("scope-mismatch.json"), evaluation, packages, "state-provider", now=NOW
            )

    def test_criterion_support_mismatch_fails(self) -> None:
        record = state_package(supports=["evaluation-summary"])
        packages = validator.package_map([(Path("state.json"), record)], now=NOW)
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_bindings(
                Path("support-mismatch.json"), state_evaluation(record["evidence_ref"]),
                packages, "state-provider", now=NOW
            )

    def test_evaluation_summary_requires_matching_support(self) -> None:
        criterion_locator = "artifact:criterion.json"
        criterion_ref = f"evidence+sha256:{STATE_DIGEST}:{criterion_locator}"
        criterion = state_package(locator=criterion_locator, supports=["durability"])
        summary_locator = "artifact:summary.json"
        summary_ref = f"evidence+sha256:{SUMMARY_DIGEST}:{summary_locator}"
        summary = state_package(digest=SUMMARY_DIGEST, locator=summary_locator, supports=["durability"])
        summary["evidence_id"] = "state-summary-package"
        packages = validator.package_map(
            [(Path("criterion.json"), criterion), (Path("summary.json"), summary)], now=NOW
        )
        evaluation = state_evaluation(criterion_ref)
        evaluation["governance"]["evidence_reference"] = summary_ref
        with self.assertRaises(SystemExit):
            validator.validate_evaluation_bindings(
                Path("summary-missing-support.json"), evaluation, packages,
                "state-provider", now=NOW
            )

    def test_valid_evaluation_binding_passes(self) -> None:
        record = state_package()
        packages = validator.package_map([(Path("state.json"), record)], now=NOW)
        validator.validate_evaluation_bindings(
            Path("evaluation.json"), state_evaluation(record["evidence_ref"]),
            packages, "state-provider", now=NOW
        )


if __name__ == "__main__":
    unittest.main()
