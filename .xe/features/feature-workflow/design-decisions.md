# Design Decisions: Feature Workflow

## Resume-state assessment ownership

**Decision**: Phase 0 owns resume-state assessment, not per-phase self-check.

**Date**: 2026-04-20

**Why**: Phase 0's `feature-scope.md` Step 1 already reads the spec for existing features. Extending that read to inspect rollout, plan, test, and implementation state is cheap and reuses context Phase 0 already has. Downstream phases stay simple: if you entered the phase, you do the work — no skip-or-do-work branching in every STOP gate.

**Rejected**: Per-phase self-check. Each phase reads its own artifacts and decides locally. Duplicates reads Phase 0 already did and moves a scoping decision out of scoping.

## Active State section semantics

**Decision**: Active State uses overwrite semantics, separate from append-only Notes.

**Date**: 2026-04-20

**Why**: Active State is current-state; a successor agent needs the latest mental model, not history. Overwrite prevents stale content from accumulating and defeats the discipline trap where "append one more entry" becomes a growing log no one re-reads. Notes stays append-only because history has independent value (audit, revisit old decisions). Placing Active State at the top of the rollout signals read-order: current state first, context/history second.

**Rejected**: Unified Notes section that handles both current-state and history. Merging would force readers to filter every update; overwrite-in-one-place-append-in-another makes each section's purpose unambiguous.

## Active State field set

**Decision**: Active State has 6 fields (Model, Decisions, Open, Next, Pins, Assumptions).

**Date**: 2026-04-20

**Why**: The initial explore proposed 7 fields. First implementation narrowed to 3 (Model, Next, Pins), which dropped load-bearing content (Decisions made this session not yet in design-decisions.md; Open questions awaiting user answer; Assumptions treated as true without verification). Re-expansion to 6 drops only "Mission" because the rollout Overview + Run heading already convey it. Each of the 6 remaining fields captures genuinely distinct state a successor needs.

**Rejected**: 3-field narrowing. Under-described state led to load-bearing gaps a successor would have to re-derive. Also rejected: 7-field original (Mission duplicated by Overview).

## Continuity ritual placement

**Decision**: Continuity ritual is a single action file referenced from orchestration playbooks.

**Date**: 2026-04-20

**Why**: Actions are composable — `feature-test.md` runs under `create-feature`, `update-feature`, and `repair-feature` orchestrations. Making each action responsible for maintaining Active State pushes a cross-cutting concern into single-purpose files and duplicates enforcement. Extracting the ritual to `feature-state.md` and referencing it from each orchestration playbook's Phases intro keeps actions focused on their own concern and keeps the ritual in one place to evolve.

**Rejected**: Exit Criteria entries in each of the 6 `feature-*.md` actions. Duplication across 6 files; cross-cutting concern in the wrong layer; evolving the ritual would require 6 edits.

## Active State ritual reference placement

**Decision**: Active State ritual is referenced at EVERY STOP gate with @-prefixed path.

**Date**: 2026-04-20

**Why**: A single reference at the top of the Phases section gets read once and forgotten — agents execute Phase 0, move to Phase 1, and never revisit the intro. Placing the Execute line at each STOP gate reinforces the ritual at every phase transition (the exact moments when state must be persisted). The @-prefix on the path (`@node_modules/...`) triggers the file-loading behavior used throughout Catalyst playbooks; inline code references do not auto-load and require an explicit Read tool call, making skipping easier.

**Rejected**: Once-at-top-of-Phases note. Fails under real execution: phase-by-phase agents don't re-read the Phases intro. Also rejected: inline code reference without @-prefix — does not trigger auto-load, increases likelihood of skipping.

## Phase 4 STOP gate placement

**Decision**: The Phase 4 STOP gate lives inside `feature-complete.md` as a one-line block at the end of Step 1d, guarding entry to Step 2 (closeout). Governed by the global `NFR:reliability.sequential-execution` ("STOP gate after every phase that validates ALL exit criteria, including any required user confirmation"), not by a per-phase FR.

**Date**: 2026-04-26

**Why**: Closeout (delete rollout, commit, PR, index, celebrate) runs entirely *inside* `feature-complete.md`, not at the orchestration playbook level. By the time `feature-complete.md` returns to the playbook, closeout has already happened — so a STOP block in `create/update/repair-feature.md` after `Execute feature-complete.md` would gate nothing. The only place a gate can actually prevent the bad collapse (presentation skipped → straight to closeout) is between Step 1d and Step 2 inside the action file itself. Orchestration-level Phase 4 STOP blocks were initially added for "structural parity" with phases 0-3 but were decorative and removed.

**Rejected**: Adding a per-phase `FR:review.gate`. This would have introduced the only per-phase gate FR while phases 0-3 rely on the global NFR; tightening the NFR's wording to "after every phase" covers all gates uniformly with zero new FR overhead. Also rejected: STOP blocks in the orchestration playbooks at Phase 4 entry — they fire after the action file has already finished closeout, gating nothing. Also rejected: hoisting closeout out of `feature-complete.md` into the orchestration playbooks so the orchestration STOP would be load-bearing — too invasive for a single-feature behavior fix.

## Rollout template FR ownership

**Decision**: Rollout template FR lives in feature-context, not feature-workflow.

**Date**: 2026-04-20

**Why**: feature-context owns rollout template structure (`FR:rollout.*`). Adding a new section to the rollout template is a feature-context concern. feature-workflow owns the ritual that maintains the section (when/how/why), which references the upstream template FRs via `@req`. Splitting on this axis matches how other template/workflow pairs are organized (spec template in feature-context; spec-writing workflow in feature-workflow).

**Rejected**: Putting template FR in feature-workflow. Would couple template structure to orchestration, break the feature-context/feature-workflow separation, and force the rollout template to have multiple owners.
