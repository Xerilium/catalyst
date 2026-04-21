---
owner: "Engineer"
reviewers:
  required: ["Architect"]
  optional: ["Product Manager"]
---

# Playbook: Repair Feature

**Goal**: Fixes bugs and optimizes design of existing features with a grounded, spec-driven workflow

**Phases**: Discovery → Scope → Spec validation → Plan → Implement → Review

**AskUserQuestion (AUQ) tool usage rules**: See @node_modules/@xerilium/catalyst/standards/auq.md

## Inputs

Parse user's input to identify optional parameters:

- **issue**: GitHub issue number
- **feature-id**: Kebab-cased ID of the feature(s) to update or refactor; must exist; maps to `.xe/features/{feature-id}/spec.md`
- **context-files**: Referenced files (proposals, notes, transcripts, etc) read for additional context
  - If files seem temporary and only necessary for context (notes, proposals, old artifacts, etc), note them for potential cleanup later — NEVER delete without confirmation

**Resuming from a rollout plan**: See `feature-scope.md` § Step 1 item 9 for rollout resume handling.

## Artifacts

- Bug fix with reproduction test and passing validation, with `@req` traceability
- Conditional: Spec updates at `.xe/features/{feature-id}/spec.md` (only if bug reveals requirements gap)
- Temporary: Rollout plan at `.xe/rollouts/rollout-{id}.md` (deleted when complete)
- Conditional: Feature branch and pull request (only for `autonomous-branch` execution mode)

## Phases

### Phase 0: Scope

Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-scope.md`

**Additional context for bug fixes**:

- Parse spec to understand expected behavior
- Identify which FR is being violated

**STOP HERE**: Do NOT proceed to Phase 1 until scope approved and setup complete – MUST have:

- **execution-mode** set
- Draft rollout plan: `.xe/rollouts/rollout-{id}.md`
- Execute @node_modules/@xerilium/catalyst/playbooks/actions/feature-state.md — DO NOT SKIP

### Phase 1: Spec Validation

1. Read existing spec: `.xe/features/{feature-id}/spec.md`
2. Compare expected behavior (from spec) vs actual behavior (from bug report)
3. Determine if bug reveals a spec gap:

   - **Spec complete**: Bug violates existing FR → proceed to Phase 3
   - **Spec incomplete**: Bug reveals missing/incorrect requirement → update spec (step 4)

4. If spec needs updates:

   - Use **AskUserQuestion**: "The spec doesn't cover {scenario}. Should we update the spec to clarify expected behavior?"
   - If approved → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-spec.md`
   - If declined → Proceed to Phase 3 with current spec

**STOP HERE**: Do NOT proceed to Phase 2 until spec is validated or updated

- Execute @node_modules/@xerilium/catalyst/playbooks/actions/feature-state.md — DO NOT SKIP

### Phase 2: Plan

Lighter planning may be sufficient for small fixes. Focus on: what's broken, root cause, fix approach, regression test. For complex bugs affecting multiple files, use full plan mode.

Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-plan.md`

**STOP HERE**: Do NOT proceed to Phase 3 until plan is approved and documented in `.xe/rollouts/rollout-{id}.md`

- Execute @node_modules/@xerilium/catalyst/playbooks/actions/feature-state.md — DO NOT SKIP

### Phase 3: Implementation

Execute IN ORDER (TDD):

1. Write tests → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-test.md`
   - Write failing test to reproduces the bug FIRST
   - `@req` annotations link to the existing FR being violated
2. Write code → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-code.md`

**STOP HERE**: Do NOT proceed to Phase 4 until code is written, tests are passing, and test/traceability coverage meets engineering bar

- Execute @node_modules/@xerilium/catalyst/playbooks/actions/feature-state.md — DO NOT SKIP

### Phase 4: Review and Closure

Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-complete.md`

## Error handling

**Implementation Failures:**

- If implementation task fails: preserve completed work, document blocker in rollout plan
- Escalate to human review if blocker cannot be resolved

**Spec Changes During Implementation:**

- Stop current implementation immediately if spec becomes invalid
- Document what was completed in rollout plan
- Never deviate from approved spec without user consent

**Context/Dependency Issues:**

- If required files missing (templates, architecture docs), halt and notify user
- If external dependencies unavailable, document blocker in rollout plan and suggest alternatives

## Success criteria

- [ ] Each phase exit criteria met
- [ ] Each nested instructions exit criteria met
- [ ] Bug reproduced with failing test before fix applied
- [ ] Every fix has corresponding `@req` annotation linking to violated FR
- [ ] User confirms work is complete
