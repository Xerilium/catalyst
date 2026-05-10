---
owner: "Product Manager"
reviewers:
  required: ["Architect"]
  optional: ["Engineer"]
---

# Playbook: Start Blueprint

**Goal**: Create or update the product blueprint with a grounded, spec-driven workflow

## Inputs

Parse user's input to identify optional parameters:

- **issue**: GitHub issue number containing blueprint context
- **context-files**: Referenced files (proposals, notes, transcripts, etc) read for additional context
  - If files seem temporary and only necessary for context, note them for potential cleanup later — NEVER delete without confirmation

## Phase 0: Scope

If `.xe/features/blueprint/` exists, execute `node_modules/@xerilium/catalyst/playbooks/actions/blueprint-format.md` to migrate legacy blueprint format

Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-scope.md (artifacts: `blueprint`). If `.xe/rollouts/rollout-blueprint.md` exists, assess Run 0 phase completeness and recommend a resume entry phase as a question in the workflow-scope AUQ — Run 1+ entries existing implies Run 0 is complete (resume targets Run 0 closeout or Phase 3 with abandoned-closeout handling).

⛔️ **STOP HERE**: Do NOT proceed to Phase 1 until scope approved and setup complete – MUST have:

- **execution-mode** set
- Rollout plan created at `.xe/rollouts/rollout-blueprint.md`
- Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-state.md — DO NOT SKIP

## Phase 1: Plan

Lead with the **product** — blueprints document the product architecture from a feature and high-level data model perspective. Enter plan mode and:

1. Draft any product expansions needed (new personas, strategy phases, customer journeys)
2. Define the product's feature decomposition, dependency graph, and roadmap structure aligned with product strategy
3. For each feature, capture id, complexity, one-sentence purpose, scope boundaries, and dependencies
4. Confirm each draft with the user per the active execution mode
5. Route every `Decision:` note: project-wide → promote to `.xe/features/design-decisions.md`; feature-internal → keep inline; duplicate → delete. Re-validate wave/phase/feature references in existing design-decisions entries against the current structure.
6. Apply blueprint changes (rename, scope, dependency, count) consistently across every affected artifact in one pass — diagram nodes/edges, gantt tasks/`after` refs, dependency declarations, rollout Wave checklists, Active State, design-decisions, prose. Partial updates are not acceptable.

After plan approval, populate `.xe/rollouts/rollout-blueprint.md` per the template:

- Run 0 phase checklist remains as the playbook progresses
- **Run 1+** — one run per phase from the approved Roadmap. Group feature build tasks by `### Wave {phase}.{wave}` H3 sub-headings. Tasks are `/catalyst:create {feature-id}` (new) or `/catalyst:change {feature-id}` (expansion) calls with full feature context inline — purpose, scope (in/out), dependencies, open questions from blueprint Roadmap — to pass everything it needs without re-reading:

  ```text
  - [ ] /catalyst:create "{feature-id}": {one-sentence purpose}
    - Scope: {what's in / what's out}
    - Dependencies: {feature-a}, {feature-b}
    - Open questions: {if any}
  ```

- Translate gantt `after` gates to `🔀 Execute in parallel:` groups — tasks sharing a gate are children of a single parallel group; do not flatten parallelism into a flat checklist.
- Collapse fully-completed prior runs (all tasks `[x]`) to a brief summary: `Run N: {phase-name} — completed {YYYY-MM-DD}. {1-2 line description of what capabilities were delivered}`

⛔️ **STOP HERE**: Do NOT proceed to Phase 2 until plan is approved AND Run 1+ entries populated for every phase in the Roadmap

Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-state.md — DO NOT SKIP

## Phase 2: Implement

Write `.xe/features/blueprint.md` per `src/resources/templates/specs/blueprint.md` and append product-architecture decisions to `.xe/features/design-decisions.md`

⛔️ **STOP HERE**: Do NOT proceed to Phase 3 until blueprint and (if applicable) design-decisions are written and validated against the blueprint template structure

Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-state.md — DO NOT SKIP

## Phase 3: Review

Present the final blueprint for review and close out:

1. Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-audit.md
2. Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-review.md with:
   - Spec-change recovery: re-execute Phase 1 (Plan) and Phase 2 (Implement) for changed sections, then return; Roadmap changes MUST also re-populate Run 1+ entries
3. Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-closure.md (pr-type: Blueprint)
4. Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-celebrate.md

## Error handling

**Implementation Failures**: preserve completed work, document blocker in rollout plan, escalate if unresolvable

**Spec Changes During Implementation**: stop, document, return to plan phase; if Roadmap changes, re-populate Run 1+ entries

**Context/Dependency Issues**: if required files missing, halt and notify user

## Success criteria

- [ ] Each phase exit criteria met
- [ ] Each nested instructions exit criteria met
- [ ] Run 0 phase checklist all `[x]`; blueprint authored at `.xe/features/blueprint.md`
- [ ] Run 1+ entries populated from Roadmap — one run per phase, feature build tasks grouped by wave with `/catalyst:create` or `/catalyst:change` invocations
- [ ] User confirms work is complete
