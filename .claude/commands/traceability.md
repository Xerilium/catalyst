---
name: "traceability"
description: Run requirements traceability coverage gap analysis
allowed-tools: Read, Glob, Grep, Bash, TodoWrite
argument-hint: [feature-id]
Usage: /catalyst:traceability [feature-id]
Examples: /catalyst:traceability
  /catalyst:traceability req-traceability
  /catalyst:traceability ai-provider-claude
---

# Requirements Traceability Coverage Gap Analysis

Analyze requirement coverage gaps and produce actionable insights for improving traceability across planning, implementation, and testing phases.

## Usage

```bash
/catalyst:traceability
/catalyst:traceability [feature-id]
```

## Parameters

- `feature-id` (optional): Filter analysis to a single feature (e.g., "req-traceability", "ai-provider-claude")

## Process

### Step 1: Run Traceability Analysis

Execute the traceability scan using the project's dev script:

```bash
# For all features
npx tsx scripts/run-traceability.ts

# For single feature
npx tsx scripts/run-traceability.ts --feature {feature-id}
```

Capture the full report output for analysis.

### Step 2: Generate Coverage Summary

Present an overview of current coverage state:

```
## Coverage Summary

| Metric | Value | Notes |
|--------|------:|-----------:|--------:|
| Total Requirements | X | X active |
| Planned (in tasks) | X% | X unplanned |
| Implemented (code) | X% | X unimplemented |
| Tested | X% | X untested |
| Covered (any) | X% | X uncovered |
| Uncovered (gaps) | X% | - |
| Deferred | X | - | X |
| Deprecated | X | - | X |

Severity Breakdown:
- S1 (Critical): X requirements, X% covered
- S2 (High): X requirements, X% covered
- S3 (Medium): X requirements, X% covered
- S4 (Low): X requirements, X% covered
- S5 (Nice-to-have): X requirements, X% covered
```

### Step 3: Analyze Unplanned Requirements

Identify requirements without task references in tasks.md files.

For each unplanned requirement:
1. Read the spec.md file to understand the requirement
2. Check if it's a new requirement that hasn't been planned yet
3. Check if it's intentionally excluded from planning (e.g., documentation-only)

**Output format:**

```
## Unplanned Requirements Analysis

### Summary
- Total unplanned: X requirements (X% of active)
- Expected unplanned: X (X%)
- Unexpected unplanned: X

### Grouped by Reason

**Documentation/Process Requirements** (expected to be unplanned)
- List requirements that are process-oriented, not code-oriented

**Recently Added Requirements** (need planning)
- List requirements added after initial planning

**Infrastructure/Cross-cutting Requirements** (may be implicit)
- List requirements that are satisfied by architecture decisions

**Unexpected Gaps** (need attention)
- List requirements that should have tasks but don't

### Recommendations
- Specific suggestions for improving task coverage
```

### Step 4: Analyze Unimplemented Requirements (Planned but No Code)

Identify requirements that have tasks but no `@req` annotations in source code.

For each unimplemented requirement:
1. Read the tasks.md to see what work was planned
2. Search for related code that might be missing annotations
3. Determine if the task is incomplete or just missing annotations

**Output format:**

```
## Unimplemented Requirements Analysis

### Summary
- Total planned but not implemented: X requirements
- Expected (work in progress): X
- Unexpected (missing annotations or incomplete): X

### Grouped by Reason

**Work In Progress** (tasks exist, implementation ongoing)
- List requirements with incomplete tasks

**Missing Annotations** (code exists, annotations missing)
- List requirements where code likely exists but @req is missing
- Include suspected file locations

**Blocked/Deferred Implementation** (intentionally delayed)
- List requirements waiting on dependencies

**Unexpected Gaps** (need attention)
- List requirements that should be implemented

### Recommendations
- Add @req annotations to existing code: [file:line suggestions]
- Complete incomplete tasks: [task references]
- Update spec to defer blocked requirements
```

### Step 5: Analyze Untested Requirements (Planned but No Tests)

Identify requirements that have tasks but no `@req` annotations in test files.

For each untested requirement:
1. Check if tests exist but are missing annotations
2. Check if requirement is testable (some may be documentation-only)
3. Check if requirement is covered by integration tests implicitly

**Output format:**

```
## Untested Requirements Analysis

### Summary
- Total planned but not tested: X requirements
- Expected (not testable): X
- Unexpected (missing test annotations or no tests): X

### Grouped by Reason

**Not Directly Testable** (documentation, process requirements)
- List requirements that don't require explicit tests

**Missing Test Annotations** (tests exist, annotations missing)
- List requirements where tests likely exist but @req is missing
- Include suspected test file locations

**Covered by Integration Tests** (implicitly tested)
- List requirements covered by higher-level tests

**Unexpected Gaps** (need attention)
- List requirements that should have explicit tests

### Recommendations
- Add @req annotations to existing tests: [file:line suggestions]
- Create new tests for: [requirement list]
- Mark non-testable requirements appropriately in spec
```

### Step 6: Analyze Tasks Without Requirements

Tasks in tasks.md files that don't reference any `@req` annotation. Categorize each as:

1. **Invalid - Setup Tasks** (remove): One-time setup like "Create directory", "Install dependency"
2. **Invalid - Verification Tasks** (remove): Implicit in Phase 5 like "Verify tests pass", "Run build"
3. **Invalid - Fixture Tasks** (merge): Should be sub-bullets of test tasks, not standalone
4. **Valid - Missing @req** (fix): Legitimate tasks that need `@req` annotations added
5. **Cross-cutting** (ignore): Documentation/testing that would map to engineering NFRs

**Auto-fix before final analysis:**

For invalid tasks, remove them from tasks.md files:
- Setup tasks violate Living Specification Principle (describe final state, not setup steps)
- Verification tasks are implicit in Phase 5 Validation of development process
- Fixture creation belongs as sub-bullets under test tasks

**Output format:**

```
## Tasks Without Requirements Analysis

### Summary
- Total tasks without @req: X
- Invalid (should remove): X
- Valid (need @req added): X
- Cross-cutting (leave as-is): X

### Invalid Tasks to Remove
**Setup Tasks** (violate Living Specification Principle):
- {feature}:{task-id} - {description}

**Verification Tasks** (implicit in Phase 5):
- {feature}:{task-id} - {description}

### Valid Tasks Needing @req
- {feature}:{task-id} → should map to FR:{requirement}
- Include the specific requirement ID when identifiable

### Cross-cutting Tasks (No Action)
- {feature}:{task-id} - documentation/testing task
```

### Step 7: Analyze Other Coverage Gaps

Identify orphaned annotations and status review needs.

**Output format:**

```
## Other Coverage Gaps

### Orphaned Annotations
Annotations referencing non-existent requirements:
- {annotation-id} at {file:line}
- Recommendation: Update or remove

### Deprecated/Deferred Status Review
Requirements that may need status updates:
- {requirement-id}: Consider deprecating (no recent activity)
- {requirement-id}: Consider activating (dependencies met)
```

### Step 8: Improvement Recommendations Summary

Synthesize findings into actionable improvements for the req-traceability feature itself:

```
## Workflow Improvement Recommendations

### Spec Changes
- Add missing severity markers to requirements
- Clarify requirements that are documentation-only
- Consider splitting large requirements

### Process Changes
- Add @req annotation checklist to PR template
- Include traceability check in CI pipeline
- Create annotation guidelines for common patterns

### Tooling Changes
- Enhance parser to detect [pattern]
- Add warning for [condition]
- Improve report format for [use case]

### Coverage Targets
Based on current state and gaps identified:
- Current overall coverage: X%
- Recommended target: Y%
- Critical (S1-S2) coverage target: Z%
```

### Step 9: Offer Implementation Plan

At the end of the analysis, present:

```
## Next Steps

Based on this analysis, I can help you:

1. **Quick wins** - Add @req annotations to existing code/tests (estimated: X files)
2. **Documentation updates** - Update spec.md to clarify non-testable requirements
3. **Task updates** - Add missing @req references to tasks.md
4. **Feature improvements** - Update req-traceability feature to address workflow gaps

Would you like me to create a todolist plan to:
- [ ] Address the unexpected gaps identified above
- [ ] Update the req-traceability spec with recommended changes
- [ ] Implement tooling improvements
- [ ] Add missing annotations across the codebase

Reply with which areas you'd like to focus on, or "all" to create a comprehensive plan.
```

## Error Handling

- **Script not found** - Check that `scripts/run-traceability.ts` exists
- **Feature not found** - Validate feature-id exists in `.xe/features/`
- **Parse errors** - Report specific parsing issues and suggest fixes
- **No requirements found** - Check if spec.md files exist and are properly formatted

## Success Criteria

This command is successful when:

- [ ] Traceability scan completed without errors
- [ ] Coverage summary presented with accurate metrics
- [ ] Each gap category analyzed with grouped reasons
- [ ] Unexpected gaps clearly identified and prioritized
- [ ] Actionable recommendations provided
- [ ] User offered concrete next steps

## Examples

```bash
# Full project analysis
/catalyst:traceability

# Single feature deep-dive
/catalyst:traceability req-traceability

# Check a specific provider implementation
/catalyst:traceability ai-provider-claude
```
