---
id: feature-context
title: Feature Context Templates
dependencies:
  - product-context
  - engineering-context
---

<!-- markdownlint-disable single-title -->

# Feature: Feature Context Templates

## Purpose

Provide standardized templates for feature-level documentation — specifications, change tracking, and data models — so that AI agents produce consistent, enterprise-quality features and humans can review structured, complete deliverables. This feature owns templates consumed during feature development; it does not own product-level templates (product-context), engineering templates (engineering-context), or workflow orchestration (feature-changes).

## Scenarios

### FR:spec: Feature specification template

Developer needs a structured template for defining feature requirements so that every feature captures complete, scenario-driven specifications with traceable requirements.

- **FR:spec.template** (P1): Template MUST exist at `src/resources/templates/specs/spec.md` and follow template standard defined in `.xe/standards/catalyst.md`
- **FR:spec.purpose** (P1): Template MUST include Purpose section for the feature's mission statement defining what, why, and scope boundaries
- **FR:spec.scenarios** (P2): Template MUST include Scenarios section where each scenario IS a functional requirement with a unique ID (`FR:{scenario-id}`) describing what a recognized persona needs
- **FR:spec.scenarios.format** (P2): Each scenario MUST follow the format: `### FR:{scenario-id}: {scenario-name}` followed by `{actor} needs to {action} so that {value}`
- **FR:spec.scenarios.sub-reqs** (P2): Scenarios MUST support nested sub-requirements: `- **FR:{scenario-id}.{sub-id}** (P1-P5): MUST/SHOULD/MAY statement`
- **FR:spec.scenarios.io** (P3): Scenarios MUST support Input/Output as nested FRs with traceable IDs: `FR:{scenario-id}.{sub-id}.input` and `FR:{scenario-id}.{sub-id}.output`
- **FR:spec.scenarios.priority** (P3): Template MUST define priority levels P1 (Critical) through P5 (Informational)
- **FR:spec.scenarios.personas** (P2): Scenarios MUST reference `.xe/product.md § Personas` and require ONLY recognized personas
- **FR:spec.nfr** (P3): Template MUST include Non-functional Requirements subsection, explicitly optional with guidance to delete if no measurable targets exist
- **FR:spec.constraints** (P2): Template MUST include Architecture Constraints section for testable guardrails (annotated with `@req`)
- **FR:spec.dependencies** (P2): Template MUST include Dependencies section for upstream-only dependencies (internal features and external tools)
- **FR:spec.frontmatter** (P2): Template MUST include frontmatter with `id`, `title`, and `dependencies` fields; MUST NOT include `author`, `status`, or `description`

### FR:change: Change tracker template

AI Agent needs a lightweight tracking template for in-progress changes so that work can survive context window resets and interrupted sessions can be resumed.

- **FR:change.template** (P1): Template MUST exist at `src/resources/templates/specs/change.md` and follow template standard
- **FR:change.overview** (P2): Template MUST include Overview section describing what prompted the change
- **FR:change.tasks** (P2): Template MUST include Tasks section with checkbox-format task list
- **FR:change.notes** (P3): Template MUST include Notes section for decisions, blockers, and resumption context

### FR:data-model: Data model template

Developer needs an optional template for documenting feature-owned entities so that complex data structures are defined consistently without cluttering the spec.

- **FR:data-model.template** (P2): Template MUST exist at `src/resources/templates/specs/data-model.md` and follow template standard
- **FR:data-model.entities** (P2): Template MUST include Entities section with guidance for defining purpose, fields, relationships, and validation
- **FR:data-model.lightweight** (P2): Template MUST guide toward lightweight prose definitions, not code
- **FR:data-model.references** (P3): Template MUST include Referenced Entities section linking to other features' data models
- **FR:data-model.frontmatter** (P3): Template MUST include frontmatter with `feature` field linking to the owning feature

### Non-functional Requirements

- **NFR:cost** (P4): Cost & usage efficiency
  - **NFR:cost.tokens**: Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - **NFR:cost.instructions**: Instruction blocks SHOULD be clear and actionable to enable efficient AI completion

- **NFR:reliability** (P3): Reliability
  - **NFR:reliability.markdown**: Templates MUST use standard markdown syntax for maximum compatibility
  - **NFR:reliability.structure**: Templates MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

- **NFR:testability** (P3): Testability
  - **NFR:testability.validation**: Templates MUST have automated validation tests (Jest) verifying structure and completeness

## Dependencies

**Internal**: product-context (templates reference product vision and personas), engineering-context (templates follow engineering standards)

**External**: None
