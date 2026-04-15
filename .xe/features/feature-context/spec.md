---
id: feature-context
title: Feature Context Templates
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

Provide standardized templates for feature-level documentation — specifications, rollout plans, and data models — so that AI agents produce consistent, enterprise-quality features and humans can review structured, complete deliverables.

## Scenarios

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
- **FR:spec.scenarios.io** (P3): Scenarios MUST support Input/Output as nested FRs with traceable IDs: `FR:{scenario-id}.{sub-id}.input` and `FR:{scenario-id}.{sub-id}.output`
- **FR:spec.scenarios.priority** (P3): Template MUST define priority levels P1 (Critical) through P5 (Informational)
  > - @req FR:engineering-context/eng.quality.priority.defaults
- **FR:spec.scenarios.personas** (P2): Scenarios MUST reference `.xe/product.md § Personas` and require ONLY recognized personas
  > - @req FR:product-context/product.personas
- **FR:spec.nfr** (P3): Template MUST include Non-functional Requirements subsection, explicitly optional with guidance to delete if no measurable targets exist
- **FR:spec.constraints** (P2): Template MUST include Architecture Constraints section for testable guardrails (annotated with `@req`)
  > - @req FR:engineering-context/arch.patterns
- **FR:spec.dependencies** (P2): Template MUST include External Dependencies section listing tools, libraries, or frameworks NOT already in `architecture.md § Technology Stack` that this feature requires; section MUST always be present with "None" if no external dependencies exist
- **FR:spec.frontmatter** (P2): Template MUST include frontmatter with `id`, `title`, and `dependencies` fields; MUST NOT include `author`, `status`, or `description`

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
- **FR:rollout.final-review** (P2): Template MUST include Final Review section as an AI checkpoint that executes only when all runs complete; AI must validate no unchecked tasks or unresolved blockers remain before proceeding to cleanup and closure
- **FR:rollout.ephemeral** (P2): All rollout files are ephemeral and MUST be deleted when the rollout is complete; rollout files MAY be persisted if they are pending completion

#### Deprecated requirements

- ~~**FR:plan.template**~~: [deprecated: FR:rollout.template]
- ~~**FR:plan.overview**~~: [deprecated: FR:rollout.overview]
- ~~**FR:plan.pre-implementation**~~: [deprecated: FR:rollout.pre-implementation]
- ~~**FR:plan.features**~~: [deprecated: FR:rollout.features]
- ~~**FR:plan.post-implementation**~~: [deprecated: FR:rollout.post-implementation]
- ~~**FR:plan.post-implementation.project-tasks**~~: [deprecated: FR:rollout.post-implementation.tasks]
- ~~**FR:plan.post-implementation.closure**~~: [deprecated: FR:rollout.final-review]
- ~~**FR:plan.notes**~~: [deprecated: FR:rollout.notes]

### FR:data-model: Data model template

Developer needs an optional template for documenting feature-owned entities so that complex data structures are defined consistently without cluttering the spec.

- **FR:data-model.template** (P2): Template MUST exist at `src/resources/templates/specs/data-model.md` and follow template standard
  > - @req FR:context-storage/templates.framework
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

## External Dependencies

None
