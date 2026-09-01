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
        "narrow header rows use no decorative inter-row gap": "column-gap:10px;row-gap:0",
        "narrow brand preserves a full touch row": ".brand{min-width:0;min-height:48px;gap:8px}",
        "narrow brand icon is visually compact": ".brand img{width:30px;height:30px}",
        "appearance control is quiet while preserving its touch floor": ".theme-button{justify-self:end;min-height:48px;min-width:48px;padding-inline:6px;border:0;border-radius:12px;background:transparent;color:var(--muted);font-size:12.5px;font-weight:600;box-shadow:none}",
        "narrow navigation remains a single horizontal row": ".nav-wrap nav{grid-column:1/-1;grid-row:2;display:flex;width:max-content;max-width:100%;flex-wrap:nowrap",
        "narrow navigation scrolls locally instead of widening the document": "overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch",
        "narrow navigation uses quiet chrome instead of a full-width outer pill": "margin:0;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none",
        "navigation targets preserve both minimum dimensions": "min-width:48px;min-height:48px;padding-inline:9px",
        "active navigation is text-forward instead of a filled pill": ".nav-wrap nav a[aria-current=true]{color:var(--text);background:transparent;border-color:transparent;font-weight:800;box-shadow:none}",
        "active navigation has a non-color-only underline marker": ".nav-wrap nav a[aria-current=true]::after{content:\"\";position:absolute;left:50%;bottom:4px;width:22px;height:3px",
        "webkit navigation scrollbar is hidden without disabling scroll": ".nav-wrap nav::-webkit-scrollbar{display:none}",
        "phone content cards collapse to one column": ".card-grid,.split,.principle-list{grid-template-columns:1fr}",
        "narrow brand text may wrap instead of forcing overflow": ".brand span{font-size:14px;white-space:normal;line-height:1.15}",
        "public anchors do not reserve sticky-header space": "html{scroll-padding-top:24px}",
    }
    for label, marker in required.items():
        if marker not in css:
            errors.append(f"Missing responsive contract: {label}")

    forbidden = {
        "two-column navigation matrix": ".nav-wrap nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))",
        "single-column navigation matrix": ".nav-wrap nav{grid-template-columns:1fr}",
        "oversized full-width navigation capsule": "padding:4px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--surface-strong) 88%,transparent)",
        "filled mobile active-navigation pill": ".nav-wrap nav a[aria-current=true]{color:var(--text);background:color-mix(in srgb,var(--accent) 11%,var(--surface-strong))",
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
        "Privacy Center responsive layout validation passed: normal-flow header, compact two-row hierarchy, "
        "quiet appearance control, compact brand icon, underline-based active navigation, 48px two-dimensional "
        "touch floors, locally bounded overflow, single-column phone content, and non-sticky anchor spacing are protected."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
