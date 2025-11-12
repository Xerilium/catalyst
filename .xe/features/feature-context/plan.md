---
id: feature-context
title: Feature Context Templates
author: "@flanakin"
description: "This document defines the implementation plan for the Feature Context Templates feature for engineers."
dependencies: ["product-context", "engineering-context"]
---

<!-- markdownlint-disable single-title -->

# Implementation Plan: Feature Context Templates

**Spec**: [Feature spec](./spec.md)

---

## Summary

Create five token-efficient markdown template files (spec.md, plan.md, tasks.md, research.md, rollout.md) in `src/templates/specs/` that follow the Catalyst template standard. These templates guide feature implementation by ensuring complete requirements capture, thorough technical planning, structured task execution, documented decision-making, and progress tracking. Templates use `{placeholder}` format and `> [INSTRUCTIONS]` blocks to guide AI and human users toward enterprise-scale quality (security, performance, testability, error handling).

**Design rationale**: See [research.md](./research.md) for analysis of existing templates and validation approach.

---

## Technical Context

This feature implementation plan extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: Five markdown template files (no code/runtime components)
- **Data Structures**: Markdown files with instruction blocks, placeholders, hierarchical sections
- **Dependencies**: Template standard at `.xe/standards/catalyst.md` (prerequisite)
- **Configuration**: None - templates are static files
- **Performance Goals**: N/A - templates are passive files read during feature implementation
- **Testing Framework**: Jest for template validation (following pattern from engineering-context feature)
- **Key Constraints**: Templates must be token-optimized (concise yet comprehensive), use standard markdown syntax, follow Catalyst template standard

---

## Project Structure

Template files created:

```text
src/templates/specs/
├── spec.md          # Feature specification template (FR-1)
├── plan.md          # Implementation plan template (FR-2)
├── tasks.md         # Task breakdown template (FR-3)
├── research.md      # Research document template (FR-4)
└── rollout.md       # Rollout orchestration template (FR-5)
```

Validation tests created:

```text
tests/templates/
├── validate-spec.test.ts       # Jest tests for spec.md template
├── validate-plan.test.ts       # Jest tests for plan.md template
├── validate-tasks.test.ts      # Jest tests for tasks.md template
├── validate-research.test.ts   # Jest tests for research.md template
└── validate-rollout.test.ts    # Jest tests for rollout.md template
```

---

## Data Model

None - templates are static markdown files.

---

## Contracts

### spec.md Template

**Purpose:** Template for documenting feature requirements (WHAT and WHY, not HOW)

**Required Sections per FR-1:**

1. Frontmatter (id, title, author, description, dependencies)
2. Problem (FR-1.2)
3. Goals with explicit non-goals (FR-1.3)
4. Scenario with user stories and outcomes (FR-1.4)
5. Success Criteria (FR-1.5)
6. Design Principles (FR-1.6)
7. Requirements with Functional Requirements subsection (FR-1.7) and Non-functional Requirements subsection (FR-1.8)
8. Key Entities (FR-1.9)
9. Dependencies (FR-1.10)
10. System Architecture (FR-1.11)

**Token optimization:** Concise instructions, clear placeholders (FR-1.12)

### plan.md Template

**Purpose:** Template for documenting implementation approach (HOW to build from scratch)

**Required Sections per FR-2:**

1. Frontmatter (id, title, author, description, dependencies)
2. Summary with design rationale reference (FR-2.2)
3. Technical Context extending architecture.md (FR-2.3)
4. Project Structure showing files/directories (FR-2.4)
5. Data Model for entities (FR-2.5)
6. Contracts for APIs/interfaces (FR-2.6)
7. Implementation Approach with numbered H3 subsections (FR-2.7)
8. Usage Examples with 2-3 practical examples (FR-2.8)

**Token optimization:** Concise instructions, code examples where helpful (FR-2.9)

### tasks.md Template

**Purpose:** Template for documenting implementation checklist (step-by-step execution)

**Required Sections per FR-3:**

1. Frontmatter (id, title, author, description)
2. Input/Prerequisites section (FR-3.2)
3. Step 1: Setup (FR-3.3)
4. Step 2: Tests First (TDD) (FR-3.4)
5. Step 3: Core Implementation (FR-3.5)
6. Step 4: Integration (FR-3.6)
7. Step 5: Polish (FR-3.7)
8. Dependencies section (FR-3.8)

**Token optimization:** Concise checklist format (FR-3.9)

### research.md Template

**Purpose:** Template for documenting analysis and design decisions

**Required Sections per FR-4:**

1. Header with date, author, feature ID
2. Overview section (FR-4.2)
3. Key Findings section (FR-4.3)
4. Design Decisions with alternatives, rationale, rejected options (FR-4.4)
5. Recommendations section (FR-4.5)
6. References section (FR-4.6)

**Token optimization:** Concise analysis format (FR-4.7)

### rollout.md Template

**Purpose:** Template for tracking feature rollout progress and orchestration

**Required Sections per FR-5:**

1. Frontmatter (id, title, features list)
2. Feature Context with references (FR-5.2)
3. Rollout Status tracking (FR-5.3)
4. Pre-Implementation Actions (FR-5.4)
5. Feature Implementation referencing tasks.md (FR-5.5)
6. Post-Implementation Actions (FR-5.6)
7. Blockers section (FR-5.7)

**Token optimization:** Concise orchestration format (FR-5.8)

---

## Implementation Approach

### 1. Validate Existing Templates

Templates already exist in `src/templates/specs/`. Verify each template against requirements:

1. Read each template file (spec.md, plan.md, tasks.md, research.md, rollout.md)
2. Check compliance with FR-1 through FR-5 requirements
3. Identify any missing sections or non-compliant structure
4. Update templates as needed to meet all functional requirements

### 2. Create Validation Tests

Following the pattern from engineering-context feature (validate-architecture.test.ts, validate-engineering.test.ts, validate-development.test.ts), create Jest tests for each template:

**validate-spec.test.ts (FR-1 validation):**
- Verify template follows Catalyst standard (FR-1.1): placeholders, instructions, headings
- Check all required sections exist: Problem, Goals, Scenario, Success Criteria, Design Principles, Requirements, Key Entities, Dependencies, System Architecture
- Validate Functional Requirements subsection structure (FR-1.7)
- Validate Non-functional Requirements subsection with 10 standard categories (FR-1.8)
- Check token optimization (reasonable line count, concise instructions)

**validate-plan.test.ts (FR-2 validation):**
- Verify template follows Catalyst standard (FR-2.1)
- Check all required sections exist: Summary, Technical Context, Project Structure, Data Model, Contracts, Implementation Approach, Usage Examples
- Validate Implementation Approach has numbered H3 subsections (FR-2.7.1) including Data Structures, Core Algorithms, Integration Points, Error Handling, Validation, Performance Considerations, Testing Strategy
- Check token optimization

**validate-tasks.test.ts (FR-3 validation):**
- Verify template follows Catalyst standard (FR-3.1)
- Check required sections: Input/Prerequisites, Step 1-5, Dependencies
- Validate checklist format with markdown checkboxes
- Check token optimization

**validate-research.test.ts (FR-4 validation):**
- Verify template follows Catalyst standard (FR-4.1)
- Check required sections: Overview, Key Findings, Design Decisions, Recommendations, References
- Validate Design Decisions includes alternatives and rationale
- Check token optimization

**validate-rollout.test.ts (FR-5 validation):**
- Verify template follows Catalyst standard (FR-5.1)
- Check required sections: Feature Context, Rollout Status, Pre-Implementation Actions, Feature Implementation, Post-Implementation Actions, Blockers
- Check token optimization

### 3. Update Templates Based on Requirements

For any templates not meeting requirements, update them:

**spec.md updates (if needed):**
- Ensure FR-1.7 (Functional Requirements) and FR-1.8 (Non-functional Requirements) are separate subsections
- Ensure NFR subsection lists 10 standard categories per FR-1.8.2
- Add guidance for hierarchical FR numbering per FR-1.7.2
- Add guidance for organizing FRs by feature area per FR-1.7.3
- Ensure circular dependency warning exists (CRITICAL instruction)

**plan.md updates (if needed):**
- Ensure Implementation Approach section includes all 8 subsections per FR-2.7.1-2.7.8
- Add numbered H3 format guidance per FR-2.7.1
- Ensure code example guidance per FR-2.7.9

**tasks.md, research.md, rollout.md updates (if needed):**
- Verify compliance with respective FR-3, FR-4, FR-5 requirements
- Update structure or instructions as needed

### 4. Error Handling

**Template non-compliance**: Update templates to meet all FR requirements before marking feature complete
**Missing sections**: Add required sections per spec
**Test failures**: Fix templates until all Jest tests pass
**Token bloat**: Reduce verbosity while maintaining completeness

### 5. Validation

Validation confirms templates meet all functional requirements:

1. Run Jest tests: `npm test -- tests/templates/validate-spec.test.ts tests/templates/validate-plan.test.ts tests/templates/validate-tasks.test.ts tests/templates/validate-research.test.ts tests/templates/validate-rollout.test.ts`
2. All tests must pass (FR-1 through FR-5 requirements validated)
3. Manual review: Ensure templates guide toward enterprise-scale quality
4. Verify templates follow `.xe/standards/catalyst.md`

---

## Usage Examples

### Example 1: Using spec.md Template for New Feature

Engineer creates new feature spec by copying template:

```bash
# Copy template
cp src/templates/specs/spec.md .xe/features/user-authentication/spec.md

# Fill in placeholders
# - Replace {feature-name} with "User Authentication"
# - Replace [feature-id] with "user-authentication"
# - Fill in Problem, Goals, Scenarios
# - Define Functional Requirements (FR-1, FR-2, ...)
# - Define Non-functional Requirements (NFR-1: Cost, NFR-2: Reliability, ...)
# - Remove unused NFR categories
# - Remove instruction blocks

# Result: Complete feature spec ensuring no requirements missed
```

### Example 2: AI Agent Using Templates

AI agent reads templates during feature implementation:

```text
1. AI reads spec.md template structure
2. AI generates feature spec following template sections
3. AI ensures all NFR categories considered (security, performance, testability)
4. AI reads plan.md template structure
5. AI generates implementation plan with all technical considerations
6. AI ensures error handling, validation, testing addressed
7. AI reads tasks.md template structure
8. AI generates task breakdown with TDD approach
9. Result: Enterprise-quality feature implementation
```

Templates ensure AI doesn't skip critical considerations like error handling, validation, performance, security, testability.
