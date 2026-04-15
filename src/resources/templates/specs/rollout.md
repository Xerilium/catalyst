---
features: [{ feature-ids }]
status: in-progress
created: { date }
last_updated: { date }
---

# Rollout: {rollout-id}

> [INSTRUCTIONS]
> Tracks the work required for one or more features. Keep updated so work can resume if context window resets. Deleted when complete.

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
