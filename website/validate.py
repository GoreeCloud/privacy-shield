#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "website"
DIST = SITE / "dist"
ICON = ROOT / "branding" / "privacy-shield" / "privacy-shield-icon.svg"
GLAZE_DIR = SITE / "glaze"
GLAZE_LOCK = SITE / "glaze.lock.json"
ADOPTION = SITE / "GLAZE-UI-V1.1-ADOPTION.md"
README = SITE / "README.md"
WORKFLOW = ROOT / ".github" / "workflows" / "glaze-ui-v1.1-validation.yml"

GLAZE_VERSION = "1.1.0"
GLAZE_RELEASE_COMMIT = "15cc76d2bcd4065552dc31c77145b63f34d9e7b2"
GLAZE_RELEASE_TREE = "52eb8207272498db227c984d2398e1242b659393"
GLAZE_ENTRYPOINT = "css/glaze-v1.1.0.css"
GLAZE_FILES = {
    "css/glaze-v1.1.0.css": "c689e8e58cefc49f931862996a1e0e871497fe88",
    "css/glaze-v1.0.0.css": "eca2209c5d678830f92907b4d44ea6cc5b1c8536",
    "css/glaze-v1.1.css": "aa0250f01151f17cd3c77e9a67544c6af4b5aa32",
    "css/glaze-v1.1-appearance.css": "c4e10e043d537c68f1e4a5f97bdb8b6f0d371dce",
    "css/glaze-v1.foundation.css": "b01051203831ce011c08f37b79f2e2032d34d0c8",
    "css/glaze-v1.components.css": "f74d5d4a4dd3ae22354812260e06a042d3928507",
    "css/glaze-v1.components.adaptive.css": "e174ea4923ec1ac6e1eb52d7ee33c14f2f77d5ca",
    "css/glaze-v1.components.runtime.css": "a89356172d74b66c62cfda198ae827fe9b71c520",
    "css/glaze-v1.structure.css": "9781c3e162edbac9fce67b93fd3287fdacbcd504",
    "css/glaze-v1.overlay.css": "cb937fae3166289c9c935d7ae25cefe3f82f3ec0",
    "css/glaze-v1.advanced.css": "d6e60a9b23354b1dc62dafac284c93b772e582a4",
    "css/glaze-v1.visual-refinement.css": "f5696fdb81f8deda3ce75e112989d772b7d74909",
    "css/glaze-v1.optical-reachability.css": "6123cff22f06b4c537156a1285e2664763f33316",
}
EXPECTED_DIST_FILES = {
    "index.html",
    "404.html",
    "_headers",
    "assets/site.css",
    "assets/site-polish.css",
    "assets/site.js",
    "assets/privacy-shield-icon.svg",
    *(f"assets/glaze/{Path(path).name}" for path in GLAZE_FILES),
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def expected_dist_bytes() -> dict[str, bytes]:
    result = {
        "index.html": (SITE / "index.html").read_bytes(),
        "404.html": (SITE / "404.html").read_bytes(),
        "_headers": (SITE / "_headers").read_bytes(),
        "assets/site.css": (SITE / "site.css").read_bytes(),
        "assets/site-polish.css": (SITE / "site-polish.css").read_bytes(),
        "assets/site.js": (SITE / "site.js").read_bytes(),
        "assets/privacy-shield-icon.svg": ICON.read_bytes(),
    }
    for upstream_path in GLAZE_FILES:
        name = Path(upstream_path).name
        result[f"assets/glaze/{name}"] = (GLAZE_DIR / name).read_bytes()
    return result


def validate_dist(label: str) -> None:
    require(DIST.is_dir(), f"{label}: website/dist is missing")
    actual_files = {
        str(path.relative_to(DIST)).replace("\\", "/")
        for path in DIST.rglob("*")
        if path.is_file()
    }
    require(
        actual_files == EXPECTED_DIST_FILES,
        f"{label}: committed/generated dist file set drifted: {sorted(actual_files)}",
    )
    for relative, expected in expected_dist_bytes().items():
        require((DIST / relative).read_bytes() == expected, f"{label}: dist artifact is stale: {relative}")


for name in (
    "index.html",
    "404.html",
    "site.css",
    "site-polish.css",
    "site.js",
    "_headers",
    "build.py",
    "glaze.lock.json",
    "GLAZE-UI-V1.1-ADOPTION.md",
    "GLAZE-UI-2.1-HISTORICAL.md",
    "GLAZE-UI-2.0-HISTORICAL.md",
    "README.md",
):
    require((SITE / name).is_file(), f"missing website source: {name}")
require(WORKFLOW.is_file(), "missing Privacy Center GLAZE UI V1.1 validation workflow")
for superseded in (
    "GLAZE-UI-2.1-ADOPTION.md",
    "GLAZE-UI-2.0-ADOPTION.md",
    "glaze-ui-2.1.0.css",
    "glaze-ui-2.0.0.css",
    "glaze-ui-1.5.0.css",
):
    require(not (SITE / superseded).exists(), f"superseded active website source remains: {superseded}")
require(
    not (ROOT / ".github" / "workflows" / "glaze-ui-2-validation.yml").exists(),
    "superseded Glaze 2 validation workflow remains active",
)

lock = json.loads(GLAZE_LOCK.read_text(encoding="utf-8"))
require(lock.get("schema") == "goreecloud.glaze-ui.web-source-manifest.v1", "unexpected Glaze source manifest schema")
require(lock.get("product") == "GLAZE UI V1.1", "unexpected Glaze product identity")
require(lock.get("version") == GLAZE_VERSION, "unexpected Glaze Stable version")
require(lock.get("tag") == "v1.1.0", "unexpected Glaze Stable tag")
require(lock.get("release_commit") == GLAZE_RELEASE_COMMIT, "unexpected Glaze Stable release commit")
require(lock.get("release_tree") == GLAZE_RELEASE_TREE, "unexpected Glaze Stable release tree")
require(lock.get("entrypoint") == GLAZE_ENTRYPOINT, "unexpected Glaze Stable web entrypoint")
require(lock.get("runtime_network_dependency_required") is False, "Glaze source lock must not require a runtime network dependency")
require(lock.get("files") == GLAZE_FILES, "Glaze source file identity map drifted from Stable")
require(set(path.name for path in GLAZE_DIR.glob("*.css")) == {Path(path).name for path in GLAZE_FILES}, "vendored Glaze file set drifted")
for upstream_path, expected_sha in GLAZE_FILES.items():
    local = GLAZE_DIR / Path(upstream_path).name
    require(local.is_file(), f"missing locked Glaze source: {local.name}")
    actual_sha = git_blob_sha(local.read_bytes())
    require(actual_sha == expected_sha, f"Glaze source blob mismatch for {local.name}: {actual_sha}")

# Checked-in publication evidence must already be fresh. The build is not
# allowed to silently repair a stale committed artifact into a passing result.
validate_dist("pre-build")
subprocess.run([sys.executable, str(SITE / "build.py")], cwd=ROOT, check=True)
validate_dist("post-build")

html = (DIST / "index.html").read_text(encoding="utf-8")
not_found = (DIST / "404.html").read_text(encoding="utf-8")
headers = (DIST / "_headers").read_text(encoding="utf-8")
site_css = (DIST / "assets" / "site.css").read_text(encoding="utf-8")
polish_css = (DIST / "assets" / "site-polish.css").read_text(encoding="utf-8")
site_js = (DIST / "assets" / "site.js").read_text(encoding="utf-8")
adoption = ADOPTION.read_text(encoding="utf-8")
readme = README.read_text(encoding="utf-8")
workflow = WORKFLOW.read_text(encoding="utf-8")
entrypoint = (DIST / "assets" / "glaze" / "glaze-v1.1.0.css").read_text(encoding="utf-8")
v11_css = (DIST / "assets" / "glaze" / "glaze-v1.1.css").read_text(encoding="utf-8")
appearance_css = (DIST / "assets" / "glaze" / "glaze-v1.1-appearance.css").read_text(encoding="utf-8")
optical_css = (DIST / "assets" / "glaze" / "glaze-v1.optical-reachability.css").read_text(encoding="utf-8")

for needle in (
    "GoreeCloud Privacy Shield",
    "Privacy by Default",
    "Compiled Browser acceptance pending",
    "Wardveil Security",
    "Sentinel Fold",
    "Mesh refresh handoff · Established in source",
    "separately produced current Privacy Shield evidence",
    "does not replace or weaken",
    'data-glaze-version="1.1"',
    'name="goreecloud-glaze-ui" content="1.1.0"',
    'data-glaze-ui="1.1.0"',
    'data-glaze-density-profile="standard"',
    "GLAZE UI V1.1",
    "Presented through GLAZE UI V1.1 / 1.1.0 Stable source",
):
    require(needle in html, f"required public content missing: {needle}")

for document in (html, not_found):
    for stale in (
        "Glaze UI 1.5",
        "Glaze UI 2.0",
        "Glaze UI 2.1",
        "glaze-ui-1.5.0.css",
        "glaze-ui-2.0.0.css",
        "glaze-ui-2.1.0.css",
        'content="2.0.0"',
        'content="2.1.0"',
        'data-glaze-ui="2.0.0"',
        'data-glaze-ui="2.1.0"',
        "data-glaze-appearance",
    ):
        require(stale not in document, f"stale Privacy Center public content remains: {stale}")

for document in (html, not_found):
    require(
        document.index('/assets/glaze/glaze-v1.1.0.css') < document.index('/assets/site.css') < document.index('/assets/site-polish.css'),
        "GLAZE UI Stable source and Privacy Shield product CSS must load in design-system/base/polish order",
    )
require(html.count("glz11-soft-glaze") == 1, "Privacy Center must bound Soft Glaze to one persistent chrome surface")
require(html.count("glz1-card") >= 7, "Privacy Center must map durable privacy content to solid V1 card surfaces")
for forbidden_class in ("glz11-deep-glaze", "glz11-live-glaze"):
    require(forbidden_class not in html, f"Privacy Center exceeds bounded material budget: {forbidden_class}")

require(ICON.read_bytes() == (DIST / "assets/privacy-shield-icon.svg").read_bytes(), "public Privacy Shield icon is not byte-identical to canonical branding source")
for needle in (
    "Content-Security-Policy:",
    "frame-ancestors 'none'",
    "Permissions-Policy:",
    "X-Content-Type-Options: nosniff",
):
    require(needle in headers, f"required security header missing: {needle}")
for prohibited in ("google-analytics", "googletagmanager", "segment.com", "fonts.googleapis.com"):
    require(prohibited not in html.lower(), f"prohibited public dependency detected: {prohibited}")

for needle in (
    '@import url("./glaze-v1.0.0.css")',
    '@import url("./glaze-v1.1.css")',
    '@import url("./glaze-v1.1-appearance.css")',
):
    require(needle in entrypoint, f"Stable entrypoint missing import: {needle}")
for needle in (
    'html[data-glaze-version="1.1"]',
    "--glz11-target-min: 48px",
    'data-glz-touch-assistance="true"',
    "forced-colors: active",
    "prefers-reduced-motion: reduce",
):
    require(needle in v11_css, f"GLAZE UI V1.1 Stable layer missing contract marker: {needle}")
for appearance in ("light", "dark", "deep-dark"):
    require(f'data-glz-appearance="{appearance}"' in appearance_css, f"V1.1 appearance adapter missing {appearance}")
for needle in ("prefers-reduced-transparency:reduce", "forced-colors:active"):
    require(needle in optical_css, f"V1 optical reachability layer missing accessibility marker: {needle}")

require(
    ".glass-card{background:var(--surface-strong);" in site_css,
    "Privacy Center durable content cards must remain solid product surfaces",
)
for reduced_target in ("min-height:38px", "min-height:40px", "min-height:44px"):
    require(reduced_target not in site_css + polish_css, f"Privacy Center responsive CSS reduces target floor: {reduced_target}")
require("min-height:48px" in polish_css, "Privacy Center product polish must preserve the 48px interaction floor")
require("setAttribute('data-glz-appearance'" in site_js, "Privacy Center appearance control must write the V1.1 appearance attribute")
require("removeAttribute('data-glz-appearance')" in site_js, "System appearance must clear the explicit V1.1 appearance attribute")
require("data-glaze-appearance" not in site_js, "obsolete Glaze appearance attribute remains in Privacy Center runtime")

for needle in (
    "Status: **Source Migration Candidate**",
    "GLAZE UI V1.1 / 1.1.0 Stable",
    GLAZE_RELEASE_COMMIT,
    GLAZE_RELEASE_TREE,
    "13-file web import graph",
    "48 px floor",
    "56 px floor",
    "Reduced Transparency",
    "Forced Colors",
    "committed `website/dist`",
    "human Visual Excellence review",
    "presentation and interaction only",
):
    require(needle in adoption, f"GLAZE UI V1.1 adoption record missing boundary: {needle}")
for needle in (
    "GLAZE UI V1.1 / 1.1.0 Stable",
    "exact Git blob identities",
    "Source, committed generated artifact, and deployed bytes",
    "does not itself authorize broader Privacy Shield claims",
):
    require(needle in readme, f"Privacy Center README missing V1.1 acceptance boundary: {needle}")
for needle in (
    "Validate Privacy Center GLAZE UI V1.1 Stable",
    "persist-credentials: false",
    "Verify exact source revision",
    "python3 website/validate.py",
):
    require(needle in workflow, f"Privacy Center GLAZE UI workflow missing invariant: {needle}")

print(
    "Privacy Shield public website validation passed with immutable GLAZE UI V1.1 / 1.1.0 Stable "
    "source identity, deterministic committed publication artifact, and bounded presentation authority"
)
