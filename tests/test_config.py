from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "privacy-shield.v2.json"


class PrivacyShieldConfigTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.data = json.loads(CONFIG.read_text(encoding="utf-8"))

    def test_native_blocker_replaces_extension_dependency(self) -> None:
        blocker = self.data["components"]["content_blocking"]
        self.assertEqual(blocker["replaces"], "uBlock Origin")
        self.assertFalse(blocker["extension_required"])
        self.assertEqual(blocker["ownership"], "goreecloud")
        self.assertGreaterEqual(len(blocker["hosts"]), 20)

    def test_tracker_learning_stays_local(self) -> None:
        tracker = self.data["components"]["tracker_protection"]
        self.assertEqual(tracker["minimum_distinct_first_party_sites"], 3)
        self.assertFalse(tracker["remote_learning_allowed"])
        self.assertFalse(tracker["remote_telemetry_allowed"])

    def test_local_resources_remain_fail_open_and_unpopulated(self) -> None:
        local = self.data["components"]["local_resources"]
        self.assertEqual(local["mode"], "exact-byte-match-only")
        self.assertEqual(local["fail_behavior"], "network-original")
        self.assertEqual(local["resources"], [])

    def test_source_does_not_claim_production_acceptance(self) -> None:
        self.assertFalse(self.data["production_approved"])
        self.assertTrue(all(self.data["security_boundaries"].values()))


if __name__ == "__main__":
    unittest.main()
