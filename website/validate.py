#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "website"
DIST = SITE / "dist"
ICON = ROOT / "branding" / "privacy-shield" / "privacy-shield-icon.svg"
ADOPTION = SITE / "GLAZE-UI-2.1-ADOPTION.md"
README = SITE / "README.md"
WORKFLOW = ROOT / ".github" / "workflows" / "glaze-ui-2-validation.yml"
GLAZE_VERSION = "2.1.0"
GLAZE_REVISION = "c49113eb8b93c267613fdf1bbca1f814495acad7"
GLAZE_ASSET = f"glaze-ui-{GLAZE_VERSION}.css"
EXPECTED_DIST_FILES = {
    "index.html",
    "404.html",
    "_headers",
    "assets/site.css",
    "assets/site-polish.css",
    "assets/site.js",
    f"assets/{GLAZE_ASSET}",
    "assets/privacy-shield-icon.svg",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def expected_dist_bytes() -> dict[str, bytes]:
    return {
        "index.html": (SITE / "index.html").read_bytes(),
        "404.html": (SITE / "404.html").read_bytes(),
        "_headers": (SITE / "_headers").read_bytes(),
        "assets/site.css": (SITE / "site.css").read_bytes(),
        "assets/site-polish.css": (SITE / "site-polish.css").read_bytes(),
        "assets/site.js": (SITE / "site.js").read_bytes(),
        f"assets/{GLAZE_ASSET}": (SITE / GLAZE_ASSET).read_bytes(),
        "assets/privacy-shield-icon.svg": ICON.read_bytes(),
    }


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
        actual = (DIST / relative).read_bytes()
        require(actual == expected, f"{label}: dist artifact is stale: {relative}")


for name in (
    "index.html",
    "404.html",
    "site.css",
    "site-polish.css",
    "site.js",
    GLAZE_ASSET,
    "_headers",
    "build.py",
    "GLAZE-UI-2.1-ADOPTION.md",
    "GLAZE-UI-2.0-HISTORICAL.md",
    "README.md",
):
    require((SITE / name).is_file(), f"missing website source: {name}")
require(WORKFLOW.is_file(), "missing Privacy Center Glaze UI validation workflow")
for superseded in (
    "GLAZE-UI-2.0-ADOPTION.md",
    "glaze-ui-2.0.0.css",
    "glaze-ui-1.5.0.css",
):
    require(not (SITE / superseded).exists(), f"superseded active website source remains: {superseded}")

# Dist is checked in as publication evidence. Validate it before build.py can
# replace anything, so CI cannot silently repair a stale committed artifact.
validate_dist("pre-build")
subprocess.run([sys.executable, str(SITE / "build.py")], cwd=ROOT, check=True)
validate_dist("post-build")

html = (DIST / "index.html").read_text(encoding="utf-8")
not_found = (DIST / "404.html").read_text(encoding="utf-8")
headers = (DIST / "_headers").read_text(encoding="utf-8")
glaze_css = (DIST / "assets" / GLAZE_ASSET).read_text(encoding="utf-8")
site_css = (DIST / "assets" / "site.css").read_text(encoding="utf-8")
polish_css = (DIST / "assets" / "site-polish.css").read_text(encoding="utf-8")
site_js = (DIST / "assets" / "site.js").read_text(encoding="utf-8")
adoption = ADOPTION.read_text(encoding="utf-8")
readme = README.read_text(encoding="utf-8")
workflow = WORKFLOW.read_text(encoding="utf-8")

for needle in (
    "GoreeCloud Privacy Shield",
    "Privacy by Default",
    "Compiled Browser acceptance pending",
    "Wardveil Security",
    "Sentinel Fold",
    "Mesh refresh handoff · Established in source",
    "separately produced current Privacy Shield evidence",
    "does not replace or weaken",
    'name="goreecloud-glaze-ui" content="2.1.0"',
    'data-glaze-ui="2.1.0"',
    'data-glaze-density="standard"',
    'data-glaze-performance="balanced"',
    "Glaze UI 2.1",
    "Presented through Glaze UI 2.1 Stable",
):
    require(needle in html, f"required public content missing: {needle}")

for document in (html, not_found):
    for stale in (
        "Glaze UI 1.5",
        "Glaze UI 2.0",
        "glaze-ui-1.5.0.css",
        "glaze-ui-2.0.0.css",
        'content="2.0.0"',
        'data-glaze-ui="2.0.0"',
    ):
        require(stale not in document, f"stale Privacy Center public content remains: {stale}")

require(
    html.index('/assets/glaze-ui-2.1.0.css') < html.index('/assets/site.css') < html.index('/assets/site-polish.css'),
    "Glaze UI Stable subset and Privacy Shield product CSS must load in design-system/base/polish order",
)
require(
    not_found.index('/assets/glaze-ui-2.1.0.css') < not_found.index('/assets/site.css') < not_found.index('/assets/site-polish.css'),
    "404 page must load design-system/base/polish CSS in order",
)
require(
    html.count('data-glaze-material-level="soft-glaze"') == 1,
    "Privacy Center administration recipe must bound Soft Glaze to one persistent chrome surface",
)
require(
    html.count('data-glaze-material-level="surface"') >= 7,
    "Privacy Center must explicitly map primary privacy content planes to solid Surface",
)
for forbidden_level in (
    'data-glaze-material-level="deep-glaze"',
    'data-glaze-material-level="live-glaze"',
):
    require(forbidden_level not in html, f"Privacy Center exceeds bounded material budget: {forbidden_level}")

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
    GLAZE_REVISION,
    "--glaze-touch-min:48px",
    "--glaze-touch-assistance-min:56px",
    "data-glaze-material-level=surface",
    "data-glaze-material-level=soft-glaze",
    "prefers-reduced-transparency",
    "prefers-reduced-motion",
    "prefers-contrast:more",
    "forced-colors:active",
    "data-glaze-performance=constrained",
    "data-glaze-performance=minimal",
    "@supports not ((backdrop-filter:blur(1px))",
):
    require(needle in glaze_css, f"Glaze UI 2.1 Stable subset missing contract marker: {needle}")
require(
    ".glass-card{background:var(--surface-strong);" in site_css,
    "Privacy Center content cards must remain solid product surfaces",
)
for reduced_target in ("min-height:38px", "min-height:40px", "min-height:44px"):
    require(reduced_target not in site_css + polish_css, f"Privacy Center responsive CSS reduces target floor: {reduced_target}")
require(
    "min-height:48px" in polish_css,
    "Privacy Center product polish must preserve the 48px interaction floor",
)
require(
    "dataset.glazeAppearance" in site_js and "removeAttribute('data-glaze-appearance')" in site_js,
    "Privacy Center appearance control must map to Glaze UI appearance state",
)

for needle in (
    "Status: **Adoption Candidate**",
    "Target: **Glaze UI 2.1.0 Stable**",
    GLAZE_REVISION,
    "administration/control surface",
    "48 px floor",
    "56 px floor",
    "Reduced Transparency",
    "Forced Colors",
    "committed `website/dist`",
    "human Visual Excellence approval",
    "Glaze UI standardizes presentation only",
):
    require(needle in adoption, f"Glaze UI 2.1 adoption record missing boundary: {needle}")
for needle in (
    "Glaze UI 2.1.0 Stable",
    "Source, committed generated artifact, and deployed bytes",
    "does not itself authorize broader Privacy Shield claims",
):
    require(needle in readme, f"Privacy Center README missing 2.1 acceptance boundary: {needle}")
for needle in (
    "Validate Privacy Center Glaze UI 2.1 Stable",
    "persist-credentials: false",
    "Verify exact source revision",
    "python3 website/validate.py",
):
    require(needle in workflow, f"Privacy Center Glaze UI workflow missing invariant: {needle}")

print(
    "Privacy Shield public website validation passed with Glaze UI 2.1.0 Stable "
    "source/build Adoption Candidate mapping and pre-build committed-dist freshness"
)
