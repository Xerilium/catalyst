# Feedback for blueprint-workflow

## Blueprint maintenance

- Blueprints get outdated as features evolve. There should be a mechanism to true-up the blueprint after rollouts complete — either naturally during rollout completion or as a periodic reconciliation.
  - **Why:** By the time significant implementation is done, the original blueprint's feature inventory, dependencies, and phasing may no longer reflect reality. Without true-up, the blueprint becomes misleading.
  - **How to apply:** Factor into whatever blueprint structure we land on. Some options make true-up natural (e.g., if the feature inventory is auto-derivable from specs); others require explicit reconciliation steps.

## Missing upstream FR — AI commands location

- No FR currently defines `src/resources/ai-config/commands/` as the canonical location for AI slash command files. `FR:ai-provider/commands.generate` reads from the path; `FR:feedback-loop/inject.source-safe` protects the path; neither owns it.
  - **Why**: `FR:workflow.cli` (and any future workflow's cli FR) needs an `@req` anchor for "where AI commands live." Currently has no upstream dep, which is a gap in the dependency graph.
  - **How to apply**: Add `FR:ai-provider/commands.location` (or similar) declaring the canonical source path. Then update workflow specs to `@req` it. Out of scope for blueprint-workflow Run 2; raise on ai-provider when convenient.
