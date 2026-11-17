---
id: product-context
title: Product Context Templates
description: PM-owned templates for product vision, strategy, principles, personas, capabilities, journeys, competitors.
dependencies:
  - context-storage
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Product Context Templates

## Purpose

Product managers need a consistent, token-efficient way to document product-level context — vision, strategy, design principles, personas, product-level capabilities, customer journeys, and competitive analysis — so that AI agents make strategic implementation decisions aligned with product direction. This feature provides PM-owned templates that capture product intent without spilling into engineering context or feature-level specification detail.

## Scenarios

### FR:product: Product.md Template

Product Manager needs a concise template for documenting product vision, capabilities, and strategic priorities so that AI can make aligned implementation decisions.

- **FR:product.template** (P1): Template MUST exist at `src/resources/templates/specs/product.md` and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/standards.catalyst-templates
  > - @req FR:context-storage/templates.framework
- **FR:product.purpose** (P1): Template MUST include a Purpose section that combines a concise product description with any product-level scope boundaries, as prose
  - Description covers what the product does, its core value, and its primary benefits
- **FR:product.strategy** (P1): Template MUST include Product Strategy section (phased implementation priorities)
- **FR:product.principles** (P1): Template MUST include Design Principles section (3-5 non-negotiable values with quality criteria)
- **FR:product.personas** (P1): Template MUST include Personas section defining recognized actors (user personas and system components) that feature specs reference in scenarios
- **FR:product.scenarios** (P1): Template MUST include a Scenarios section that documents product-level capabilities
  - **FR:product.scenarios.id** (P1): Template MUST give each scenario an FR ID heading (`### FR:{scenario-id}: {scenario-name}`) with a 1-2 sentence description
  - **FR:product.scenarios.no-nesting** (P2): Template SHOULD keep scenarios free of nested sub-requirements
    - Rationale: Detailed requirements belong in feature specs at `.xe/features/{feature-id}/spec.md`.
- **FR:product.journey** (P2): Template MUST include a Customer Journey section that links to `.xe/customer-journey.md` when present
  - Section is optional; omit it when no customer journey exists
- **FR:product.team** (P2): Template MUST include Team section (product, engineering, AI reviewer roles)
- **FR:product.optimized** (P2): Template MUST be token-optimized with concise instructions
- **FR:product.location** (P1): Rendered product files MUST be stored at `.xe/product.md`
  > - @req FR:context-storage/storage.project

### FR:competitive: Competitive-Analysis.md Template

Product Manager needs a competitive analysis template that forces honest assessment of whether to build this and what makes it revolutionary so that we only build world-changing products.

- **FR:competitive.template** (P1): Template MUST exist at `src/resources/templates/specs/competitive-analysis.md` and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/standards.catalyst-templates
  > - @req FR:context-storage/templates.framework
- **FR:competitive.assessment** (P1): Template MUST include a "Should We Build This?" section
  - Contents: problem severity, demand analysis, team fit, risk assessment, go/no-go
  - Contents: problem severity, demand analysis, team fit, risk assessment, and go/no-go recommendation
- **FR:competitive.landscape** (P2): Template MUST include Competitive Landscape section (per-competitor analysis)
- **FR:competitive.tablestakes** (P2): Template MUST include Table-Stakes Features section
- **FR:competitive.differentiation** (P1): Template MUST include Revolutionary Differentiation section (10x better innovations)
- **FR:competitive.positioning** (P2): Template MUST include Recommended Positioning section (target segment, positioning, key message)
- **FR:competitive.optimized** (P2): Template MUST be token-optimized with concise instructions
- **FR:competitive.location** (P2): Rendered competitive analysis files MUST be stored at `.xe/competitive-analysis.md` when present
  > - @req FR:context-storage/storage.project

### FR:journey: Customer-Journey.md Template

Product Manager needs a customer journey template that captures how actors interact with the product across distinct workflows so that AI agents understand product-level actor sequencing and checkpoint placement.

- **FR:journey.template** (P1): Template MUST exist and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:journey.location** (P2): Customer journey files MUST be stored at `.xe/customer-journey.md` when present
  > - @req FR:context-storage/storage.project
- **FR:journey.structure** (P1): Template MUST guide the author to write a title, a short description, and mermaid sequenceDiagram sections
  - Description says what the journey covers; diagrams show actor interactions and checkpoints
  - Diagrams show actor interactions and checkpoints
  - **FR:journey.structure.multiple** (P1): Template MUST support multiple named journeys in one file (for example, initialization, blueprint build-out, feature development)
- **FR:journey.output** (P1): Output: `src/resources/templates/specs/customer-journey.md`
  > - @req FR:context-storage/templates.framework

### Non-functional Requirements

- **NFR:cost.token-efficiency** (P3): Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
- **NFR:reliability.syntax** (P3): Templates MUST use standard markdown syntax for maximum compatibility
- **NFR:reliability.structure** (P3): Templates MUST be structured consistently (frontmatter, instruction blocks, placeholders)

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
