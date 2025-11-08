# Implementation Plan: Engineering Context Templates

**Spec**: [Feature spec](./spec.md)

---

## Summary

Optimize two existing markdown template files (architecture.md, engineering.md) in `src/templates/specs/` following Catalyst template standard and product-context token optimization patterns. Templates provide essential architecture/engineering-owned context for AI-powered development: technology stack, repository structure, architecture patterns, core engineering principles, and technical standards. Token-optimized by removing verbose instructions, duplicate content, and unnecessary placeholders. Templates use `{placeholder}` format and `> [INSTRUCTIONS]` blocks for AI completion.

**Design rationale**: See [research.md](./research.md) for token ROI analysis and optimization strategy based on product-context precedent.

---

## Technical Context

This feature implementation plan extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: Two markdown template files (no code/runtime components)
- **Data Structures**: Markdown files with instruction blocks, placeholders, tables
- **Dependencies**: Template standard at `.xe/standards/catalyst.md` (prerequisite)
- **Configuration**: None - templates are static files
- **Performance Goals**: N/A - templates are passive files read during project initialization
- **Testing Framework**: Manual validation via template instantiation with sample values
- **Key Constraints**: Templates must minimize tokens (concise yet comprehensive), use standard markdown syntax, achieve 30-40% line reduction

---

## Project Structure

Template files optimized in source directory:

```
src/templates/specs/
├── architecture.md               # Technical architecture template (token-optimized)
└── engineering.md                # Engineering principles template (token-optimized)
```

---

## Data Model

No runtime entities. Templates produce markdown files consumed by AI agents.

---

## Contracts

### architecture.md Template

**Purpose:** Token-optimized template for documenting technical architecture decisions that AI needs for implementation

**Sections:**

1. Overview - Brief pointer to purpose (remove duplicate paragraphs)
2. Technology Stack - Essential technology decisions in table format (5-7 rows max)
3. Repository Structure - Directory tree showing code organization
4. Technical Architecture Patterns - Project-specific architectural decisions (optional, minimal)

**Placeholders:**
- `{project-name}`, `{runtime-env}`, `{data-storage}`, `{automation}`, `{ai-tools}`, `{testing}`, `{deployment}`, `{security}`, `{monitoring}`

### engineering.md Template

**Purpose:** Token-optimized template for documenting engineering principles that guide implementation quality

**Sections:**

1. Core Principles - List of actionable engineering principles (proven high-value)
2. Technical Standards - Pointer to `.xe/standards/` directory with consolidated standards
3. Development Process - Pointer to `.xe/process/development.md` (no duplication)

**Placeholders:**
- `{project-name}`

---

## Implementation Approach

### 1. Optimize architecture.md Template

Apply token ROI optimization following product-context patterns:

1. **Remove token bloat:**
   - Delete duplicate Overview paragraph that restates template purpose
   - Remove verbose instruction blocks (condense to 1-2 sentences max)

2. **Optimize Technology Stack:**
   - Keep table format (high ROI - shows key decisions at a glance)
   - Reduce from 8 rows to 5-7 essential aspects
   - Keep placeholders concise (`{runtime-env}` not `{runtime-environment-details}`)

3. **Simplify Repository Structure:**
   - Keep code block format (high ROI - visual understanding)
   - Condense instructions to single sentence
   - Remove verbose "balance" guidance

4. **Minimize Technical Architecture Patterns:**
   - Keep section but make it clearly optional
   - Provide one example pattern (External Dependencies abstraction)
   - Remove verbose instructions about what to include

5. **Target reduction:** 57 → ~35 lines (40% reduction)

### 2. Optimize engineering.md Template

Apply same optimization principles:

1. **Keep Core Principles list:**
   - Proven high-value content (guides AI decisions)
   - Already well-optimized (brief, actionable)
   - No changes needed

2. **Optimize Technical Standards:**
   - Remove detailed bullet lists (token bloat)
   - Replace with pointer to `.xe/standards/` directory
   - Keep section brief (2-3 sentences)

3. **Remove Development Process section:**
   - Duplicate of `.xe/process/development.md`
   - Zero marginal ROI (already referenced in architecture.md)

4. **Reduce instruction bloat:**
   - Remove instructions explaining which principles to remove
   - Remove verbose customization guidance
   - Keep minimal `> [INSTRUCTIONS]` blocks

5. **Target reduction:** 59 → ~40 lines (32% reduction)

### 3. Error Handling

**Standard non-compliance**: Templates must follow `.xe/standards/catalyst.md`
**Missing sections**: All required sections per spec must be present (FR-1.2, FR-2.2)
**Token bloat**: Templates must be concise - reject unnecessary verbosity

### 4. Testing Strategy

**Manual Validation:**

1. Verify all required sections present (FR-1.2, FR-2.2)
2. Verify instruction blocks use `> [INSTRUCTIONS]` prefix
3. Confirm token optimization (30-40% line reduction achieved)
4. Validate templates can generate valid architecture/engineering docs
