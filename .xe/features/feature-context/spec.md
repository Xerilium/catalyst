---
id: feature-context
title: Feature Context Templates
description: Standardized templates and conventions for feature-level documentation (specs, data models, rollouts, decisions).
dependencies:
  - context-storage
  - engineering-context
  - product-context
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
  - **FR:design-decisions.heading.decision** (P3): AI Agent MUST write each decision's H2 as the decision itself, in plain language
    - Rationale: Readers learn the outcome without opening the section.
- **FR:design-decisions.criteria** (P2): AI Agent MUST record a decision only when distinct options existed
  - **FR:design-decisions.criteria.impact** (P2): AI Agent MUST record only decisions that change an outcome, add a limitation, or invite later refutation
  - **FR:design-decisions.criteria.exclusions** (P2): AI Agent MUST NOT record execution details with negligible customer, outcome, UX, or API impact
    - **FR:design-decisions.criteria.exclusions.point-in-time** (P2): AI Agent MUST NOT record point-in-time choices that no later evidence could refute
    - **FR:design-decisions.criteria.exclusions.destination** (P2): AI Agent MUST put excluded details in pull request comments
- **FR:design-decisions.active** (P2): AI Agent MUST keep only active decisions in the file
  - **FR:design-decisions.active.supersede** (P2): AI Agent MUST update an existing entry in place when its decision changes
    - **FR:design-decisions.active.supersede.no-overlap** (P2): AI Agent MUST NOT add a second entry that overlaps an existing one
- **FR:design-decisions.scope** (P3): Each decision entry MUST include:
  - **Decision**: What was chosen
  - **Date**: When the decision was last set or changed (YYYY-MM-DD)
  - **Why**: The constraint or tradeoff that drove the choice — MUST be self-standing (no authority-based reasoning like "per user request" or "it was a requirement"); a future reader with no prior context must be able to determine whether the decision still holds
  - **Rejected**: The distinct options that lost and why
  - **Evidence**: Links to supporting evidence where applicable (benchmarks, documentation, GitHub issues, ADRs, relevant PRs) so that claims are verifiable
  - MUST NOT contain: research/analysis (ephemeral), implementation notes (use code comments), post-implementation learnings (use feedback.md), or requirements (use spec.md)

### FR:spec: Feature specification template

Developer needs a structured template for defining feature requirements so that every feature captures complete, scenario-driven specifications with traceable requirements.

- **FR:spec.@file** (P1): Interface: `.xe/features/{feature-id}/spec.md`
  > - @req FR:context-storage/storage.project
  - **FR:spec.@file.nesting** (P2): `{feature-id}` MAY contain `/` to group features under subfolders, such as `portal/shell`
    - **FR:spec.@file.nesting.path** (P2): The ID MUST be the full relative path from `.xe/features/` to the spec directory
- **FR:spec.template** (P1): Input: Feature specs use a `src/resources/templates/specs/spec.md` template, following the template standard
  > - @req FR:context-storage/templates.framework
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:spec.purpose** (P1): Template MUST include Purpose section for the feature's mission statement defining what, why, and scope boundaries
  - **FR:spec.purpose.mission-only** (P2): Purpose MUST be a simple, high-level mission statement (1-3 sentences)
    - MUST NOT restate or enumerate scenarios/FRs
  - **FR:spec.purpose.vision-stable** (P2): Purpose MUST convey the feature's enduring vision
    - Rationale: Purpose stays valid as scenarios and FRs evolve.
    - MUST NOT document specific scenarios, flows, or capabilities that change as the feature grows
- **FR:spec.scenarios** (P2): Template MUST include a Scenarios section
  - **FR:spec.scenarios.id** (P2): Each scenario MUST be a functional requirement with a unique ID (`FR:{scenario-id}`)
  - **FR:spec.scenarios.need** (P2): Each scenario MUST describe what a recognized persona needs
  - **FR:spec.scenarios.format** (P2): Scenarios MUST follow the format: `### FR:{scenario-id}: {scenario-name}` followed by `{actor} needs to {action} so that {value}`
    - **FR:spec.scenarios.format.actor** (P2): `{actor}` MUST be the requirement owner, stated first in the sentence
      > - @req FR:spec.scenarios.personas
  - **FR:spec.scenarios.coverage** (P2): Scenarios MUST cover externally observable units of behavior, including inter-feature interactions
    - **FR:spec.scenarios.coverage.internal** (P2): Scenarios MUST cover internal units no external caller triggers, such as jobs, schedulers, and loops
    - Each scenario MUST answer "what observable unit of behavior does this represent, and what triggers it (caller, schedule, event, etc.)"
    - Organizational sections and implementation steps within a unit of behavior remain behavior FRs, not scenarios
    - **FR:spec.scenarios.coverage.decisions** (P2): Template MUST direct that a decision or scenario detail be an FR within its scenario
      - **FR:spec.scenarios.coverage.decisions.nested** (P2): Template MUST direct that an FR refining another FR nest beneath it
      - **FR:spec.scenarios.coverage.decisions.not-scenario** (P2): Template MUST direct that a decision or detail not become its own scenario
  - **FR:spec.scenarios.patterns** (P3): Scenarios SHOULD map interfaces/input/behaviors/output to the scenario:
    - **FR:spec.scenarios.patterns.function** (P3): Functions/operations: interface = `@api`/`@cli`/`@page`/etc; input = data needed; behaviors = logic; output = return value or side effects
    - **FR:spec.scenarios.patterns.artifact** (P3): Data file artifacts (markdown) use `@file` with the path as interface
      - Input is the template. Behaviors state content requirements. No separate output FR: `@file` is the address.
    - **FR:spec.scenarios.patterns.structured-artifact** (P3): Structured file artifacts use a format sigil (`@yaml`, `@json`) and file path as interface
      - Input is the template or schema. Behaviors state field and structure requirements. No separate output FR.
    - **FR:spec.scenarios.patterns.data-structure** (P3): Data structures (class/interface, plain object) are not scenario interfaces; define each as a `$entity` FR in Data Model
      - Scenarios reference the entity via `@req FR:$entity` in input/output.
    - Other shapes are valid when the feature domain warrants: interface = how the feature is triggered; input = external data needed (may be none); behaviors = what it does; output = what it makes available outside the feature
  - **FR:spec.scenarios.sub-reqs** (P2): Scenarios MUST support hierarchical, multi-level nested requirements with no fixed depth: `- **FR:{scenario-id}.{sub-id}[.{sub-id}...]** (P1-P5): MUST/SHOULD/MAY statement`
    - **FR:spec.scenarios.sub-reqs.grouping** (P3): Related FRs SHOULD group under a shared parent FR by concern; depth is encouraged where it clarifies structure
    - **FR:spec.scenarios.sub-reqs.namespacing** (P2): Nested FRs MUST be dot-namespaced under their parent (`{parent-id}.{child-id}`) and indented one level beneath it
    - **FR:spec.scenarios.sub-reqs.nest-over-bullet** (P2): Detail that carries its own requirement MUST be a nested FR
      - **FR:spec.scenarios.sub-reqs.nest-over-bullet.plain** (P2): Plain sub-bullets MAY carry only non-normative clarification that needs no `@req` target
  - **FR:spec.scenarios.user-story** (P2): Scenarios MUST be a high-level user story ({persona} needs {capability} to {outcome})
    - **FR:spec.scenarios.user-story.no-restate** (P2): Scenarios MUST NOT restate or enumerate nested FRs
  - **FR:spec.scenarios.deps** (P2): Requirements MUST include bulleted blockquote `@req` links to each upstream FR that is a direct dependency
    - **FR:spec.scenarios.deps.level** (P2): Links MUST target the lowest-level FR that owns the precise requirement being depended on
    - **FR:spec.scenarios.deps.format** (P2): Links MUST use format: `> - @req FR:{feature-id}/{fr-id}`
      - **FR:spec.scenarios.deps.format.blockquote** (P2): `@req` links MUST appear as nested blockquote bullets under the depending FR
        - Rationale: A traceability scanner attributes each link to its owning FR.
        - **FR:spec.scenarios.deps.format.blockquote.not-inline** (P2): `@req` links MUST NOT appear inline in FR prose
  - **FR:spec.scenarios.structure** (P2): Each scenario MUST decompose into FRs for interfaces, input, behaviors, and output, in that order
    - Each of these FRs may nest further FRs.
    - **FR:spec.scenarios.structure.interfaces** (P2): Scenarios MUST list FRs per interface that has an external contract or when drift would silently break something
      - **FR:spec.scenarios.structure.interfaces.first** (P3): Scenarios MUST list interface FRs FIRST, before input/behaviors/output
        - **FR:spec.scenarios.structure.interfaces.first.outside-in** (P3): Template MUST direct that interface FRs go outside-in, outermost surface first (e.g., `@ai-command` before the `@playbook` it calls)
      - **FR:spec.scenarios.structure.interfaces.sigil** (P2): Interface FRs MUST prefix the interface token with `@` to mark the FR as a public surface
        > - @req FR:req-traceability/id.format.interface
        - Example: `FR:design-decisions.@file`, `FR:index.@cli`, `FR:workflow.@ai-skill`, `FR:@function`
      - **FR:spec.scenarios.structure.interfaces.kinds** (P2): Interface sigil MUST name the surface kind, meaning how the surface is invoked or addressed
        - Common sigils: `@cli`, `@function`, `@page`, `@mcp`, `@mobile`, `@ai-skill`, `@json`.
        - **FR:spec.scenarios.structure.interfaces.kinds.not-wire** (P2): Interface sigil MUST NOT name the wire format
        - **FR:spec.scenarios.structure.interfaces.kinds.specific** (P2): Interface sigil SHOULD be specific
        - **FR:spec.scenarios.structure.interfaces.kinds.body** (P2): Body MUST be the literal address, such as a path, command, endpoint, or function name
      - **FR:spec.scenarios.structure.interfaces.multiple** (P3): Same-kind interfaces MAY group under one `@kind` FR, such as `@function.get` and `@function.set`
        - **FR:spec.scenarios.structure.interfaces.multiple.layered** (P3): Layered interfaces, where one surface calls another, MUST NOT group
      - **FR:spec.scenarios.structure.interfaces.layers** (P2): When one external interface calls another (e.g., `@ai-skill` delegating to an `@playbook` file), both MUST appear as root-sibling interface FRs
      - **FR:spec.scenarios.structure.interfaces.internal** (P2): Template MUST direct that internal functions and types get no interface FR, since the compiler and tests catch their drift
        - Internal surfaces where drift fails silently (persisted files, wire formats, commands scripts invoke) stay covered by FR:spec.scenarios.structure.interfaces
      - **FR:spec.scenarios.structure.interfaces.contract** (P3): Scenarios MUST include a connection string for external and silently breakable interfaces
        - **FR:spec.scenarios.structure.interfaces.contract.no-params** (P3): Scenarios MUST NOT include interface parameters
    - **FR:spec.scenarios.structure.input** (P2): Scenarios with defined interfaces MUST have one `input` FR listing external data from any source
      - **FR:spec.scenarios.structure.input.optional** (P2): Scenarios without defined interfaces or inputs MAY omit the `input` FR
    - **FR:spec.scenarios.structure.behaviors** (P2): Scenarios MUST define 1+ FRs for critical behaviors using domain-meaningful names
      - **FR:spec.scenarios.structure.behaviors.normative** (P2): Behavior FRs MUST use the form `{actor} {MUST/SHOULD/MAY} {behavior}`
        - **FR:spec.scenarios.structure.behaviors.normative.actor** (P2): `{actor}` MUST name the owner that implements the behavior
          - **FR:spec.scenarios.structure.behaviors.normative.actor.not-target** (P2): `{actor}` MUST NOT name the element the behavior acts upon
          - **FR:spec.scenarios.structure.behaviors.normative.actor.consistent** (P2): `{actor}` MUST stay consistent within a scenario
        - **FR:spec.scenarios.structure.behaviors.normative.single** (P2): Each FR MUST contain exactly one normative statement
          - Normative keywords: MUST, SHOULD, MAY.
          - **FR:spec.scenarios.structure.behaviors.normative.single.split** (P2): Multiple normative statements MUST split into sibling or nested FRs
        - **FR:spec.scenarios.structure.behaviors.normative.what** (P2): Behavior FRs MUST state what is required
          - **FR:spec.scenarios.structure.behaviors.normative.what.not-why** (P2): Behavior FRs MUST NOT state why
            > - @req FR:spec.ste.rationale.bullet
            - Justification goes in the scenario user story or a nested `Rationale:` bullet.
          - **FR:spec.scenarios.structure.behaviors.normative.what.not-how** (P2): Behavior FRs MUST NOT state how
            - Mechanics belong in the enforcing action file.
        - **FR:spec.scenarios.structure.behaviors.normative.outcome** (P2): Template MUST direct that FRs define only desired-state outcomes and the rules that assure their quality
          - Excluded: detail that can change without changing an outcome (internal types, data shapes, algorithm steps, thresholds)
    - **FR:spec.scenarios.structure.output** (P2): Scenarios with defined interfaces MUST have 1 `output` FR that defines data emitted to any destination (not only returns)
    - **FR:spec.scenarios.structure.schema** (P2): Scenario MAY define 1 `schema` FR when the scenario maps to a defined object
    - **FR:spec.scenarios.structure.data-model** (P2): Scenario input, output, and schema MUST use `{content} ({type}) — {optional-description}`
      - **FR:spec.scenarios.structure.data-model.type** (P2): `{type}` MUST be a simple primitive or an `@req` link to a defined data model FR
        > - @req FR:spec.data-model.id
        - Link form: `FR:${entity}` or `FR:{feature}/${entity}`.
      - **FR:spec.scenarios.structure.data-model.multiple** (P2): Scenarios with multiple items MUST list them as nested bullets
  - **FR:spec.scenarios.priority** (P3): Template MUST define priority levels P1 (Critical) through P5 (Informational)
    > - @req FR:engineering-context/eng.quality.priority.defaults
  - **FR:spec.scenarios.personas** (P2): Scenario actors MUST be a recognized persona from `.xe/product.md § Personas`, OR the product by name; never "System"
    > - @req FR:product-context/product.personas
- **FR:spec.examples** (P3): Spec-authoring guidance MUST show a bad → good example for each rule that `catalyst check` enforces on specs
  - **FR:spec.examples.review-only** (P3): Spec-authoring guidance MUST show a bad → good example for each rule only review enforces
    - Rules: Purpose stays put, and code comments link instead of restating.
  - **FR:spec.examples.plain-language** (P3): Spec-authoring guidance MUST point authors to the Plain Language principle in `.xe/engineering.md`
    > - @req FR:engineering-context/eng.principles.list
- **FR:spec.nfr** (P3): Template MUST include Non-functional Requirements subsection, explicitly optional with guidance to delete if no measurable targets exist
  - **FR:spec.nfr.single** (P3): Each NFR MUST contain exactly one normative statement
    - **FR:spec.nfr.single.split** (P3): Multiple normative statements MUST split into sibling or nested NFRs
- **FR:spec.data-model** (P2): Template MUST include a Data Model section
  - **FR:spec.data-model.none** (P2): Data Model section MUST say "None" when the feature has no entities
    - Rationale: AI does not skip the section when entities are added later.
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

    - **FR:spec.data-model.format.entity** (P3): Entity names MUST be **bold**
      - **FR:spec.data-model.format.entity.exact** (P3): P1-2 entity names MUST use exact names in `code`
    - **FR:spec.data-model.format.desc** (P3): P1-2 entities MUST include an entity description if not obvious
      - **FR:spec.data-model.format.desc.p3** (P3): P3 entities SHOULD include an entity description if not obvious
    - **FR:spec.data-model.format.field-name** (P2): P1-2 entities MUST use exact field names in `code`
    - **FR:spec.data-model.format.field-type** (P2): P1-3 entities MUST include field type
      - **FR:spec.data-model.format.field-type.precision** (P3): P1 entities MUST use exact types (e.g., `float` or `double` over `number`; `{type}[]` for arrays, `{type}?` for optional)
    - **FR:spec.data-model.format.field-values** (P2): P1-2 entities MUST include allowed and default values as a nested bullet
      - **FR:spec.data-model.format.field-values.p3** (P3): P3 entities SHOULD include allowed and default values
      - **FR:spec.data-model.format.field-values.inline** (P3): P3 entities MAY put simple sets in the description (`Allowed: Val1, Val2; Default: Val1`)
    - **FR:spec.data-model.format.field-valid** (P3): P1 entities MUST include field validation rules, if any
      - **FR:spec.data-model.format.field-valid.p2** (P3): P2 entities SHOULD include field validation rules
      - **FR:spec.data-model.format.field-valid.inline** (P3): P2 entities MAY put simple rules in the description
    - **FR:spec.data-model.format.rels** (P3): P1 entities MUST include entity relationships in prose or nested bullets
      - **FR:spec.data-model.format.rels.p2** (P3): P2 entities SHOULD include entity relationships
      - **FR:spec.data-model.format.rels.style** (P5): Relationship lines MUST use `code` for exact entity names
        - **FR:spec.data-model.format.rels.style.logical** (P5): Relationship lines MAY use _italic_ for logical entity names

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

- **FR:spec.constraints** (P2): Template MUST include an Architecture Constraints section for testable guardrails
  > - @req FR:engineering-context/arch.patterns
  - **FR:spec.constraints.annotation** (P2): Architecture Constraints MUST carry `@req` annotations
  - **FR:spec.constraints.none** (P2): Architecture Constraints MUST say "None" when no constraints beyond `.xe/architecture.md` apply
  - **FR:spec.constraints.not-behavior** (P2): Template MUST direct that test-observable behavior be an FR, not an Architecture Constraint
    - Examples: output format, which tool performs external access.
- **FR:spec.dependencies** (P2): Template MUST include an External Dependencies section
  - **FR:spec.dependencies.list** (P2): External Dependencies MUST list tools, libraries, or frameworks the feature requires beyond `architecture.md § Technology Stack`
  - **FR:spec.dependencies.none** (P2): External Dependencies MUST say "None" when the feature needs no external dependencies
  - **FR:spec.dependencies.direct** (P2): Template MUST direct that External Dependencies and frontmatter `dependencies` list only direct dependencies the feature itself calls or reads
- **FR:spec.frontmatter** (P2): Template MUST include frontmatter with `id`, `title`, `description`, and `dependencies` fields
  - **FR:spec.frontmatter.excluded** (P2): Template MUST NOT include `author` or `status` frontmatter fields
  - **FR:spec.frontmatter.dependencies** (P3): Template MUST direct that frontmatter `dependencies` list feature IDs in ASCII order
  - **FR:spec.frontmatter.description** (P2): `description` MUST be a required single-line summary of the feature's scope, up to 120 characters
    - **FR:spec.frontmatter.description.fragment** (P2): `description` MUST be a sentence fragment suitable for the feature index
    - **FR:spec.frontmatter.description.no-title** (P2): `description` MUST NOT repeat the title verbatim

- **FR:spec.ste** (P2): Feature specs MUST follow Simplified Technical English (STE) rules for FR prose.
  - **FR:spec.ste.sentence** (P2): Each FR SHOULD contain one sentence of 20 words or fewer.
  - **FR:spec.ste.voice** (P2): FR prose MUST use active voice with the actor as subject.
    > - @req FR:spec.scenarios.structure.behaviors.normative.actor
  - **FR:spec.ste.rationale** (P2): FR prose MUST NOT contain rationale clauses such as "so that", "so", "rather than", "because", or "in order to".
    - **FR:spec.ste.rationale.scenario** (P2): Scenario user-story lines MUST keep their `so that` value clause.
      > - @req FR:spec.scenarios.format
    - **FR:spec.ste.rationale.bullet** (P2): An FR that needs rationale MAY add one nested bullet formatted `Rationale: {up to 20 words}`.
    - **FR:spec.ste.rationale.overflow** (P2): Rationale longer than 20 words MUST go in `design-decisions.md`.
  - **FR:spec.ste.idioms** (P2): FR prose MUST NOT use idioms or figurative phrases.
  - **FR:spec.ste.terms** (P2): FR prose MUST use the project's existing term for each concept.
    - Catalyst defines no term list: each project owns its terms, such as `entity` and `field` for one stack or `table` and `column` for another.

### FR:rollout: Rollout plan template

Playbook executor needs a rollout tracking template so that multi-feature work survives context resets and interrupted runs can be resumed.

- **FR:rollout.@file** (P1): Interface: `.xe/rollouts/rollout-{id}.md`
  > - @req FR:context-storage/storage.project
- **FR:rollout.template** (P1): Authoring MUST start from the rollout template at `src/resources/templates/specs/rollout.md`, following the template standard
  > - @req FR:context-storage/templates.framework
- **FR:rollout.frontmatter** (P3): Template MUST support optional frontmatter with `features`, `status`, `created`, and `last_updated` fields for AI crash recovery
- **FR:rollout.overview** (P2): Template MUST include an Overview section describing what the rollout accomplishes
  - **FR:rollout.overview.context** (P2): Overview MUST give a new run enough context to continue without rereading conversation history
- **FR:rollout.runs** (P2): Template MUST support `## Run N: {name}` sections, each self-contained with Pre-implementation, Features, Post-implementation, and Notes subsections
- **FR:rollout.pre-implementation** (P3): Each run MUST include a Pre-implementation section for tasks before feature work, such as migrations
  - **FR:rollout.pre-implementation.deletable** (P3): Rollout author MAY delete the Pre-implementation section when unneeded
- **FR:rollout.features** (P2): Each run MUST include Features section with `#### {feature-id}` sub-headings grouping checkbox-format tasks by feature in dependency order
  - **FR:rollout.features.parallel** (P2): Tasks that can run concurrently MUST be grouped as nested children under a parent label bullet `- 🔀 Execute in parallel:`
  - **FR:rollout.features.sequential** (P3): Tasks that run in order within a parallel group MUST nest under `- 🔗 Execute in sequence:`
    - **FR:rollout.features.sequential.placement** (P3): The `🔗 Execute in sequence:` bullet MUST be a child of `🔀 Execute in parallel:`
- **FR:rollout.post-implementation** (P2): Each run MUST include Post-implementation section for tasks after feature work
  - **FR:rollout.post-implementation.tasks** (P3): Post-implementation section MUST support project-specific tasks, such as data migrations, cleanup, and monitoring
  - **FR:rollout.post-implementation.closure** (P3): Post-implementation section MUST support standard per-run closure tasks
    - Standard tasks: present work for review; route external issues.
- **FR:rollout.notes** (P3): Template MUST include a rollout-level Notes section for design decisions, blockers, constraints, and resumption context; notes are appended, never overwritten
- **FR:rollout.active-state** (P2): Template MUST include an Active State section
  - **FR:rollout.active-state.placement** (P2): Active State section MUST appear immediately after the H1 heading, before Overview
    - Rationale: A successor agent reads it first.
  - Section MUST contain these fields: Model (current mental model not yet in spec), Decisions (load-bearing decisions made this session not yet recorded elsewhere), Open (questions pending user answer or flagged unresolved), Next (literal imperative for next step), Pins (file:line-range references with short anchor text), Assumptions (things treated as true without verifying this session)
  - Each field MUST use terse one-line examples in the template to signal brevity expectation
- **FR:rollout.active-state.overwrite** (P2): Active State MUST use overwrite semantics — each update replaces the section in full; no append history retained
  - Distinct from Notes (append-only) so the distinction is unambiguous
  - Prevents stale content from accumulating; enforces that the section always reflects current state
- **FR:rollout.final-review** (P2): Template MUST include a Final Review section as an AI checkpoint
  - **FR:rollout.final-review.timing** (P2): AI Agent MUST execute Final Review only when all runs complete
  - **FR:rollout.final-review.validate** (P2): AI Agent MUST confirm no unchecked tasks or unresolved blockers remain before cleanup and closure
- **FR:rollout.ephemeral** (P2): Rollout file MUST be deleted when the rollout is complete
  - Rollout files are untracked working-tree scratch.
  - **FR:rollout.ephemeral.persist** (P2): Rollout file MAY persist only while completion is pending
  - **FR:rollout.ephemeral.deletion** (P2): Interim deletion MUST be a hard `rm`
    - Recoverable cleanup via a session-scoped recycle-bin is a planned feature.

### FR:feedback: Feedback file convention

Developer needs a convention for capturing post-implementation learnings so that improvement ideas, bug observations, and enhancement requests discovered after building a feature are tracked consistently without cluttering specs or design decisions.

- **FR:feedback.@file** (P2): Interface: `.xe/features/{feature-id}/feedback.md`
  > - @req FR:context-storage/storage.project
- **FR:feedback.template** (P2): Authoring MUST start from the feedback template at `src/resources/templates/specs/feedback.md`, following the template standard
  > - @req FR:context-storage/templates.framework
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:feedback.scope** (P2): Feedback entries MUST capture post-implementation observations
  - Examples: improvement ideas, bug reports, enhancement requests, architectural concerns, process friction.
  - MUST NOT contain: requirements (use spec.md), design rationale (use design-decisions.md), or implementation notes (use code comments)
- **FR:feedback.format** (P2): Feedback items MUST be grouped under H2 headings with bullet-point content
  - **FR:feedback.format.reuse** (P2): H2s group themes, not items; new H2s MUST be added only when no existing H2 fits

### FR:index: Feature index

AI Agent needs an at-a-glance listing of every feature so that it can orient itself across a 100+ feature inventory without reading each spec.

- **FR:index.@cli** (P2): Interface: `catalyst index` regenerates the index
- **FR:index.@file** (P2): Interface: `.xe/features/README.md`
  > - @req FR:context-storage/storage.project
- **FR:index.input** (P2): Spec frontmatter (`id`, `title`, `description`) of every feature spec at `.xe/features/{feature-id}/spec.md`
  > - @req FR:spec.@file
  > - @req FR:spec.frontmatter
- **FR:index.discovery** (P2): Index regeneration MUST discover feature specs recursively, including nested feature IDs
  > - @req FR:spec.@file.nesting
- **FR:index.generated** (P2): Feature index MUST be auto-generated
  - **FR:index.generated.no-hand-edit** (P2): Authors MUST NOT hand-edit the feature index
  - **FR:index.generated.idempotent** (P2): Index regeneration MUST produce no diff when inputs are unchanged
- **FR:index.content** (P2): Each feature MUST appear as one entry sourced from its `id`, `title`, and `description` frontmatter fields
  - **FR:index.content.order** (P2): Index entries MUST be ordered alphabetically by `id`
    - Rationale: Deterministic order keeps regeneration stable.
- **FR:index.generated-marker** (P3): Index MUST declare at the top of the file that it is auto-generated
  - Rationale: Editors learn to change the source frontmatter, not the index.

### Non-functional Requirements

- **NFR:cost** (P4): Cost & usage efficiency
  - **NFR:cost.tokens**: Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - **NFR:cost.instructions**: Instruction blocks SHOULD be clear and actionable to enable efficient AI completion

- **NFR:reliability** (P3): Reliability
  - **NFR:reliability.markdown**: Templates MUST use standard markdown syntax for maximum compatibility
  - **NFR:reliability.structure**: Templates MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

- **NFR:testability** (P3): Testability
  - **NFR:testability.validation**: Templates MUST have automated validation tests (Jest) verifying structure and completeness

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
