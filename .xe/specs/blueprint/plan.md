---
id: blueprint
title: Catalyst Product Blueprint
author: "@flanakin"
description: "This document defines the implementation plan for building the complete Catalyst product by implementing all 27 features across 5 strategic phases in dependency order."
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Implementation Plan: Catalyst Product Blueprint

> **CRITICAL INSTRUCTION**
> This implementation plan describes how to build the complete Catalyst product from scratch by implementing all 27 features in the blueprint. Each feature is implemented via `/catalyst:run start-rollout {feature-id}`.

**Spec**: [Feature spec](./spec.md)

---

## Summary

The Catalyst product will be built by implementing 27 discrete features across 5 strategic phases (POC, Mainstream, Innovation, Platform, Enterprise) in dependency order. Features are organized into phase-relative tiers where features in the same tier can be implemented in parallel. Implementation follows a phased rollout strategy: complete all Phase 1 features before starting Phase 2, implement features tier-by-tier within each phase, and track progress in the rollout plan.

**Design rationale**: See [research.md](./research.md) for feature breakdown methodology, phase assignment decisions, and tier numbering rationale.

---

## Technical Context

This feature implementation plan extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: 27 features implemented via individual feature rollouts
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
   - Spec → Plan → Tasks → Code → Tests → PR → Merge
   - Human checkpoints at spec, plan, and tasks approval
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

## Usage Examples

**Implementing the product:**

**1. Start with Phase 1, Tier 1.1 (no dependencies):**

```bash
# Implement foundation features in parallel
/catalyst:run start-rollout product-context
/catalyst:run start-rollout engineering-context
/catalyst:run start-rollout github-integration
```

**2. Mark features complete in rollout plan:**

After each feature PR merges:
```bash
# Edit .xe/rollouts/rollout-blueprint.md
# Change [ ] to [x] for completed feature
- [x] product-context
```

**3. Continue to next tier:**

Once Tier 1.1 complete, start Tier 1.2:
```bash
/catalyst:run start-rollout playbook-engine
/catalyst:run start-rollout project-initialization
```

**4. Track overall progress:**

```bash
# View rollout plan to see status
cat .xe/rollouts/rollout-blueprint.md

# Count completed features
grep -c "\[x\]" .xe/rollouts/rollout-blueprint.md
```
