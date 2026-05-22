# Complete Feature Work

Compose the workflow-context closure actions for the feature workflow. Adds feature-specific spec-recovery routing and feature-index regeneration.

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- `rollout-id`: In-progress rollout ID; rollout file at `.xe/rollouts/rollout-{rollout-id}.md`
- `execution-mode`: `interactive`, `checkpoint-review`, `final-review`, or `autonomous`

## Instructions

### 1. Audit completeness

▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-audit.md

### 2. Close out and present work

If `execution-mode` is `autonomous`: closure → review. All other modes: review → closure.

1. If `autonomous`: ▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-closure.md (pr-type: Feature)
2. ▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-review.md
3. If NOT `autonomous`: ▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-closure.md (pr-type: Feature)

Spec-change recovery (user requests spec changes during review): add a `### Review additions` subsection under the current `## Run N` (sibling of Features/Post-implementation, scoped to this run only), re-execute `feature-spec.md` → `feature-plan.md` → `feature-test.md` → `feature-code.md`, then re-invoke this composer from step 1.

### 3. Regenerate feature index

Run `npx catalyst index` to regenerate `.xe/features/README.md` – If command fails, log error and continue

### 4. Celebrate

Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-celebrate.md

## Exit Criteria

- [ ] Audit complete (workflow-audit.md exit criteria met)
- [ ] Review presented in every mode (with "done" loop under non-`autonomous` modes)
- [ ] Closeout complete (external issues routed, cleanup done, work persisted)
- [ ] Feature index regenerated (`catalyst index`)
- [ ] Celebration message output
