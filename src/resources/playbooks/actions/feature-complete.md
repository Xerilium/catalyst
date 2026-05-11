# Complete Feature Work

Compose the workflow-context closure actions for the feature workflow. Adds feature-specific spec-recovery routing and feature-index regeneration.

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- `rollout-id`: In-progress rollout ID; rollout file at `.xe/rollouts/rollout-{rollout-id}.md`
- `execution-mode`: `interactive`, `checkpoint-review`, `final-review`, or `autonomous`

## Instructions

### 1. Audit completeness

▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-audit.md

### 2. Present work

Spec-change recovery (when the user requests spec changes during review): add a `## Review additions` section to the rollout plan, then re-execute the relevant phases in order — `feature-spec.md` → `feature-plan.md` → `feature-test.md` → `feature-code.md` — and re-invoke this composer from step 1.

▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-review.md

The review action enforces structured **Completed**, **Remaining**, and **Findings** sections in its summary, STOPs after presentation, and loops on user input until "done".

### 3. Clean up and close out

▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-closure.md (pr-type: Feature)

The closure action enforces a STOP precondition before closeout (gated on user-confirmed "done" from step 2) and routes external issues, cleanup, commit, and PR creation.

### 4. Regenerate feature index

Run `npx catalyst index` to regenerate `.xe/features/README.md` – If command fails, log error and continue

### 5. Celebrate

Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-celebrate.md

## Exit Criteria

- [ ] Audit complete (workflow-audit.md exit criteria met)
- [ ] Review presented and user confirmed "done" (or `autonomous` mode skipped presentation)
- [ ] Closeout complete (external issues routed, cleanup done, work persisted as requested)
- [ ] Feature index regenerated (`catalyst index`)
- [ ] Celebration message output
