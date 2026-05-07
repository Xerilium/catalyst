# Audit Workflow Completeness

Verify the rollout's source context is satisfied before closure proceeds. Identify gaps and route them — do not fix them in-place; fixes happen in the calling playbook.

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- `rollout-id`: In-progress rollout ID; rollout file at `.xe/rollouts/rollout-{rollout-id}.md`

## Instructions

1. Read the rollout's source context — the explore doc, linked issue, or original request that prompted the work
2. Verify all stated requirements are addressed in the implemented work; flag unchecked tasks in the rollout
3. Classify each gap:
   - **Critical** (blocks closure): route back to the previous phase rather than continuing; surface to the calling playbook
   - **Non-critical** (deferrable): itemize for the review action's Remaining list
4. **Boy Scout log**: for any pre-existing issue you intend to fix during closure (rather than defer to triage), append `- Boy Scout: {what} — {why}` to the rollout's `## Notes` BEFORE the fix runs. The fix itself is the calling playbook's responsibility, not this action's.

## Exit Criteria

- [ ] All stated requirements verified against implemented work
- [ ] Critical gaps routed back to the prior phase (closure halted)
- [ ] Non-critical gaps itemized for review's Remaining list
- [ ] Boy Scout entries appended to rollout Notes before any fix runs
