#!/usr/bin/env python3
"""Fail closed if Privacy Center's locked GLAZE UI CSS graph is incomplete."""

from build import load_verified_glaze_assets

assets = load_verified_glaze_assets()
print(f"Validated locked GLAZE UI import closure across {len(assets)} Privacy Center stylesheets")
