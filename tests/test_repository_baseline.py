from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "validate_repository_baseline.py"
SPEC = importlib.util.spec_from_file_location("validate_repository_baseline", MODULE_PATH)
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validator
SPEC.loader.exec_module(validator)


class RepositoryBaselineTests(unittest.TestCase):
    def populate(self, root: Path) -> None:
        for relative in (*validator.REQUIRED_ROOT_FILES, *validator.REQUIRED_REPOSITORY_CONTROLS):
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            if relative == validator.VALIDATION_WORKFLOW:
                path.write_text(
                    "persist-credentials: false\n"
                    "Verify exact Privacy Shield revision\n"
                    "EXPECTED_SHA: ${{ github.event.pull_request.head.sha || github.sha }}\n"
                    'run: test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"\n',
                    encoding="utf-8",
                )
            else:
                path.write_text(f"meaningful repository control for {relative}\n", encoding="utf-8")

    def test_required_root_set_matches_governed_fourteen_file_baseline(self) -> None:
        self.assertEqual(len(validator.REQUIRED_ROOT_FILES), 14)
        self.assertIn("PRIVACY POLICY.md", validator.REQUIRED_ROOT_FILES)
        self.assertIn("NOTES.md", validator.REQUIRED_ROOT_FILES)

    def test_complete_baseline_passes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.populate(root)
            validated = validator.validate_repository_baseline(root)
            self.assertEqual(len(validated), 16)

    def test_missing_mandatory_file_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.populate(root)
            (root / "SECURITY.md").unlink()
            with self.assertRaises(SystemExit):
                validator.validate_repository_baseline(root)

    def test_placeholder_sized_file_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.populate(root)
            (root / "FEATURES.md").write_text("TBD\n", encoding="utf-8")
            with self.assertRaises(SystemExit):
                validator.validate_repository_baseline(root)

    def test_validation_workflow_requires_exact_revision_readback(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.populate(root)
            (root / validator.VALIDATION_WORKFLOW).write_text(
                "persist-credentials: false\n", encoding="utf-8"
            )
            with self.assertRaises(SystemExit):
                validator.validate_repository_baseline(root)

    def test_pull_request_template_is_enforced_for_this_repository(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.populate(root)
            (root / ".github/PULL_REQUEST_TEMPLATE.md").unlink()
            with self.assertRaises(SystemExit):
                validator.validate_repository_baseline(root)


if __name__ == "__main__":
    unittest.main()
