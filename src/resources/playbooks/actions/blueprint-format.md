# Migrate Legacy Blueprint to Current Shape

Transform a legacy multi-file blueprint (`.xe/features/blueprint/` with some combination of `spec.md`/`plan.md`/`data-model.md`/`design-decisions.md`/`tasks.md`/`research.md`) into the current single-file shape (`.xe/features/blueprint.md` + appended `.xe/features/design-decisions.md` + new/merged `.xe/rollouts/rollout-blueprint.md`).

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- `execution-mode`: `interactive`, `checkpoint-review`, `final-review`, or `autonomous`

## Instructions

### 1. Detect legacy files

List every `.md` in `.xe/features/blueprint/`. Real legacy structures vary — common files include `spec.md`, `plan.md`, `data-model.md`, `design-decisions.md`, `tasks.md`, `research.md`. Any subset may be present.

### 2. Map content to target sections

- **Product-level scenarios** (from `spec.md`) — stage for `.xe/product.md` merge. Add a one-line note per scenario to the rollout's `## Notes` section flagging user follow-up. DO NOT auto-merge into product.md.
- **Feature inventory + dependency graph** (from `plan.md` or `spec.md`) → `.xe/features/blueprint.md` Architecture section
- **Roadmap details / phase plan** (from `plan.md` or `tasks.md`) → `.xe/features/blueprint.md` Roadmap section
- **Product domain entities** (from `data-model.md`) → `.xe/features/blueprint.md` Data Model section
- **Design decisions** (from `design-decisions.md` AND any decision rationale unique to `research.md`) — APPEND to `.xe/features/design-decisions.md` (root-level, NOT nested under `blueprint/`). Create from `node_modules/@xerilium/catalyst/templates/specs/design-decisions.md` if missing.
- **Tasks** (from `tasks.md`) — merge into `.xe/rollouts/rollout-blueprint.md` Run 1+ entries

### 3. Generate new files

- `.xe/features/blueprint.md` — create from `node_modules/@xerilium/catalyst/templates/specs/blueprint.md` template; populate Architecture / Data Model / Roadmap from mapped content
- `.xe/rollouts/rollout-blueprint.md` — if missing, create from `node_modules/@xerilium/catalyst/templates/specs/rollout-blueprint.md` template; if exists, merge — Run 0 added/updated, prior Run 1+ entries preserved (do not overwrite implementation progress)
- `.xe/features/design-decisions.md` — append migrated decisions; create from template if missing

### 4. Approval gate (interactive/checkpoint-review modes only)

If `execution-mode` is `interactive` or `checkpoint-review`, execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to confirm change summary:

- Summary line: `Migrated {N} files; {X} scenarios staged for product.md merge; {Y} decisions appended to design-decisions.md; {Z} tasks moved to rollout`
- Options: "Approve all" (Recommended) / "Review individually"

If "Review individually", present per-target AUQs (mappings, decisions, tasks) in batches of 4 until approved.

For `final-review` and `autonomous` modes, auto-approve and proceed.

### 5. Write new files

After approval, write the three target files. Preserve original content verbatim where possible — do not reword unless approved.

### 6. Cleanup

Delete the entire `.xe/features/blueprint/` directory (all source files migrated or discarded per Step 2).

### 7. Commit migration

Commit the migration as a clean, format-only commit so it doesn't mix with subsequent blueprint updates from the calling workflow. ▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-commit.md with `feature-id: blueprint`, `files: [.xe/features/blueprint.md, .xe/features/design-decisions.md, .xe/rollouts/rollout-blueprint.md]` plus the deleted source files, `description: Migrate legacy blueprint to latest format`.

## Exit Criteria

- [ ] Legacy `.xe/features/blueprint/` directory deleted
- [ ] `.xe/features/blueprint.md` written per blueprint template
- [ ] `.xe/features/design-decisions.md` updated/created with migrated decisions
- [ ] `.xe/rollouts/rollout-blueprint.md` created or merged (Run 0 set, prior Run 1+ preserved)
- [ ] Product-level scenarios staged in rollout `## Notes` for product.md merge follow-up
- [ ] User approved transformation (auto-approved for `final-review` and `autonomous`)
- [ ] Migration committed as a clean, format-only commit (does not mix with subsequent blueprint updates)
