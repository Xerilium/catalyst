---
features: [feature-workflow]
status: in-progress
created: 2026-05-17
last_updated: 2026-05-17
---

<!-- markdownlint-disable no-duplicate-heading -->

# Rollout: feature-workflow-rollout-dispatch

## Active State

**Model**: Adding rollout lifecycle primitives to feature-workflow: /catalyst:rollout command + start-rollout.md playbook (orient-and-dispatch only) + two new FRs + prose fixes in 4 files.

**Decisions**: FR:workflow.rollout-dispatch renamed to FR:workflow.dispatch per user feedback

**Open**: None

**Next**: Phase 1 — update feature-workflow spec with new FRs

**Pins**:

- `.xe/features/feature-workflow/spec.md` — target spec

**Assumptions**:

- execution-mode: final-review (autonomous to completion, no commits)
- Prose fixes (A-D) approved as proposed

## Overview

Add rollout lifecycle primitives: a `/catalyst:rollout` slash command and `start-rollout.md` playbook for orient-and-dispatch, two new FRs in feature-workflow spec, and prose fixes establishing the run/rollout mental model across 4 files.

## Run 1: Implement

### Features

#### feature-workflow

- [ ] Update spec: add FR:workflow.@ai-command.rollout and FR:workflow.dispatch; update FR:workflow.discover.resume to reference /catalyst:rollout
- [ ] Write `src/resources/ai-config/commands/rollout.md`
- [ ] Write `src/resources/playbooks/start-rollout.md`
- [ ] Prose fix A: rollout.md template — multi-run model note
- [ ] Prose fix B: workflow-closure.md — define "Start next run"
- [ ] Prose fix C: feature-scope.md — Step 1.9 framing
- [ ] Prose fix D: create-feature.md + update-feature.md — Phase 4 multi-run note

### Post-implementation

- [ ] Run `npx catalyst traceability feature-workflow` — 100% coverage
- [ ] Run `npm test` — no regressions
- [ ] Present work for review

## Notes

Temp files: `/Users/flanakin/.claude/plans/serialized-doodling-feigenbaum.md` (plan, already read)

## Final Review

- [ ] Confirm all runs complete — no unchecked tasks, no unresolved blockers
- [ ] Clean up temporary files and this rollout plan
- [ ] Close out — commit, PR, or defer
