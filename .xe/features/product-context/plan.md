# Implementation Plan: Product Context Templates

**Spec**: [Feature spec](./spec.md)

---

## Summary

Create two token-optimized markdown template files (product.md, competitive-analysis.md) in `src/resources/templates/specs/` that follow the Catalyst template standard. Templates provide essential PM-owned product context for AI-powered development: product vision (overview, strategy, principles, non-goals, team) and competitive analysis (go/no-go assessment, competitive landscape, revolutionary differentiation). Token-optimized by removing personas, scenarios, success metrics, technical requirements, and GTM strategy (deferred/separate files). Templates use `{placeholder}` format and `> [INSTRUCTIONS]` blocks for AI completion.

**Design rationale**: See [research.md](./research.md) for token ROI analysis and aggressive optimization decisions.

---

## Technical Context

This feature implementation plan extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: Two markdown template files (no code/runtime components)
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
src/resources/templates/specs/
├── product.md                    # Product vision template (token-optimized)
└── competitive-analysis.md       # Competitive analysis template (revolutionary focus)
```

---

## Data Model

None

---

## Contracts

### product.md Template

**Purpose:** Template for documenting product vision and strategic direction that AI needs for implementation decisions

**Sections:**

1. Overview - Pointers to related context files (competitive-analysis.md, engineering.md, architecture.md)
2. System Overview - 2-3 sentence product description
3. Product Strategy - Phased implementation priorities (POC → Mainstream → Innovation → Platform → Enterprise → Scale)
4. Design Principles - 3-5 non-negotiable values guiding all decisions (with detailed quality criteria)
5. Non-Goals - Explicit scope boundaries
6. Team - Product, engineering, AI reviewer roles (Claude Code, GitHub Copilot)

### competitive-analysis.md Template

**Purpose:** Template for honest assessment of whether to build this project and identifying revolutionary differentiation

**Sections:**

1. Should We Build This? - Honest go/no-go assessment (problem severity, demand, team fit, risks, recommendation)
2. Competitive Landscape - Per-competitor analysis (strengths, weaknesses, customer sentiment)
3. Table-Stakes Features - Features needed to compete
4. Revolutionary Differentiation - Game-changing innovations (10x better)
5. Recommended Positioning - How to win (target segment, positioning, key message)

---

## Implementation Approach

### 1. Create product.md Template

Build product vision template following `.xe/standards/catalyst.md`:

1. Add H1 title: `# Product Vision for {project-name}`
2. Add concise instruction block explaining purpose
3. Create Overview section with pointers to competitive-analysis.md, engineering.md, architecture.md
4. Create System Overview section (2-3 sentence description)
5. Create Product Strategy section (phased priorities)
6. Create Design Principles section (3-5 values with quality criteria)
7. Create Non-Goals section (explicit scope boundaries)
8. Create Team section (product, engineering, AI reviewer roles)
9. Use minimal placeholders
10. Keep instructions ultra-concise

### 2. Create competitive-analysis.md Template

Build competitive analysis template following standard:

1. Add H1 title: `# Competitive Analysis for {project-name}`
2. Add instruction block emphasizing revolutionary products only (10x better, not copycats)
3. Create Should We Build This? section with go/no-go assessment subsections
4. Create Competitive Landscape section with per-competitor analysis structure
5. Create Table-Stakes Features section
6. Create Revolutionary Differentiation section (10x innovations)
7. Create Recommended Positioning section (target segment, positioning, key message)
8. Use minimal placeholders
9. Keep instructions focused on forcing honest, revolutionary thinking

### 3. Error Handling

**Standard non-compliance**: Templates must follow `.xe/standards/catalyst.md` per FR-1.1, FR-2.1
**Missing sections**: All required sections per spec must be present (FR-1.2-1.8, FR-2.2-2.7)
**Token bloat**: Templates must be concise per FR-1.8, FR-2.7

### 4. Validation

Validation confirms templates meet functional requirements:

1. Verify product.md meets FR-1.2-1.8 (sections, token efficiency)
2. Verify competitive-analysis.md meets FR-2.2-2.7 (sections, go/no-go assessment, token efficiency)
3. Confirm all templates use `> [INSTRUCTIONS]` prefix per standard
