# Development Process for Catalyst

## Living Specification Principle

All specifications describe the desired end state, not a chronological log of changes.

- `spec.md` contains timeless requirements applicable to any future implementation
- When requirements change, update specs to reflect the new desired state (not a diff)
- Write as if building from scratch — use "Create", "Implement", not "Modify", "Update"

## Spec-First Development

Every change starts with a spec. Before writing code:

1. Ensure the relevant feature spec(s) in `.xe/features/{feature-id}/spec.md` are up to date
2. Get design approval via plan mode before implementation begins
3. Human review gates exist at spec finalization and PR review

## Test-Driven Development

Follow the full TDD cycle for every change:

1. **Write failing tests** — Cover all FRs, NFRs, and architecture constraints from the spec. Annotate each test with `@req FR:{feature-id}/{requirement-id}` for traceability.
2. **Verify tests fail** — Run the test suite to confirm new tests fail for the right reasons. If a test passes before implementation, it isn't testing new behavior.
3. **Implement the feature** — Write the minimum code to make tests pass.
4. **Verify tests pass** — Run the full test suite. Ideally, no test modifications are needed — if tests must change, justify why.
5. **Validate traceability** — Run traceability analysis to confirm all spec requirements have `@req` coverage.

## Branching

- `xe/{change-id}` for Catalyst-executed work
- `{username}/{change-id}` for manual work (e.g., `flanakin/expand-score-display`)

## Feature Documentation

Each feature in `.xe/features/{feature-id}/` contains:

- **`spec.md`** — Requirements: purpose, scenarios (FRs), architecture constraints, dependencies
- **`data-model.md`** (optional) — Entity definitions when complex data structures exist

Changes are tracked in `.xe/features/change-{change-id}.md` — ephemeral files deleted when complete.

## Quality Standards

### Code Quality

- Comprehensive documentation on public functions
- Parameter validation at system boundaries
- Consistent error handling patterns following project conventions
- Naming conventions per `.xe/standards/`

### Validation

- `npm run format` — Format all markdown and code files
- `npm run lint` — Zero critical issues
- `npm run test` — All tests passing
- Code coverage per `.xe/engineering.md` targets
- All standards in `.xe/standards/` applied

### Security and Performance

- Input validation and sanitization at system boundaries
- File system access and path validation
- Performance impact assessed for existing operations

## Testing Strategy

### Unit Testing

- Test individual functions in isolation
- Target code coverage per `.xe/engineering.md`
- Mock external dependencies
- Test edge cases and error conditions

### Integration Testing

- Test end-to-end processing pipeline validation
- Test file system operations with various directory structures
- Test error handling with malformed input scenarios

### Continuous Integration

- GitHub Actions for automated testing on changes
- Automated linting for code quality
- Automated formatting for consistency
