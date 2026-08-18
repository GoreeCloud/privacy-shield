# GoreeCloud Privacy Shield Identity and Icon Standard

## Purpose

This document defines the identity and icon requirements for GoreeCloud Privacy Shield.

Privacy Shield is a browser-specific privacy and content-protection subsystem. Its identity must communicate private browsing protection and filtering without being confused with the GoreeCloud Browser application itself or with Wardveil Security, the platform-wide GoreeCloud security identity.

## Identity hierarchy

The visual relationship is:

- **GoreeCloud Browser** — application identity.
- **GoreeCloud Privacy Shield** — browser privacy and content-protection identity.
- **Wardveil Security by GoreeCloud** — platform-wide security and protection identity.

These identities must remain visually distinct.

## Official icon description

The Privacy Shield icon should depict a **rounded protective shield containing layered privacy bands that partially conceal a central web surface**.

The internal bands should overlap smoothly across the shield. They represent the interception, filtering, and removal of unwanted tracking while legitimate web content remains accessible.

A subtle **negative-space P** may emerge from the shield and internal privacy layers, but the icon should not look like a conventional lettermark at first glance.

The icon should communicate:

- **Privacy** — unnecessary observation and tracking are obscured.
- **Filtering** — unwanted advertising, tracking requests, and tracking parameters are intercepted.
- **Protection** — browsing activity receives an additional Browser-level privacy boundary.
- **Control** — the user decides what Privacy Shield blocks or permits.
- **Transparency** — protection is understandable rather than mysterious or aggressive.

## Glaze UI visual direction

The icon must follow the GoreeCloud Glaze UI Design Language and should use:

- smooth rounded geometry;
- layered surfaces;
- selective translucency;
- restrained depth;
- strong legibility at small sizes;
- polished but calm visual treatment;
- compatibility with light and dark Glaze UI environments.

The identity should feel trustworthy and privacy-focused rather than like conventional antivirus software.

## Prohibited or discouraged imagery

Do not base the primary Privacy Shield identity on:

- a plain generic shield;
- a padlock;
- a fingerprint;
- an eye with a slash;
- hacker or terminal imagery;
- bugs or insects;
- a shield with a checkmark;
- the GoreeCloud Browser application icon;
- Wardveil Security artwork;
- unrelated generic GoreeCloud marks.

These patterns either lack distinctiveness or create ambiguity with other GoreeCloud security surfaces.

## Canonical source asset

Once final artwork is approved, the authoritative source file must be:

```text
branding/privacy-shield/privacy-shield-icon.svg
```

That SVG is the canonical source for application UI, Browser settings, Privacy Shield panels, status surfaces, documentation, GitHub, websites, and future platform integrations.

Derived assets may include:

- compact toolbar symbols;
- monochrome variants;
- favicon-sized variants;
- high-resolution raster exports;
- light/dark presentation variants when technically necessary.

Derived assets must originate from the canonical SVG rather than becoming separate independently maintained designs.

## Technical requirements

The approved icon should:

- remain recognizable at approximately 16–24 px;
- contain no text;
- avoid embedded raster artwork in the canonical SVG;
- provide a usable monochrome form for compact Browser chrome;
- preserve recognizable silhouette and internal structure under Glaze UI light and dark themes;
- avoid excessive micro-detail that disappears at toolbar sizes.

## Approval boundary

This standard defines the design brief and asset contract. It does **not** approve any final Privacy Shield icon artwork.

Final artwork must be reviewed and approved separately before `privacy-shield-icon.svg` is treated as authoritative.
