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

Product managers need a structured way to document product vision, strategy, and competitive analysis for AI-powered development. Without templates, product context documentation is inconsistent, incomplete, or skipped entirely, leading to features that don't align with product strategy or market needs.

## Goals

- Provide token-efficient templates for essential PM-owned product context (vision, competitive analysis)
- Enable AI agents to make strategic implementation decisions aligned with product direction
- Force honest assessment of whether projects are worth building (world-changing only, no copycats)
- Guide teams to identify revolutionary differentiation (10x better, not incremental)

Explicit non-goals:

- This feature does NOT include engineering context (architecture, engineering principles, development processes)
- This feature does NOT include personas/scenarios (separate files, only read for UX features)
- This feature does NOT include success metrics (separate file, only read by measurement features)
- This feature does NOT include GTM strategy (deferred until we have features that consume it)

## Scenario

- As a **Product Manager**, I need a concise template for documenting product vision and strategic priorities so that AI can make aligned implementation decisions
  - Outcome: Token-efficient product vision guiding all feature development

- As a **Product Manager**, I need a competitive analysis template that forces honest assessment of whether to build this and what makes it revolutionary so that we only build world-changing products
  - Outcome: Clear go/no-go decision and game-changing differentiation strategy

- As an **AI Agent**, I need to read product vision and competitive analysis during feature implementation so that I can align with strategic direction and competitive positioning
  - Outcome: AI-generated features align with product strategy and competitive requirements

## Success Criteria

- Product.md template exists with essential sections (overview, strategy, principles, non-goals, team)
- Competitive-analysis.md template forces "should we build?" assessment and revolutionary differentiation
- Templates follow [template standard](.xe/standards/catalyst.md)
- Templates enable AI agents to make strategic decisions without reading unnecessary context
- Templates can be instantiated for any new world-changing project

## Design principles

See [.xe/product.md](.xe/product.md) for product-wide design principles.

No feature-specific design principles are needed for this template feature.

## Requirements

### Functional Requirements

- **FR-1**: Product.md template MUST exist
  - **FR-1.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-1.2**: Template MUST include sections for: System Overview, Product Strategy, Design Principles, Non-Goals, Team
  - **FR-1.3**: Template MUST be token-optimized (concise instructions, no unnecessary sections)

- **FR-2**: Competitive-analysis.md template MUST exist
  - **FR-2.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-2.2**: Template MUST include sections for: Should We Build This?, Competitive Landscape, Table-Stakes Features, Revolutionary Differentiation, Recommended Positioning
  - **FR-2.3**: Template MUST force honest go/no-go assessment and 10x differentiation thinking

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

- Product vision and strategic priorities (from PM or initialization issue)
- Competitive analysis and differentiation strategy (from PM research)
- Project name, team members (project-specific values)

**Outputs:**

- `product.md` template with token-optimized product vision (overview, strategy, principles, non-goals, team)
- `competitive-analysis.md` template with go/no-go assessment and revolutionary differentiation
- Templates located in `src/templates/specs/` directory

## Dependencies

None
