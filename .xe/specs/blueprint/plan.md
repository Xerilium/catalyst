---
id: blueprint
title: Catalyst Product Blueprint
author: "@flanakin"
description: "This document defines the implementation plan for building the complete Catalyst product by implementing features across 5 strategic phases in dependency order."
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Implementation Plan: Catalyst Product Blueprint

> **CRITICAL INSTRUCTION**
> This implementation plan describes how to build the complete Catalyst product from scratch by implementing all features in the blueprint. Each feature is implemented via `/catalyst:run start-rollout {feature-id}`.

**Spec**: [Feature spec](./spec.md)

---

## Summary

The Catalyst product will be built by implementing discrete features across 5 strategic phases (POC, Mainstream, Innovation, Platform, Enterprise) in dependency order. Features are organized into phase-relative tiers where features in the same tier can be implemented in parallel. Implementation follows a phased rollout strategy: complete all Phase 1 features before starting Phase 2, implement features tier-by-tier within each phase, and track progress in the rollout plan.

**Design rationale**: See [research.md](./research.md) for feature breakdown methodology, phase assignment decisions, and tier numbering rationale.

---

## Technical Context

This feature implementation plan extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: Features implemented via individual feature rollouts
- **Data Structures**: Each feature has spec.md, plan.md, tasks.md in `.xe/specs/{feature-id}/`
- **Dependencies**: Each feature depends on prior tier features being complete
- **Configuration**: Phase and tier structure from blueprint spec
- **Performance Goals**: N/A - this is a meta-feature orchestrating other features
- **Testing Framework**: Each feature has its own testing requirements per `.xe/engineering.md`
- **Key Constraints**: Features must be implemented in dependency order (tier-by-tier)

---

## Project Structure

Features will be implemented in `.xe/specs/{feature-id}/` directories as they are rolled out:

```
.xe/specs/
├── blueprint/            # Meta-feature (this blueprint)
├── product-context/      # Created by first feature rollout
├── engineering-context/  # Created by second feature rollout
├── github-integration/   # Created by third feature rollout
└── ...                   # Additional features as implemented
```

---

## Data Model

**Entities owned by this feature:**

- **Feature**: Discrete capability with clear scope boundaries
  - `id`: string (kebab-case, e.g., "product-context", "autonomous-orchestration")
  - `name`: string (display name)
  - `description`: string (1-2 sentence scope definition)
  - `phase`: "POC" | "Mainstream" | "Innovation" | "Platform" | "Enterprise"
  - `tier`: string (phase-relative numbering: "1.1", "1.2", "2.1", etc.)
  - `dependencies`: string[] (array of feature IDs this depends on)
  - `complexity`: "Small" | "Medium" | "Large"
  - `priority`: number (implementation order)

- **Phase**: Strategic grouping of features
  - `name`: "POC" | "Mainstream" | "Innovation" | "Platform" | "Enterprise"
  - `goal`: string (phase objective)
  - `tiers`: Tier[] (dependency-based groupings within phase)

- **Tier**: Dependency-based grouping enabling parallel development
  - `id`: string (phase-relative: "1.1", "1.2", "2.1", etc.)
  - `features`: Feature[] (features with no cross-dependencies within tier)

**Entities from other features:**

- **Context Files** (product-context, engineering-context): Source of product strategy, engineering principles, and technical patterns
- **Playbooks** (playbook-engine): Workflows that features will execute once implemented

---

## Implementation Approach

### 1. Phased Rollout Strategy

**Phase Completion Criteria:**
- All features in a phase must be complete before starting next phase
- Features can be implemented in parallel within same tier
- Each feature must pass all success criteria before marked complete

**Implementation Sequence:**
1. Implement Phase 1 (POC) - 11 features, tier-by-tier
2. Phase transition checkpoint - review Phase 1, plan Phase 2 details
3. Implement Phase 2 (Mainstream) - 4 features, tier-by-tier
4. Continue for Phases 3-5

### 2. Feature Implementation Process

**For each feature:**

1. **Execute start-rollout playbook**:
   ```bash
   /catalyst:run start-rollout {feature-id}
   ```

2. **Playbook creates**:
   - `.xe/specs/{feature-id}/spec.md` - Feature requirements
   - `.xe/specs/{feature-id}/plan.md` - Implementation design
   - `.xe/specs/{feature-id}/tasks.md` - Implementation checklist
   - `.xe/specs/{feature-id}/research.md` - Analysis and decisions

3. **Implementation workflow**:
   - Spec → Plan → Tasks → Code → Tests → Documentation → PR → Merge
   - Human checkpoints via pull requests after spec, plan, tasks, code and tests, and documentation (internal/external where applicable)
   - Update rollout-blueprint.md checkbox when feature complete

### 3. Tier-Based Parallelization

**Within each tier:**
- Features marked [P] can be implemented in parallel
- No dependencies between features in same tier
- All features in tier must complete before next tier starts

**Example - Phase 1, Tier 1.1:**
```bash
# These can run in parallel (no cross-dependencies)
/catalyst:run start-rollout product-context       # [P]
/catalyst:run start-rollout engineering-context   # [P]
/catalyst:run start-rollout github-integration    # [P]
```

### 4. Dependency Management

**Dependency rules:**
- Features depend on ALL features in prior tiers
- Features in same tier have NO dependencies on each other
- Circular dependencies are not allowed (graph is acyclic)

**Validation:**
- Check dependency graph before starting each feature
- Verify all dependencies are marked complete in rollout plan
- Block feature implementation if dependencies incomplete

### 5. Integration Points

**Blueprint integrates with:**
- **Context files** - Each feature reads product.md, architecture.md, engineering.md for requirements
- **Playbook engine** - start-rollout playbook orchestrates each feature implementation
- **Rollout tracking** - rollout-blueprint.md maintains implementation status

**Status reporting:**
- Update rollout-blueprint.md checkbox after each feature merge
- Track blockers and dependencies in rollout plan
- Report phase completion milestones

### 6. Error Handling

- **Dependency not met**: Block feature start if dependencies not complete, show missing dependencies
- **Feature implementation fails**: Document blocker in rollout plan, preserve completed work
- **Parallel conflicts**: If parallel features conflict, serialize them and document decision
- **Phase transition issues**: Review incomplete features, decide to complete or defer to next phase

### 7. Testing Strategy

**Per-feature validation:**
- Each feature has own testing requirements in its spec.md
- All tests must pass before feature marked complete
- Code coverage targets per `.xe/engineering.md`

**Blueprint-level validation:**
- All Phase 1 features complete before Phase 2 starts
- No circular dependencies in graph
- Rollout plan accurately reflects implementation status

---

## Feature Breakdown

### Phase 1: POC - Early Adopters

**Tier 1.1: Context Foundation**

1. **product-context** (Small, Priority 1)
   - Dependencies: None
   - Scope: PM-owned context files (product.md, competitive-analysis.md) defining product vision, strategy, team, and success metrics

2. **engineering-context** (Medium, Priority 2)
   - Dependencies: None
   - Scope: Engineering-owned context files (architecture.md, engineering.md, process/development.md) defining technical patterns, principles, and workflows

3. **github-integration** (Medium, Priority 3)
   - Dependencies: None
   - Scope: GitHub CLI wrapper for issue and PR operations with consistent error handling per Dependency Inversion principle

**Tier 1.2: Core Workflows**

1. **playbook-engine** (Large, Priority 4)
   - Dependencies: engineering-context
   - Scope: Execute structured workflows with inputs, outputs, steps, checkpoints, and error handling; support for manual and autonomous execution modes


2. **project-initialization** (Large, Priority 5)
   - Dependencies: product-context, engineering-context, github-integration, playbook-engine
   - Scope: Generate project context files from GitHub issue using initialization playbook and templates

**Tier 1.3: Feature Development**

1. **blueprint-creation** (Large, Priority 6)
   - Dependencies: playbook-engine, project-initialization
   - Scope: Break down product vision into features with dependencies, phases, and priorities using blueprint playbook


2. **feature-rollout** (Large, Priority 7)
   - Dependencies: playbook-engine, project-initialization
   - Scope: Implement features via spec → plan → tasks → implementation workflow with human checkpoints

**Tier 1.4: Extraction & AI Integration**

1. **extract-features** (Medium, Priority 8)
   - Dependencies: feature-rollout
   - Scope: Extract specs from existing implementations via research → analysis → spec generation, then run feature-rollout playbook

2. **extract-blueprint** (Medium, Priority 9)
   - Dependencies: blueprint-creation
   - Scope: Extract blueprint from existing projects via structure analysis → feature identification, then run blueprint-creation playbook

3. **slash-command-integration** (Medium, Priority 10)
   - Dependencies: playbook-engine, blueprint-creation, feature-rollout
   - Scope: Markdown-based slash commands for AI platforms (Claude Code, GitHub Copilot) wrapping playbook execution

**Tier 1.5: Distribution**

1. **framework-distribution** (Medium, Priority 11)
   - Dependencies: slash-command-integration
   - Scope: Package framework for easy distribution with installation scripts to copy AI integration files to consumer projects

### Phase 2: Mainstream - Product-Market Fit (4 features, high-level)

**Tier 2.1: AI Agent Infrastructure**

1. **role-based-subagents** (Large, Priority 12)
   - Dependencies: Phase 1 complete
   - Scope: Specialized agent implementations (PM, Architect, Engineer) for automated reviews; usable locally or in autonomous workflows

2. **config-management** (Medium, Priority 13)
   - Dependencies: Phase 1 complete
   - Scope: Centralized configuration in `.xe/catalyst.json` for autonomy settings, playbook defaults, and integration configuration

**Tier 2.2: Autonomous Orchestration**

1. **autonomous-orchestration** (Large, Priority 14)
   - Dependencies: role-based-subagents, config-management
   - Scope: Remote GitHub app orchestrating multi-feature workflows with PR-based checkpoints and autonomous execution

**Tier 2.3: Infrastructure (TBD)**

1. **rollout-orchestration** (TBD, Priority 15)
   - Dependencies: feature-rollout
   - Scope: TBD - evaluate during Phase 2 if shared orchestration infrastructure should be extracted from feature-rollout

### Phase 3: Innovation - The Magic (6 features, high-level)

**Tier 3.1: Autonomous Review & Improvement**

1. **autonomous-pull-request-review** (Large, Priority 16)
   - Dependencies: autonomous-orchestration
   - Scope: Monitor PRs, review code quality, suggest fixes, auto-approve or request changes

2. **autonomous-issue-review** (Medium, Priority 17)
   - Dependencies: autonomous-orchestration
   - Scope: Triage issues, label, assign, suggest solutions, create related issues

3. **autonomous-discussion-review** (Medium, Priority 18)
   - Dependencies: autonomous-orchestration
   - Scope: Monitor discussions, provide context, answer questions, escalate decisions

4. **autonomous-architecture-review** (Large, Priority 19)
   - Dependencies: autonomous-orchestration
   - Scope: Code quality monitoring, tech debt detection, refactoring recommendations, dependency updates

5. **autonomous-product-review** (Large, Priority 20)
   - Dependencies: autonomous-orchestration
   - Scope: Market analysis, competitive research, product strategy updates, feature recommendations

6. **conversational-agents** (Large, Priority 21)
   - Dependencies: role-based-subagents
   - Scope: Interactive discussion, brainstorming, research requests, and analysis with human collaboration

### Phase 4: Platform - Extensibility (3 features, high-level)

**Tier 4.1: Platform Extensions**

1. **template-customization** (Small, Priority 22)
   - Dependencies: Phase 1 complete
   - Scope: Project-specific template overrides in `node_modules/@xerilium/catalyst/templates/` with fallback to framework defaults

2. **custom-playbooks** (Medium, Priority 23)
   - Dependencies: playbook-engine
   - Scope: SDK for creating project-specific playbooks with validation and testing utilities

3. **plugin-system** (Large, Priority 24)
   - Dependencies: template-customization, custom-playbooks
   - Scope: Community extensions and integrations with discovery, installation, and versioning

### Phase 5: Enterprise + Scale (3 features, high-level)

**Tier 5.1: Enterprise Features**

1. **multi-repository-management** (Large, Priority 25)
   - Dependencies: autonomous-orchestration
   - Scope: Centralized orchestration across multiple repositories with shared context and dependency management

2. **multi-team-coordination** (Large, Priority 26)
   - Dependencies: multi-repository-management
   - Scope: Cross-team feature dependencies, planning coordination, and workflow orchestration

3. **audit-logging** (Medium, Priority 27)
   - Dependencies: Phase 4 complete
   - Scope: Complete execution history, compliance tracking, and rollback capabilities

## Feature Dependency Graph

```mermaid
graph TD
    %% Phase 1 - Tier 1.1
    pc[product-context]
    ec[engineering-context]
    gh[github-integration]

    %% Phase 1 - Tier 1.2
    pe[playbook-engine]
    pi[project-initialization]

    %% Phase 1 - Tier 1.3
    bc[blueprint-creation]
    fr[feature-rollout]

    %% Phase 1 - Tier 1.4
    sc[slash-command-integration]

    %% Phase 1 - Tier 1.5
    dist[framework-distribution]

    %% Phase 1 - Tier 1.6
    ef[extract-features]
    eb[extract-blueprint]

    %% Phase 2
    rbs[role-based-subagents]
    cm[config-management]
    ao[autonomous-orchestration]
    ro[rollout-orchestration]

    %% Phase 3
    apr[autonomous-pull-request-review]
    air[autonomous-issue-review]
    adr[autonomous-discussion-review]
    aar[autonomous-architecture-review]
    aprod[autonomous-product-review]
    ca[conversational-agents]

    %% Phase 4
    tc[template-customization]
    cp[custom-playbooks]
    ps[plugin-system]

    %% Phase 5
    mrm[multi-repository-management]
    mtc[multi-team-coordination]
    al[audit-logging]

    %% Phase 1 Dependencies
    ec --> pe
    pc --> pi
    ec --> pi
    gh --> pi
    pe --> pi
    pe --> bc
    pi --> bc
    pe --> fr
    pi --> fr
    pe --> sc
    bc --> sc
    fr --> sc
    sc --> dist
    fr --> ef
    bc --> eb

    %% Phase 2 Dependencies
    dist --> rbs
    dist --> cm
    rbs --> ao
    cm --> ao
    fr --> ro

    %% Phase 3 Dependencies
    ao --> apr
    ao --> air
    ao --> adr
    ao --> aar
    ao --> aprod
    rbs --> ca

    %% Phase 4 Dependencies
    dist --> tc
    pe --> cp
    tc --> ps
    cp --> ps

    %% Phase 5 Dependencies
    ao --> mrm
    mrm --> mtc
    ps --> al
```
