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

Create three markdown template files (product.md, competitive-analysis.md, go-to-market.md) in `src/templates/specs/` directory that follow the Catalyst template standard. Templates provide structured documentation for PM-owned product context including vision, strategy, personas, scenarios, competitive analysis, and go-to-market planning. Templates use `{placeholder}` format for project-specific values and `> [INSTRUCTIONS]` blocks to guide AI/human completion during project initialization.

**Design rationale**: See [research.md](./research.md) for market research findings and template structure decisions.

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
├── product.md                    # Product context template
├── competitive-analysis.md       # Competitive analysis template
└── go-to-market.md              # GTM strategy template
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

**Purpose:** Template for documenting product vision, strategy, personas, scenarios, principles, requirements, metrics, and team structure

**Sections:**

1. System Overview - 2-3 sentence product description
2. Product Strategy - Phased implementation priorities
3. Target Personas - User archetypes with goals and needs
4. High-Level Scenarios - Key user workflows and outcomes
5. Design Principles - 3-5 product-wide values guiding decisions
6. Technical Requirements - Platform, integration, performance needs
7. Success Metrics - Measurable outcomes (adoption, performance, quality)
8. Non-Goals - Explicit scope boundaries
9. Team - Product, engineering, AI reviewer roles

**Placeholders:**
- `{project-name}`, `{product-manager}`, `{architect}`, `{engineer}`, `{ai-reviewer}`

### competitive-analysis.md Template

**Purpose:** Template for documenting market analysis, competitor features, positioning, and competitive advantages

**Sections:**

1. Market Overview - Target market, size, trends
2. Competitor Analysis - List of competitors with features, strengths, weaknesses
3. Competitive Advantages - Product differentiation
4. Market Gaps - Unmet needs and opportunities
5. Positioning Strategy - How product is positioned vs competitors

**Placeholders:**
- `{project-name}`, `{target-market}`, `{competitor-name}`

### go-to-market.md Template

**Purpose:** Template for documenting GTM strategy, target markets, positioning, channels, pricing, and launch timing

**Sections:**

1. GTM Strategy Overview - High-level approach and objectives
2. Target Market & Personas - Buyer personas and market segments
3. Value Proposition & Positioning - Core value and competitive positioning
4. Marketing & Sales Channels - Distribution and promotion channels
5. Pricing Strategy - Pricing model and rationale
6. Success Metrics - GTM-specific metrics (CAC, conversion, retention)
7. Launch Timing - Phased rollout plan

**Placeholders:**
- `{project-name}`, `{target-market}`, `{value-proposition}`, `{pricing-model}`

---

## Implementation Approach

### 1. Create product.md Template

Build product context template following `.xe/standards/catalyst.md`:

1. Create frontmatter with placeholders
2. Add H1 title: `# {project-name} Product Context`
3. Add instruction block at top explaining purpose
4. Create H2 sections with instruction blocks:
   - System Overview
   - Product Strategy
   - Target Personas
   - High-Level Scenarios
   - Design Principles
   - Technical Requirements
   - Success Metrics
   - Non-Goals
   - Team
5. Use placeholders for project-specific values
6. Add examples in instruction blocks where helpful
7. Keep concise (minimize token usage)

### 2. Create competitive-analysis.md Template

Build new template from scratch following standard:

1. Create frontmatter with placeholders
2. Add H1 title: `# {project-name} Competitive Analysis`
3. Add instruction block at top explaining purpose
4. Create H2 sections with instruction blocks:
   - Market Overview: Target market, size, trends (H3: Market Size, Key Trends)
   - Competitor Analysis: Table or list of competitors (H3 per competitor or H3: Direct Competitors, Indirect Competitors)
   - Competitive Advantages: What differentiates this product
   - Market Gaps: Unmet needs and opportunities
   - Positioning Strategy: How product is positioned vs competitors
5. Use placeholders for project-specific values
6. Add examples in instruction blocks where helpful
7. Keep concise (minimize token usage)

### 3. Create go-to-market.md Template

Build new template from scratch following standard:

1. Create frontmatter with placeholders
2. Add H1 title: `# {project-name} Go-to-Market Strategy`
3. Add instruction block at top explaining purpose and progressive approach
4. Create H2 sections with instruction blocks:
   - GTM Strategy Overview: High-level approach
   - Target Market & Personas: Buyer personas, market segments (H3 per persona)
   - Value Proposition & Positioning: Core value, competitive positioning
   - Marketing & Sales Channels: Distribution channels (H3: Marketing Channels, Sales Channels)
   - Pricing Strategy: Pricing model and rationale
   - Success Metrics: GTM-specific KPIs (CAC, conversion, retention)
   - Launch Timing: Phased rollout plan (H3 per phase or H3: POC, Beta, GA)
5. Use placeholders for project-specific values
6. Add examples in instruction blocks where helpful
7. Keep concise (minimize token usage)

### 4. Error Handling

**Standard non-compliance**: Templates must follow `.xe/standards/catalyst.md`
**Missing sections**: All required sections per spec must be present
**Placeholder format errors**: Use `{kebab-case}` format consistently

### 5. Testing Strategy

**Manual Validation:**

1. Read each template file
2. Verify all required sections present
3. Check placeholder format (`{kebab-case}`)
4. Verify instruction blocks use `> [INSTRUCTIONS]` prefix
5. Ensure markdown syntax is standard
6. Confirm heading hierarchy (H1 title, H2 sections, H3 subsections)

**Instantiation Testing:**

1. Create test instantiation by replacing placeholders with sample values
2. Remove instruction blocks
3. Verify resulting document is complete and usable
4. Validate template provides sufficient guidance for completion

**Token Efficiency:**

1. Count lines/tokens in each template
2. Verify templates are concise yet comprehensive
3. Ensure no unnecessary duplication or verbosity

---

## Usage Examples

### Template Placeholder Replacement

Example showing placeholder usage:

```markdown
# {project-name} Product Context

> [INSTRUCTIONS]
> 2-3 sentence overview of {project-name}: core value proposition and user benefits.

## Team

**Roles:**

- **Product Manager**: {product-manager}
- **Architect**: {architect}
- **Engineer**: {engineer}
```

When instantiated with values:
- `{project-name}` → "TaskFlow"
- `{product-manager}` → "@jane"
- `{architect}` → "@john"
- `{engineer}` → "@alex"

AI/human completes sections following instruction blocks, then removes instruction blocks.
