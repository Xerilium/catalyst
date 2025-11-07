---
id: product-context
title: Product Context Templates
author: "@flanakin"
description: "This document defines the product context template feature that provides reusable templates for PM-owned context files (product.md, competitive-analysis.md) defining product vision, strategy, team structure, success metrics, and competitive landscape for AI-powered software development."
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Product Context Templates

## Problem

Product managers need a structured way to document product vision, strategy, success metrics, competitive analysis, and market research for their projects. Without templates, product context documentation is inconsistent, incomplete, or skipped entirely, leading to features that don't align with product strategy, market needs, or competitive positioning.

## Goals

- Provide standardized templates for all PM-owned product context documentation
- Enable consistent product vision, strategy, market research, and go-to-market planning across projects
- Support AI-powered feature development with comprehensive product context
- Enable startups to scale to enterprise requirements with complete strategic documentation

Explicit non-goals:

- This feature does NOT include engineering context (architecture, engineering principles, development processes)
- This feature does NOT conduct actual research or populate context data (templates are guides for PMs to fill out manually based on their research)

## Scenario

- As a **Product Manager**, I need structured templates for documenting product vision, strategy, and success metrics so that I can establish clear product direction for AI-powered development
  - Outcome: Comprehensive product context documentation that guides all feature development decisions

- As a **Product Manager**, I need a structured template for documenting competitive analysis so that I can consistently capture market insights, competitor features, and positioning strategy
  - Outcome: Market research documentation that informs feature prioritization and competitive positioning

- As an **AI Agent**, I need to read product context files during feature implementation so that I can understand product vision, strategy, success metrics, market context, and competitive positioning
  - Outcome: AI-generated features align with product strategy, market needs, and competitive requirements

## Success Criteria

- Product.md template exists with comprehensive sections including target personas and high-level scenarios
- Competitive-analysis.md template exists with structured market analysis sections
- Go-to-market.md template exists with GTM strategy, target markets, positioning, channels, pricing, and launch timing
- All templates follow [template standard](.xe/standards/catalyst.md)
- Templates enable AI agents to extract complete product context for feature development
- Templates can be instantiated for any new project from startup to enterprise scale

## Design principles

See [.xe/product.md](.xe/product.md) for product-wide design principles.

No feature-specific design principles are needed for this template feature.

## Requirements

### Functional Requirements

- **FR-1**: Product.md template MUST exist
  - **FR-1.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-1.2**: Template MUST include sections for: System Overview, Product Strategy, Target Personas, High-Level Scenarios, Design Principles, Technical Requirements, Success Metrics, Non-Goals, Team

- **FR-2**: Competitive-analysis.md template MUST exist
  - **FR-2.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-2.2**: Template MUST include sections for: Market Overview, Competitor Analysis, Competitive Advantages, Market Gaps, Positioning Strategy

- **FR-3**: Go-to-market.md template MUST exist
  - **FR-3.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-3.2**: Template MUST include sections for: GTM Strategy Overview, Target Market & Personas, Value Proposition & Positioning, Marketing & Sales Channels, Pricing Strategy, Success Metrics, Launch Timing

### Non-functional requirements

- **NFR-1**: Cost & usage efficiency
  - Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - Instruction blocks SHOULD be clear and actionable to enable efficient AI completion

- **NFR-2**: Reliability
  - Templates MUST use standard markdown syntax for maximum compatibility
  - Templates MUST be structured consistently (frontmatter, instruction blocks, placeholders)

## Key Entities

This is a template feature with no runtime data entities. Templates produce markdown files consumed by AI agents.

**Inputs:**

- Product vision, strategy, and requirements (from PM or initialization issue)
- Market research, competitor analysis, and positioning strategy (from PM research)
- Project name, team members, success metrics (project-specific values)

**Outputs:**

- `product.md` template with structured product vision, strategy, principles, requirements, metrics, and team
- `competitive-analysis.md` template with structured market and competitive analysis
- `go-to-market.md` template with GTM strategy, target markets, positioning, channels, and pricing
- Templates located in `src/templates/specs/` directory

## Dependencies

None
