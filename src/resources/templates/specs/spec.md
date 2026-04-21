---
id: [feature-id]
title: [feature-name]
description: [one-line scope summary — feeds the feature index]
dependencies:
  - [dependent-feature-ids]
---

<!-- markdownlint-disable single-title -->

# Feature: {feature-name}

> [INSTRUCTIONS]
> Define the WHAT and WHY of this feature — not HOW to implement it. Write as a living specification: describe the desired end state as if building from scratch. Never reference current implementation state.
>
> Only reference features this feature depends on (listed in frontmatter). Never mention features that will depend on this feature.
>
> **Frontmatter `description`**: Required. A single-line sentence-fragment (≤120 chars) summarizing the feature's scope. Shown in the auto-generated feature index at `.xe/features/README.md`. Do NOT repeat the title verbatim — describe what the feature does.

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
> Cross-feature deps: add `> - @req FR:{feature-id}/{fr-id}` under the sub-req, targeting the lowest-level upstream FR.
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
  - **FR:{scenario-id}.{sub-id}.input** (P1-P5): Input: [type/format]
  - **FR:{scenario-id}.{sub-id}.output** (P1-P5): Output: [type/format]
- **FR:{scenario-id}.{sub-id-2}** (P2): System MUST [requirement that depends on another feature]
  > - @req FR:{feature-id}/{fr-id}
- **FR:{scenario-id}.{sub-id-3}**: System SHOULD [requirement]

### Non-functional Requirements

> [INSTRUCTIONS]
> Only include when there are enforceable, testable NFRs specific to this feature with specific, measurable targets. If none, delete this section entirely.

## Architecture Constraints

> [INSTRUCTIONS]
> Design decisions and constraints that MUST be respected during implementation. Guardrails, not implementation details. Each should be testable where feasible (annotate with @req). Always keep this section; write "None" if nothing beyond .xe/architecture.md applies.

## External Dependencies

> [INSTRUCTIONS]
> Tools, libraries, or frameworks this feature requires that are NOT already in `architecture.md § Technology Stack`. Omit internal feature dependencies (use frontmatter `dependencies` and `@req` annotations instead). Always keep this section; write "None" if no external dependencies exist.
