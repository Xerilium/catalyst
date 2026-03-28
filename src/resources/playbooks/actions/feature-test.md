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
4. Mark completed tasks in the plan doc with `[x]`

## Exit Criteria

- [ ] All FRs have corresponding failing tests with `@req` annotations
- [ ] Tests fail for correct reasons (missing implementation)
- [ ] Plan doc updated with test completion status
