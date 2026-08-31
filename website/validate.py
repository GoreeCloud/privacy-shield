#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "website"
DIST = SITE / "dist"
GLAZE_VERSION = "2.1.0"
GLAZE_REVISION = "c49113eb8b93c267613fdf1bbca1f814495acad7"
GLAZE_ASSET = f"glaze-ui-{GLAZE_VERSION}.css"

for name in ("index.html", "404.html", "site.css", "site-polish.css", "site.js", GLAZE_ASSET, "_headers", "build.py"):
    if not (SITE / name).is_file():
        raise SystemExit(f"missing website source: {name}")

subprocess.run([sys.executable, str(SITE / "build.py")], cwd=ROOT, check=True)

for name in ("index.html", "404.html", "_headers", "assets/site.css", "assets/site.js", f"assets/{GLAZE_ASSET}", "assets/privacy-shield-icon.svg"):
    if not (DIST / name).is_file():
        raise SystemExit(f"missing build artifact: {name}")

html = (DIST / "index.html").read_text(encoding="utf-8")
headers = (DIST / "_headers").read_text(encoding="utf-8")
glaze_css = (DIST / "assets" / GLAZE_ASSET).read_text(encoding="utf-8")
source_icon = (ROOT / "branding" / "privacy-shield" / "privacy-shield-icon.svg").read_bytes()
built_icon = (DIST / "assets" / "privacy-shield-icon.svg").read_bytes()

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
    "Glaze UI 2.1",
):
    if needle not in html:
        raise SystemExit(f"required public content missing: {needle}")

for stale in ("Glaze UI 1.5", "glaze-ui-1.5.0.css", "Glaze UI 2.0", "glaze-ui-2.0.0.css"):
    if stale in html:
        raise SystemExit(f"stale Privacy Center content remains: {stale}")

if source_icon != built_icon:
    raise SystemExit("public Privacy Shield icon is not byte-identical to canonical branding source")

for needle in ("Content-Security-Policy:", "frame-ancestors 'none'", "Permissions-Policy:", "X-Content-Type-Options: nosniff"):
    if needle not in headers:
        raise SystemExit(f"required security header missing: {needle}")

for prohibited in ("google-analytics", "googletagmanager", "segment.com", "fonts.googleapis.com"):
    if prohibited in html.lower():
        raise SystemExit(f"prohibited public dependency detected: {prohibited}")

for needle in (
    GLAZE_REVISION,
    "Content is solid. Interaction is glazed.",
    "--glaze-touch-min:48px",
    "--glaze-touch-assisted:56px",
    "data-glaze-density=compact",
    "data-glaze-performance=reduced",
    "data-glaze-large-text=true",
    "prefers-reduced-transparency",
    "forced-colors:active",
):
    if needle not in glaze_css:
        raise SystemExit(f"Glaze UI 2.1 Stable subset missing contract marker: {needle}")

print(f"Privacy Shield public website validation passed with Glaze UI {GLAZE_VERSION} Stable")
