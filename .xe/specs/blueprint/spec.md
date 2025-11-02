---
id: blueprint
title: Catalyst Product Blueprint
author: "@flanakin"
description: "This document defines the complete feature roadmap for Catalyst, breaking down the product vision into 27 discrete features across 5 phases with clear dependencies, scope boundaries, and implementation priorities."
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Catalyst Product Blueprint

## Problem

AI code generation without context leads to poorly designed software that isn't reliable, doesn't scale, and has security vulnerabilities. Development teams need a framework that combines AI automation with context engineering and spec-driven development to maintain enterprise-scale quality while achieving autonomous execution.

## Goals

- Enable autonomous AI software development with human oversight at key checkpoints (spec → plan → tasks)
- Provide context engineering foundation via centralized `.xe/` directory for product, architecture, engineering, and process context
- Support spec-driven development with reusable playbooks and templates for consistent, reproducible workflows
- Enable progressive feature implementation via blueprint-based rollout guides
- Support multi-agent platforms (Claude Code, GitHub Copilot, future extensibility)
- Achieve enterprise-scale quality for projects serving millions of monthly active users
- Package as reusable npm framework for distribution across projects

Explicit non-goals:

- Full automation without human checkpoints - human review at deliverables is core to design
- GitHub app automation layer - current phase focuses on manual MVP
- Automatic migration of pre-existing codebases - designed for new development

## Scenario

- As a **Product Manager**, I need AI to generate feature specs from issues while maintaining context about product vision and strategy
  - Outcome: Context-aware specs that align with product.md strategy without manual copy-paste

- As an **Architect**, I need AI to follow established architecture patterns and design principles when implementing features
  - Outcome: Consistent technical decisions based on architecture.md and engineering.md without repeated explanations

- As an **Engineer**, I need AI to implement features autonomously between checkpoints while adhering to quality standards
  - Outcome: 80% autonomous execution with human review only at spec, plan, and task milestones

- As a **Framework User**, I need reusable playbooks and templates to adopt Catalyst's workflow in my own projects
  - Outcome: Install via npm, run initialization, get immediate access to context engineering and spec-driven workflows

## Success Criteria

- Successfully package and distribute Catalyst as npm package for reuse across multiple projects
- 90%+ adherence to standardized templates and playbooks across all implementations
- 100% of deliverables pass human review at spec, plan, and task checkpoints before implementation
- Reduce time from feature concept to production-ready code by 50% compared to manual workflows
- Achieve 80% autonomous execution between human checkpoints while maintaining quality standards
- Support projects serving millions of monthly active users with enterprise-scale reliability, security, and scalability
- Enable both Claude Code and GitHub Copilot integration with extensibility for future AI platforms

## Design principles

- **Context over repetition**
  > Store project context centrally in `.xe/` directory so AI reads context once instead of receiving repeated instructions. Context files (product.md, architecture.md, engineering.md) provide single source of truth for vision, patterns, and principles.

- **Human checkpoints at deliverables**
  > AI executes autonomously between checkpoints but requires human approval at spec, plan, and tasks milestones. This prevents AI hallucinations while maintaining velocity by avoiding micro-management.

- **Spec-driven development**
  > Every feature starts with a spec defining problem, goals, scenarios, requirements, and success criteria. Specs guide AI implementation and serve as documentation for future reference.

- **Reusable playbooks over custom prompts**
  > Structured workflows (playbooks) with defined inputs, outputs, and steps enable consistent execution across platforms. Playbooks are AI-agnostic markdown files, not platform-specific code.

## Requirements

### Functional Requirements

**Context Engineering:**
- **FR-1**: Framework MUST provide centralized context storage in `.xe/` directory
- **FR-2**: Framework MUST support context files for product vision (product.md), architecture patterns (architecture.md), engineering principles (engineering.md), and development process (process/development.md)
- **FR-3**: Context files MUST use structured markdown format parseable by AI
- **FR-4**: Context files MUST be created via project initialization from GitHub issues

**Spec-Driven Development:**
- **FR-5**: Framework MUST provide playbook engine for executing structured workflows
- **FR-6**: Playbooks MUST define inputs, outputs, execution steps, checkpoints, and success criteria
- **FR-7**: Framework MUST support human checkpoints at spec, plan, and tasks milestones
- **FR-8**: Framework MUST provide templates for specs, plans, tasks, and rollouts

**Feature Implementation:**
- **FR-9**: Framework MUST support blueprint-based feature breakdown with dependencies, phases, and priorities
- **FR-10**: Framework MUST enable progressive feature rollout via start-rollout playbook
- **FR-11**: Framework MUST track feature implementation status in rollout plans
- **FR-12**: Features MUST be organized into dependency tiers enabling parallel development

**Multi-Agent Support:**
- **FR-13**: Framework MUST integrate with Claude Code via slash commands in `.claude/commands/`
- **FR-14**: Framework MUST integrate with GitHub Copilot (future - not in Phase 1)
- **FR-15**: Integration layer MUST be extensible for future AI platforms

**Distribution:**
- **FR-16**: Framework MUST be packaged as npm module `@xerilium/catalyst`
- **FR-17**: Framework MUST include postinstall scripts to copy integration files to consumer projects
- **FR-18**: Framework MUST support project-specific template overrides (Phase 4)

### Non-functional requirements

- **NFR-1**: Cost & usage efficiency
  - Context files SHOULD be concise (<5000 tokens each) to minimize AI token usage
  - Playbooks SHOULD avoid redundant context by referencing context files
  - Template generation SHOULD reuse patterns to reduce implementation time

- **NFR-2**: Security
  - Framework MUST NOT store credentials or secrets in context files
  - GitHub integration MUST use authenticated GitHub CLI (`gh`) commands
  - Generated code MUST follow security best practices from engineering.md

- **NFR-3**: Reliability
  - Playbook execution MUST handle errors gracefully with clear user guidance
  - Context file validation MUST catch malformed markdown before AI processing
  - Feature dependency graph MUST be acyclic to prevent circular dependencies

- **NFR-4**: Performance
  - Context files MUST be parseable by AI in single pass without external dependencies
  - Playbook execution MUST complete within reasonable time (target <5 minutes for most workflows)
  - Template substitution MUST be instant (<1 second)

- **NFR-5**: Observability
  - Rollout plans MUST track feature implementation status with checkboxes
  - Playbooks MUST log execution steps for debugging
  - Framework MUST provide clear error messages for validation failures

- **NFR-6**: Accessibility
  - All markdown files MUST be human-readable and renderable in GitHub
  - Mermaid diagrams MUST render correctly for visual understanding
  - Templates MUST include comments explaining substitution variables

- **NFR-7**: Globalization
  - Not applicable - Catalyst is English-only framework in Phase 1

- **NFR-8**: Backward compatibility
  - Context file schemas SHOULD be versioned for future migration support
  - Template formats MUST remain stable across minor version updates
  - Playbook interfaces (inputs/outputs) MUST be backward compatible

## Key Entities

**Core domain entities:**

1. **Context Files** - Markdown files in `.xe/` directory containing project state
   - `product.md` - Product vision, strategy, team, success metrics
   - `architecture.md` - Technical patterns, technology stack, repository structure
   - `engineering.md` - Engineering principles and standards
   - `process/development.md` - Development workflow phases
   - `competitive-analysis.md` - Market research and competitive positioning

2. **Templates** - Reusable markdown templates for issues, specs, plans, tasks, rollouts
   - Located in `src/templates/` (framework) or `node_modules/@xerilium/catalyst/templates/` (project-specific overrides)
   - Support variable substitution via conventions defined in engineering standards

3. **Playbooks** - AI-agnostic workflow definitions with inputs, outputs, and execution steps
   - Located in `node_modules/@xerilium/catalyst/playbooks/`
   - Define structured workflows (start-initialization, start-blueprint, start-rollout)
   - Include error handling, checkpoints, and success criteria

4. **Features** - Discrete capabilities with specs, plans, and tasks
   - Located in `.xe/specs/{feature-id}/` directory
   - Each feature has: spec.md (requirements), plan.md (design), tasks.md (implementation), research.md (analysis)

5. **Rollouts** - Orchestration plans coordinating feature implementation
   - Located in `.xe/rollouts/rollout-{rollout-id}.md`
   - Coordinate: pre-implementation → tasks.md → post-implementation → cleanup
   - Track feature implementation status

**Inputs:**
- GitHub issues for project initialization and feature planning
- User-provided context during initialization workflow

**Outputs:**
- Generated context files in `.xe/` directory
- Feature specifications in `.xe/specs/{feature-id}/`
- Rollout orchestration plans in `.xe/rollouts/`
- Implementation code in project source directories

## Dependencies

- GitHub CLI (`gh`) for issue and PR operations
- Node.js runtime for executing playbook scripts
- npm for package distribution and installation

---

**Note:** See [plan.md](./plan.md) for the complete feature breakdown showing how Catalyst's 27 features are organized across 5 phases with dependency relationships.
