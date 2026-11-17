---
id: init-workflow
title: Project Initialization Workflow
description: Orchestrates project init by researching context, confirming gaps with the user, and rendering foundational artifacts.
dependencies:
  - ai-plugin
  - context-storage
  - engineering-context
  - product-context
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

- **FR:workflow.@ai-skill** (P1): Interface: `/catalyst:init`
  > - @req FR:ai-plugin/skills.@ai-skill
- **FR:workflow.@playbook** (P1): Interface: `src/resources/playbooks/start-initialization.md`
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
  - **FR:workflow.scope.detect** (P2): Workflow MUST detect existing `.xe/product.md`
    > - @req FR:context-storage/storage.project
    - **FR:workflow.scope.detect.improve** (P2): When `.xe/product.md` exists, workflow MUST research existing artifacts and propose improvements that strengthen product vision
    - **FR:workflow.scope.detect.inputs** (P2): Workflow MUST use provided inputs to scope and direct research and proposals
    - **FR:workflow.scope.detect.no-inputs** (P2): Workflow MUST improve what it deems weak when no inputs are provided
  - **FR:workflow.scope.research** (P2): Workflow MUST inspect the repository and any prompt context before asking
    - Repository sources: README, package metadata, top-level source layout
    - **FR:workflow.scope.research.draft** (P2): Workflow MUST draft proposed answers from that research before asking
  - **FR:workflow.scope.initial-batch** (P1): Workflow MUST present an initial AUQ batch with up to 4 questions:
    - Q1-Q3: high-level context-gathering questions tailored to inputs and research; skip individually when research is sufficient. When research suggests the user would benefit from the full interview to refine inputs, Q3 MUST be "Run the full product interview to refine these inputs?" with a recommendation — this is the single decision point for opting into the full interview outside `interactive` mode
    - Q4: execution mode selection presenting all four modes with descriptions; recommend one based on complexity and user preference
      > - @req FR:workflow-context/execution-modes
  - **FR:workflow.scope.interview** (P1): Workflow MUST conduct a full product interview through the AUQ action in `interactive` mode or on opt-in
    - The initial batch offers the opt-in
    - **FR:workflow.scope.interview.autonomous** (P1): Without opt-in outside `interactive` mode, workflow MUST run the interview autonomously by filling best-guess answers from research
    - **FR:workflow.scope.interview.follow-up** (P1): Workflow MUST ask a follow-up batch when questions are required to proceed safely
    - **FR:workflow.scope.interview.recommend** (P1): Workflow MUST present a recommended answer with rationale and alternatives in every AUQ question
    - **FR:workflow.scope.interview.unknowns** (P1): Workflow MUST call out unknowns explicitly in every AUQ question
    - **FR:workflow.scope.interview.size** (P2): Full interview SHOULD ask ≤8 questions
      - **FR:workflow.scope.interview.size.more** (P2): Workflow MAY ask more questions when necessary
      - **FR:workflow.scope.interview.size.follow-up-cap** (P2): Non-interactive follow-up batches MUST stay ≤4 questions
    - **FR:workflow.scope.interview.progress** (P2): Workflow MUST prefix every AUQ-presented interview question with `(Qi/n)` when the total is known or `(Qi/n+)` when more are expected
      - Rationale: Users know how many questions to expect.
- **FR:workflow.implement** (P1): Workflow MUST render every product-context and engineering-context artifact from its template using the confirmed input in an `Implement` phase
  > - @req FR:product-context/product.template
  > - @req FR:product-context/journey.template
  > - @req FR:product-context/competitive.template
  > - @req FR:engineering-context/eng.template
  > - @req FR:engineering-context/arch.template
  > - @req FR:engineering-context/dev.template
  - **FR:workflow.implement.strip** (P1): Workflow MUST strip template instruction blocks
  - **FR:workflow.implement.placeholders** (P1): Workflow MUST replace placeholders
- **FR:workflow.review** (P2): Workflow MUST run a `Review` phase that delegates to the shared workflow-audit, workflow-review, workflow-closure, and workflow-celebrate actions
  > - @req FR:workflow-context/audit
  > - @req FR:workflow-context/review
  > - @req FR:workflow-context/closure
  > - @req FR:workflow-context/celebrate
  - **FR:workflow.review.audit** (P2): Workflow MUST audit completeness
  - **FR:workflow.review.summary** (P2): Workflow MUST present a summary
  - **FR:workflow.review.route** (P2): Workflow MUST route external issues
  - **FR:workflow.review.next-step** (P2): Workflow MUST tell the user in the closing message to run `/catalyst:blueprint` when ready to start designing the product
- **FR:workflow.auq-usage** (P1): Workflow MUST invoke the AUQ action file at every AUQ call site
  > - @req FR:workflow-context/auq
  - **FR:workflow.auq-usage.form** (P1): Workflow MUST write each call site as `Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to {imperative intent}`
  - **FR:workflow.auq-usage.no-inline** (P1): Workflow MUST NOT use inline AskUserQuestion directives
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

- **NFR:reliability.sequential-execution** (P1): Workflow MUST execute phases sequentially
  - **NFR:reliability.sequential-execution.stop-gate** (P1): Workflow MUST honor a STOP gate after every phase
  - **NFR:reliability.sequential-execution.exit-criteria** (P1): STOP gate MUST validate ALL exit criteria, including any required user confirmation, before any subsequent action runs
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
