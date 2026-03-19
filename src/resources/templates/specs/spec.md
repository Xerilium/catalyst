---
id: [feature-id]
title: [feature-name]
dependencies:
  - [dependent-feature-ids]
---

<!-- markdownlint-disable single-title -->

# Feature: {feature-name}

> [INSTRUCTIONS]
> Define the WHAT and WHY of this feature — not HOW to implement it. Write as a living specification: describe the desired end state as if building from scratch. Never reference current implementation state.
>
> Only reference features this feature depends on (listed in frontmatter). Never mention features that will depend on this feature.

## Purpose

> [INSTRUCTIONS]
> The feature's mission statement: 1-3 sentences defining what this feature does, why it exists, and where its mandate ends. Every requirement that follows must serve this mission. If a requirement doesn't clearly advance the mission, it doesn't belong here.
>
> Think of this as a charter — it declares the feature's reason for being AND its boundaries. Analogous to a team's mission statement that both empowers and constrains.

## Scenarios

> [INSTRUCTIONS]
> Each scenario IS a functional requirement describing what an actor needs. Actors are user personas or system components defined in `.xe/product.md § Personas`. Use ONLY recognized personas.
>
> **Scenario format**: Each scenario is an FR with a unique ID: `### FR:{scenario-id}: {scenario-name}` followed by: "{actor} needs to {action} so that {value}."
>
> Nest detailed sub-requirements under each scenario: `- **FR:{scenario-id}.{sub-id}** (P1-P5): MUST/SHOULD/MAY statement`
>
> **Inputs/Outputs**: Define as nested FRs where interface
> consistency matters:
>
> - **FR:{scenario-id}.{sub-id}.input** (P1-P5): Input: [type/format]
> - **FR:{scenario-id}.{sub-id}.output** (P1-P5): Output: [type/format]
>
> For complex data structures: `→ see data-model.md#{entity}`
>
> **Priority levels**:
>
> - P1 (Critical): Security, data integrity, core functionality
> - P2 (Important): Error handling, key features, integration points
> - P3 (Standard): Regular functionality, validation (default)
> - P4 (Minor): Performance optimizations, tooling
> - P5 (Informational): Documentation, process
>
> **Deprecated requirements**: ~~**FR:old.path**~~: [deprecated: FR:new.path]

### FR:{scenario-id}: {scenario-name}

{actor} needs to {action} so that {value}.

- **FR:{scenario-id}.{sub-id}** (P1): System MUST [requirement]
> - **FR:{scenario-id}.{sub-id}.input** (P1-P5): Input: [type/format]
> - **FR:{scenario-id}.{sub-id}.output** (P1-P5): Output: [type/format]
- **FR:{scenario-id}.{sub-id}**: System SHOULD [requirement]

### Non-functional Requirements

> [INSTRUCTIONS]
> Only include when there are enforceable, testable NFRs specific to this feature with specific, measurable targets. If none, delete this section entirely.

## Architecture Constraints

> [INSTRUCTIONS]
> Design decisions and constraints that MUST be respected during implementation. Guardrails, not implementation details. Each should be testable where feasible (annotate with @req). Delete if nothing beyond .xe/architecture.md applies.

## Dependencies

> [INSTRUCTIONS]
> ONLY upstream dependencies — features and external tools/libraries this feature requires. Never list downstream consumers.
>
> **Internal**: Features this depends on (must match frontmatter)
>
> **External**: Tools, libraries, frameworks required
