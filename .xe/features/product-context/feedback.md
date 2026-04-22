# Feedback for product-context

## Customer journey

- Customer journeys (workflow diagrams showing actor interactions and checkpoints) should be a standard part of product architecture, not a one-off in the Catalyst blueprint. f4-music, founders-agreement, and eventually stack all have workflows that benefit from visualization.
  - **Why:** Leads to better quality by making the product vision concrete and testable. Currently only Catalyst has one (as a mermaid sequence diagram in blueprint spec.md).
  - **How to apply:** Determine whether this belongs in product.md, blueprint spec, or a separate artifact. Also: is a customer journey a requirement or an analysis that leads to requirements? Needs exploration.

## Template size metric

- Product templates (product.md, customer-journey.md, competitive-analysis.md) don't currently have file-level size checks — validators only assert per-instruction-block size. Consider adding character-count checks for consistency with validate-spec / validate-rollout / validate-development. Line count is the wrong metric; prefer characters.
