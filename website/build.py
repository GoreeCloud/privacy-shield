#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "website"
DIST = SOURCE / "dist"
ICON = ROOT / "branding" / "privacy-shield" / "privacy-shield-icon.svg"
GLAZE_ASSET = "glaze-ui-2.1.0.css"

if DIST.exists():
    shutil.rmtree(DIST)
(DIST / "assets").mkdir(parents=True)

for name in ("index.html", "404.html", "_headers"):
    shutil.copy2(SOURCE / name, DIST / name)
for name in ("site.css", "site-polish.css", "site.js", GLAZE_ASSET):
    shutil.copy2(SOURCE / name, DIST / "assets" / name)
shutil.copy2(ICON, DIST / "assets" / "privacy-shield-icon.svg")
print(
    f"Built {DIST.relative_to(ROOT)} with canonical Privacy Shield identity "
    "and Glaze UI 2.1.0 Stable adoption mapping"
)
