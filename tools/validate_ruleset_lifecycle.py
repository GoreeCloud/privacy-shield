#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "privacy-shield.ruleset-lifecycle.json"


def fail(message: str) -> None:
    raise SystemExit(message)


def main() -> int:
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    if contract.get("schema_version") != 1:
        fail("ruleset lifecycle schema_version must remain 1")

    canonical = contract.get("canonical_ruleset", {})
    relative_path = canonical.get("path")
    if relative_path != "config/privacy-shield.v2.json":
        fail("canonical ruleset path changed unexpectedly")

    config_path = ROOT / relative_path
    if not config_path.is_file():
        fail("canonical Privacy Shield ruleset is missing")
    config = json.loads(config_path.read_text(encoding="utf-8"))

    if canonical.get("schema_version") != config.get("schema_version"):
        fail("lifecycle contract schema version does not match canonical ruleset")
    if canonical.get("ruleset_version") != config.get("ruleset_version"):
        fail("lifecycle contract ruleset version does not match canonical ruleset")
    if canonical.get("owner") != "GoreeCloud" or canonical.get("review_required") is not True:
        fail("ruleset ownership/review boundary changed")

    governance = contract.get("governance", {})
    required_false = (
        "remote_rules_required",
        "remote_tracker_learning_allowed",
        "remote_tracker_telemetry_allowed",
        "remote_local_resource_catalog_allowed",
    )
    if any(governance.get(key) is not False for key in required_false):
        fail("remote rules, learning, telemetry, and catalogs must remain disabled")
    if governance.get("semantic_changes_require_ruleset_version_increment") is not True:
        fail("semantic ruleset changes must require a version increment")
    if governance.get("production_approval_must_remain_separate") is not True:
        fail("source ruleset review must remain separate from production approval")

    required_scopes = {
        "components.content_blocking.hosts",
        "components.tracker_protection",
        "components.url_cleaning.tracking_parameters",
        "components.url_cleaning.exempt_hosts",
        "components.local_resources.resources",
        "security_boundaries",
    }
    if set(governance.get("review_scopes", [])) != required_scopes:
        fail("ruleset review scopes drifted from the approved set")

    blocker = config["components"]["content_blocking"]
    tracker = config["components"]["tracker_protection"]
    local = config["components"]["local_resources"]
    if blocker.get("remote_rules_required") is not False:
        fail("canonical ruleset unexpectedly requires remote rules")
    if tracker.get("remote_learning_allowed") is not False:
        fail("canonical ruleset unexpectedly allows remote tracker learning")
    if tracker.get("remote_telemetry_allowed") is not False:
        fail("canonical ruleset unexpectedly allows remote tracker telemetry")
    if local.get("remote_catalog_allowed") is not False:
        fail("canonical ruleset unexpectedly allows a remote local-resource catalog")

    consumption = contract.get("browser_consumption", {})
    if consumption.get("current_runtime_authority") != "GoreeCloud/browser":
        fail("Browser runtime authority changed")
    if consumption.get("adapter_must_validate_schema_version") is not True:
        fail("Browser adapter must validate schema version")
    if consumption.get("adapter_must_validate_ruleset_version") is not True:
        fail("Browser adapter must validate ruleset version")
    if consumption.get("adapter_must_fail_closed_on_unsupported_contract") is not True:
        fail("Browser adapter must fail closed on unsupported contracts")
    if consumption.get("site_exception_storage") != config["settings"].get("exception_storage"):
        fail("site-exception storage boundary does not match the canonical ruleset")
    if consumption.get("tracker_evidence_scope") != tracker.get("learning_scope"):
        fail("tracker evidence scope does not match the canonical ruleset")
    if consumption.get("local_resource_failure_behavior") != local.get("fail_behavior"):
        fail("local-resource failure behavior does not match the canonical ruleset")

    release = contract.get("release_boundary", {})
    if release.get("source_validation_is_production_acceptance") is not False:
        fail("source validation cannot imply production acceptance")
    if release.get("compiled_browser_acceptance_required") is not True:
        fail("compiled Browser acceptance must remain required")
    if release.get("production_ready") is not False or config.get("production_approved") is not False:
        fail("Privacy Shield cannot claim production readiness from source rules alone")

    print("GoreeCloud Privacy Shield ruleset lifecycle passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
