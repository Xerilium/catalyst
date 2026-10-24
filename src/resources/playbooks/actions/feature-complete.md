# Complete Feature Work

Compose the workflow-context closure actions for the feature workflow. Adds feature-specific spec-recovery routing and feature-index regeneration.

‼️ Write for **Plain Language**: like a human explaining it to a teammate

## Inputs

- `rollout-id`: In-progress rollout ID; rollout file at `.xe/rollouts/rollout-{rollout-id}.md`
- `execution-mode`: `interactive`, `checkpoint-review`, `spec-review`, `final-review`, or `autonomous`

## Instructions

‼️ **No bare "done"**: implementation completing is the trigger to run this composer, not to hand back with an unclosed rollout. Surface completion only through the review (step 3) so it drives closure.

### 1. Audit completeness

▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-audit.md

### 2. Spec gate

‼️ Run before any pull request is created, in every mode. For each feature in scope:

1. Run `npx catalyst check {feature-id}` and fix every finding on FRs this work touched (most often `spec.one-req`: split FRs with more than one MUST/SHOULD/MAY)
2. Read each touched `design-decisions.md` top to bottom; merge any entries that overlap or contradict into one active entry (update its Date) so no two decisions cover the same ground
3. Diff each touched spec's `## Purpose` against the default branch; revert the change unless the feature's scope or vision changed. Purpose never lists scenarios or FRs
4. Re-run `npx catalyst check {feature-id}` until touched FRs are clean

### 3. Close out and present work

If `execution-mode` is `autonomous`: closure → review. All other modes: review → closure.

1. If `autonomous`: ▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-closure.md (pr-type: Feature)
2. ▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-review.md
3. If NOT `autonomous`: ▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-closure.md (pr-type: Feature)

Spec-change recovery (user requests spec changes during review): add a `### Review additions` subsection under the current `## Run N` (sibling of Features/Post-implementation, scoped to this run only), re-execute `feature-spec.md` → `feature-plan.md` → `feature-test.md` → `feature-code.md`, then re-invoke this composer from step 1.

### 4. Regenerate feature index

Run `npx catalyst index` to regenerate `.xe/features/README.md` – If command fails, log error and continue

### 5. Celebrate

Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-celebrate.md

## Exit Criteria

- [ ] Audit complete (workflow-audit.md exit criteria met)
- [ ] Spec gate passed before any pull request: `catalyst check` clean on touched FRs, no overlapping design decisions, Purpose unchanged unless scope or vision changed
- [ ] Review presented in every mode (with done-loop under non-`autonomous` modes); no bare ad-hoc "done" bypassed this composer
- [ ] Closeout complete (external issues routed, cleanup done, work persisted)
- [ ] Feature index regenerated (`catalyst index`)
- [ ] Celebration message output
