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

- **FR:product**: Product.md template
  - **FR:product.template**: Template MUST exist and follow template standard defined in `.xe/standards/catalyst.md`
  - **FR:product.overview**: Template MUST include Overview section with pointers to related context files
  - **FR:product.system**: Template MUST include System Overview section (2-3 sentence product description)
  - **FR:product.strategy**: Template MUST include Product Strategy section (phased implementation priorities)
  - **FR:product.principles**: Template MUST include Design Principles section (3-5 non-negotiable values with quality criteria)
  - **FR:product.nongoals**: Template MUST include Non-Goals section (explicit scope boundaries)
  - **FR:product.team**: Template MUST include Team section (product, engineering, AI reviewer roles)
  - **FR:product.optimized**: Template MUST be token-optimized with concise instructions

- **FR:competitive**: Competitive-analysis.md template
  - **FR:competitive.template**: Template MUST exist and follow template standard defined in `.xe/standards/catalyst.md`
  - **FR:competitive.assessment**: Template MUST include Should We Build This? section with problem severity, demand analysis, team fit, risk assessment, and go/no-go recommendation
  - **FR:competitive.landscape**: Template MUST include Competitive Landscape section (per-competitor analysis)
  - **FR:competitive.tablestakes**: Template MUST include Table-Stakes Features section
  - **FR:competitive.differentiation**: Template MUST include Revolutionary Differentiation section (10x better innovations)
  - **FR:competitive.positioning**: Template MUST include Recommended Positioning section (target segment, positioning, key message)
  - **FR:competitive.optimized**: Template MUST be token-optimized with concise instructions

### Non-functional requirements

- **NFR:cost**: Cost & usage efficiency
  - Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - Instruction blocks SHOULD be clear and actionable to enable efficient AI completion

- **NFR:reliability**: Reliability
  - Templates MUST use standard markdown syntax for maximum compatibility
  - Templates MUST be structured consistently (frontmatter, instruction blocks, placeholders)

## Key Entities

None

**Inputs:**

- Product vision and strategic priorities (from PM or initialization issue)
- Competitive analysis and differentiation strategy (from PM research)
- Project name, team members (project-specific values)

**Outputs:**

- `src/resources/templates/specs/product.md` - token-optimized product vision template (overview, strategy, principles, non-goals, team)
- `src/resources/templates/specs/competitive-analysis.md` - go/no-go assessment and revolutionary differentiation template

## Dependencies

None
