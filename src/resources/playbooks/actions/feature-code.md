# Write Code

Implement features to make tests pass, following spec for WHAT and plan for HOW, with validation and drift protection.

## Inputs

- `feature-id`: The feature being implemented
- `execution-mode`: `interactive`, `checkpoint-review`, `final-review`, or `autonomous`

## Instructions

1. Implement features to make tests pass
   - Focus only on code required for this task (YAGNI)
   - Keep changes small and scoped to single responsibility
2. Update existing implementation/tests if behavior changes
3. Run formatting, linting, and tests per `.xe/engineering.md`
4. Run `npx catalyst traceability {feature-id}` for each feature in scope – ALL tests must pass, traceability coverage must meet requirements
5. Mark completed tasks in plan with `[x]`
   - Keep rollout plan and todo list in sync: the rollout plan is the persistent record, the todo list is the conversation view
   - If a task is blocked or the approach changes, update plan Notes section
6. If implementation requires a significant change in approach, record the decision in `.xe/features/{feature-id}/design-decisions.md`
   - Typical triggers: hitting a constraint that forces a pivot, discovering a library limitation, choosing between implementation patterns
   - Append to existing file; do not overwrite prior decisions
7. **Never modify spec.md without user approval**
   - Requirements MAY be changed with user approval — execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to present proposed requirement changes
   - **Never rename or remove FR/NFR IDs** without updating all `@req` references in tests and implementation
   - If a requirement cannot be met: STOP and ask the user

## Error Handling

**Implementation Failures:**

- If implementation task fails: preserve completed work, document blocker in rollout plan
- Escalate to user if blocker cannot be resolved

**Spec Changes During Implementation:**

- Stop current implementation immediately if spec becomes invalid
- Document what was completed in rollout plan
- Never deviate from approved spec without user consent

**Context/Dependency Issues:**

- If required files missing (templates, architecture docs), halt and notify user
- If external dependencies unavailable, document blocker in rollout plan and suggest alternatives

## Exit Criteria

- [ ] All tests passing
- [ ] Traceability validated
- [ ] Rollout plan tasks complete and checked off
