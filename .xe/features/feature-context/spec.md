---
id: feature-context
title: Feature Context Templates
author: "@flanakin"
description: "This document defines the feature context template feature that provides reusable templates for feature specifications, implementation plans, task breakdowns, and research documents used by blueprint-creation and feature-rollout playbooks."
dependencies: ["product-context", "engineering-context"]
---

<!-- markdownlint-disable single-title -->

# Feature: Feature Context Templates

## Problem

Feature implementation requires consistent structure to ensure enterprise-scale quality and completeness. Without standardized templates defining what goes in spec.md, plan.md, tasks.md, research.md, and rollout.md, features lack complete requirements, implementation plans vary in quality, and critical considerations (security, performance, testability) are missed.

## Goals

- Provide standardized templates that ensure complete feature requirements (spec.md)
- Ensure implementation plans address all technical considerations (plan.md)
- Define consistent task breakdown structure for implementation execution (tasks.md)
- Encourage thorough analysis and decision documentation (research.md)
- Enable progress tracking and orchestration (rollout.md)
- Ensure templates guide toward enterprise-scale quality (security, performance, testability)
- Minimize token usage while maintaining completeness

Explicit non-goals:

- This feature does NOT include product-level templates (product.md, competitive-analysis.md - those are in product-context)
- This feature does NOT include engineering templates (architecture.md, engineering.md, development.md - those are in engineering-context)
- This feature does NOT include playbook templates (playbook.md - that's for playbook-engine feature)

## Scenario

- As a **Product Manager**, I need a template for feature specs so that all features capture complete requirements including security, performance, and testability considerations
  - Outcome: Every feature has comprehensive spec.md ensuring no critical requirements are missed

- As an **Architect**, I need a template for implementation plans so that all technical decisions are documented including error handling, validation, and integration points
  - Outcome: Every feature has complete plan.md addressing all architectural concerns

- As an **Engineer**, I need a template for task breakdowns so that implementation follows TDD and includes all quality gates
  - Outcome: Every feature has tasks.md ensuring tests-first approach and complete implementation

- As an **AI Agent**, I need templates to guide feature implementation so that I produce enterprise-quality code meeting all requirements
  - Outcome: Features implemented using templates consistently meet quality standards

## Success Criteria

- spec.md template ensures all features capture complete requirements (FR, NFR, scenarios, success criteria)
- plan.md template ensures all technical considerations are addressed (error handling, validation, testing)
- tasks.md template ensures TDD approach and complete implementation steps
- research.md template encourages thorough analysis and documented decisions
- rollout.md template enables progress tracking and orchestration
- Templates guide toward enterprise-scale quality (security, performance, testability)
- All templates follow [template standard](.xe/standards/catalyst.md)
- Templates validated by automated tests (Jest)

## Design principles

See [.xe/product.md](.xe/product.md) for product-wide design principles.

No feature-specific design principles are needed for this template feature.

## Requirements

### Functional Requirements

- **FR-1**: spec.md template MUST exist
  - **FR-1.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-1.2**: Template MUST include Problem section for defining user/business problem
  - **FR-1.3**: Template MUST include Goals section for objectives and non-goals
  - **FR-1.4**: Template MUST include Scenario section for user stories with outcomes
  - **FR-1.5**: Template MUST include Success Criteria section for measurable outcomes
  - **FR-1.6**: Template MUST include Design Principles section (with option to reference product-wide principles)
  - **FR-1.7**: Template MUST include Functional Requirements subsection with:
    - **FR-1.7.1**: FR-X numbering format for requirements
    - **FR-1.7.2**: FR items SHOULD be grouped hierarchically using FR-X.Y.Z format for nested requirements
    - **FR-1.7.3**: Template MUST provide guidance on organizing FRs by feature area or component
  - **FR-1.8**: Template MUST include Non-functional Requirements subsection with:
    - **FR-1.8.1**: NFR-X numbering format for requirements (separate from FR numbering)
    - **FR-1.8.2**: Template MUST list standard NFR categories with guidance to delete unused ones:
      - NFR-1: Cost & usage efficiency
      - NFR-2: Reliability
      - NFR-3: Performance
      - NFR-4: Observability
      - NFR-5: Auditability
      - NFR-6: Testability
      - NFR-7: Security
      - NFR-8: Accessibility
      - NFR-9: Globalization
      - NFR-10: Backward compatibility
    - **FR-1.8.3**: Each NFR MUST describe specific, measurable constraints or quality attributes
  - **FR-1.9**: Template MUST include Key Entities section for data model overview
  - **FR-1.10**: Template MUST include Dependencies section for prerequisite features/systems
  - **FR-1.11**: Template MUST include System Architecture section with option for diagrams
  - **FR-1.12**: Template MUST be token-optimized with concise instructions

- **FR-2**: plan.md template MUST exist
  - **FR-2.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-2.2**: Template MUST include Summary section for high-level overview and design rationale reference
  - **FR-2.3**: Template MUST include Technical Context section extending architecture.md
  - **FR-2.4**: Template MUST include Project Structure section showing files/directories
  - **FR-2.5**: Template MUST include Data Model section for entities (inline or separate file)
  - **FR-2.6**: Template MUST include Contracts section for APIs/interfaces
  - **FR-2.7**: Template MUST include Implementation Approach section with:
    - **FR-2.7.1**: Numbered H3 subsections for each major implementation component
    - **FR-2.7.2**: Data Structures subsection documenting in-memory data organization
    - **FR-2.7.3**: Core Algorithms subsection for key logic and processing flows
    - **FR-2.7.4**: Integration Points subsection for external dependencies and APIs
    - **FR-2.7.5**: Error Handling subsection for failure scenarios and recovery strategies
    - **FR-2.7.6**: Validation subsection for input validation and data integrity checks
    - **FR-2.7.7**: Performance Considerations subsection for optimization strategies (if applicable)
    - **FR-2.7.8**: Testing Strategy subsection for unit/integration test approach
    - **FR-2.7.9**: Each subsection SHOULD include code examples for complex logic
  - **FR-2.8**: Template MUST include Usage Examples section with 2-3 practical examples
  - **FR-2.9**: Template MUST be token-optimized with concise instructions

- **FR-3**: tasks.md template MUST exist
  - **FR-3.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-3.2**: Template MUST include Input/Prerequisites section referencing design docs
  - **FR-3.3**: Template MUST include Step 1 (Setup) section for prerequisites
  - **FR-3.4**: Template MUST include Step 2 (Tests First/TDD) section for test-driven development
  - **FR-3.5**: Template MUST include Step 3 (Core Implementation) section for feature code
  - **FR-3.6**: Template MUST include Step 4 (Integration) section for connecting components
  - **FR-3.7**: Template MUST include Step 5 (Polish) section for final touches
  - **FR-3.8**: Template MUST include Dependencies section documenting step dependencies
  - **FR-3.9**: Template MUST be token-optimized with concise checklist format

- **FR-4**: research.md template MUST exist
  - **FR-4.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-4.2**: Template MUST include Overview section for research scope
  - **FR-4.3**: Template MUST include Key Findings section for analysis results
  - **FR-4.4**: Template MUST include Design Decisions section documenting choices, rationale, alternatives
  - **FR-4.5**: Template MUST include Recommendations section for next steps
  - **FR-4.6**: Template MUST include References section for sources
  - **FR-4.7**: Template MUST be token-optimized with concise instructions

- **FR-5**: rollout.md template MUST exist
  - **FR-5.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-5.2**: Template MUST include Feature Context section referencing feature files
  - **FR-5.3**: Template MUST include Rollout Status section tracking progress
  - **FR-5.4**: Template MUST include Pre-Implementation Actions section for one-time setup
  - **FR-5.5**: Template MUST include Feature Implementation section referencing tasks.md
  - **FR-5.6**: Template MUST include Post-Implementation Actions section for cleanup
  - **FR-5.7**: Template MUST include Cleanup section for tracking post-implementation cleanup actions
  - **FR-5.8**: Template MUST be token-optimized with concise instructions

### Non-functional requirements

- **NFR-1**: Cost & usage efficiency
  - Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - Instruction blocks SHOULD be clear and actionable to enable efficient AI completion

- **NFR-2**: Reliability
  - Templates MUST use standard markdown syntax for maximum compatibility
  - Templates MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

- **NFR-3**: Testability
  - Templates MUST have automated validation tests (Jest) verifying structure and completeness

## Key Entities

None

**Inputs:**

- Product vision and feature requirements
- Technical architecture patterns and constraints
- Implementation decisions and trade-offs

**Outputs:**

- `src/resources/templates/specs/spec.md` - Feature specification template
- `src/resources/templates/specs/plan.md` - Implementation plan template
- `src/resources/templates/specs/tasks.md` - Task breakdown template
- `src/resources/templates/specs/research.md` - Research document template
- `src/resources/templates/specs/rollout.md` - Rollout orchestration template

## Dependencies

- **product-context**: Templates reference product vision and strategy
- **engineering-context**: Templates follow engineering standards and development process

## System Architecture

Templates are passive files consumed by AI agents during feature development:

```text
AI Agent
  ↓ reads
Templates (spec.md, plan.md, tasks.md, research.md, rollout.md)
  ↓ fills placeholders, removes instructions
Feature Documentation (.xe/features/{feature-id}/)
```

Templates ensure consistent structure without dictating specific workflow orchestration.
