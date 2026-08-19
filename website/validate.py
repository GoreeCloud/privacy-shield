#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "website"
DIST = SITE / "dist"

for name in ("index.html", "404.html", "site.css", "site.js", "_headers", "build.py"):
    if not (SITE / name).is_file():
        raise SystemExit(f"missing website source: {name}")

subprocess.run([sys.executable, str(SITE / "build.py")], cwd=ROOT, check=True)

for name in ("index.html", "404.html", "_headers", "assets/site.css", "assets/site.js", "assets/privacy-shield-icon.svg"):
    if not (DIST / name).is_file():
        raise SystemExit(f"missing build artifact: {name}")

html = (DIST / "index.html").read_text(encoding="utf-8")
headers = (DIST / "_headers").read_text(encoding="utf-8")
source_icon = (ROOT / "branding" / "privacy-shield" / "privacy-shield-icon.svg").read_bytes()
built_icon = (DIST / "assets" / "privacy-shield-icon.svg").read_bytes()

for needle in ("GoreeCloud Privacy Shield", "Privacy by Default", "Compiled Browser acceptance pending", "Wardveil Security", "does not replace or weaken"):
    if needle not in html:
        raise SystemExit(f"required public content missing: {needle}")

if source_icon != built_icon:
    raise SystemExit("public Privacy Shield icon is not byte-identical to canonical branding source")

for needle in ("Content-Security-Policy:", "frame-ancestors 'none'", "Permissions-Policy:", "X-Content-Type-Options: nosniff"):
    if needle not in headers:
        raise SystemExit(f"required security header missing: {needle}")

for prohibited in ("google-analytics", "googletagmanager", "segment.com", "fonts.googleapis.com"):
    if prohibited in html.lower():
        raise SystemExit(f"prohibited public dependency detected: {prohibited}")

print("Privacy Shield public website validation passed")
