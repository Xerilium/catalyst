---
owner: "Product Manager"
reviewers:
  required: ["Architect"]
  optional: ["Engineer"]
---

# Playbook: Update Feature

**Goal**: Update or refactor existing features with a grounded, spec-driven workflow

**Phases**: Discovery → Scope → Spec → Plan → Implement → Review

**AskUserQuestion (AUQ) tool usage rules**: See @node_modules/@xerilium/catalyst/standards/auq.md

## Inputs

Parse user's input to identify optional parameters:

- **issue**: GitHub issue number
- **feature-id**: Kebab-cased ID of the feature(s) to update or refactor; must exist; maps to `.xe/features/{feature-id}/spec.md`
- **context-files**: Referenced files (proposals, notes, transcripts, etc) read for additional context
  - If files seem temporary and only necessary for context (notes, proposals, old artifacts, etc), note them for potential cleanup later — NEVER delete without confirmation

**Resuming from a plan**: If the user references an existing plan file (`.xe/sessions/plan-{id}.md`), read it and determine the resume point:

- If all tasks are checked `[x]` → skip to Phase 4 (Review/Closure)
- If some tasks are checked and implementation code exists → resume at Phase 3 (Implementation)
- If plan has task breakdown but no implementation → resume at Phase 3 (Implementation)
- If plan has feature sub-headings but no task breakdown → resume at Phase 2 (Plan)
- If plan has overview only → resume at Phase 1 (Spec)

## Artifacts

- Updated feature specification(s) at `.xe/features/{feature-id}/spec.md`
- Data model(s) at `.xe/features/{feature-id}/data-model.md` (if needed)
- Implemented code with passing tests and `@req` traceability
- Temporary: Implementation plan at `.xe/sessions/plan-{id}.md` (deleted when complete)
- Conditional: Feature branch and pull request (only for `autonomous-branch` execution mode)

## Phases

### Phase 0: Scope

Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-scope.md`

**STOP HERE**: Do NOT proceed to Phase 1 until scope approved and setup complete – MUST have:

- **execution-mode** set
- Draft plan outline: `.xe/sessions/plan-{id}.md`

### Phase 1: Spec

1. Read existing spec: `.xe/features/{feature-id}/spec.md`
2. Check spec sections to confirm latest spec format
   - **Latest format sections**: Purpose, Scenarios (with nested FRs + NFRs), Architecture Constraints (optional), Dependencies (optional)
   - If not using latest sections, execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-format.md`
3. Update spec(s) → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-spec.md`

**STOP HERE**: Do NOT proceed to Phase 2 until spec written with passing dependency traceability and approved for planning

### Phase 2: Plan

Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-plan.md`

**STOP HERE**: Do NOT proceed to Phase 3 until plan is approved and documented in `.xe/sessions/plan-{id}.md`

### Phase 3: Implementation

Execute IN ORDER (TDD):

1. Write tests → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-test.md`
2. Write code → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-code.md`

**STOP HERE**: Do NOT proceed to Phase 4 until code is written, tests are passing, and test/traceability coverage meets engineering bar

### Phase 4: Review and Closure

Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-complete.md`

## Error handling

**Implementation Failures:**

- If implementation task fails: preserve completed work, document blocker in feature plan
- Escalate to human review if blocker cannot be resolved

**Spec Changes During Implementation:**

- Stop current implementation immediately if spec becomes invalid
- Document what was completed in feature plan
- Never deviate from approved spec without user consent

**Context/Dependency Issues:**

- If required files missing (templates, architecture docs), halt and notify user
- If external dependencies unavailable, document blocker in feature plan and suggest alternatives

## Success criteria

- [ ] Each phase exit criteria met
- [ ] Each nested instructions exit criteria met
- [ ] User confirms work is complete
