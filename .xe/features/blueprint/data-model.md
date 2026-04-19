---
feature: blueprint
---

# Data Model: Catalyst Product Blueprint

## Entities

### Feature

A discrete, independently deployable product capability with clear scope boundaries.

- **id** (string, required): Kebab-case identifier unique across all features (e.g., `product-context`, `autonomous-orchestration`)
- **name** (string, required): Human-readable display name
- **description** (string, required): 1–2 sentence scope definition
- **phase** (`POC` | `Mainstream` | `Innovation` | `Platform` | `Enterprise`, required): Strategic phase this feature belongs to
- **tier** (string, required): Phase-relative dependency tier (e.g., `1.1`, `1.2`, `2.1`)
- **dependencies** (string[], required): Feature IDs this feature depends on; empty array if none
- **complexity** (`Small` | `Medium` | `Large`, required): Implementation size estimate
- **priority** (number): Relative implementation order within tier
- Relationships: A Feature belongs to one Phase and one Tier. Dependencies reference other Feature IDs.
- Validation: `id` must match the directory name under `.xe/features/`. `dependencies` must not introduce cycles. `tier` must be consistent with declared `phase`.

### Phase

A strategic grouping of features sharing a common maturity goal.

- **name** (`POC` | `Mainstream` | `Innovation` | `Platform` | `Enterprise`, required): Unique phase name
- **goal** (string, required): One-sentence objective for this phase (e.g., "Prove the concept works with manual workflow")
- **tiers** (Tier[], required): Ordered dependency-based groupings within this phase
- Validation: Phases are sequentially ordered; all features in Phase N must complete before Phase N+1 begins.

### Tier

A dependency-based grouping within a phase that enables parallel feature development.

- **id** (string, required): Phase-relative identifier in `{phase}.{sequence}` format (e.g., `1.1`, `1.2`, `2.1`)
- **features** (Feature[], required): Features with no cross-dependencies within the tier; all may be implemented in parallel
- Validation: Features within a tier MUST have no dependencies on each other. All features in a tier must complete before the next tier begins.

## Referenced Entities

- **Context Files** — owned by `product-context` and `engineering-context`; provide product strategy, engineering principles, and technical patterns consumed by blueprint-creation and feature-rollout playbooks
- **Playbooks** — owned by `playbook-engine`; workflows executed once features are implemented; see [playbook-engine data-model.md](../playbook-engine/data-model.md)
