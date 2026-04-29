---
id: feature-context
title: Feature Context Templates
description: Standardized templates and conventions for feature-level documentation (specs, data models, rollouts, decisions).
dependencies:
  - context-storage
  - product-context
  - engineering-context
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Feature Context Templates

## Purpose

Provide standardized templates and conventions for feature-level documentation — design decisions, specifications, data models, and rollout plans — so that AI agents produce consistent, enterprise-quality features without regressions.

## Scenarios

### FR:design-decisions: Design decisions documentation

Developer needs a convention for documenting design rationale so that decision context (why X over Y, what constraints drove the choice) survives across sessions and team members without cluttering the spec.

- **FR:design-decisions.location** (P3): Design decisions MUST be stored at `.xe/features/{feature-id}/design-decisions.md` when present
  > - @req FR:context-storage/storage.project
- **FR:design-decisions.heading** (P3): File MUST use H1 format `# Design Decisions: {feature-name}` where feature-name is the human-readable feature title (not the kebab-case ID)
- **FR:design-decisions.scope** (P3): Each decision entry MUST include:
  - **Decision**: What was chosen
  - **Date**: When the decision was made (YYYY-MM-DD)
  - **Why**: The constraint or tradeoff that drove the choice — MUST be self-standing (no authority-based reasoning like "per user request" or "it was a requirement"); a future reader with no prior context must be able to determine whether the decision still holds
  - **Rejected**: Alternatives considered and why they were rejected (omit only if no alternatives existed)
  - **Evidence**: Links to supporting evidence where applicable (benchmarks, documentation, GitHub issues, ADRs, relevant PRs) so that claims are verifiable
  - MUST NOT contain: research/analysis (ephemeral), implementation notes (use code comments), post-implementation learnings (use feedback.md), or requirements (use spec.md)
- **FR:design-decisions.template** (P2): Template MUST exist at `src/resources/templates/specs/design-decisions.md` and follow template standard
  > - @req FR:context-storage/templates.framework
  > - @req FR:context-storage/standards.catalyst-templates

### FR:spec: Feature specification template

Developer needs a structured template for defining feature requirements so that every feature captures complete, scenario-driven specifications with traceable requirements.

- **FR:spec.template** (P1): Template MUST exist at `src/resources/templates/specs/spec.md` and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/templates.framework
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:spec.purpose** (P1): Template MUST include Purpose section for the feature's mission statement defining what, why, and scope boundaries
- **FR:spec.scenarios** (P2): Template MUST include Scenarios section where each scenario IS a functional requirement with a unique ID (`FR:{scenario-id}`) describing what a recognized persona needs
- **FR:spec.scenarios.format** (P2): Each scenario MUST follow the format: `### FR:{scenario-id}: {scenario-name}` followed by `{actor} needs to {action} so that {value}`
- **FR:spec.scenarios.sub-reqs** (P2): Scenarios MUST support nested sub-requirements: `- **FR:{scenario-id}.{sub-id}** (P1-P5): MUST/SHOULD/MAY statement`
- **FR:spec.scenarios.deps** (P2): Sub-requirements that depend on requirements owned by other features MUST include bulleted blockquote `@req` links to each upstream FR that is explicitly depended on
  - **FR:spec.scenarios.deps.level** (P2): Links MUST target the lowest-level FR that owns the precise requirement being depended on
  - **FR:spec.scenarios.deps.format** (P2): Links MUST use format: `> - @req FR:{feature-id}/{fr-id}`
- **FR:spec.scenarios.structure** (P2): Each scenario MUST decompose into L2 sub-FRs in this order:
  - `FR:{scenario-id}.{interface-name}` — 1+ interfaces (mobile, web, mcp, cli, api, {file-format}) where the feature is exposed
  - `FR:{scenario-id}.input` — what flows into the scenario
  - `FR:{scenario-id}.{behavior-name}` — 1+ behaviors using domain-meaningful names
  - `FR:{scenario-id}.output` — what flows out
  - Authors MAY omit slots not relevant (e.g., a constraint-only FR has only behaviors). Authors MAY use domain-meaningful names instead of literal `.input` / `.output` when clearer.
  - **FR:spec.scenarios.structure.io** (P2): Input and Output MUST be `{content} ({type}) — {optional-description}` where the type is a simple primitive or `@req` link to a defined data model FR (`FR:${entity}` or `FR:{feature}/${entity}`)
    > - @req FR:spec.data-model.id
  - **FR:spec.scenarios.structure.interface** (P3): Interface sub-FRs MUST name the interface using a short label (e.g., `cli`, `mcp`, `api`, `web`, `mobile`, `{file-format}`) and describe availability or behavior on that interface sorted outside-in (logical callstack order)
    - Internal interfaces (between internal features) MUST NOT include implementation details (URLs, ports, command names, route paths).
    - Public interfaces (exposed to consumers outside the project — published APIs, CLI commands users invoke, file formats that are the feature's contract) MUST include those details since the details ARE the contract.
    - Multi-interface scenarios list one sub-FR per interface, OR a single sub-FR with an interface list when behavior is identical across them.
- **FR:spec.scenarios.priority** (P3): Template MUST define priority levels P1 (Critical) through P5 (Informational)
  > - @req FR:engineering-context/eng.quality.priority.defaults
- **FR:spec.scenarios.personas** (P2): Scenarios MUST reference `.xe/product.md § Personas` and require ONLY recognized personas
  > - @req FR:product-context/product.personas
- **FR:spec.nfr** (P3): Template MUST include Non-functional Requirements subsection, explicitly optional with guidance to delete if no measurable targets exist
- **FR:spec.data-model** (P2): Template MUST include Data Model section; section MUST be present, "None" if no entities (so AI doesn't skip when entities are added later)
  - **FR:spec.data-model.section** (P2): All entities MUST be defined in `## Data Model` H2 section (after Scenarios)
  - **FR:spec.data-model.id** (P2): Entities MUST be defined as FRs with `$` prefix and kebab-cased name (`FR:$entity-name`)
  - **FR:spec.data-model.format** (P2): Entities MUST use simple list format, not code:

    ```markdown
    - **FR:${entity-name}** (P1-5): **`{entity-name}`** – {optional-description}
      - `{field}` ({type}) – {optional-description}
        - [Optional] Allowed: {values}; Default: {value}
        - [Optional] Validation – ...
      - [Optional] Relationships – ...
    ```

    - **FR:spec.data-model.format.entity** (P3): Entity names MUST be **bold**; P1-2 MUST use exact names in `code`
    - **FR:spec.data-model.format.desc** (P3): P1-2 entities MUST include an entity description if not obvious; P3 SHOULD
    - **FR:spec.data-model.format.field-name** (P2): P1-2 entities MUST use exact field names in `code`
    - **FR:spec.data-model.format.field-type** (P2): P1-3 entities MUST include field type
      - **FR:spec.data-model.format.field-type.precision** (P3): P1 entities MUST use exact types (e.g., `float` or `double` over `number`; `{type}[]` for arrays, `{type}?` for optional)
    - **FR:spec.data-model.format.field-values** (P2): P1-2 entities MUST include allowed and default values as a nested bullet; P3 SHOULD – simple sets MAY be included in description (`Allowed: Val1, Val2. Default: Val1.`)
    - **FR:spec.data-model.format.field-valid** (P3): P1 entities MUST include field validation rules, if any; P2 SHOULD – simple rules MAY be included in description
    - **FR:spec.data-model.format.rels** (P3): P1 entities MUST include entity relationships in prose or nested bullets; P2 SHOULD
      - **FR:spec.data-model.format.rels.style** (P5): Relationship lines MUST use `code` for exact entity names; _italic_ MAY be used for logical entity names

    ```markdown
    - **FR:$p1-order-details** (P1): **`OrderDetails`** — Newly submitted customer order before preprocessing
      - `OrderId` (string)
      - `Products` (string[]) — List of product IDs; at least 1, no more than 100 per order (backend limitation)
      - `Nickname` (string?) — Customer alias for the order
      - `Subtotal` (real)
      - `Tax` (real) — Obtained using GetTax() API
      - `Total` (real)
      - `PaymentMethod` (@req FR:payments/$payment-method)
      - `Status` (string)
        - Allowed: Submitted, Paid, Delivered; Default: Submitted
        - Validation: Fraud check required before payment processing
      - Relationships: A `User` owns many `OrderDetails` instances. A `User` belongs to one `Organization`.
    - **FR:$p3-order-details** (P3): **Order Details**
      - Order ID (string)
      - Product List (array)
      - Nickname (string) — Optional
      - Subtotal, Tax, Total (number)
      - Payment (@req FR:payments/$payment-method)
      - Status (string) — Allowed: Submitted, Paid, Delivered; Default: Submitted
      - Relationships: A _User_ owns many _Orders_. A _User_ belongs to one _Organization_.
    ```

- **FR:spec.constraints** (P2): Template MUST include Architecture Constraints section for testable guardrails (annotated with `@req`); section MUST always be present with "None" if no constraints beyond `.xe/architecture.md` apply
  > - @req FR:engineering-context/arch.patterns
- **FR:spec.dependencies** (P2): Template MUST include External Dependencies section listing tools, libraries, or frameworks NOT already in `architecture.md § Technology Stack` that this feature requires; section MUST always be present with "None" if no external dependencies exist
- **FR:spec.frontmatter** (P2): Template MUST include frontmatter with `id`, `title`, `description`, and `dependencies` fields; MUST NOT include `author` or `status`
  - **FR:spec.frontmatter.description** (P2): `description` field MUST be a required, single-line summary (≤120 chars) of the feature's scope, written as a sentence fragment suitable for the feature index; MUST NOT repeat the title verbatim

### FR:rollout: Rollout plan template

Playbook executor needs a rollout tracking template so that multi-feature work survives context resets and interrupted runs can be resumed.

- **FR:rollout.template** (P1): Template MUST exist at `src/resources/templates/specs/rollout.md` and follow template standard
  > - @req FR:context-storage/templates.framework
- **FR:rollout.location** (P2): Rollout plans MUST be stored at `.xe/rollouts/rollout-{id}.md`
  > - @req FR:context-storage/storage.project
- **FR:rollout.frontmatter** (P3): Template MUST support optional frontmatter with `features`, `status`, `created`, and `last_updated` fields for AI crash recovery
- **FR:rollout.overview** (P2): Template MUST include Overview section describing what the rollout accomplishes with enough context for a new run to pick up without re-reading conversation history
- **FR:rollout.runs** (P2): Template MUST support `## Run N: {name}` sections, each self-contained with Pre-implementation, Features, Post-implementation, and Notes subsections
- **FR:rollout.pre-implementation** (P3): Each run MUST include Pre-implementation section for tasks before feature work (e.g., migrations, dependency upgrades, infrastructure setup); section is deletable if not needed
- **FR:rollout.features** (P2): Each run MUST include Features section with `#### {feature-id}` sub-headings grouping checkbox-format tasks by feature in dependency order
- **FR:rollout.post-implementation** (P2): Each run MUST include Post-implementation section for tasks after feature work
  - **FR:rollout.post-implementation.tasks** (P3): Section MUST support project-specific tasks (e.g., data migrations, cleanup, monitoring) and standard per-run closure tasks: present work for review, route external issues
- **FR:rollout.notes** (P3): Template MUST include a rollout-level Notes section for design decisions, blockers, constraints, and resumption context; notes are appended, never overwritten
- **FR:rollout.active-state** (P2): Template MUST include an Active State section placed at the top of the rollout (immediately after the H1 heading, before Overview) so a successor agent reads it first
  - Section MUST contain these fields: Model (current mental model not yet in spec), Decisions (load-bearing decisions made this session not yet recorded elsewhere), Open (questions pending user answer or flagged unresolved), Next (literal imperative for next step), Pins (file:line-range references with short anchor text), Assumptions (things treated as true without verifying this session)
  - Each field MUST use terse one-line examples in the template to signal brevity expectation
- **FR:rollout.active-state.overwrite** (P2): Active State MUST use overwrite semantics — each update replaces the section in full; no append history retained
  - Distinct from Notes (append-only) so the distinction is unambiguous
  - Prevents stale content from accumulating; enforces that the section always reflects current state
- **FR:rollout.final-review** (P2): Template MUST include Final Review section as an AI checkpoint that executes only when all runs complete; AI must validate no unchecked tasks or unresolved blockers remain before proceeding to cleanup and closure
- **FR:rollout.ephemeral** (P2): All rollout files are ephemeral and MUST be deleted when the rollout is complete; rollout files MAY be persisted if they are pending completion

### FR:feedback: Feedback file convention

Developer needs a convention for capturing post-implementation learnings so that improvement ideas, bug observations, and enhancement requests discovered after building a feature are tracked consistently without cluttering specs or design decisions.

- **FR:feedback.location** (P2): Feedback MUST be stored at `.xe/features/{feature-id}/feedback.md` when present
  > - @req FR:context-storage/storage.project
- **FR:feedback.scope** (P2): Feedback entries capture post-implementation observations: improvement ideas, bug reports, enhancement requests, architectural concerns, and process friction discovered after building a feature
  - MUST NOT contain: requirements (use spec.md), design rationale (use design-decisions.md), or implementation notes (use code comments)
- **FR:feedback.format** (P2): Feedback items MUST be grouped under H2 headings with bullet-point content
- **FR:feedback.template** (P2): Template MUST exist at `src/resources/templates/specs/feedback.md` and follow template standard
  > - @req FR:context-storage/templates.framework
  > - @req FR:context-storage/standards.catalyst-templates

### FR:index: Feature index

AI Agent needs an at-a-glance listing of every feature so that it can orient itself across a 100+ feature inventory without reading each spec.

- **FR:index.location** (P2): Feature index MUST be stored at `.xe/features/README.md`
  > - @req FR:context-storage/storage.project
- **FR:index.generated** (P2): Feature index MUST be auto-generated from feature spec frontmatter — never hand-edited; regeneration MUST be idempotent and produce no diff when inputs are unchanged
  > - @req FR:context-storage/storage.project
- **FR:index.content** (P2): Each feature MUST appear as one entry sourced from its `id`, `title`, and `description` frontmatter fields; entries MUST be ordered deterministically (alphabetical by `id`) so regeneration is stable
- **FR:index.generated-marker** (P3): Index MUST declare it is auto-generated at the top of the file so a human editor knows to modify the source frontmatter rather than the index

### Non-functional Requirements

- **NFR:cost** (P4): Cost & usage efficiency
  - **NFR:cost.tokens**: Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - **NFR:cost.instructions**: Instruction blocks SHOULD be clear and actionable to enable efficient AI completion

- **NFR:reliability** (P3): Reliability
  - **NFR:reliability.markdown**: Templates MUST use standard markdown syntax for maximum compatibility
  - **NFR:reliability.structure**: Templates MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

- **NFR:testability** (P3): Testability
  - **NFR:testability.validation**: Templates MUST have automated validation tests (Jest) verifying structure and completeness

## Architecture Constraints

None

## External Dependencies

None
