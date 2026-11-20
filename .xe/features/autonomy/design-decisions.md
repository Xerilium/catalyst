# Design Decisions: Full Autonomy

## Move the human gate into committed config

**Decision**: When `autonomy.enabled` is `true` in `.xe/config/catalyst.json`, the authoring agent adds Autopilot to its own clean PR. Turning autonomy on, or widening it, is itself a PR that always escalates.

**Date**: 2026-11-19

**Why**: Today a person adds Autopilot to every PR. That is the last manual step. A committed key is reviewed, versioned, and visible to every clone. `.xe/config/**` is a default sensitive path, so an agent can never approve its own wider autonomy.

**Rejected**:

- **Env var, CLI flag, or user-level config**: Invisible to reviewers; differs per machine.
- **`catalyst init` turns it on**: Hides a risky choice inside setup.

## Escalate by withholding Autopilot, not with a new label

**Decision**: An escalation leaves the PR without Autopilot and posts one `🤖 [AI]` comment whose reason list starts with 🧭.

**Date**: 2026-11-19

**Why**: Without Autopilot, the existing gates never merge the PR. Reconcile owns Needs Attention and would clear it. Sweep already leaves 🧭 items for the user.

**Rejected**:

- **Add Blocked or Needs Attention**: Both have other meanings and owners.

## Decide in code, behind ports

**Decision**: Decision logic lives in `src/autonomy/` as pure functions. GitHub, files, and the clock reach it only through ports. The CLI wires adapters.

**Date**: 2026-11-19

**Why**: The AI should not judge mechanical rules (sizes, paths, budgets). Pure code is testable and moves to Arc unchanged.

**Rejected**:

- **Playbook-only (Markdown) rules**: Drift-prone; not testable.
- **A new playbook action**: Couples the core to the playbook engine.

## Kill switch shares the scheduler's STOP file

**Decision**: Halt while `STOP` exists in `.xe/runs/autonomy/` or the scheduler state folder (`$CATALYST_SCHEDULE_STATE`, else `~/.cache/catalyst/schedule`).

**Date**: 2026-11-19

**Why**: One file stops both the scheduler and autonomy. The repo file stops one clone without touching others.

**Rejected**:

- **A committed STOP file**: Needs a push to take effect; too slow in an emergency.

## Token budget is self-reported

**Decision**: Agents record tokens with `--tokens`. The core sums ledger entries.

**Date**: 2026-11-19

**Why**: No portable API reports token use per PR. Rounds and wall-clock minutes are measured, so a missing token report still hits a cap.
