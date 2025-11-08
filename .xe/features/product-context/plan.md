---
id: product-context
title: Product Context Templates
author: "@flanakin"
description: "This document defines the implementation plan for the Product Context Templates feature for engineers."
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Implementation Plan: Product Context Templates

**Spec**: [Feature spec](./spec.md)

---

## Summary

Create two token-optimized markdown template files (product.md, competitive-analysis.md) in `src/templates/specs/` that follow the Catalyst template standard. Templates provide essential PM-owned product context for AI-powered development: product vision (overview, strategy, principles, non-goals, team) and competitive analysis (go/no-go assessment, competitive landscape, revolutionary differentiation). Token-optimized by removing personas, scenarios, success metrics, technical requirements, and GTM strategy (deferred/separate files). Templates use `{placeholder}` format and `> [INSTRUCTIONS]` blocks for AI completion.

**Design rationale**: See [research.md](./research.md) for token ROI analysis and aggressive optimization decisions.

---

## Technical Context

This feature implementation plan extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: Three markdown template files (no code/runtime components)
- **Data Structures**: Markdown files with frontmatter, placeholders, instruction blocks
- **Dependencies**: Template standard at `.xe/standards/catalyst.md` (prerequisite)
- **Configuration**: None - templates are static files
- **Performance Goals**: N/A - templates are passive files read during project initialization
- **Testing Framework**: Manual validation via template instantiation with sample values
- **Key Constraints**: Templates must minimize tokens (concise yet comprehensive), use standard markdown syntax

---

## Project Structure

Template files created in source directory:

```
src/templates/specs/
├── product.md                    # Product vision template (token-optimized)
└── competitive-analysis.md       # Competitive analysis template (revolutionary focus)
```

---

## Data Model

No runtime entities. Templates produce markdown files consumed by AI agents during project initialization.

**Template Structure** (all templates):
- Frontmatter: Project metadata (name, author, date)
- H1 title: Template name with project placeholder
- H2 sections: Major content areas
- H3 subsections: Detailed breakdowns (where needed)
- `{placeholder-name}` values: Project-specific values to replace
- `> [INSTRUCTIONS]` blocks: AI/human guidance for completion

---

## Contracts

### product.md Template

**Purpose:** Token-optimized template for documenting product vision and strategic direction that AI needs for implementation decisions

**Sections:**

1. System Overview - 2-3 sentence product description
2. Product Strategy - Phased implementation priorities (POC → Mainstream → Innovation → Platform → Enterprise → Scale)
3. Design Principles - 3-5 non-negotiable values guiding all decisions (with detailed quality criteria)
4. Non-Goals - Explicit scope boundaries
5. Team - Product, engineering, AI reviewer roles (Claude Code, GitHub Copilot)

**Token Optimization:**
- Removed: Personas (separate personas.md for UX features)
- Removed: Scenarios (separate scenarios.md for UX features)
- Removed: Technical Requirements (belongs in architecture.md)
- Removed: Success Metrics (separate metrics.md for measurement features)
- Removed: Frontmatter (unnecessary for AI)

**Placeholders:**
- `{product-manager}`, `{architect}`, `{engineer}`

### competitive-analysis.md Template

**Purpose:** Force honest assessment of whether to build this project and identify revolutionary differentiation (10x better, not copycat)

**Sections:**

1. Should We Build This? - Honest go/no-go assessment (problem severity, demand, team fit, risks)
2. Competitive Landscape - What exists (strengths, weaknesses, customer sentiment)
3. Required Differentiation - Table-stakes features to compete
4. Revolutionary Differentiation - Game-changing innovations that make us 10x better
5. Recommended Positioning - How to win (target segment, positioning, key message)

**Revolutionary Focus:**
- Forces brutal honesty about project viability
- Emphasizes world-changing products only (no also-ran copycats)
- Separates must-have features from game-changing innovations
- Includes customer sentiment (what users love/hate about competitors)

**AI Limitations Noted:**
- Cannot reliably determine market share or positioning (mark as requiring research)

**Placeholders:**
- `{competitor-name}`, `{who-we-serve-best}`, `{why-we-win}`

---

## Implementation Approach

### 1. Create product.md Template

Build token-optimized product vision template following `.xe/standards/catalyst.md`:

1. Add H1 title: `# Product Vision` (no placeholder - generic title)
2. Add concise instruction block explaining purpose (focus on what AI needs)
3. Create H2 sections with minimal instruction blocks:
   - System Overview (2-3 sentences)
   - Product Strategy (use standard phased priorities from original template)
   - Design Principles (preserve detailed quality criteria from original template)
   - Non-Goals (2-3 items)
   - Team (roles + AI reviewers list: Claude Code, GitHub Copilot)
4. Use placeholders only where needed (`{product-manager}`, `{architect}`, `{engineer}`)
5. Keep instructions ultra-concise - AI can infer from section titles
6. Remove all unnecessary content (frontmatter, personas, scenarios, technical requirements, success metrics)

### 2. Create competitive-analysis.md Template

Build revolutionary-focused template following standard:

1. Add H1 title: `# Competitive Analysis` (no placeholder - generic title)
2. Add instruction block emphasizing revolutionary products only (10x better, not copycats)
3. Create H2 sections with focused instruction blocks:
   - Should We Build This?: Honest go/no-go assessment (problem severity, demand, team fit, risks, recommendation)
   - Competitive Landscape: Per-competitor analysis (H3 per competitor: strengths, weaknesses, customer sentiment)
   - Required Differentiation: Table-stakes features needed to compete
   - Revolutionary Differentiation: Game-changing innovations (10x better)
   - Recommended Positioning: How to win (target segment, positioning, key message)
4. Note AI limitations (cannot determine market share - requires human research)
5. Use minimal placeholders (`{competitor-name}`, `{who-we-serve-best}`, `{why-we-win}`)
6. Keep instructions focused on forcing honest, revolutionary thinking

### 3. Error Handling

**Standard non-compliance**: Templates must follow `.xe/standards/catalyst.md`
**Missing sections**: All required sections per spec must be present (FR-1.2, FR-2.2)
**Token bloat**: Templates must be concise - reject unnecessary verbosity

### 4. Testing Strategy

**Manual Validation:**

1. Verify all required sections present (FR-1.2, FR-2.2, FR-2.3)
2. Verify instruction blocks use `> [INSTRUCTIONS]` prefix
3. Confirm token optimization (no unnecessary content)
4. Validate revolutionary focus in competitive-analysis.md

**Token Efficiency Check:**

1. product.md should be ~50-60 lines (vs 156 before)
2. competitive-analysis.md should be ~70 lines (vs 108 before)
3. No unnecessary verbosity or duplication

---

## Usage Examples

### Token ROI Analysis

**Before aggressive optimization** (original implementation):
- product.md: 156 lines (personas, scenarios, technical requirements, success metrics, frontmatter)
- competitive-analysis.md: 108 lines (market size numbers AI hallucinates)
- go-to-market.md: 151 lines (not consumed by any features yet)
- **Total**: 415 lines read on every feature implementation

**After aggressive optimization**:
- product.md: ~56 lines (vision, strategy, principles, non-goals, team only)
- competitive-analysis.md: ~69 lines (go/no-go, revolutionary focus)
- go-to-market.md: DELETED (deferred until features consume it)
- **Total**: ~125 lines
- **Token savings**: 70% reduction

**Deferred to separate files** (only read when needed):
- personas.md (only for UX features)
- scenarios.md (only for UX features)
- metrics.md (only for measurement features)
- Technical requirements → architecture.md (engineering artifact)
