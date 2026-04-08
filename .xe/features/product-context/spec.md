---
id: product-context
title: Product Context Templates
dependencies:
  - context-storage
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Product Context Templates

## Purpose

Product managers need a structured way to document product vision, strategy, and competitive analysis for AI-powered development. Without templates, product context documentation is inconsistent, incomplete, or skipped entirely, leading to features that don't align with product strategy or market needs. This feature provides token-efficient templates for essential PM-owned product context (vision, competitive analysis), enabling AI agents to make strategic implementation decisions aligned with product direction.

Explicit non-goals:

- Engineering context (architecture, engineering principles, development processes)
- Detailed user research or journey mapping (separate effort)
- Success metrics (separate file, only read by measurement features)
- GTM strategy (deferred until we have features that consume it)

## Scenarios

### FR:product: Product.md Template

Product Manager needs a concise template for documenting product vision and strategic priorities so that AI can make aligned implementation decisions.

- **FR:product.template** (P1): Template MUST exist and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:product.overview** (P2): Template MUST include Overview section with pointers to related context files
- **FR:product.system** (P1): Template MUST include System Overview section (2-3 sentence product description)
- **FR:product.strategy** (P1): Template MUST include Product Strategy section (phased implementation priorities)
- **FR:product.principles** (P1): Template MUST include Design Principles section (3-5 non-negotiable values with quality criteria)
- **FR:product.nongoals** (P2): Template MUST include Non-Goals section (explicit scope boundaries)
- **FR:product.personas** (P1): Template MUST include Personas section defining recognized actors (user personas and system components) that feature specs reference in scenarios
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

### Non-functional Requirements

- **NFR:cost.token-efficiency** (P3): Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
- **NFR:reliability.syntax** (P3): Templates MUST use standard markdown syntax for maximum compatibility
- **NFR:reliability.structure** (P3): Templates MUST be structured consistently (frontmatter, instruction blocks, placeholders)

## External Dependencies

None
