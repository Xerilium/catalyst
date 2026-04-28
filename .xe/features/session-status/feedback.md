# Feedback for session-status

## Distribution

- Consider extracting `/sitrep` as a standalone Claude plugin (`@xerilium/sitrep` separate repo) once Catalyst version proves the concept. The "lost track of parallel sessions" problem is agent-agnostic and applies to any AI session, not just Catalyst-driven ones.
  - **Why:** Catalyst-only distribution caps reach to Catalyst adopters. The standalone plugin would drop the Catalyst-specific header conditional (initiative/rollout/feature) and degrade to a generic header, but the core value (5-line re-orientation) carries over. Extracting later is cheap — one markdown file with no Catalyst-specific dependencies in the body.
  - **How to apply:** Defer until the Catalyst version sees real session-recovery use. Signals to extract: users asking "can I use this without Catalyst?", or external traction on the concept. Extraction = strip frontmatter to non-Catalyst conventions, drop Catalyst identifier detection from the header, republish under separate package.

## Active State schema

- Watch flag: `feature-state.md` Active State has 6 fields (Model / Decisions / Open / Next / Pins / Assumptions) but lacks an explicit `Progress` field. Currently a successor agent has to scan rollout `[x]` checkmarks to derive what got done this session.
  - **Why:** Q1 gap analysis during session-status scoping compared sitrep, feature-complete review recap, and feature-state Active State. Active State was the only one missing "what's been completed so far." Marginal because it's derivable, but the derivation costs context tokens on every resume.
  - **How to apply:** Defer adding the field until the gap actually bites in practice — e.g., a post-compaction resume that needs Progress and the rollout checkmarks aren't sufficient. If added, format would mirror Next: a one-line literal status (e.g., "Phase 2 plan approved; sitrep.md edited; feature-complete recap pending").
