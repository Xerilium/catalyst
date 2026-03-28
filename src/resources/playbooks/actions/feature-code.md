# Write Code

Implement features to make tests pass, following spec for WHAT and plan for HOW, with validation and drift protection.

## Inputs

- `feature-id`: The feature being implemented
- `execution-mode`: `interactive`, `checkpoint-review`, `autonomous-local`, or `autonomous-branch`

## Instructions

1. Implement features to make tests pass
   - Focus only on code required for this task (YAGNI)
   - Keep changes small and scoped to single responsibility
2. Update existing implementation/tests if behavior changes
3. Run formatting, linting, and tests per `.xe/engineering.md`
4. Run `npx catalyst traceability {feature-id}` for each feature in scope – ALL tests must pass, traceability coverage must meet requirements
5. Mark completed tasks in plan with `[x]`
   - Keep plan doc and todo list in sync: the plan doc is the persistent record, the todo list is the session view
   - If a task is blocked or the approach changes, update plan Notes section
6. **Never modify spec.md without user approval**
   - Requirements MAY be changed with user approval — present proposed changes via AskUserQuestion
   - **Never rename or remove FR/NFR IDs** without updating all `@req` references in tests and implementation
   - If a requirement cannot be met: STOP and ask the user

## Error Handling

**Implementation Failures:**

- If implementation task fails: preserve completed work, document blocker in feature plan
- Escalate to user if blocker cannot be resolved

**Spec Changes During Implementation:**

- Stop current implementation immediately if spec becomes invalid
- Document what was completed in feature plan
- Never deviate from approved spec without user consent

**Context/Dependency Issues:**

- If required files missing (templates, architecture docs), halt and notify user
- If external dependencies unavailable, document blocker in feature plan and suggest alternatives

## Exit Criteria

- [ ] All tests passing
- [ ] Traceability validated
- [ ] Plan doc tasks complete and checked off
