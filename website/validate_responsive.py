#!/usr/bin/env python3
"""Fail closed on the Privacy Center responsive/public-document layout contract."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
CSS = ROOT / "site-polish.css"


def main() -> int:
    errors: list[str] = []
    css = CSS.read_text(encoding="utf-8")

    required = {
        "public header remains in normal document flow": ".site-header{position:relative;inset-block-start:auto}",
        "navigation is allowed to wrap instead of horizontal scrolling": ".nav-wrap nav{flex-wrap:wrap;overflow:visible}",
        "phone navigation becomes a two-column touch grid": "@media(max-width:700px){.nav-wrap nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))",
        "phone content cards collapse to one column": ".card-grid,.split,.principle-list{grid-template-columns:1fr}",
        "narrow brand/theme layout stays content-safe": "@media(max-width:420px){.nav-wrap{grid-template-columns:1fr auto}",
        "navigation links remain at least 48px tall": ".nav-wrap nav a{min-height:48px",
        "sticky-header anchor offsets are removed": "html{scroll-padding-top:24px}",
    }
    for label, marker in required.items():
        if marker not in css:
            errors.append(f"Missing responsive contract: {label}")

    sticky = css.rfind(".site-header{position:sticky")
    normal_flow = css.rfind(".site-header{position:relative;inset-block-start:auto}")
    if sticky >= 0 and normal_flow <= sticky:
        errors.append("Final Privacy Center cascade does not override sticky public navigation with normal-flow navigation")

    if errors:
        print("Privacy Center responsive validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("Privacy Center responsive layout validation passed: normal-flow navigation, 48px touch targets, deliberate two-column phone navigation, single-column content, and narrow-screen header composition are protected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
