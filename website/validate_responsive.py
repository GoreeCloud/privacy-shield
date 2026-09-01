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
        "public header remains in normal document flow": ".site-header{position:relative;top:auto;inset-block-start:auto;box-shadow:none",
        "narrow navigation remains a single horizontal row": ".nav-wrap nav{grid-column:1/-1;grid-row:2;display:flex;width:max-content;max-width:100%;flex-wrap:nowrap",
        "narrow navigation scrolls locally instead of widening the document": "overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch",
        "narrow navigation uses quiet chrome instead of a full-width outer pill": "margin:0;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none",
        "navigation targets preserve both minimum dimensions": ".nav-wrap nav a{flex:0 0 auto;width:auto;min-width:48px;min-height:48px",
        "active navigation remains visibly selected without coloring the entire row": ".nav-wrap nav a[aria-current=true]{color:var(--text);background:color-mix(in srgb,var(--accent) 11%,var(--surface-strong))",
        "webkit navigation scrollbar is hidden without disabling scroll": ".nav-wrap nav::-webkit-scrollbar{display:none}",
        "phone content cards collapse to one column": ".card-grid,.split,.principle-list{grid-template-columns:1fr}",
        "narrow brand and theme share a content-safe first row": "@media(max-width:420px){.nav-wrap{grid-template-columns:minmax(0,1fr) auto",
        "narrow brand text may wrap instead of forcing overflow": ".brand span{white-space:normal;line-height:1.15}",
        "public anchors do not reserve sticky-header space": "html{scroll-padding-top:24px}",
    }
    for label, marker in required.items():
        if marker not in css:
            errors.append(f"Missing responsive contract: {label}")

    forbidden = {
        "two-column navigation matrix": ".nav-wrap nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))",
        "single-column navigation matrix": ".nav-wrap nav{grid-template-columns:1fr}",
        "oversized full-width navigation capsule": "padding:4px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--surface-strong) 88%,transparent)",
    }
    for label, marker in forbidden.items():
        if marker in css:
            errors.append(f"Responsive navigation regressed to {label}")

    sticky = css.rfind(".site-header{position:sticky")
    normal_flow = css.rfind(".site-header{position:relative;top:auto;inset-block-start:auto")
    if sticky >= 0 and normal_flow <= sticky:
        errors.append("Final Privacy Center cascade does not override sticky public navigation with normal-flow navigation")

    if errors:
        print("Privacy Center responsive validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(
        "Privacy Center responsive layout validation passed: normal-flow header, compact single-row navigation, "
        "48px two-dimensional touch floors, locally bounded overflow, quiet mobile chrome, single-column phone content, "
        "and non-sticky anchor spacing are protected."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
