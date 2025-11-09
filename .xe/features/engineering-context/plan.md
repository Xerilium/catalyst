# Implementation Plan: Engineering Context Templates

**Spec**: [Feature spec](./spec.md)

---

## Summary

Create three token-efficient markdown template files (architecture.md, engineering.md, development.md) in `src/templates/specs/` that follow the Catalyst template standard. Templates provide essential architecture/engineering-owned context for AI-powered development: technical stack, repository structure, architecture patterns, core engineering principles, technical standards, and development process. Templates use `{placeholder}` format and `> [INSTRUCTIONS]` blocks for AI completion.

**Design rationale**: See [research.md](./research.md) for token ROI analysis.

---

## Technical Context

This feature implementation plan extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: Three markdown template files (no code/runtime components)
- **Data Structures**: Markdown files with instruction blocks, placeholders, tables
- **Dependencies**: Template standard at `.xe/standards/catalyst.md` (prerequisite)
- **Configuration**: None - templates are static files
- **Performance Goals**: N/A - templates are passive files read during project initialization
- **Testing Framework**: Manual validation via template instantiation
- **Key Constraints**: Templates must minimize tokens (concise yet comprehensive), use standard markdown syntax

---

## Project Structure

Template files created in source directory:

```
src/templates/specs/
├── architecture.md               # Technical architecture template
├── engineering.md                # Engineering principles template
└── development.md                # Development process template
```

---

## Data Model

No runtime entities. Templates produce markdown files consumed by AI agents.

---

## Contracts

### architecture.md Template

**Purpose:** Template for documenting technical architecture decisions that AI needs for implementation

**Sections:**

1. Overview - Pointers to related context files (engineering.md, process/development.md)
2. Technology Stack - Essential technology decisions in table format (runtime, storage, automation, AI, testing, deployment, security, monitoring)
3. Repository Structure - Directory tree showing code organization
4. Technical Architecture Patterns - Project-specific architectural decisions

**Placeholders:**
- `{project-name}`, `{runtime-env}`, `{data-storage}`, `{automation}`, `{ai-tools}`, `{testing}`, `{deployment}`, `{security}`, `{monitoring}`

### engineering.md Template

**Purpose:** Template for documenting engineering principles that guide implementation quality

**Sections:**

1. Core Principles - List of actionable engineering principles (KISS, YAGNI, Separation of Concerns, Single Responsibility, Open/Closed, Dependency Inversion, Principle of Least Astonishment, DRY, Fail Fast, Design for Testability, Deterministic Processing)
2. Technical Standards - Pointer to `.xe/standards/` directory
3. Development Process - Pointer to `.xe/process/development.md`

**Placeholders:**
- `{project-name}`

### development.md Template

**Purpose:** Template for documenting development workflow phases and checkpoints

**Sections:**

1. Overview - Purpose of development process documentation
2. Workflow Phases - Sequential phases for feature development
3. Human Checkpoints - Required approval points
4. Quality Gates - Standards that must be met at each phase

**Placeholders:**
- `{project-name}`

---

## Implementation Approach

### 1. Create architecture.md Template

Build technical architecture template following `.xe/standards/catalyst.md`:

1. Add H1 title: `# System Architecture for {project-name}`
2. Add concise instruction block explaining purpose
3. Create Overview section with pointers to engineering.md and process/development.md
4. Create Technology Stack section with table (runtime, storage, automation, AI, testing, deployment, security, monitoring)
5. Create Repository Structure section with code block showing directory organization
6. Create Technical Architecture Patterns section with example pattern (External Dependencies abstraction)
7. Use minimal placeholders
8. Keep instructions ultra-concise

### 2. Create engineering.md Template

Build engineering principles template following standard:

1. Add H1 title: `# Engineering Principles for {project-name}`
2. Add instruction block emphasizing timeless, actionable guidelines and token efficiency
3. Create Core Principles section with 11 standard principles
4. Create Technical Standards section with pointer to `.xe/standards/`
5. Create Development Process section with pointer to `.xe/process/development.md`
6. Keep instructions focused on guiding principle selection

### 3. Create development.md Template

Build development process template following standard:

1. Add H1 title: `# Development Process for {project-name}`
2. Add instruction block explaining workflow documentation
3. Create Overview section with process purpose
4. Create Workflow Phases section for sequential development phases
5. Create Human Checkpoints section for approval gates
6. Create Quality Gates section for phase-exit criteria
7. Use minimal placeholders

### 4. Error Handling

**Standard non-compliance**: Templates must follow `.xe/standards/catalyst.md`
**Missing sections**: All required sections per spec must be present (FR-1.2-1.5, FR-2.2-2.3)
**Token bloat**: Templates must be concise - reject unnecessary verbosity

### 5. Testing Strategy

**Manual Validation:**

1. Verify all required sections present per FRs
2. Verify instruction blocks use `> [INSTRUCTIONS]` prefix
3. Confirm token optimization (no unnecessary content)
4. Validate templates can generate valid architecture/engineering/process docs
