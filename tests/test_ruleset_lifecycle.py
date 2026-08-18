from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "privacy-shield.ruleset-lifecycle.json"


class PrivacyShieldRulesetLifecycleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        relative = cls.contract["canonical_ruleset"]["path"]
        cls.config = json.loads((ROOT / relative).read_text(encoding="utf-8"))

    def test_contract_tracks_exact_current_ruleset(self) -> None:
        canonical = self.contract["canonical_ruleset"]
        self.assertEqual(canonical["schema_version"], self.config["schema_version"])
        self.assertEqual(canonical["ruleset_version"], self.config["ruleset_version"])
        self.assertTrue(canonical["review_required"])

    def test_remote_dependency_boundaries_remain_disabled(self) -> None:
        governance = self.contract["governance"]
        self.assertFalse(governance["remote_rules_required"])
        self.assertFalse(governance["remote_tracker_learning_allowed"])
        self.assertFalse(governance["remote_tracker_telemetry_allowed"])
        self.assertFalse(governance["remote_local_resource_catalog_allowed"])

    def test_browser_consumption_is_versioned_and_fail_closed(self) -> None:
        browser = self.contract["browser_consumption"]
        self.assertEqual(browser["current_runtime_authority"], "GoreeCloud/goreecloud-browser")
        self.assertTrue(browser["adapter_must_validate_schema_version"])
        self.assertTrue(browser["adapter_must_validate_ruleset_version"])
        self.assertTrue(browser["adapter_must_fail_closed_on_unsupported_contract"])

    def test_source_contract_does_not_claim_production_readiness(self) -> None:
        release = self.contract["release_boundary"]
        self.assertFalse(release["source_validation_is_production_acceptance"])
        self.assertTrue(release["compiled_browser_acceptance_required"])
        self.assertFalse(release["production_ready"])


if __name__ == "__main__":
    unittest.main()
