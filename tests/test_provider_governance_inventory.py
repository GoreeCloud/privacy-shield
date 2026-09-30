import unittest
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


class ProviderGovernanceInventoryTests(unittest.TestCase):
    def test_repository_inventory_validator(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "tools" / "validate_provider_governance_inventory.py")],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("provider-governance inventory valid", result.stdout)


if __name__ == "__main__":
    unittest.main()
