# GoreeCloud Privacy Shield — Version 2.0 Release Provenance and Rollback Evidence

**Requirement level:** Mandatory  
**Status:** Template defined; evidence not yet accepted  
**Candidate:** `privacy-shield-2.0.0-seal.2`

## Purpose

This record defines the release, deployment, provenance, and rollback evidence required before the Version 2.0 hosting/Observability/recovery/release gate can pass its release portion.

The machine-readable template is `qualification/release-evidence.template.json`. It is deliberately non-authorizing: release-specific fields remain pending or null until a separate exact-candidate accepted record is produced.

## Required final evidence

A final accepted record must bind the exact candidate source to a governed published release, exact artifact/package identity and digest, required SBOM and signing/source provenance, exact deployed revision/environment, canonical post-release readback, and a completed rollback exercise against an accepted target.

## Fail-closed boundary

Until a separate accepted record exists, release evidence in the Platform Contract remains empty, the qualification gate remains blocked, lifecycle remains Seal, deployment remains development, and no Privacy Shield production, Anchor, or Stable authority is created.

The validator ensures placeholder fields cannot be mistaken for accepted release evidence.
