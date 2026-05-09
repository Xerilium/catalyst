---
features: [blueprint]
status: in-progress
created: { date }
last_updated: { date }
---

<!-- markdownlint-disable no-duplicate-heading -->

# Rollout: blueprint

Implement the product per `.xe/features/blueprint.md`.

## Active State

> [INSTRUCTIONS]
> Current-state snapshot for post-compaction resume. OVERWRITE in full at every STOP gate — NEVER append history here (use Notes). Keep each field terse; one line is usually enough.

**Model**: {mental model landed this session, not yet in spec}

**Decisions**: {load-bearing decisions made this session, not yet in design-decisions.md}

- {decision} — {rejected alternative}

**Open**: {questions awaiting user answer, or flagged unresolved}

- {question}

**Next**: {literal imperative for the next step}

**Pins**: {file:line-range references for load-bearing context}

- `path/to/file:L1-L10` — {short anchor}

**Assumptions**: {things treated as true this session without verification}

- {assumption}

## Run 0: Blueprint creation

Run 0 produces the blueprint via the `start-blueprint` playbook.

- [ ] Phase 0: Scope — context gathered, scope approved, rollout setup complete
- [ ] Phase 1: Plan — feature decomposition approved; Run 1+ entries below populated from approved Roadmap
- [ ] Phase 2: Implement — `.xe/features/blueprint.md` written; design-decisions.md updated if applicable
- [ ] Phase 3: Review — work presented, external issues routed, cleanup done, rollout closed

## Run 1: {phase-name}

> [INSTRUCTIONS]
> Populated by `start-blueprint` from blueprint Roadmap Phase 1. Pre-implementation captures one-time setup — delete if none. Each wave is an H3 of markdown checklist tasks. Group concurrent tasks under a `- 🔀 Execute in parallel:` parent label; subagents may execute the children concurrently. To run two ordered chains in parallel, nest `- 🔗 Execute in sequence:` groups inside the parallel group. Waves are sequential (wave N+1 starts only after wave N completes). Each task is `/catalyst:create {feature-id}` (new) or `/catalyst:change {feature-id}` (expansion); pass the full feature context inline (purpose, scope, dependencies, open questions from the blueprint Roadmap entry) so the called workflow doesn't re-read the blueprint.

### Pre-implementation

- [ ] {one-time setup task}

### Wave 1.1

- 🔀 Execute in parallel:
  - [ ] `/catalyst:create {feature-id}: {one-sentence purpose}`
    - Scope: {what's in / what's out}
    - Dependencies: none
    - Open questions: {if any}
  - [ ] `/catalyst:create {feature-id}: {one-sentence purpose}`
    - Scope: {what's in / what's out}
    - Dependencies: none

### Wave 1.2

- 🔀 Execute in parallel:
  - [ ] `/catalyst:change {feature-id}: {one-sentence purpose}`
    - Scope: {what's in / what's out}
    - Dependencies: {feature-id from Wave 1.1}
    - Open questions: {if any}

## Run 2: {phase-name}

> [INSTRUCTIONS]
> Same shape as Run 1, populated from blueprint Roadmap Phase 2. Phase re-evaluation pre-step is REQUIRED for every phase after Phase 1. The re-evaluation invokes `start-blueprint`, which collapses prior completed runs to one-line summaries as part of its Plan-phase work — no manual collapse step needed here.

### Pre-implementation

- [ ] **Re-evaluate blueprint via `/catalyst:blueprint`** — incorporate Phase 1 learnings; adjust Phase 2 scope, dependencies, and features against the now-known reality before starting wave work
- [ ] {one-time setup task for this phase, if any}

### Wave 2.1

- 🔀 Execute in parallel:
  - [ ] `/catalyst:create {feature-id}: {one-sentence purpose}`
    - Scope: {what's in / what's out}
    - Dependencies: {prior-phase feature-id, if any}

## Notes

> [INSTRUCTIONS]
> Design decisions, blockers, constraints, and resumption context for the entire rollout. Append new notes — do not overwrite.

## Vision Checkpoint

When the planned phases are implemented, run this checkpoint instead of closing out.

- [ ] Re-run `/catalyst:blueprint` to evaluate current state against the original vision and identify next moves (extend with new phases, address accumulated tech debt, or close out)
- [ ] If new phases identified → add them as Run N+1, Run N+2, … and update blueprint Roadmap to match
- [ ] If closing out (vision achieved or sunset) → clean up this rollout file
