---
features: [blueprint]
status: in-progress
created: 2025-11-01
last_updated: 2026-05-04
---

<!-- markdownlint-disable no-duplicate-heading no-trailing-punctuation -->

# Rollout: blueprint

Implement the product per `.xe/features/blueprint.md`.

## Active State

**Model**: Migrated from legacy multi-file blueprint (spec/plan/data-model/design-decisions) to current shape via blueprint-format. POC phase is structurally complete (all 35 features have specs; most shipped). Mainstream + Innovation + Platform + Enterprise phases pending implementation.

**Decisions**: None this session (6 product-architecture decisions migrated to `.xe/features/design-decisions.md`)

**Open**:

- 5 product-level scenarios from legacy spec.md staged for `.xe/product.md` merge follow-up (see Notes)
- Plan.md decomposition diverged significantly from initial vision (ai-provider* replaced playbook-actions-claude/copilot; init-workflow/blueprint-workflow/feature-workflow replaced project-initialization/blueprint-creation/feature-rollout; catalyst-cli replaced framework-distribution + slash-command-integration). Migrated blueprint reflects current reality.

**Next**: User merges staged scenarios into `.xe/product.md`, then runs `/catalyst:blueprint` to begin Phase 2 (Mainstream) implementation.

**Pins**:

- `.xe/features/blueprint.md` — migrated blueprint
- `.xe/features/design-decisions.md` — 6 migrated product-architecture decisions

**Assumptions**:

- POC phase tasks T001-T009 shipped per legacy rollout; collapsed into Run 1 summary
- Unbuilt POC features (Tier 1.5–1.7) were superseded by current features (init-workflow, blueprint-workflow, feature-workflow, catalyst-cli) — no carry-over needed
- Mainstream + Innovation + Platform + Enterprise tasks not yet started; populated as Run 2+ from blueprint Roadmap

## Run 1: POC — completed via incremental tier rollouts. Shipped: product-context, engineering-context, error-handling, context-storage, logging, feature-context, blueprint-context, workflow-context, playbook-definition, playbook-yaml, playbook-template-engine, playbook-engine, playbook-actions-scripts, playbook-actions-io, playbook-actions-controls, playbook-actions-github, playbook-actions-ai, req-traceability, feedback-loop, ai-provider (+ 6 provider features), init-workflow, blueprint-workflow, feature-workflow, pull-request-workflow, catalyst-cli. See git history for details.

## Run 2: Mainstream — Make autonomous execution real

### Pre-implementation

- [ ] **Re-evaluate blueprint via `/catalyst:blueprint`** — incorporate Phase 1 learnings; adjust Phase 2 scope, dependencies, and features against the now-known reality before starting wave work

### Wave 2.1

- 🔀 Execute in parallel:
  - [ ] `/catalyst:create role-based-subagents: Specialized agent implementations (PM, Architect, Engineer) for automated reviews`
    - Scope: subagent definitions per role; usable locally or in autonomous workflows; role-specific prompts and tools
    - Dependencies: ai-provider
  - [ ] `/catalyst:create config-management: Centralized configuration in .xe/catalyst.json for autonomy settings, playbook defaults, and integration configuration`
    - Scope: config schema; load/merge with defaults; surface in CLI and playbooks
    - Dependencies: catalyst-cli
  - [ ] `/catalyst:create model-selection: Intelligent AI model selection based on task complexity, context size, and performance requirements`
    - Scope: model routing rules; cost/latency tradeoffs; per-action overrides
    - Dependencies: playbook-actions-ai, ai-provider

### Wave 2.2

- 🔀 Execute in parallel:
  - [ ] `/catalyst:create autonomous-orchestration: Remote GitHub app orchestrating multi-feature workflows with PR-based checkpoints and autonomous execution`
    - Scope: GitHub app shell; queue feature/blueprint workflow runs; PR-based human checkpoints; resume on review
    - Dependencies: role-based-subagents, config-management, blueprint-workflow, feature-workflow, model-selection

## Run 3: Innovation — Autonomous review and conversation

### Pre-implementation

- [ ] **Re-evaluate blueprint via `/catalyst:blueprint`** — incorporate Phase 2 learnings; adjust Phase 3 scope, dependencies, and features against the now-known reality before starting wave work

### Wave 3.1

- 🔀 Execute in parallel:
  - [ ] `/catalyst:create autonomous-pull-request-review: Monitor PRs, review code quality, suggest fixes, auto-approve or request changes`
    - Scope: PR webhook listener; quality gates; structured review comments
    - Dependencies: autonomous-orchestration
  - [ ] `/catalyst:create autonomous-issue-review: Triage issues, label, assign, suggest solutions, create related issues`
    - Scope: issue webhook listener; label/assign rules; solution drafts
    - Dependencies: autonomous-orchestration
  - [ ] `/catalyst:create autonomous-discussion-review: Monitor discussions, provide context, answer questions, escalate decisions`
    - Scope: discussion webhook listener; answer drafts; escalation rules
    - Dependencies: autonomous-orchestration
  - [ ] `/catalyst:create autonomous-architecture-review: Code quality monitoring, tech debt detection, refactoring recommendations, dependency updates`
    - Scope: scheduled architecture audits; tech debt registry; refactor proposals
    - Dependencies: autonomous-orchestration
  - [ ] `/catalyst:create autonomous-product-review: Market analysis, competitive research, product strategy updates, feature recommendations`
    - Scope: scheduled product audits; competitive scans; strategy proposals
    - Dependencies: autonomous-orchestration

### Wave 3.2

- 🔀 Execute in parallel:
  - [ ] `/catalyst:create conversational-agents: Interactive discussion, brainstorming, research requests, and analysis with human collaboration`
    - Scope: chat surface; brainstorm/research playbooks; durable session state
    - Dependencies: role-based-subagents

## Run 4: Platform — Extensibility

### Pre-implementation

- [ ] **Re-evaluate blueprint via `/catalyst:blueprint`** — incorporate Phase 3 learnings; adjust Phase 4 scope, dependencies, and features against the now-known reality before starting wave work

### Wave 4.1

- 🔀 Execute in parallel:
  - [ ] `/catalyst:create template-customization: Project-specific template overrides with fallback to framework defaults`
    - Scope: lookup order; per-project overrides; merge semantics
    - Dependencies: context-storage
  - [ ] `/catalyst:create custom-playbooks: SDK for creating project-specific playbooks with validation and testing utilities`
    - Scope: playbook authoring API; validators; test harness
    - Dependencies: playbook-engine

### Wave 4.2

- 🔀 Execute in parallel:
  - [ ] `/catalyst:create plugin-system: Community extensions and integrations with discovery, installation, and versioning`
    - Scope: plugin manifest; install/upgrade; discovery registry
    - Dependencies: template-customization, custom-playbooks

## Run 5: Enterprise — Scale

### Pre-implementation

- [ ] **Re-evaluate blueprint via `/catalyst:blueprint`** — incorporate Phase 4 learnings; adjust Phase 5 scope, dependencies, and features against the now-known reality before starting wave work

### Wave 5.1

- 🔀 Execute in parallel:
  - [ ] `/catalyst:create multi-repository-management: Centralized orchestration across multiple repositories with shared context and dependency management`
    - Scope: cross-repo dependency graph; shared context federation
    - Dependencies: autonomous-orchestration

### Wave 5.2

- 🔀 Execute in parallel:
  - [ ] `/catalyst:create multi-team-coordination: Cross-team feature dependencies, planning coordination, and workflow orchestration`
    - Scope: team-scoped feature ownership; cross-team gates
    - Dependencies: multi-repository-management
  - [ ] `/catalyst:create audit-logging: Complete execution history, compliance tracking, and rollback capabilities`
    - Scope: append-only event log; query API; rollback hooks
    - Dependencies: playbook-engine

## Notes

**Product-level scenarios staged for `.xe/product.md` merge follow-up** (from legacy spec.md):

- As a Developer, I need to establish and query centralized project context so that AI agents consistently produce decisions and code that align with the product vision, architecture, and engineering principles without repeated manual input.
- As a Developer, I need to execute structured, reproducible workflows so that feature implementation produces consistent, enterprise-grade outcomes regardless of which AI platform performs the work.
- As a Project Maintainer, I need to plan and progressively implement modular features so that the product can be built incrementally in dependency order with full traceability.
- As an AI Agent, I need a platform-agnostic execution layer so that the same playbooks can run across Claude Code, GitHub Copilot, and future AI platforms without modification.
- As a Developer, I need to easily integrate Catalyst into new projects so that the framework's context, playbooks, and templates are available with minimal setup effort.

## Vision Checkpoint

When the planned phases are implemented, run this checkpoint instead of closing out.

- [ ] Re-run `/catalyst:blueprint` to evaluate current state against the original vision and identify next moves (extend with new phases, address accumulated tech debt, or close out)
- [ ] If new phases identified → add them as Run N+1, Run N+2, … and update blueprint Roadmap to match
- [ ] If closing out (vision achieved or sunset) → clean up this rollout file
