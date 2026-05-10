---
owner: "Product Manager"
reviewers:
  required: ["Architect"]
  optional: ["Engineer"]
---

# Playbook: Update Feature

**Goal**: Update or refactor existing features with a grounded, spec-driven workflow

**Phases**: Discovery → Scope → Spec → Plan → Implement → Review

## Inputs

Parse user's input to identify optional parameters:

- **issue**: GitHub issue number
- **feature-id**: Kebab-cased ID of the feature(s) to update or refactor; must exist; maps to `.xe/features/{feature-id}/spec.md`
- **context-files**: Referenced files (proposals, notes, transcripts, etc) read for additional context
  - If files seem temporary and only necessary for context (notes, proposals, old artifacts, etc), note them for potential cleanup later — NEVER delete without confirmation

**Resuming from a rollout plan**: See `feature-scope.md` § Step 1.9.

## Artifacts

- Updated feature specification(s) at `.xe/features/{feature-id}/spec.md`
- Implemented code with passing tests and `@req` traceability
- Temporary: Rollout plan at `.xe/rollouts/rollout-{id}.md` (deleted when complete)
- Conditional: Feature branch and pull request (only for `autonomous` execution mode)

## Phases

### Phase 0: Scope

‼️ **MUST EXECUTE** `node_modules/@xerilium/catalyst/playbooks/actions/feature-scope.md`

⛔️ **STOP HERE**: Do NOT proceed to Phase 1 until scope approved and setup complete – MUST have:

- **execution-mode** set
- Draft rollout plan: `.xe/rollouts/rollout-{id}.md`
- Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-state.md — DO NOT SKIP

### Phase 1: Spec

1. Read existing spec: `.xe/features/{feature-id}/spec.md`
2. Check spec sections to confirm latest spec format
   - **Latest format sections**: Purpose, Scenarios (with nested FRs + NFRs), Architecture Constraints (optional), External Dependencies
   - If not using latest sections, execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-format.md`
3. Update spec(s) → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-spec.md`

⛔️ **STOP HERE**: Do NOT proceed to Phase 2 until spec written with passing dependency traceability and approved for planning

- Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-state.md — DO NOT SKIP

### Phase 2: Plan

‼️ **MUST EXECUTE** `node_modules/@xerilium/catalyst/playbooks/actions/feature-plan.md`

⛔️ **STOP HERE**: Do NOT proceed to Phase 3 until plan is approved and documented in `.xe/rollouts/rollout-{id}.md`

- Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-state.md — DO NOT SKIP

### Phase 3: Implementation

Execute IN ORDER (TDD):

1. Write failing tests first (TDD) with `@req` links → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-test.md`
2. Write code with `@req` links → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-code.md`
3. Build and run tests – MUST pass (repeat 1-2 as needed)
4. Run `npx catalyst traceability {feature-id}` – MUST pass engineering bar

⛔️ **STOP HERE**: Do NOT proceed to Phase 4 until code is written, tests are passing, and test/traceability coverage meets engineering bar – Repeat 1-4 as needed

Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-state.md — DO NOT SKIP

### Phase 4: Review and Closure

‼️ **MUST EXECUTE** `node_modules/@xerilium/catalyst/playbooks/actions/feature-complete.md`

## Error handling

**Implementation Failures:**

- If implementation task fails: preserve completed work, document blocker in rollout plan
- Escalate to human review if blocker cannot be resolved

**Spec Changes During Implementation:**

- Stop current implementation immediately if spec becomes invalid
- Document what was completed in rollout plan
- Return to the spec phase and present new information
- Never deviate from approved spec without updating the spec with user approval

**Context/Dependency Issues:**

- If required files missing (templates, architecture docs), halt and notify user
- If external dependencies unavailable, document blocker in rollout plan and suggest alternatives

## Success criteria

- [ ] Each phase exit criteria met
- [ ] Each nested instructions exit criteria met
- [ ] User confirms work is complete
