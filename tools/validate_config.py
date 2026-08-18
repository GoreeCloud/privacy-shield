#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "privacy-shield.v2.json"
DOMAIN = re.compile(r"^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


def fail(message: str) -> None:
    raise SystemExit(message)


def require_unique(values: list[str], label: str) -> None:
    if len(values) != len(set(values)):
        fail(f"{label} must not contain duplicates")


def require_domains(values: list[str], label: str) -> None:
    require_unique(values, label)
    for value in values:
        if value != value.lower() or not DOMAIN.fullmatch(value):
            fail(f"{label} contains invalid domain: {value}")


def main() -> int:
    data = json.loads(CONFIG.read_text(encoding="utf-8"))
    if data.get("schema_version") != 2:
        fail("schema_version must remain 2")
    if data.get("feature") != "GoreeCloud Privacy Shield":
        fail("feature identity changed")
    if data.get("ruleset_version") != 2:
        fail("ruleset_version must remain 2 until a reviewed ruleset change")
    if data.get("default_enabled") is not True:
        fail("Privacy Shield must be enabled by default")
    if data.get("production_approved") is not False:
        fail("source configuration cannot claim production approval")

    settings = data.get("settings", {})
    required_toggles = {
        "content_blocking",
        "tracker_protection",
        "url_cleaning",
        "local_resources",
    }
    if settings.get("master_toggle") is not True:
        fail("master toggle is required")
    if set(settings.get("component_toggles", [])) != required_toggles:
        fail("component toggles drifted from the reviewed set")
    if settings.get("persistent_site_exceptions") is not True:
        fail("persistent site exceptions are required")
    if settings.get("exception_storage") != "adapter-local-only":
        fail("exception persistence must remain local to the runtime adapter")

    components = data.get("components", {})
    blocker = components.get("content_blocking", {})
    hosts = blocker.get("hosts", [])
    if blocker.get("enabled") is not True or blocker.get("default_enabled") is not True:
        fail("native content blocking must be enabled by default")
    if blocker.get("ownership") != "goreecloud" or blocker.get("extension_required") is not False:
        fail("content blocking must remain GoreeCloud-owned and extension-free")
    if blocker.get("replaces") != "uBlock Origin":
        fail("Privacy Shield must remain the native replacement for uBlock Origin")
    if blocker.get("remote_rules_required") is not False:
        fail("a remote rules service must not be required")
    if len(hosts) < 20:
        fail("reviewed content-blocking seed set is unexpectedly small")
    require_domains(hosts, "content_blocking.hosts")

    tracker = components.get("tracker_protection", {})
    if tracker.get("minimum_distinct_first_party_sites") != 3:
        fail("tracker threshold must remain three distinct first-party sites")
    if tracker.get("requires_tracking_signal") is not True:
        fail("tracker learning requires a tracking signal")
    if tracker.get("remote_learning_allowed") is not False:
        fail("remote tracker learning is not allowed")
    if tracker.get("remote_telemetry_allowed") is not False:
        fail("remote tracker telemetry is not allowed")

    cleaner = components.get("url_cleaning", {})
    parameters = cleaner.get("tracking_parameters", [])
    if not parameters:
        fail("URL cleaner requires reviewed tracking parameters")
    require_unique(parameters, "url_cleaning.tracking_parameters")
    for parameter in parameters:
        if "*" in parameter and not parameter.endswith("*"):
            fail(f"tracking wildcard must be a suffix wildcard: {parameter}")
    require_domains(cleaner.get("exempt_hosts", []), "url_cleaning.exempt_hosts")
    if cleaner.get("unknown_parameters_preserved") is not True:
        fail("unknown URL parameters must be preserved")
    if cleaner.get("functional_parameters_preserved") is not True:
        fail("functional URL parameters must be preserved")

    local = components.get("local_resources", {})
    if local.get("mode") != "exact-byte-match-only":
        fail("local substitutions must require exact matches")
    if local.get("fail_behavior") != "network-original":
        fail("local substitutions must fail open to the original network request")
    if local.get("remote_catalog_allowed") is not False:
        fail("remote local-resource catalogs are not allowed")
    if local.get("resources") != []:
        fail("local resource payloads require separate provenance, license, integrity, and compatibility review")

    boundaries = data.get("security_boundaries", {})
    if not boundaries or not all(value is True for value in boundaries.values()):
        fail("all inherited Browser security boundaries must remain unchanged")

    print("GoreeCloud Privacy Shield configuration passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
