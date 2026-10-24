---
id: [feature-id]
title: [feature-name]
description: [one-line scope summary — feeds the feature index]
dependencies:
  - [upstream-feature-ids — direct only: features this one calls or reads]
---

<!-- markdownlint-disable single-title -->

# Feature: {feature-name}

> [INSTRUCTIONS]
> Define feature WHAT and WHY — not HOW to implement it. Write as a living spec: desired end state, never current implementation state.
>
> Only reference features listed in frontmatter `dependencies`. Never mention dependents.
>
> **Frontmatter `description`**: Required. A single-line sentence-fragment (≤120 chars) summarizing the feature's scope. Feeds the feature index at `.xe/features/README.md`; do NOT repeat the title.

## Purpose

> [INSTRUCTIONS]
> Mission statement: 1-3 sentences on what this feature does, why it exists, and where its mandate ends. MUST NOT restate scenarios.
>
> Think charter, not summary: reason for being and boundaries.
>
> **Vision-stable**: Convey the enduring vision — it MUST stay valid as scenarios and FRs evolve within that vision. Do NOT document scenarios, flows, or capabilities that change.

## Scenarios

> [INSTRUCTIONS]
> Each scenario IS a functional requirement: what an actor needs.
>
> **Format**: `### FR:{scenario-id}: {scenario-name}` then "{actor} needs to {action} so that {value}."
>
> **Actor**: A persona from `.xe/product.md § Personas`, OR the product/system by name. Never an undefined role.
>
> **User-story only**: The opening sentence is the user story. MUST NOT restate or enumerate FRs.
>
> **Coverage**: One externally-observable unit of behavior per scenario — a caller using the feature, OR an internal-only unit (bg jobs, schedulers). A decision or a detail of one scenario is an FR in it, never its own scenario.
>
> **Interface scope**: Interface FRs cover EXTERNAL surfaces (relative to the feature boundary) OR surfaces where drift could silently break something. NEVER write an `@function`/`@cli` FR for anything not called from outside the feature; internal functions and types are implementation details.
>
> **Outcomes only**: FRs define desired-state outcomes and the rules that assure their quality. Omit detail that can change without changing an outcome (internal types, data shapes, algorithm steps, thresholds).
>
> **Structure**: FRs (`- **FR:{scenario-id}.{sub-id}** (P1-P5): ...`) go outside-in: interfaces FIRST (at the top of the scenario, outermost surface first), then `input`, behaviors, `output`.
>
> - `FR:{scenario-id}.@{interface-kind}` — public interfaces (`@cli`, `@function`, `@json`); body is the literal address. Layered surfaces (A calls B) become root-sibling FRs. Same-kind interfaces MAY group under one `@kind` FR.
> - `FR:{scenario-id}.input` — what flows in
> - `FR:{scenario-id}.{behavior-name}` — 1+ behaviors named for the domain: `{actor} MUST/SHOULD/MAY {behavior}`; `{actor}` IMPLEMENTS it
> - `FR:{scenario-id}.output` — what flows out
> - `FR:{scenario-id}.schema` (optional) — for a defined object
>
> Only behaviors use MUST/SHOULD/MAY, exactly ONE per FR; split multiples into siblings or nested FRs.
>
> **Detail = nested FR, not sub-bullet**: Detail with its own requirement becomes a nested (dot-namespaced, indented) FR so it is traceable. Plain sub-bullets are for non-normative clarification only. Group related FRs under a shared parent by concern; depth is encouraged where it clarifies.
>
> **Deps**: `> - @req FR:{feature-id}/{fr-id}` as nested blockquote bullets under the depending FR (never inline in prose), targeting the lowest-level upstream FR.
>
> **Pattern variations**:
>
> - **Function**: interface = `@api`/`@cli`; input = params; output = return/side effects
> - **Data file artifact**: interface = `@file` (path); input = template
> - **Structured file artifact**: interface = `@yaml`/`@json` + path; input = schema
> - **Data structure**: NOT an interface FR — a `$entity` in Data Model

### FR:{scenario-id}: {scenario-name}

{actor} needs to {action} so that {value}.

> [INSTRUCTIONS]
> Slot content: `{content} ({type}) — {description}` where `{type}` is a primitive (`string`, `number`, `boolean`) or `@req` entity reference. Interface FRs cover the contract surface only — never enumerate parameters (those go in `.input`). Defer `@req` entities to the Data Model section.
>
> **Multi-value slots**: When a slot carries multiple logical values, list each as a nested bullet. Name slots for the _logical_ content, not the wire-level container.
>
> ```markdown
> - **FR:place-order.@api** (P2): Interface: `POST /orders`
> - **FR:place-order.input** (P2):
>   - Order request (@req FR:$order) — submitted by an authenticated customer
>   - Idempotency key (string) — client-supplied, prevents double-submit
> - **FR:place-order.validate** (P1): Order service MUST reject line items that do not reference an active product
>   - **FR:place-order.validate.quantity** (P1): Order service MUST reject line items with quantity ≤ 0
> - **FR:place-order.charge** (P2): Order service MUST charge the customer payment method before confirming the order
>   > - @req FR:payments/charge.execute
> - **FR:place-order.output** (P2): Order confirmation (@req FR:$order-confirmation)
> ```
>
> **Priority levels**: P1 Critical (security, data integrity, core); P2 Important (errors, key features, integration); P3 Standard (default); P4 Minor (perf, tooling); P5 Informational (docs).
>
> **Deprecated**: `~~**FR:old.path**~~: [deprecated: FR:new.path]`

### Non-functional Requirements

> [INSTRUCTIONS]
> Only include enforceable, testable NFRs specific to this feature with specific, measurable targets. If none, delete this section entirely.
>
> One MUST/SHOULD/MAY statement per NFR — split multiple into sibling or nested NFRs, same as behavior FRs.

## Data Model

> [INSTRUCTIONS]
> Section required; "None" if no entities. Entity FRs use `$` prefix: `FR:$entity-name` (cross-feature: `@req FR:{feature-id}/$entity-name`). Simple primitives inline in I/O FRs.
>
> **Type precision**: P1 types MUST be exact — `double`/`float` not `number`; `Type[]` for arrays; `Type?` for optional/nullable. P2-3 SHOULD be exact when known.
>
> **Detail by priority**:
>
> - **P1**: MUST have exact **`Code`** entity name, `code` field names, and types; as needed: desc, Allowed/Default, Validation, Relationships
> - **P2**: same as P1; Validation/Relationships are SHOULD
> - **P3**: logical **bold** entity names, logical field names allowed; type required; description and Allowed/Default SHOULD; rest optional
> - **P4-P5**: logical **bold** entity names allowed; others not required
>
> ```markdown
> - **FR:$order** (P1): **`Order`** — A customer's purchase intent.
>   - `Id` (string) — Unique order identifier
>   - `CustomerId` (string)
>   - `LineItems` (LineItem[])
>     - Validation: 1-100
>   - `Total` (double)
>     - Validation: MUST equal sum of line item subtotals
>   - `Status` (string)
>     - Allowed: pending, confirmed, shipped, delivered, cancelled. Default: pending.
>   - `Notes` (string?) — Optional customer notes
>   - Relationships: An `Order` belongs to one `Customer` and has many `LineItem` records.
>
> - **FR:$shipping-quote** (P3): **Shipping Quote** — Estimated delivery cost
>   - city (string)
>   - postalCode (string)
>   - cost (number) — In customer currency
>   - shipDate (number)
> ```

## Architecture Constraints

> [INSTRUCTIONS]
> Constraints that MUST be respected during implementation. Guardrails, not implementation details; testable where feasible (annotate with @req). Behavior a test can observe (e.g., "emoji trails the label text", "GitHub access goes through `gh`") is an FR in its scenario, not a constraint. Always keep this section; write "None" if nothing beyond .xe/architecture.md applies.

## External Dependencies

> [INSTRUCTIONS]
> Tools, libraries, or frameworks this feature requires that are NOT already in `architecture.md § Technology Stack`. List only direct dependencies — what this feature itself calls (e.g., `gh` when the feature runs it). Omit internal feature dependencies (use frontmatter `dependencies` and `@req`). Always keep this section; write "None" if no external dependencies exist.
