#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "website"
DIST = SOURCE / "dist"
ICON = ROOT / "branding" / "privacy-shield" / "privacy-shield-icon.svg"

if DIST.exists():
    shutil.rmtree(DIST)
(DIST / "assets").mkdir(parents=True)

for name in ("index.html", "404.html", "_headers"):
    shutil.copy2(SOURCE / name, DIST / name)

base_css = (SOURCE / "site.css").read_text(encoding="utf-8")
polish_css = (SOURCE / "site-polish.css").read_text(encoding="utf-8")
(DIST / "assets" / "site.css").write_text(base_css + "\n" + polish_css + "\n", encoding="utf-8")
shutil.copy2(SOURCE / "site.js", DIST / "assets" / "site.js")
shutil.copy2(SOURCE / "glaze-ui-2.0.0.css", DIST / "assets" / "glaze-ui-2.0.0.css")
shutil.copy2(ICON, DIST / "assets" / "privacy-shield-icon.svg")
print(f"Built {DIST.relative_to(ROOT)} with canonical Privacy Shield identity and Glaze UI 2.0.0 Stable")
