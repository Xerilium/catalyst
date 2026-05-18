---
features: [blueprint-context, blueprint-workflow, feature-workflow]
status: pending
created: 2026-04-18
last_updated: 2026-05-11
---

# Rollout: blueprint-system

## Overview

Build the new blueprint system: a blueprint-context feature owning the `blueprint.md` template (Architecture, Data Model, Roadmap sections) and a blueprint-workflow feature with playbooks for creating and updating blueprints. Update feature-workflow to support non-feature rollouts and rollout continuation. Migrate the Catalyst project's existing messy blueprint to the new format.

The blueprint construct moves from a "meta-feature with spec/plan/tasks/research" to a focused product architecture artifact:

- `.xe/features/blueprint.md` — Architecture (structure + dependency graph), Data Model (product domain entities), Roadmap (phased plan with unbuilt feature details that migrate into specs as features get built)
- `.xe/customer-journey.md` — Product workflow visualization (already created in release-cleanup Run 5)
- `.xe/design-decisions.md` — Product-level architectural decisions (currently in `.xe/features/blueprint/design-decisions.md`; move to root)
- Rollouts carry temporary blueprint FR details that migrate into features as work completes

**Source:** Decided in Run 5 of [rollout-release-cleanup.md](rollout-release-cleanup.md). One of three parallel rollouts. Absorbs the work that was Run 6 of release-cleanup (rollout entry point + step-through-runs + initiative concept).

**Cross-rollout dependencies:**

- Depends on [rollout-product-foundation.md](rollout-product-foundation.md) outputs (customer-journey convention) for full integration; can develop independently
- Depends on [rollout-feature-index.md](rollout-feature-index.md) outputs (description frontmatter) for blueprint.md's link to README.md; can develop independently
- Both upstream rollouts should land before final integration testing in this rollout

**Parallelization:** Different features from the other rollouts. feature-workflow updates here MUST NOT run in parallel with other feature-workflow changes. blueprint-context and blueprint-workflow are new features with no existing files to conflict.

## Run 1: blueprint-context — define the artifacts

### Pre-implementation

- [x] Decide: file location for blueprint.md (`.xe/features/blueprint.md` per Run 5 decision)
- [x] Decide: what goes in Architecture vs Data Model vs Roadmap H2 sections (per Run 5 discussion)

### Features

#### blueprint-context (new feature)

- [x] Create `.xe/features/blueprint-context/spec.md` with FRs for:
  - blueprint.md location: `.xe/features/blueprint.md`
  - blueprint.md template structure: Architecture (feature structure + dependency graph), Data Model (product domain entities), Roadmap (phased plan with unbuilt feature details)
  - design-decisions.md location for product-level: `.xe/features/design-decisions.md` (co-located with blueprint.md, not at .xe/ root — decision made in spec phase)
  - customer-journey.md and README.md references dropped as standalone FRs (redundant with upstream location FRs); cross-link reminders live in the template's instruction blocks
- [x] Create `src/resources/templates/specs/blueprint.md` template (note: actual location is `templates/specs/`, not `templates/`, per existing convention)
- [x] Add validation tests for blueprint.md template structure (`tests/templates/validate-blueprint.test.ts`, 19 tests)
- [x] Frontmatter for blueprint-context spec includes `dependencies: [context-storage, feature-context, product-context]` (added context-storage per @req convention used by sibling context features)

### Post-implementation

- [x] Confirm blueprint-context spec is complete and approved
- [x] No file migrations yet (those happen in Run 4)

## Run 2: blueprint-workflow — define the playbooks

### Pre-implementation

- [x] Review feature-workflow spec and playbooks as reference structure
- [x] Decide: which work types does blueprint need? — single create-or-update orchestration (explore deferred per YAGNI; bug-fix N/A for blueprints)

### Features

#### blueprint-workflow (new feature)

- [x] Create `.xe/features/blueprint-workflow/spec.md` with FRs for:
  - Single FR:workflow scenario (no separate create/update FRs — playbook handles both modes)
  - 4-phase sequence: Scope → Plan → Implement → Review (Spec phase folded into Plan; this workflow doesn't produce feature specs)
  - Plan phase covers product-context expansions (personas, strategy, journey) AND feature decomposition + dependency graph + roadmap
- [x] Rewrite `src/resources/playbooks/start-blueprint.md` in place (preserves git history; old file was ~70% wrong-model legacy references)
- [x] Rewrite `src/resources/ai-config/commands/blueprint.md` (minimal, mirrors `commands/create.md` shape)
- [x] Frontmatter dependencies: `[context-storage, product-context, engineering-context, blueprint-context, workflow-context, feature-context, feedback-loop]` (added context-storage and engineering-context for transitive correctness; added workflow-context for execution modes; dropped catalyst-cli — spec-only feature doesn't run CLI; added feedback-loop for review-phase external-issue routing)

#### Legacy cleanup

- [x] Delete `src/resources/playbooks/start-blueprint.yaml` (legacy YAML conversion)
- [x] Delete `src/resources/playbooks/invoke-blueprint.md` (out of scope for blueprint-workflow — different concern)
- [x] Delete `src/resources/playbooks/write-blueprint-{spec,plan,research}.yaml` (legacy YAML)
- [x] Delete `src/resources/playbooks/new-blueprint-issue.{md,yaml,ts,js,js.map,d.ts,d.ts.map}` (issue-flow consolidated into optional `issue` input on /catalyst:blueprint)
- [x] Update `src/resources/playbooks/start-initialization.md` §6 to point at `/catalyst:blueprint` interactive flow instead of `new-blueprint-issue` playbook
- [x] Update `src/resources/templates/issues/init.md` line 71 with the same change

### Post-implementation

- [x] Confirm playbooks are complete and approved (21/21 validate-start-blueprint tests pass; 100% blueprint-workflow traceability)
- [x] Workflow-context closure-action extraction completed by separate agent; start-blueprint.md Phase 3 composes workflow-audit/review/closure/celebrate directly (no soft cross-workflow dep on feature-complete.md)
- [ ] Test the `/catalyst:blueprint` command end-to-end on a scratch project — deferred to Run 4 dogfood (migrating Catalyst's own blueprint will exercise this end-to-end)

## Run 3: blueprint-format action — migration tooling

Parallel to feature-format.md but for blueprints. Handles extract/transform/move when migrating an old-format blueprint (spec/plan/tasks/research) to the new format (blueprint.md + design-decisions.md + rollout merger).

### Features

#### blueprint-workflow (ownership corrected from blueprint-context — workflow action, not artifact convention)

- [x] Create `src/resources/playbooks/actions/blueprint-format.md` action that:
  - Reads existing blueprint files (spec/plan/data-model/design-decisions/tasks/research — actual files vary)
  - Extracts product-level scenarios → stages them in rollout Notes for product.md merge follow-up (does NOT auto-merge)
  - Extracts feature inventory + dependency graph → `.xe/features/blueprint.md` Architecture section
  - Extracts roadmap details → `.xe/features/blueprint.md` Roadmap section
  - Extracts product domain model (from data-model.md) → `.xe/features/blueprint.md` Data Model section
  - Extracts design decisions → APPEND to `.xe/features/design-decisions.md` (root, not nested)
  - Merges tasks → `.xe/rollouts/rollout-blueprint.md` Run 1+ entries (preserves prior progress on merge)
  - Deletes the entire `.xe/features/blueprint/` directory after migration
- [x] Spec amendment: replaced FR:workflow.scope.legacy-detection with FR:workflow.format (P2) at workflow scenario top level
- [x] Workflow integration: start-blueprint.md Phase 0 now auto-migrates legacy blueprints (was: STOP and surface to user)
- [x] Boy Scout: fixed feature-ID leaks throughout start-blueprint.md (no more `blueprint-context`/`product-context` references in deployed playbook)

### Post-implementation

- [x] Confirm action exit criteria match feature-format.md pattern (24/24 validation tests pass)
- [ ] Test action against Catalyst's own blueprint — deferred to Run 4 (which IS the dogfood run; no separate dry-run needed)

## Run 4: Migrate Catalyst's existing blueprint

Apply the blueprint-format action to Catalyst's own blueprint. Cleans up the partial conversion done by the subagent in release-cleanup Run 5.

### Pre-implementation

- [x] Review current state of `.xe/features/blueprint/` (subagent already converted spec, deleted research, merged tasks; plan.md remains)
- [x] Review current state of `.xe/features/blueprint/design-decisions.md` (created by subagent)

### Features

#### blueprint (existing folder)

- [x] Run blueprint-format action against `.xe/features/blueprint/`
- [x] Verify produced files: `.xe/features/blueprint.md`, `.xe/features/design-decisions.md` updates, rollout-blueprint.md integration
- [x] Delete remaining `.xe/features/blueprint/` directory once migration verified
- [x] Update any remaining references to the old blueprint feature folder (search codebase)

### Post-implementation

- [x] Run README generation and verify blueprint isn't listed as a feature (33 features, blueprint absent)
- [x] Run traceability and verify no broken `@req` annotations

## Run 5: feature-workflow updates — rollout continuation and blueprint integration

Absorbs the work originally scoped as Run 6 in release-cleanup (missing entry point for non-feature rollouts, step-through-runs, run completion direction). Adds blueprint reference updates throughout feature-workflow.

### Pre-implementation

- [x] Review release-cleanup Run 6 notes for the original framing (rollout entry point, initiative concept, step-through-runs, directional run completion)
- [x] Determine: is this one new playbook (`/catalyst:rollout`) or extensions to existing playbooks? — one new playbook (`/catalyst:rollout` → `start-rollout.md`); extensions to existing playbooks for multi-run notes and closure

### Features

#### feature-workflow

- [x] Add FR for non-feature rollout support: `FR:workflow.@ai-command.rollout` + `FR:workflow.@playbook.rollout` (new `/catalyst:rollout` → `start-rollout.md`)
- [x] Add FR for rollout continuation/execution: `FR:workflow.execute` — reads declared `> **Execute**:` command from next run, executes playbook inline
- [x] Add FR for directional run completion: multi-run note added to all four feature playbooks (create, update, repair, explore) and workflow-closure "Start next run"
- [x] Update update-feature.md and create-feature.md Phase 4 with multi-run handoff note
- [x] Update playbook actions to reference new blueprint locations (`.xe/features/blueprint.md` not `.xe/features/blueprint/`) — already done; feature-scope.md and workflow-scope.md were current at migration time
- [x] Update feature-scope.md to read blueprint.md (was: read blueprint/spec.md, plan.md, tasks.md) — already done
- [x] Update explore-feature.md similarly — no explore-feature.md action exists; covered by feature-scope.md
- [x] Rationalize with "initiative" concept — deferred to 0.3 per user; rollouts cover the use case adequately
- [x] Update template at `src/resources/templates/specs/rollout.md` — added `> **Execute**:` blockquote format with command selection guidance

### New artifacts

- [x] `src/resources/playbooks/start-rollout.md` — create-or-execute entry point; enumerates rollouts when no args; reads declared command; executes playbook inline
- [x] `src/resources/playbooks/actions/create-rollout.md` — scaffold new rollout from template with approved runs and declared commands
- [x] `src/resources/ai-config/commands/rollout.md` — `/catalyst:rollout` slash command

### Post-implementation

- [x] Dogfood: multi-run rollout continuation uses `> **Execute**:` format; `start-rollout.md` reads and executes inline
- [x] Verify all blueprint references across codebase point to new locations — verified; only intentional legacy refs remain (blueprint-format detection trigger, FR:workflow.format trigger condition)
- [x] `npx catalyst traceability feature-workflow` — 100% (50 requirements)
- [x] `npm test` — 150 suites, 2793 passed

## Notes

- Runs 1-3 develop in sequence within this rollout but can start before product-foundation and feature-index complete
- Run 4 (migration) requires Run 3 (format action) to be complete; benefits from product-foundation and feature-index landing first but doesn't strictly require them
- Run 5 (feature-workflow) is independent from Runs 1-4 and could potentially run in parallel within this rollout, but keeping sequential for review clarity
- Existing blueprint playbooks in `src/resources/playbooks/` (start-blueprint.md, write-blueprint-*.yaml, invoke-blueprint.md, new-blueprint-issue.md, etc.) need to be reconciled with the new system in Runs 2-4. Some delete, some replace, some update.

## Final Review

- [ ] All 5 runs complete — no unchecked tasks, no unresolved blockers
- [ ] blueprint-context and blueprint-workflow features fully specced and tested
- [ ] Catalyst's blueprint migrated to new format
- [ ] feature-workflow supports rollout continuation
- [ ] All cross-rollout dependencies (product-foundation, feature-index) integrated
- [ ] Delete this rollout plan
