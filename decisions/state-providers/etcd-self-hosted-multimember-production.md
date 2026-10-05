# Privacy Shield state-provider selection — etcd self-hosted multi-member — 2026-10-04

Status: approved for bounded provider-specific source integration only.

The complete current candidate evaluation supports selecting self-hosted etcd v3.7.2 for implementation work.

This decision authorizes source integration, tests, documentation, and qualification hooks only. It does not establish runtime acceptance, deployment acceptance, production approval, Anchor, or Stable status.

The existing Privacy Shield state-store interface is synchronous. The implementation must therefore preserve fail-closed atomic transaction semantics through an explicit transport boundary. Exact target-environment qualification and acceptance remain separate.
