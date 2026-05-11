---
id: feature-context
title: Feature Context Templates
description: Standardized templates and conventions for feature-level documentation (specs, data models, rollouts, decisions).
dependencies:
  - context-storage
  - product-context
  - engineering-context
  - req-traceability
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

- **FR:design-decisions.@file** (P3): Interface: `.xe/features/{feature-id}/design-decisions.md`
  > - @req FR:context-storage/storage.project
- **FR:design-decisions.template** (P2): Input: Design decisions MUST use a `src/resources/templates/specs/design-decisions.md` template, following the template standard
  > - @req FR:context-storage/templates.framework
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:design-decisions.heading** (P3): File MUST use H1 format `# Design Decisions: {feature-name}` where feature-name is the human-readable feature title (not the kebab-case ID)
- **FR:design-decisions.scope** (P3): Each decision entry MUST include:
  - **Decision**: What was chosen
  - **Date**: When the decision was made (YYYY-MM-DD)
  - **Why**: The constraint or tradeoff that drove the choice — MUST be self-standing (no authority-based reasoning like "per user request" or "it was a requirement"); a future reader with no prior context must be able to determine whether the decision still holds
  - **Rejected**: Alternatives considered and why they were rejected (omit only if no alternatives existed)
  - **Evidence**: Links to supporting evidence where applicable (benchmarks, documentation, GitHub issues, ADRs, relevant PRs) so that claims are verifiable
  - MUST NOT contain: research/analysis (ephemeral), implementation notes (use code comments), post-implementation learnings (use feedback.md), or requirements (use spec.md)

### FR:spec: Feature specification template

Developer needs a structured template for defining feature requirements so that every feature captures complete, scenario-driven specifications with traceable requirements.

- **FR:spec.@file** (P1): Interface: `.xe/features/{feature-id}/spec.md`
  > - @req FR:context-storage/storage.project
- **FR:spec.template** (P1): Input: Feature specs use a `src/resources/templates/specs/spec.md` template, following the template standard
  > - @req FR:context-storage/templates.framework
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:spec.purpose** (P1): Template MUST include Purpose section for the feature's mission statement defining what, why, and scope boundaries
- **FR:spec.scenarios** (P2): Template MUST include Scenarios section where each scenario IS a functional requirement with a unique ID (`FR:{scenario-id}`) describing what a recognized persona needs
  - **FR:spec.scenarios.format** (P2): Scenarios MUST follow the format: `### FR:{scenario-id}: {scenario-name}` followed by `{actor} needs to {action} so that {value}`
  - **FR:spec.scenarios.external** (P2): Scenarios MUST describe external or inter-feature interactions thru defined interfaces
    - Scenarios MUST answer "who does what with this feature, and thru what surface"
    - Internal phases, organizational sections, and implementation steps are behavior FRs
  - **FR:spec.scenarios.patterns** (P3): Scenarios SHOULD map interfaces/input/behaviors/output to the scenario:
    - **FR:spec.scenarios.patterns.function** (P3): Functions/operations: interface = `@api`/`@cli`/`@web`/etc; input = data needed; behaviors = logic; output = return value or side effects
    - **FR:spec.scenarios.patterns.artifact** (P3): Data file artifacts (markdown): interface = `@file` (path); input = template; behaviors = content requirements; no separate output FR — `@file` IS the address
    - **FR:spec.scenarios.patterns.structured-artifact** (P3): Structured file artifacts: interface = format sigil (`@yaml`, `@json`) with file path; input = template/schema; behaviors = field/structure requirements; no separate output FR
    - **FR:spec.scenarios.patterns.data-structure** (P3): Data structures (class/interface, plain object): NOT a scenario interface — define as `$entity` FR in the Data Model section; scenarios reference the entity via `@req FR:$entity` in input/output
    - Other shapes are valid when the feature domain warrants: interface = how the feature is triggered; input = external data needed (may be none); behaviors = what it does; output = what it makes available outside the feature
  - **FR:spec.scenarios.sub-reqs** (P2): Scenarios MUST support hierarchical, multi-level nested requirements with no fixed depth: `- **FR:{scenario-id}.{sub-id}[.{sub-id}...]** (P1-P5): MUST/SHOULD/MAY statement`
  - **FR:spec.scenarios.deps** (P2): Requirements MUST include bulleted blockquote `@req` links to each upstream FR that is a direct dependency
    - **FR:spec.scenarios.deps.level** (P2): Links MUST target the lowest-level FR that owns the precise requirement being depended on
    - **FR:spec.scenarios.deps.format** (P2): Links MUST use format: `> - @req FR:{feature-id}/{fr-id}`
  - **FR:spec.scenarios.structure** (P2): Each scenario MUST decompose into FRs that outline the interface(s) exposed, input needed, behavior(s) performed, and output returned in this order (each may nest further FRs):
    - **FR:spec.scenarios.structure.interfaces** (P2): Scenarios MUST include 1+ interface FRs with terse names (mobile, web, mcp, cli, api, {file-format}, {framework-construct}); interfaces SHOULD be sorted outside-in (logical callstack order)
      - **FR:spec.scenarios.structure.interfaces.sigil** (P2): Interface FRs MUST prefix the interface token with `@` to mark the FR as a public surface
        > - @req FR:req-traceability/id.format.interface
        - Example: `FR:design-decisions.@file`, `FR:index.@cli`, `FR:workflow.@ai-command`
      - **FR:spec.scenarios.structure.interfaces.kinds** (P2): Sigil names the surface kind (HOW the surface is invoked or addressed), NOT the wire format. Common surface kinds: `@cli`, `@api`, `@web`, `@mcp`, `@mobile`, `@slash-command`, `@ai-command`, `@playbook` (executable file invoked by orchestration), `@file` (data file consumers read/parse), `@event`. Body MUST be the literal address (path, command, endpoint, event name); for singleton files like a feature's README, the address is the absolute file path
      - **FR:spec.scenarios.structure.interfaces.internal** (P3): Scenarios SHOULD NOT list internal feature interfaces
      - **FR:spec.scenarios.structure.interfaces.contract** (P3): Scenarios MUST include connection string for external interfaces and MUST NOT include parameters
    - **FR:spec.scenarios.structure.input** (P2): Scenarios MUST have 1 `input` FR that defines the inputs expected by the interfaces; inputs MAY come from sources other than interface params; FR MAY use domain-meaningful name when clearer
    - **FR:spec.scenarios.structure.behaviors** (P2): Scenarios MUST define 1+ FRs for critical behaviors using domain-meaningful names
    - **FR:spec.scenarios.structure.output** (P2): Scenarios MUST have 1 `output` FR that defines the outputs of the scenario; outputs MAY include destinations other than interface returns; FR MAY use domain-meaningful name when clearer
    - **FR:spec.scenarios.structure.data-model** (P2): Scenario input/output MUST use `{content} ({type}) — {optional-description}` where the type is a simple primitive or `@req` link to a defined data model FR (`FR:${entity}` or `FR:{feature}/${entity}`); list as nested bullets when there are multiple or when content is logically mapped to multiple values (e.g., AI I/O)
      > - @req FR:spec.data-model.id
  - **FR:spec.scenarios.priority** (P3): Template MUST define priority levels P1 (Critical) through P5 (Informational)
    > - @req FR:engineering-context/eng.quality.priority.defaults
  - **FR:spec.scenarios.personas** (P2): Scenarios MUST reference `.xe/product.md § Personas` and require ONLY recognized personas
    > - @req FR:product-context/product.personas
- **FR:spec.nfr** (P3): Template MUST include Non-functional Requirements subsection, explicitly optional with guidance to delete if no measurable targets exist
- **FR:spec.data-model** (P2): Template MUST include Data Model section; section MUST be present, "None" if no entities (so AI doesn't skip when entities are added later)
  - **FR:spec.data-model.section** (P2): All entities MUST be defined in `## Data Model` H2 section (after Scenarios)
  - **FR:spec.data-model.id** (P2): Entities MUST be defined as FRs with `$` prefix and kebab-cased name (`FR:$entity-name`)
    > - @req FR:req-traceability/id.format.entity
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

- **FR:rollout.@file** (P1): Interface: `.xe/rollouts/rollout-{id}.md`
  > - @req FR:context-storage/storage.project
- **FR:rollout.template** (P1): Authoring MUST start from the rollout template at `src/resources/templates/specs/rollout.md`, following the template standard
  > - @req FR:context-storage/templates.framework
- **FR:rollout.frontmatter** (P3): Template MUST support optional frontmatter with `features`, `status`, `created`, and `last_updated` fields for AI crash recovery
- **FR:rollout.overview** (P2): Template MUST include Overview section describing what the rollout accomplishes with enough context for a new run to pick up without re-reading conversation history
- **FR:rollout.runs** (P2): Template MUST support `## Run N: {name}` sections, each self-contained with Pre-implementation, Features, Post-implementation, and Notes subsections
- **FR:rollout.pre-implementation** (P3): Each run MUST include Pre-implementation section for tasks before feature work (e.g., migrations, dependency upgrades, infrastructure setup); section is deletable if not needed
- **FR:rollout.features** (P2): Each run MUST include Features section with `#### {feature-id}` sub-headings grouping checkbox-format tasks by feature in dependency order
  - **FR:rollout.features.parallel** (P2): Tasks that can run concurrently MUST be grouped as nested children under a parent label bullet `- 🔀 Execute in parallel:`
  - **FR:rollout.features.sequential** (P3): Tasks that MUST run in order within a parallel group MUST be grouped as nested children under a parent label bullet `- 🔗 Execute in sequence:` (used as a child of `🔀 Execute in parallel:`)
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

- **FR:feedback.@file** (P2): Interface: `.xe/features/{feature-id}/feedback.md`
  > - @req FR:context-storage/storage.project
- **FR:feedback.template** (P2): Authoring MUST start from the feedback template at `src/resources/templates/specs/feedback.md`, following the template standard
  > - @req FR:context-storage/templates.framework
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:feedback.scope** (P2): Feedback entries MUST capture post-implementation observations: improvement ideas, bug reports, enhancement requests, architectural concerns, and process friction discovered after building a feature
  - MUST NOT contain: requirements (use spec.md), design rationale (use design-decisions.md), or implementation notes (use code comments)
- **FR:feedback.format** (P2): Feedback items MUST be grouped under H2 headings with bullet-point content
  - **FR:feedback.format.reuse** (P2): H2s group themes, not items; new H2s MUST be added only when no existing H2 fits

### FR:index: Feature index

AI Agent needs an at-a-glance listing of every feature so that it can orient itself across a 100+ feature inventory without reading each spec.

- **FR:index.@cli** (P2): Interface: `catalyst index`
- **FR:index.@file** (P2): Interface: `.xe/features/README.md`
  > - @req FR:context-storage/storage.project
- **FR:index.input** (P2): Index regeneration MUST read spec frontmatter (`id`, `title`, `description`) from every feature spec at `.xe/features/{feature-id}/spec.md`
  > - @req FR:spec.@file
  > - @req FR:spec.frontmatter
- **FR:index.generated** (P2): Feature index MUST be auto-generated — never hand-edited; regeneration MUST be idempotent and produce no diff when inputs are unchanged
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
