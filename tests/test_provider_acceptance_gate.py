from __future__ import annotations

import importlib.util
import sys
import unittest
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "validate_provider_acceptance_gate.py"
SPEC = importlib.util.spec_from_file_location("validate_provider_acceptance_gate", MODULE_PATH)
assert SPEC and SPEC.loader
gate = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = gate
SPEC.loader.exec_module(gate)

NOW = datetime(2026, 9, 19, 21, 0, tzinfo=timezone.utc)
SHA = "a" * 40
TREE = "b" * 40
DIGEST = "c" * 64
REF = f"evidence+sha256:{DIGEST}:artifact:test"


def state_record():
    qualifications = {name: "passed" for name in gate.STATE_QUALIFICATIONS}
    evidence = []
    for index, category in enumerate(sorted(gate.STATE_EVIDENCE_CATEGORIES)):
        digest = f"{index+1:064x}"[-64:]
        evidence.append({
            "id": f"state-{index}",
            "category": category,
            "result": "passed",
            "reference": f"evidence+sha256:{digest}:artifact:{category}",
            "sha256": digest,
        })
    return {
        "schema_version": 1,
        "contract_id": "goreecloud.privacy-shield.state-provider-acceptance.v1",
        "selection_decision_id": "distributed-state-provider-production",
        "provider_id": "distributed-state",
        "provider_implementation": "ExampleDistributedStateProvider",
        "provider_authority": "GoreeCloud/goreecloud-privacy-shield",
        "exact_source_revision": SHA,
        "source_tree_sha": TREE,
        "provider_version": "1.0.0",
        "deployment": {"environment": "production", "topology_id": "state-prod-a", "distributed": True, "multi_writer": True, "replica_count": 3},
        "capabilities": {"durable": True, "restart_recovery": True, "atomic_transactions": True, "multi_writer_serializable": True, "distributed": True, "fail_closed_on_conflict": True},
        "qualification": qualifications,
        "privacy": {"raw_private_payloads_in_acceptance_evidence": False, "secret_material_in_acceptance_evidence": False},
        "acceptance": {"status": "passed", "production_approved": True, "exact_revision_required": True, "observed_date": "2026-09-19", "valid_until": "2026-09-20T21:00:00Z"},
        "evidence": evidence,
        "limitations": [],
    }


def signing_record():
    evidence = []
    for index, category in enumerate(sorted(gate.SIGNING_QUALIFICATIONS)):
        digest = f"{index+101:064x}"[-64:]
        evidence.append({
            "id": f"signing-{index}",
            "category": category,
            "result": "passed",
            "reference": f"evidence+sha256:{digest}:artifact:{category}",
        })
    return {
        "schema_version": 1,
        "contract_id": "goreecloud.privacy-shield.signing-key-provider-acceptance.v1",
        "selection_decision_id": "production-signing-provider",
        "provider_id": "production-signing",
        "provider_implementation": "ExampleSigningProvider",
        "provider_authority": "GoreeCloud/goreecloud-privacy-shield",
        "provider_version": "1.0.0",
        "exact_source_revision": SHA,
        "deployment": {"environment": "production", "deployment_id": "signing-prod-a"},
        "producer_identity": "goreecloud-privacy-shield",
        "algorithms": ["example-approved-algorithm"],
        "qualification": {name: "passed" for name in gate.SIGNING_QUALIFICATIONS},
        "privacy": {"raw_private_payloads_in_acceptance_evidence": False, "secret_material_in_acceptance_evidence": False, "full_capability_tokens_in_acceptance_evidence": False},
        "acceptance": {"status": "passed", "production_approved": True, "exact_revision_required": True, "valid_until": "2026-09-20T21:00:00Z"},
        "evidence": evidence,
        "limitations": [],
    }


class ProviderAcceptanceGateTests(unittest.TestCase):
    def test_complete_current_state_acceptance_passes(self) -> None:
        gate.validate_state_acceptance(state_record(), now=NOW)

    def test_state_acceptance_requires_selection_decision_binding(self) -> None:
        record = state_record()
        del record["selection_decision_id"]
        with self.assertRaises(SystemExit):
            gate.validate_state_acceptance(record, now=NOW)

    def test_state_acceptance_cannot_pass_with_incomplete_qualification(self) -> None:
        record = state_record()
        record["qualification"]["backup_and_restore"] = "pending"
        with self.assertRaises(SystemExit):
            gate.validate_state_acceptance(record, now=NOW)

    def test_state_acceptance_requires_content_addressed_resolved_evidence(self) -> None:
        record = state_record()
        record["evidence"][0]["reference"] = "artifact:opaque"
        with self.assertRaises(SystemExit):
            gate.validate_state_acceptance(record, now=NOW)

    def test_complete_current_signing_acceptance_passes(self) -> None:
        gate.validate_signing_acceptance(signing_record(), now=NOW)

    def test_signing_acceptance_cannot_self_approve_without_passed_status(self) -> None:
        record = signing_record()
        record["acceptance"]["status"] = "pending"
        with self.assertRaises(SystemExit):
            gate.validate_signing_acceptance(record, now=NOW)

    def test_signing_acceptance_requires_evidence_for_every_qualification(self) -> None:
        record = signing_record()
        record["evidence"] = record["evidence"][:-1]
        with self.assertRaises(SystemExit):
            gate.validate_signing_acceptance(record, now=NOW)

    def test_expired_passed_acceptance_fails_closed(self) -> None:
        record = state_record()
        record["acceptance"]["valid_until"] = "2026-09-19T20:00:00Z"
        with self.assertRaises(SystemExit):
            gate.validate_state_acceptance(record, now=NOW)


if __name__ == "__main__":
    unittest.main()
