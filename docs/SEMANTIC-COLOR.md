# Privacy Shield Semantic Color Presentation

Privacy Shield consumes Glaze UI semantic colors as presentation metadata only. Color does not establish privacy protection, runtime acceptance, capability activity, or production approval.

## State mapping

| Privacy Shield state | Preferred Glaze UI role |
| --- | --- |
| `protected` | `protected` |
| `partial` | `warning` |
| `attention` | `warning` |
| `unavailable` | `unavailable` |
| `development` | `information` |

Capability states may use `success` for `active`, `surface` for `inactive`, `information` for `pending-acceptance`, and `unavailable` for `unavailable`. The textual state remains authoritative; color is supplementary.

Privacy Shield must never render a development or pending-acceptance condition in a way that implies production approval. Application identity colors may not override privacy semantics. Light, dark, high-contrast, grayscale, color-vision-deficiency, and customized themes may alter pigments while preserving semantic meaning and non-color indicators.
