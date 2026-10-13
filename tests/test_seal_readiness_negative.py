#!/usr/bin/env python3
"""Negative tests: a valid Seal record must not hide malformed qualification evidence."""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1]
VALIDATOR = "tools/validate_seal_readiness.py"


class SealReadinessNegativeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix="goreecloud-seal-negative-")
        cls.root = Path(cls.temporary.name) / "repository"
        shutil.copytree(
            SOURCE, cls.root,
            ignore=shutil.ignore_patterns(".git", "__pycache__", "node_modules", ".artifacts"),
        )
        cls.readiness = cls.root / "qualification" / "seal-readiness.json"
        cls.candidate = cls.root / "qualification" / "seal-candidate.json"
        cls.original_readiness = cls.readiness.read_text(encoding="utf-8")
        cls.original_candidate = cls.candidate.read_text(encoding="utf-8")

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def tearDown(self):
        self.readiness.write_text(self.original_readiness, encoding="utf-8")
        self.candidate.write_text(self.original_candidate, encoding="utf-8")

    def check(self, accepted, message=""):
        result = subprocess.run(
            [sys.executable, VALIDATOR],
            cwd=self.root, text=True, capture_output=True, timeout=20, check=False,
        )
        combined = result.stdout + result.stderr
        if accepted:
            self.assertEqual(result.returncode, 0, combined)
        else:
            self.assertNotEqual(result.returncode, 0, combined)
            self.assertIn(message, combined)

    def mutate_readiness(self, modifier):
        record = json.loads(self.original_readiness)
        modifier(record)
        self.readiness.write_text(json.dumps(record), encoding="utf-8")

    def test_valid_record_stays_seal_not_anchor(self):
        self.check(True)

    def test_path_traversal_rejected(self):
        self.mutate_readiness(lambda r: r["gates"][0].update(evidence=["../../outside.json"]))
        self.check(False, "unsafe evidence path")

    def test_missing_evidence_file_rejected(self):
        self.mutate_readiness(lambda r: r["gates"][0].update(evidence=["docs/THIS_FILE_DOES_NOT_EXIST.md"]))
        self.check(False, "evidence path missing or outside repository")

    def test_duplicate_gate_rejected(self):
        self.mutate_readiness(lambda r: r["gates"].append(dict(r["gates"][0])))
        self.check(False, "gate inventory drifted")

    def test_duplicate_evidence_rejected(self):
        self.mutate_readiness(lambda r: r["gates"][0].update(evidence=[r["gates"][0]["evidence"][0]] * 2))
        self.check(False, "duplicate evidence path")

    def test_empty_reason_rejected(self):
        self.mutate_readiness(lambda r: r["gates"][0].update(reason=" "))
        self.check(False, "nonempty reason required")

    def test_invalid_source_tree_rejected(self):
        record = json.loads(self.original_candidate)
        record["source_tree"] = "not-a-sha"
        self.candidate.write_text(json.dumps(record), encoding="utf-8")
        self.check(False, "candidate source_tree must be an exact SHA")


if __name__ == "__main__":
    unittest.main()
