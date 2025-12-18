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

- **FR:spec.template**: spec.md template MUST exist
  - **FR:spec.template.standard**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR:spec.template.problem**: Template MUST include Problem section for defining user/business problem
  - **FR:spec.template.goals**: Template MUST include Goals section for objectives and non-goals
  - **FR:spec.template.scenario**: Template MUST include Scenario section for user stories with outcomes
  - **FR:spec.template.success**: Template MUST include Success Criteria section for measurable outcomes
  - **FR:spec.template.principles**: Template MUST include Design Principles section (with option to reference product-wide principles)
  - **FR:spec.template.fr**: Template MUST include Functional Requirements subsection with:
    - **FR:spec.template.fr.format**: `FR:path.to.req` format using kebab-case with dots for hierarchy
    - **FR:spec.template.fr.hierarchy**: FR items SHOULD be grouped hierarchically using parent.child format for nested requirements
    - **FR:spec.template.fr.organization**: Template MUST provide guidance on organizing FRs by feature area or component
  - **FR:spec.template.nfr**: Template MUST include Non-functional Requirements subsection with:
    - **FR:spec.template.nfr.format**: `NFR:category.detail` format using kebab-case with dots for hierarchy
    - **FR:spec.template.nfr.categories**: Template MUST list standard NFR categories with guidance to delete unused ones:
      - `NFR:cost`: Cost & usage efficiency
      - `NFR:reliability`: Reliability
      - `NFR:performance`: Performance
      - `NFR:observability`: Observability
      - `NFR:auditability`: Auditability
      - `NFR:testability`: Testability
      - `NFR:security`: Security
      - `NFR:accessibility`: Accessibility
      - `NFR:globalization`: Globalization
      - `NFR:compatibility`: Backward compatibility
    - **FR:spec.template.nfr.measurable**: Each NFR MUST describe specific, measurable constraints or quality attributes
  - **FR:spec.template.entities**: Template MUST include Key Entities section for data model overview
  - **FR:spec.template.dependencies**: Template MUST include Dependencies section for prerequisite features/systems
  - **FR:spec.template.architecture**: Template MUST include System Architecture section with option for diagrams
  - **FR:spec.template.optimized**: Template MUST be token-optimized with concise instructions

- **FR:plan.template**: plan.md template MUST exist
  - **FR:plan.template.standard**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR:plan.template.summary**: Template MUST include Summary section for high-level overview and design rationale reference
  - **FR:plan.template.context**: Template MUST include Technical Context section extending architecture.md
  - **FR:plan.template.structure**: Template MUST include Project Structure section showing files/directories
  - **FR:plan.template.datamodel**: Template MUST include Data Model section for entities (inline or separate file)
  - **FR:plan.template.contracts**: Template MUST include Contracts section for APIs/interfaces
  - **FR:plan.template.approach**: Template MUST include Implementation Approach section with:
    - **FR:plan.template.approach.numbered**: Numbered H3 subsections for each major implementation component
    - **FR:plan.template.approach.datastructures**: Data Structures subsection documenting in-memory data organization
    - **FR:plan.template.approach.algorithms**: Core Algorithms subsection for key logic and processing flows
    - **FR:plan.template.approach.integration**: Integration Points subsection for external dependencies and APIs
    - **FR:plan.template.approach.errors**: Error Handling subsection for failure scenarios and recovery strategies
    - **FR:plan.template.approach.validation**: Validation subsection for input validation and data integrity checks
    - **FR:plan.template.approach.performance**: Performance Considerations subsection for optimization strategies (if applicable)
    - **FR:plan.template.approach.testing**: Testing Strategy subsection for unit/integration test approach
    - **FR:plan.template.approach.examples**: Each subsection SHOULD include code examples for complex logic
  - **FR:plan.template.usage**: Template MUST include Usage Examples section with 2-3 practical examples
  - **FR:plan.template.optimized**: Template MUST be token-optimized with concise instructions

- **FR:tasks.template**: tasks.md template MUST exist
  - **FR:tasks.template.standard**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR:tasks.template.input**: Template MUST include Input/Prerequisites section referencing design docs
  - **FR:tasks.template.setup**: Template MUST include Step 1 (Setup) section for prerequisites
  - **FR:tasks.template.tdd**: Template MUST include Step 2 (Tests First/TDD) section for test-driven development
  - **FR:tasks.template.core**: Template MUST include Step 3 (Core Implementation) section for feature code
  - **FR:tasks.template.integration**: Template MUST include Step 4 (Integration) section for connecting components
  - **FR:tasks.template.polish**: Template MUST include Step 5 (Polish) section for final touches
  - **FR:tasks.template.dependencies**: Template MUST include Dependencies section documenting step dependencies
  - **FR:tasks.template.optimized**: Template MUST be token-optimized with concise checklist format

- **FR:research.template**: research.md template MUST exist
  - **FR:research.template.standard**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR:research.template.overview**: Template MUST include Overview section for research scope
  - **FR:research.template.findings**: Template MUST include Key Findings section for analysis results
  - **FR:research.template.decisions**: Template MUST include Design Decisions section documenting choices, rationale, alternatives
  - **FR:research.template.recommendations**: Template MUST include Recommendations section for next steps
  - **FR:research.template.references**: Template MUST include References section for sources
  - **FR:research.template.optimized**: Template MUST be token-optimized with concise instructions

- **FR:rollout.template**: rollout.md template MUST exist
  - **FR:rollout.template.standard**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR:rollout.template.context**: Template MUST include Feature Context section referencing feature files
  - **FR:rollout.template.status**: Template MUST include Rollout Status section tracking progress
  - **FR:rollout.template.pre**: Template MUST include Pre-Implementation Actions section for one-time setup
  - **FR:rollout.template.implementation**: Template MUST include Feature Implementation section referencing tasks.md
  - **FR:rollout.template.post**: Template MUST include Post-Implementation Actions section for cleanup
  - **FR:rollout.template.cleanup**: Template MUST include Cleanup section for tracking post-implementation cleanup actions
  - **FR:rollout.template.optimized**: Template MUST be token-optimized with concise instructions

### Non-functional requirements

- **NFR:cost**: Cost & usage efficiency
  - **NFR:cost.tokens**: Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - **NFR:cost.instructions**: Instruction blocks SHOULD be clear and actionable to enable efficient AI completion

- **NFR:reliability**: Reliability
  - **NFR:reliability.markdown**: Templates MUST use standard markdown syntax for maximum compatibility
  - **NFR:reliability.structure**: Templates MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

- **NFR:testability**: Testability
  - **NFR:testability.validation**: Templates MUST have automated validation tests (Jest) verifying structure and completeness

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
