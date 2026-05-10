---
id: init-workflow
title: Project Initialization Workflow
description: Orchestrates project initialization by researching context, confirming gaps with the user, and rendering the foundational artifacts.
dependencies:
  - context-storage
  - product-context
  - engineering-context
  - workflow-context
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Project Initialization Workflow

## Purpose

Orchestrate reliable, token-efficient project initialization from initial intake through context generation and review, aligned with product vision and engineering principles.

## Scenarios

### FR:workflow: Project initialization workflow

**Project Maintainer** needs to initialize a Catalyst project so that foundational product, engineering, and process context exists for every downstream workflow.

- **FR:workflow.ai-command** (P1): Interface: Workflow MUST be exposed as `/catalyst:init` slash command
- **FR:workflow.playbook** (P1): Interface: Workflow MUST be implemented as `src/resources/playbooks/start-initialization.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:workflow.input** (P2):
  - Project overview (string?) — what the project does, the problem it addresses, why it matters
  - Goals (string?) — primary goals, success metrics, milestones
  - Technology preferences (string?) — preferred stack, must-have or must-avoid technologies, deployment preferences
  - Engineering preferences (string?) — non-negotiable values and quality criteria
  - Team roles (string?) — Product Manager, Architect, Engineer, and other roles with handles
  - Product strategy priorities (string?) — ranked phased focus areas (POC, mainstream, innovation, platform, enterprise, scale)
  - Customer journey (string?) — product-level journeys the product enables
  - Competitive context (string?) — known competitors, differentiation, table-stakes features
- **FR:workflow.scope** (P1): Workflow MUST gather and confirm initialization context in a `Scope` phase
  - **FR:workflow.scope.detect** (P2): Workflow MUST detect existing `.xe/product.md`; when present, research existing artifacts and propose improvements that strengthen product vision (modernize, innovate, scale, adoption, or any weakness). Provided inputs scope and direct research and proposals; without inputs AI improves what it deems weak.
    > - @req FR:context-storage/storage.project
  - **FR:workflow.scope.research** (P2): Workflow MUST inspect the repository (README, package metadata, top-level source layout) and any prompt context to draft proposed answers before asking
  - **FR:workflow.scope.initial-batch** (P1): Workflow MUST present an initial AUQ batch with up to 4 questions:
    - Q1-Q3: high-level context-gathering questions tailored to inputs and research; skip individually when research is sufficient. When research suggests the user would benefit from the full interview to refine inputs, Q3 MUST be "Run the full product interview to refine these inputs?" with a recommendation — this is the single decision point for opting into the full interview outside `interactive` mode
    - Q4: execution mode selection presenting all four modes with descriptions; recommend one based on complexity and user preference
      > - @req FR:workflow-context/execution-modes
  - **FR:workflow.scope.interview** (P1): Workflow MUST conduct a full product interview through the AUQ action when execution mode is `interactive` OR when the user opted in via the initial batch. In other modes without opt-in, AI MUST run the interview autonomously by filling best-guess answers from research; if questions are required to proceed safely, AI MUST ask a follow-up batch of ≤4 questions. Every AUQ question MUST present a recommended answer with rationale and offer alternatives, calling out unknowns explicitly
    - **FR:workflow.scope.interview.size** (P2): Full interview SHOULD ask ≤8 questions but MAY ask more when necessary; non-interactive follow-up batches MUST stay ≤4 questions
    - **FR:workflow.scope.interview.progress** (P2): Every AUQ-presented interview question MUST be prefixed with `(Qi/n)` (known total) or `(Qi/n+)` (more expected, total unknown) so users know how many to expect
- **FR:workflow.implement** (P1): Workflow MUST render every product-context and engineering-context artifact from its template using the confirmed input in an `Implement` phase, stripping template instruction blocks and replacing placeholders
  > - @req FR:product-context/product.template
  > - @req FR:product-context/journey.template
  > - @req FR:product-context/competitive.template
  > - @req FR:engineering-context/eng.template
  > - @req FR:engineering-context/arch.template
  > - @req FR:engineering-context/dev.template
- **FR:workflow.review** (P2): Workflow MUST audit completeness, present a summary, route external issues, and close out in a `Review` phase by delegating to the shared workflow-audit, workflow-review, workflow-closure, and workflow-celebrate actions; closing message MUST inform the user to run `/catalyst:blueprint` when ready to start designing the product
  > - @req FR:workflow-context/audit
  > - @req FR:workflow-context/review
  > - @req FR:workflow-context/closure
  > - @req FR:workflow-context/celebrate
- **FR:workflow.auq-usage** (P1): Workflow MUST invoke the AUQ action file at every AUQ call site using `Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to {imperative intent}` rather than inline AskUserQuestion directives
  > - @req FR:workflow-context/auq
- **FR:workflow.output** (P2):
  - Product overview (markdown)
    > - @req FR:product-context/product.location
  - Customer journey (markdown?)
    > - @req FR:product-context/journey.location
  - Competitive analysis (markdown?)
    > - @req FR:product-context/competitive.location
  - Engineering principles (markdown)
    > - @req FR:engineering-context/eng.location
  - Architecture (markdown)
    > - @req FR:engineering-context/arch.location
  - Development process (markdown)
    > - @req FR:engineering-context/dev.output

### Non-functional Requirements

**NFR:reliability**: Execution Reliability

- **NFR:reliability.sequential-execution** (P1): Workflow MUST execute phases sequentially, honoring a STOP gate after every phase that validates ALL exit criteria — including any required user confirmation — before any subsequent action runs
- **NFR:reliability.informed-judgment** (P1): Workflow MUST form and present recommended options with rationale grounded in product vision and engineering principles
  > - @req FR:product-context/product.strategy
  > - @req FR:product-context/product.principles
  > - @req FR:engineering-context/eng.principles

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
