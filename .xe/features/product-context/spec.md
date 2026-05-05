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

- **FR:product.template** (P1): Template MUST exist and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:product.purpose** (P1): Template MUST include Purpose section combining a concise product description (what it does, core value, primary benefits) with any product-level scope boundaries as prose
- **FR:product.strategy** (P1): Template MUST include Product Strategy section (phased implementation priorities)
- **FR:product.principles** (P1): Template MUST include Design Principles section (3-5 non-negotiable values with quality criteria)
- **FR:product.personas** (P1): Template MUST include Personas section defining recognized actors (user personas and system components) that feature specs reference in scenarios
- **FR:product.scenarios** (P1): Template MUST include Scenarios section documenting product-level capabilities. Each scenario MUST use an FR ID (`### FR:{scenario-id}: {scenario-name}`) with a 1-2 sentence description. Scenarios SHOULD NOT nest MUST/SHOULD sub-requirements — detailed requirements belong in feature specs at `.xe/features/{feature-id}/spec.md`
- **FR:product.journey** (P2): Template MUST include Customer Journey section linking to `.xe/customer-journey.md` when present. Section is optional and may be omitted when no customer journey has been captured
- **FR:product.team** (P2): Template MUST include Team section (product, engineering, AI reviewer roles)
- **FR:product.optimized** (P2): Template MUST be token-optimized with concise instructions
- **FR:product.output** (P1): Template MUST be output to `src/resources/templates/specs/product.md`
  > - @req FR:context-storage/templates.framework

### FR:competitive: Competitive-Analysis.md Template

Product Manager needs a competitive analysis template that forces honest assessment of whether to build this and what makes it revolutionary so that we only build world-changing products.

- **FR:competitive.template** (P1): Template MUST exist and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:competitive.assessment** (P1): Template MUST include Should We Build This? section with problem severity, demand analysis, team fit, risk assessment, and go/no-go recommendation
- **FR:competitive.landscape** (P2): Template MUST include Competitive Landscape section (per-competitor analysis)
- **FR:competitive.tablestakes** (P2): Template MUST include Table-Stakes Features section
- **FR:competitive.differentiation** (P1): Template MUST include Revolutionary Differentiation section (10x better innovations)
- **FR:competitive.positioning** (P2): Template MUST include Recommended Positioning section (target segment, positioning, key message)
- **FR:competitive.optimized** (P2): Template MUST be token-optimized with concise instructions
- **FR:competitive.output** (P1): Template MUST be output to `src/resources/templates/specs/competitive-analysis.md`
  > - @req FR:context-storage/templates.framework

### FR:journey: Customer-Journey.md Template

Product Manager needs a customer journey template that captures how actors interact with the product across distinct workflows so that AI agents understand product-level actor sequencing and checkpoint placement.

- **FR:journey.template** (P1): Template MUST exist and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:journey.location** (P2): Customer journey files MUST be stored at `.xe/customer-journey.md` when present
  > - @req FR:context-storage/storage.project
- **FR:journey.structure** (P1): Template MUST guide the author to include a title, a short textual description of what the journey covers, and one or more mermaid sequenceDiagram sections showing actor interactions and checkpoints. Template MUST support documenting multiple named journeys in a single file (e.g., initialization, blueprint build-out, feature development)
- **FR:journey.output** (P1): Template MUST be output to `src/resources/templates/specs/customer-journey.md`
  > - @req FR:context-storage/templates.framework

### Non-functional Requirements

- **NFR:cost.token-efficiency** (P3): Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
- **NFR:reliability.syntax** (P3): Templates MUST use standard markdown syntax for maximum compatibility
- **NFR:reliability.structure** (P3): Templates MUST be structured consistently (frontmatter, instruction blocks, placeholders)

## Architecture Constraints

None

## External Dependencies

None
