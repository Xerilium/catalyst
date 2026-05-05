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
> Each scenario IS a functional requirement describing what an actor needs. Use ONLY personas defined in `.xe/product.md § Personas`.
>
> **Format**: `### FR:{scenario-id}: {scenario-name}` then "{actor} needs to {action} so that {value}."
>
> **External-only**: Each scenario MUST describe an external interaction — a persona's use of the feature through one of its external interfaces (external relative to the feature's boundary). Internal phases or organizational sections belong as behavior sub-FRs, not scenarios.
>
> **Structure**: Decompose into FRs (`- **FR:{scenario-id}.{sub-id}** (P1-P5): MUST/SHOULD/MAY ...`) ordered outside-in (interfaces → input → behaviors → output). Sub-FRs MAY nest as deep as the domain warrants.
>
> - `FR:{scenario-id}.{interface-name}` — 1+ interfaces (`mobile`, `web`, `mcp`, `cli`, `api`, `markdown`, `{file-format}`), outermost first
> - `FR:{scenario-id}.input` — what flows in (named information, not a code type)
> - `FR:{scenario-id}.{behavior-name}` — 1+ behaviors, named for the domain
> - `FR:{scenario-id}.output` — what flows out (named information, not a code type)
>
> Omit slots that don't apply. Use domain-meaningful names instead of literal `.input`/`.output` when clearer. Cross-feature deps: `> - @req FR:{feature-id}/{fr-id}` under the FR, targeting the lowest-level upstream FR.
>
> **Pattern variations** — slot interpretation adapts to the scenario's domain:
>
> - **Function/operation**: interface = api/cli/web/etc; input = data needed; behaviors = logic; output = return value or side effects
> - **Templated artifact**: interface = format (`markdown`/`yaml`/`json`); input = template; behaviors = content requirements; output = target location
> - **Data structure**: interface = class/interface; input = constructor inputs; behaviors = object requirements; output = entity FR (`FR:${entity}`)

### FR:{scenario-id}: {scenario-name}

{actor} needs to {action} so that {value}.

> [INSTRUCTIONS]
> Slot content: `{content} ({type}) — {description}` where `{type}` is a primitive (`string`, `number`, `boolean`) or `@req` entity reference. Behaviors use MUST/SHOULD/MAY. Interface FRs cover the contract surface only — never enumerate parameters (those go in `.input`). Defer `@req` entities to the Data Model section.
>
> **Multi-value slots**: When a slot carries multiple logical values, list each as a nested bullet. Name slots for the *logical* content the feature reasons about, not the wire-level container delivering it (e.g., a free-form `description` parsed into multiple logical inputs → list the parsed inputs).
>
> ```markdown
> - **FR:place-order.api** (P2): Interface: `api` — `POST /orders` (public contract)
> - **FR:place-order.input** (P2):
>   - Order request (@req FR:$order) — submitted by an authenticated customer
>   - Idempotency key (string) — client-supplied, prevents double-submit
> - **FR:place-order.validate** (P1): System MUST validate items reference active products and quantity>0
> - **FR:place-order.charge** (P2): System MUST charge customer payment method before confirming order
>   > - @req FR:payments/charge.execute
> - **FR:place-order.output** (P2): Order confirmation (@req FR:$order-confirmation)
> ```
>
> **Priority levels**: P1 Critical (security, data integrity, core); P2 Important (errors, key features, integration); P3 Standard (default); P4 Minor (perf, tooling); P5 Informational (docs).
>
> **Deprecated**: `~~**FR:old.path**~~: [deprecated: FR:new.path]`

### Non-functional Requirements

> [INSTRUCTIONS]
> Only include when there are enforceable, testable NFRs specific to this feature with specific, measurable targets. If none, delete this section entirely.

## Data Model

> [INSTRUCTIONS]
> Section required; "None" if no entities. Entity FRs use `$` prefix: `FR:$entity-name` (cross-feature: `@req FR:{feature-id}/$entity-name`). Simple primitives inline in I/O FRs.
>
> **Type precision**: P1 types MUST be exact — `double`/`float` not `number`; `Type[]` for arrays; `Type?` for optional/nullable. P2-3 SHOULD be exact when known.
>
> **Detail by priority**:
>
> - **P1**: MUST have exact **`Code`** entity name, exact `code` field names, exact types; As needed: entity/field desc, Allowed/Default, Validation, Relationships
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
> Design decisions and constraints that MUST be respected during implementation. Guardrails, not implementation details. Each should be testable where feasible (annotate with @req). Always keep this section; write "None" if nothing beyond .xe/architecture.md applies.

## External Dependencies

> [INSTRUCTIONS]
> Tools, libraries, or frameworks this feature requires that are NOT already in `architecture.md § Technology Stack`. Omit internal feature dependencies (use frontmatter `dependencies` and `@req` annotations instead). Always keep this section; write "None" if no external dependencies exist.
