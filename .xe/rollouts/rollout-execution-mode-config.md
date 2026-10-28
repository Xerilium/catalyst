---
features: [workflow-context, pull-request-workflow]
status: in-progress
created: 2026-10-28
last_updated: 2026-10-28
---

<!-- markdownlint-disable no-duplicate-heading -->

# Rollout: execution-mode-config

## Active State

**Model**: Mode resolves request > config `{command}` > config `default` > `ask`. `ask` = scope AUQ asks. PR review/update honor modes; pr-loop fixed autonomous.

**Decisions**:

- Flat config keys (`default`, `pr-review`) — rejected nested `commands:` map (matches user's example, less nesting)
- explore/sitrep/rollout exempt — no gates or outward actions

**Open**:

- Spec review in draft PR (spec-review mode)

**Next**: After spec approval, run Phase 2 plan.

**Pins**:

- `.xe/features/workflow-context/spec.md` — FR:execution-modes.ask/config/coverage
- `.xe/features/pull-request-workflow/spec.md` — FR:review.mode, FR:update.mode, FR:loop.mode

**Assumptions**:

- No TS code reads modes today; resolution is playbook-driven (AI reads config)

## Overview

Source: https://github.com/Xerilium/catalyst/pull/129#discussion_r4319921391. Add default execution mode in `.xe/config/catalyst.json` (overall + per command); add modes to all gated workflows.

## Run 1: execution-mode-config

> **Execute**: `/catalyst:change workflow-context pull-request-workflow — config default execution mode; modes for PR workflows`

### Features

#### workflow-context

- [x] Spec: ask mode, config resolution, coverage
- [ ] Plan, tests, playbook updates (feature-scope, workflow-scope, start-initialization, workflow-state)

#### pull-request-workflow

- [x] Spec: review/update/loop modes
- [ ] Plan, tests, playbook updates (review/update/loop-pull-request)

### Post-implementation

- [ ] Present work for review
- [ ] Route external issues discovered during implementation

## Notes

## Final Review

- [ ] Confirm all runs complete — no unchecked tasks, no unresolved blockers in Notes
- [ ] Clean up temporary files and this rollout plan
- [ ] Close out — commit, PR, or defer
