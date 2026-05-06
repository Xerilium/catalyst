# Blueprint: {product-name}

<!-- markdownlint-disable single-title -->

## Architecture

> [INSTRUCTIONS]
> Visualize feature dependencies grouped by functional area.

```mermaid
graph TD
  subgraph areaA[{functional-area-a}]
    a[{feature-a}]
    b[{feature-b}]
  end
  subgraph areaB[{functional-area-b}]
    c[{feature-c}]
  end
  c --> a
  c --> b
```

## Data Model

> [INSTRUCTIONS]
> Visualize the entities the product owns and operates on. Shape varies by product type:
>
> - **Apps with managed entities**: business object model (User, Order, Project)
> - **Data products**: richer database modeling
> - **Lightweight tools** (browser-direct, config-driven): config + session/runtime state
>
> Do NOT model unstructured or semi-structured data managed outside the product (e.g., source data a reporting tool reads but doesn't own). Reference such inputs in feature specs as needed.

```mermaid
classDiagram
  class EntityA {
    +id
    +name
  }
  class EntityB {
    +id
  }
  EntityA "1" --> "*" EntityB : owns
```

## Roadmap

> [INSTRUCTIONS]
> Phased implementation with dependency waves, visualized in a gantt chart. Phases MUST follow `.xe/product.md § Product Strategy`. A wave is a batch of features that can run in parallel because none of its members depend on another; the next wave starts only when the prior one completes. Features MUST include ID, complexity (Small / Medium / Large), one-sentence purpose, scope boundaries, and dependencies. Built features collapse to a link to the spec.
>
> **Gantt date format**: Use `dateFormat X` (sequence numbers) unless the user specifies hard deadlines.

```mermaid
gantt
  title Roadmap
  dateFormat X
  axisFormat %s
  section Phase 1
    {feature-a} :a, 0, 1
    {feature-b} :b, 0, 1
    {feature-c} :c, after a b, 2
  section Phase 2
    {feature-d} :d, after c, 2
```

> Each feature MUST schedule via `after` referencing its dependency tasks (or `0` for wave 1.1 with no dependencies). Avoid `:a, 0, 1` for non-foundation tasks — that puts everything at time 0 and produces a useless visualization.

### Phase 1: {phase-name}

_Strategic intent: one sentence on what this phase achieves._

#### Wave 1.1

- **{feature-a}** — [spec]({feature-a}/spec.md)
- **{feature-b}** (Medium) — _purpose in one sentence_
  - Scope: _what's in / what's out_
  - Dependencies: none

#### Wave 1.2

- **{feature-c}** (Large) — _purpose in one sentence_
  - Scope: _what's in / what's out_
  - Dependencies: {feature-a}, {feature-b}
  - Open questions: _unresolved decisions blocking spec creation (omit when none)_

### Phase 2: {phase-name}

_Strategic intent: one sentence._

- **{feature-d}** (Medium) — _purpose in one sentence_
  - Scope: _what's in / what's out_
  - Dependencies: {feature-c}
