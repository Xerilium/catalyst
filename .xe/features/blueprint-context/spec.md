---
id: blueprint-context
title: Blueprint Context
description: Product-architecture artifact convention — dependency graph, product domain model, phased roadmap.
dependencies:
  - context-storage
  - feature-context
  - product-context
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Blueprint Context

## Purpose

Provide a standardized template and conventions for product-architecture documentation — feature dependency graph, product domain model, and phased roadmap — to align on product direction at a glance. Blueprints define the target design and build plan.

## Scenarios

### FR:blueprint: Blueprint artifact

Product Manager needs a view of the product feature and data architecture, and implementation roadmap to orient on product direction at a glance.

- **FR:blueprint.location** (P2): Blueprint MUST be stored at `.xe/features/blueprint.md`
  > - @req FR:context-storage/storage.project
- **FR:blueprint.arch** (P2): Architecture MUST visualize feature dependencies grouped by functional area
- **FR:blueprint.data-model** (P2): Data Model MUST visualize product domain entities and their relationships
- **FR:blueprint.roadmap** (P2): Roadmap MUST organize features into sequential phases aligned with the product strategy
  > - @req FR:product-context/product.strategy
  - **FR:blueprint.roadmap.visual** (P3): Roadmap MUST visualize implementation sequence in a gantt chart
  - **FR:blueprint.roadmap.detail** (P2): Roadmap MUST include ID, complexity (Small / Medium / Large), one-sentence purpose, scope boundaries, and dependencies per unbuilt feature; implemented features SHOULD only include ID and spec link
- **FR:blueprint.template** (P1): Template MUST exist at `src/resources/templates/specs/blueprint.md` and follow template standard
  > - @req FR:context-storage/templates.framework
  > - @req FR:context-storage/standards.catalyst-templates

### FR:design-decisions: Product-architecture design decisions

Product Manager needs a convention for documenting product-architecture design decisions so that strategic rationale (why X over Y at the product/architecture level) is captured separately from feature-level decisions.

- **FR:design-decisions.location** (P2): Product-architecture design decisions MUST be stored at `.xe/features/design-decisions.md`
  > - @req FR:context-storage/storage.project
- **FR:design-decisions.scope** (P2): File MUST capture product/architecture-level decisions (e.g., overall structure, cross-feature patterns, scale targets) — distinct from per-feature decisions stored at `.xe/features/{feature-id}/design-decisions.md`
  > - @req FR:feature-context/design-decisions.location
- **FR:design-decisions.format** (P3): Each entry MUST follow the same Decision/Date/Why/Rejected/Evidence format used by feature-level design decisions
  > - @req FR:feature-context/design-decisions.scope
- **FR:design-decisions.template** (P3): The existing template at `src/resources/templates/specs/design-decisions.md` MAY be reused — single template, two locations (product-architecture vs per-feature)
  > - @req FR:feature-context/design-decisions.template

### Non-functional Requirements

- **NFR:cost** (P4): Cost & usage efficiency
  - **NFR:cost.tokens**: Template SHOULD be concise yet comprehensive to minimize token usage when read by AI agents

- **NFR:reliability** (P3): Reliability
  - **NFR:reliability.markdown**: Template MUST use standard markdown syntax for maximum compatibility
  - **NFR:reliability.structure**: Template MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

- **NFR:testability** (P3): Testability
  - **NFR:testability.validation**: Template MUST have automated validation tests verifying structure (Architecture, Data Model, Roadmap H2 sections present)

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
