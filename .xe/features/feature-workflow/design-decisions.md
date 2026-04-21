# Design Decisions: Feature Workflow

## Phase 0 owns resume-state assessment (not per-phase self-check)

**Date**: 2026-04-20

**Why**: Phase 0's `feature-scope.md` Step 1 already reads the spec for existing features. Extending that read to inspect rollout, plan, test, and implementation state is cheap and reuses context Phase 0 already has. Downstream phases stay simple: if you entered the phase, you do the work — no skip-or-do-work branching in every STOP gate.

**Rejected**: Per-phase self-check. Each phase reads its own artifacts and decides locally. Duplicates reads Phase 0 already did and moves a scoping decision out of scoping.
