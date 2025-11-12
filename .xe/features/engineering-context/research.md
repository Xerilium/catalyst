# Research: Engineering Context Templates

## Overview

This feature provides token-optimized templates for architecture/engineering-owned context files, mirroring the product-context feature approach for PM-owned context.

## Problem Analysis

Currently, `architecture.md` and `engineering.md` templates exist but are bloated with:
- Excessive instruction blocks consuming tokens
- Generic placeholder content that doesn't guide implementation
- Sections that could be condensed or removed

The product-context feature demonstrated aggressive token optimization (415 → 118 lines, 72% reduction). Engineering-context should apply the same principles.

## Current State Assessment

### Existing Templates

**`src/templates/specs/architecture.md`** (57 lines):
- System Overview with duplicate content
- Technology Stack table with 8 rows (comprehensive but verbose)
- Repository Structure with extensive instructions
- Technical Architecture Patterns section (mostly generic)

**`src/templates/specs/engineering.md`** (59 lines):
- Core Principles list (11 items, well-defined)
- Technical Standards (4 categories with bullets)
- Development Process pointer

### Token ROI Analysis

Following product-context token optimization methodology:

**High ROI (keep):**
- Core engineering principles list (actionable, guides decisions)
- Technology stack table (essential architecture decisions)
- Repository structure (helps AI understand codebase organization)

**Medium ROI (optimize):**
- Instruction blocks (condense to 1-2 sentences max)
- Technical Architecture Patterns (only if project-specific patterns exist)
- Technical Standards (consolidate or link to separate standards files)

**Low ROI (remove):**
- Duplicate "Overview" paragraphs that restate template purpose
- Verbose instructions explaining what each section should contain
- Pointers to other files already referenced in product.md

## Feature Scope

### In Scope

1. **Optimize architecture.md template**:
   - Remove duplicate Overview section
   - Condense Technology Stack to essential rows (5-7 max)
   - Simplify Repository Structure instructions
   - Make Technical Architecture Patterns optional/minimal

2. **Optimize engineering.md template**:
   - Keep Core Principles list (proven high value)
   - Condense Technical Standards to pointers
   - Remove Development Process section (duplicate of process/development.md)

### Out of Scope

- Standards files (`.xe/standards/`) - separate concern
- Process templates (separate feature)
- Playbook templates (separate feature)

## Competitive Analysis

No direct competitors - this is an internal optimization following product-context precedent.

**Precedent: product-context feature**
- Removed frontmatter (zero token ROI)
- Removed example placeholder lists
- Condensed instruction blocks
- Achieved 59-72% line reduction while maintaining clarity

## Recommended Approach

### Token Optimization Strategy

1. **Apply product-context optimization patterns:**
   - Remove all frontmatter
   - Condense instruction blocks to 1-2 sentences
   - Remove example placeholders
   - Keep only content that directly guides implementation decisions

2. **Target metrics:**
   - architecture.md: 57 → ~35 lines (40% reduction)
   - engineering.md: 59 → ~40 lines (32% reduction)
   - Total: 116 → ~75 lines (35% reduction)

3. **Validation:**
   - All required sections present
   - Instructions use `> [INSTRUCTIONS]` prefix
   - Token-optimized (no unnecessary content)
   - AI can generate valid architecture/engineering docs from templates

### Implementation Priority

1. Optimize architecture.md (higher complexity)
2. Optimize engineering.md (simpler, follows patterns)
3. Validate both templates produce usable output

## Dependencies

- Product-context feature (complete) - establishes token optimization patterns
- Catalyst template standard (`.xe/standards/catalyst.md`)

## Risks

**Low risk:** Templates are well-understood, optimization patterns proven in product-context feature.

**Mitigation:** Follow same validation approach as product-context (manual review, template instantiation test).

## Success Criteria

- Templates follow Catalyst template standard
- 30-40% token reduction while maintaining utility
- AI can generate architecture/engineering docs without additional guidance
- Templates align with existing `.xe/architecture.md` and `.xe/engineering.md` structure
