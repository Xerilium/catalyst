# Write Tests

Write failing tests first using Test-Driven Development (TDD) with `@req` annotations linking to functional requirements.

## Inputs

- `feature-id`: The feature being tested
- `execution-mode`: `interactive`, `checkpoint-review`, `autonomous-local`, or `autonomous-branch`

## Instructions

1. Read context:
   - `.xe/engineering.md` (principles, standards)
   - `.xe/architecture.md` (tech stack, patterns)
   - Scan `.xe/standards/` for applicable code standards
   - `.xe/features/{feature-id}/spec.md` (FRs, NFRs, constraints)
2. For each FR and NFR in approved specs:
   - Write test with `@req FR:{id}` annotation in doc comment of test function (NOT at class or file level)
   - Tests MUST fail initially (no implementation yet)
   - Use test framework's native skip/pending mechanism for requirements that cannot be automated with comment: `// @req FR:{id} — cannot be automated: [reason]`
3. Run tests to confirm they fail for the right reasons (missing implementation, not test errors)
4. Mark completed tasks in the rollout plan with `[x]`
5. **TDD Gate** — verify every in-scope FR has a test `@req` before exit:

   > - @req FR:feature-workflow/implement.tdd-gate

   - "In-scope FRs" = every FR being added or modified in this rollout (from the spec diff and rollout task breakdown)
   - For each in-scope FR, grep `tests/` for `@req FR:{id}` — an active test OR a documented skip both count
   - **P1-P3 FRs**: MUST have coverage. If any lack a test `@req`, STOP — surface the gap, write the missing test, then re-run the gate. Do NOT proceed to Phase 3 with P1-P3 gaps
   - **P4-P5 FRs**: MAY be silently waived when automation is genuinely infeasible (experimental behavior, UI aesthetics, external-service flakiness). Record the waiver and reason in the rollout plan Notes section so the waiver is reviewable — never silently skip without logging
   - If the gate passes, mark it complete in the rollout plan and proceed

## Exit Criteria

- [ ] All FRs have corresponding failing tests with `@req` annotations
- [ ] Tests fail for correct reasons (missing implementation)
- [ ] TDD gate passed: no in-scope P1-P3 FR lacks a test `@req`; any P4-P5 waivers logged in rollout Notes
- [ ] Plan doc updated with test completion status
