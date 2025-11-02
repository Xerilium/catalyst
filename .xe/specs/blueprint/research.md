---
id: blueprint
title: Research: Catalyst Product Blueprint
description: "Research notes and feature breakdown analysis for Catalyst framework."
date: 2025-11-01
---

<!-- markdownlint-disable single-title -->

# Research: Catalyst Product Blueprint

## Summary

Catalyst is an AI-powered automation framework for software development at scale. The product follows a phased implementation strategy from POC (Phase 1) through Enterprise-grade (Phase 5). Based on analysis of issue #41, the product strategy, and existing architecture, I've identified 15 core features organized into 5 dependency tiers. The features follow a natural progression from foundational capabilities (context management, template system) through orchestration (playbooks, rollouts) to AI integration and distribution.

## Scope

**In scope:**
- Complete feature breakdown for Catalyst framework Phase 1-5
- Feature dependency analysis and priority ordering
- Complexity estimation per feature
- Identification of core entities and their relationships

**Out of scope:**
- Detailed implementation plans for individual features (handled per-feature via start-rollout)
- Specific technology choices beyond those in `.xe/architecture.md`
- Migration strategies from potential predecessor systems

## Methods

- Analyzed GitHub issue #41 "Phased Implementation" content
- Reviewed `.xe/product.md` for product strategy and priorities
- Reviewed `.xe/architecture.md` for technical patterns and structure
- Reviewed `.xe/engineering.md` for design principles
- Analyzed existing source code structure in `src/` directory
- Identified user workflow from issue description

## Sources

- [GitHub Issue #41](https://github.com/xerilium/catalyst/issues/41) - Phased Implementation plan (2025-11-01)
- [`.xe/product.md`](.xe/product.md) - Product context and strategy
- [`.xe/architecture.md`](.xe/architecture.md) - Technical architecture
- [`.xe/engineering.md`](.xe/engineering.md) - Engineering principles
- [`.xe/process/development.md`](.xe/process/development.md) - Development workflow

## Technical Context

**Existing code paths:**
- `src/integrations/` - AI platform integration scripts (Claude Code, GitHub Copilot)
- `src/playbooks/` - Workflow definitions (start-initialization, start-blueprint, start-rollout)
- `src/playbooks/scripts/` - Node scripts for automation (GitHub integration, issue creation)
- `src/templates/` - Markdown templates for issues, specs, process docs
- `.xe/` - Project context directory (generated during initialization)

**Core entities identified:**
1. **Context Files** - Markdown files in `.xe/` directory containing project state
2. **Templates** - Reusable markdown templates for issues, specs, plans, tasks, rollouts
3. **Playbooks** - AI-agnostic workflow definitions with inputs/outputs/steps
4. **Rollouts** - Orchestration plans coordinating feature implementation
5. **Features** - Discrete capabilities with specs, plans, and tasks
6. **Integrations** - AI platform-specific command wrappers

**Reuse opportunities:**
- Template system can be extended via project-specific overrides (Phase 4)
- Playbook engine is AI-agnostic, supporting multiple platforms
- GitHub integration scripts can be extracted into reusable modules

## Feature Breakdown by Phase

### Phase 1 (POC - Early Adopters)
**Goal:** Prove the concept works with manual workflow

**Tier 1.1: Context Foundation (no dependencies)**
1. **product-context** (Small) - PM-owned context files (product.md, competitive-analysis.md)
2. **engineering-context** (Medium) - Engineering-owned context files (architecture.md, engineering.md, process/)
3. **github-integration** (Medium) - GitHub CLI wrapper for issues and PRs

**Tier 1.2: Core Workflows (depends on 1.1)**

1. **playbook-engine** (Large) - Execute structured workflows with inputs/outputs/steps
2. **project-initialization** (Large) - Generate project context from GitHub issue (depends on playbook-engine)

**Tier 1.3: Feature Development (depends on 1.2)**

1. **blueprint-creation** (Large) - Break down product into features with dependencies
2. **feature-rollout** (Large) - Implement features via spec-driven workflow

**Tier 1.4: AI Integration (depends on 1.3)**

1. **slash-command-integration** (Medium) - Slash commands for AI platforms (Claude Code, Copilot)

**Tier 1.5: Distribution (depends on 1.4)**

1. **npm-distribution** (Medium) - Package framework for npm with postinstall scripts

**Tier 1.6: Extraction (depends on 1.3 for playbooks)**

1. **extract-features** (Medium) - Extract specs from existing implementations, then run feature-rollout
2. **extract-blueprint** (Medium) - Extract blueprint from existing projects, then run blueprint-creation

### Phase 2 (Mainstream - Product-Market Fit)
**Goal:** Perfect the user experience with autonomy and improved workflows

**Tier 2.1: AI Agent Infrastructure**

1. **role-based-subagents** (Large) - Automated reviews from specialized agents (PM, Architect, Engineer)
2. **config-management** (Medium) - Centralized configuration in .xe/catalyst.json for autonomy settings

**Tier 2.2: Autonomous Orchestration (depends on 2.1)**

1. **autonomous-orchestration** (Large) - Remote GitHub app orchestrating multi-feature workflows with PR-based checkpoints

**Tier 2.3: Infrastructure (TBD - evaluate during Phase 2)**

1. **rollout-orchestration** (TBD) - Shared orchestration infrastructure if extraction needed from feature-rollout

### Phase 3 (Innovation - The Magic)
**Goal:** Deliver breakthrough autonomous capabilities

**Tier 3.1: Autonomous Review & Improvement**

1. **autonomous-pull-request-review** (Large) - Monitor PRs, review code quality, suggest fixes, auto-approve or request changes
2. **autonomous-issue-review** (Medium) - Triage issues, label, assign, suggest solutions, create related issues
3. **autonomous-discussion-review** (Medium) - Monitor discussions, provide context, answer questions, escalate decisions
4. **autonomous-architecture-review** (Large) - Code quality monitoring, tech debt detection, refactoring, dependency updates
5. **autonomous-product-review** (Large) - Market analysis, competitive research, product strategy updates, feature recommendations
6. **conversational-agents** (Large) - Openly discuss ideas, brainstorm, ask for research/analysis

### Phase 4 (Platform - Extensibility)
**Goal:** Build extensible foundation for customization

**Tier 4.1: Platform Extensions (depends on Phase 1 core)**

1. **template-customization** (Small) - Project-specific template overrides
2. **custom-playbooks** (Medium) - SDK for creating project-specific playbooks
3. **plugin-system** (Large) - Community extensions and integrations

### Phase 5 (Enterprise - Scale)
**Goal:** Enterprise readiness and team collaboration

**Tier 5.1: Enterprise Features (depends on Phase 4)**

1. **multi-repository-management** (Large) - Centralized orchestration across projects
2. **multi-team-coordination** (Large) - Cross-team feature dependencies and planning
3. **audit-logging** (Medium) - Complete execution history and compliance tracking

## Migration / Compatibility Considerations

Since this is a new framework being developed, migration concerns are minimal. Key considerations:
- Templates and playbooks must remain backward compatible as framework evolves
- Context file formats should be versioned to support future schema changes
- Postinstall scripts must handle both fresh installations and updates
- Feature specs should support incremental implementation (blueprint can be partially complete)

## Open Questions

- Q001: Should blueprint support parallel feature development (features in same tier)? — Owner: @flanakin — ETA: 2025-11-05
- Q002: How should playbooks handle execution failures mid-workflow? — Owner: @flanakin — ETA: 2025-11-10
- Q003: What level of autonomy should be default for Phase 1? — Owner: @flanakin — ETA: 2025-11-05

## Decision Log

- Decision: Use 5-tier dependency structure vs flat priority list
  - Rationale: Explicit dependencies prevent implementation order errors; tiers enable parallel work
  - Alternatives considered: Flat priority list (simpler but loses dependency info), DAG representation (more accurate but harder to communicate)
  - Date: 2025-11-01
  - Owner: @flanakin

- Decision: Separate AI platform integrations into distinct features
  - Rationale: Single Responsibility Principle; enables platform-specific development and testing
  - Alternatives considered: Combined "AI Integration" feature (simpler but violates SRP)
  - Date: 2025-11-01
  - Owner: @flanakin

- Decision: Include template-customization and custom-playbooks in blueprint
  - Rationale: Phase 4 (Platform) is core to product strategy; needed for extensibility
  - Alternatives considered: Defer to future blueprint (simpler but loses strategic context)
  - Date: 2025-11-01
  - Owner: @flanakin

## References

- [Existing playbook structure](src/playbooks/) - Current implementation examples
- [Template examples](src/templates/) - Current template patterns
