---
features: [{ feature-ids }]
status: in-progress
created: { date }
last_updated: { date }
---

<!-- markdownlint-disable no-duplicate-heading -->

# Rollout: {rollout-id}

> [INSTRUCTIONS]
> Tracks the work required for one or more features. Keep updated so work can resume if context window resets. Deleted when complete.

## Active State

> [INSTRUCTIONS]
> Current-state snapshot for post-compaction resume. OVERWRITE in full at every STOP gate — NEVER append history here (use Notes). A successor agent should read ONLY this block plus rollout tasks to understand state and execute the next step. Keep each field terse; one line is usually enough.

**Model**: {mental model landed this session, not yet in spec — e.g. "Phase 0 owns resume routing; phases walk forward"}

**Decisions**: {load-bearing decisions made this session, not yet in design-decisions.md}

- {decision} — {rejected alternative}

**Open**: {questions awaiting user answer, or flagged unresolved}

- {question}

**Next**: {literal imperative — e.g. "Run npm test -- orchestration.test.ts; if green, present review"}

**Pins**: {file:line-range references for load-bearing code}

- `path/to/file:L1-L10` — {short anchor}

**Assumptions**: {things treated as true this session without verification}

- {assumption}

## Overview

> [INSTRUCTIONS]
> Describe what this rollout accomplishes. Include enough context that a new run can pick up without re-reading the full conversation history.

## Run 1: {name}

> [INSTRUCTIONS]
> Each run is one playbook execution (scope → spec → planning → implement → review). For single-run rollouts, there is one run section. For multi-run rollouts, add new run sections before Final Review as needed.

### Pre-implementation

> [INSTRUCTIONS]
> Tasks before feature implementation. Delete if none.

- [ ] Task

### Features

> [INSTRUCTIONS]
> Feature implementation tasks grouped by feature. Use `#### {feature-id}` sub-headings to keep features separate and in dependency order. Mark completed tasks with `[x]`.

#### {feature-id}

- [ ] Task

### Post-implementation

> [INSTRUCTIONS]
> Tasks after feature implementation (cleanup, validation).

- [ ] Present work for review
- [ ] Route external issues discovered during implementation

## Notes

> [INSTRUCTIONS]
> Design decisions, blockers, constraints, and resumption context for the entire rollout. Append new notes — do not overwrite.

## Final Review

> [INSTRUCTIONS]
> AI checkpoint — execute these tasks (not just verify) when ALL runs are done. If additional runs are needed, add them above this section. Scan all run sections for unchecked tasks or unresolved blockers before proceeding.

- [ ] Confirm all runs complete — no unchecked tasks, no unresolved blockers in Notes
- [ ] Clean up temporary files and this rollout plan
- [ ] Close out — commit, PR, or defer
