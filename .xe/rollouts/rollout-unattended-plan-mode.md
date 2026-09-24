---
features: [feature-workflow, blueprint-workflow]
status: in-progress
created: 2026-09-24
last_updated: 2026-09-24
---

<!-- markdownlint-disable no-duplicate-heading -->

# Rollout: unattended-plan-mode

## Active State

**Model**: Plan gate auto-approves in `spec-review`/`final-review`/`autonomous`, but ExitPlanMode still blocks on a human — unattended runs stall. Fix: those modes skip the harness plan mode and run an equivalent planning pass recorded in the rollout.

**Decisions**:

- `spec-review` joins the skip group — rejected keeping plan mode there because the user leaves after spec approval, so ExitPlanMode stalls it too

**Open**:

- Awaiting research: does Claude Code auto mode (or any permission setting) auto-approve ExitPlanMode? User wants plan-mode quality without the blocker

**Next**: Read research result; if no harness bypass, proceed to Phase 1 spec edits in `.xe/features/feature-workflow/spec.md` and `.xe/features/blueprint-workflow/spec.md`

**Pins**:

- `src/resources/playbooks/actions/feature-plan.md:19-29` — step 2 plan-mode entry + step 3 focus
- `src/resources/playbooks/start-blueprint.md:34` — unconditional "Enter plan mode"
- `.xe/features/feature-workflow/spec.md:102-117` — FR:workflow.plan.*

**Assumptions**:

- ExitPlanMode blocks unattended runs (reported from PR #128 overnight run)

## Overview

Plan mode's exit (ExitPlanMode) waits for user approval, so `spec-review`, `final-review`, and `autonomous` runs stall at the plan phase even though those modes auto-approve the plan gate. Make unattended modes skip harness plan mode while keeping an equivalent-quality planning pass (architecture review, task breakdown, traceability check, alignment) recorded in the rollout plan. Applies to feature-workflow (`feature-plan.md`) and blueprint-workflow (`start-blueprint.md`). Evidence: overnight ai-plugin run (https://github.com/Xerilium/catalyst/pull/128) had to skip plan mode and record the design in the rollout.

Execution mode: `autonomous` (branch `xe/unattended-plan-mode`, PR at end).

## Run 1: Unattended plan mode

> **Execute**: `/catalyst:change feature-workflow — Skip harness plan mode in unattended execution modes without losing planning quality`

### Pre-implementation

- [ ] Confirm whether auto mode or any setting auto-approves ExitPlanMode

### Features

#### feature-workflow

- [ ] Spec: plan-phase FRs honor unattended modes; fix stale mode lists in FR:workflow.plan.approval and FR:workflow.spec.approval
- [ ] Playbook: `feature-plan.md` mode-based planning surface
- [ ] Playbook: `repair-feature.md` Phase 2 wording
- [ ] Tests: `tests/playbooks/features/orchestration.test.ts`

#### blueprint-workflow

- [ ] Spec: plan phase honors unattended modes
- [ ] Playbook: `start-blueprint.md` Phase 1 plan-mode entry
- [ ] Tests: blueprint playbook tests

### Post-implementation

- [ ] Run `npx catalyst traceability feature-workflow` and `npx catalyst traceability blueprint-workflow`
- [ ] Present work for review
- [ ] Route external issues discovered during implementation

## Notes

## Final Review

- [ ] Confirm all runs complete — no unchecked tasks, no unresolved blockers in Notes
- [ ] Clean up temporary files and this rollout plan
- [ ] Close out — commit, PR, or defer
