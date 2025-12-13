# Research: Feature Context Templates

**Date**: 2025-11-11
**Author**: @flanakin
**Feature ID**: feature-context

## Overview

This research document analyzes requirements for feature context template files (spec.md, plan.md, tasks.md, research.md) used by blueprint-creation and feature-rollout playbooks to generate consistent feature documentation.

## Key Findings

### Existing Templates Analysis

**Current state** (from `src/resources/templates/specs/`):
- ✅ spec.md - Feature specification template
- ✅ plan.md - Implementation plan template
- ✅ tasks.md - Task breakdown template
- ✅ research.md - Research document template
- ✅ rollout.md - Rollout orchestration template
- ✅ playbook.md - Playbook template (for playbook-engine feature)
- ✅ product.md - Product context template (for product-context feature)
- ✅ competitive-analysis.md - Competitive analysis template (for product-context feature)
- ✅ architecture.md - Architecture template (for engineering-context feature)
- ✅ engineering.md - Engineering principles template (for engineering-context feature)
- ✅ development.md - Development process template (for engineering-context feature)

**Observation**: All feature-related templates already exist in `src/resources/templates/specs/`.

### Template Standard Compliance

From `.xe/standards/catalyst.md`:
- Token-optimized (concise, no bloat)
- Use `{placeholder-name}` in kebab-case
- Use `> [INSTRUCTIONS]` prefix for guidance
- Standard markdown with clear heading hierarchy

### Dependencies

**Prerequisites**:
- product-context feature (provides product.md template) ✅ Complete
- engineering-context feature (provides engineering templates) ✅ Complete

**Feature-context depends on**:
- Templates must align with product vision from product-context
- Templates must follow engineering standards from engineering-context

### Usage Context

**Used by**:
1. **blueprint-creation playbook** - Generates feature specs from product vision
2. **feature-rollout playbook** - Creates spec → plan → tasks for each feature

**Workflow**:
```
AI reads template → AI fills in placeholders → AI removes instructions → Feature doc created
```

### Token Efficiency Analysis

Current template sizes (from engineering-context testing):
- spec.md: ~150-200 lines (comprehensive but concise)
- plan.md: ~100-150 lines (focused on implementation approach)
- tasks.md: ~40-60 lines (checklist format)
- research.md: ~50-80 lines (analysis and findings)

All templates are token-optimized per Catalyst standards.

## Design Decisions

### Decision 1: No New Templates Needed

**Rationale**: All feature context templates already exist in `src/resources/templates/specs/`. The feature-context feature should focus on:
1. Validating existing templates meet requirements
2. Documenting template usage patterns
3. Ensuring templates are discoverable

**Alternative considered**: Create separate "feature template" directory
**Rejected because**: Templates are already in logical location; moving them adds complexity

### Decision 2: Add Validation Tests

**Rationale**: Templates should have automated validation like architecture/engineering templates
**Approach**: Create Jest tests for spec.md, plan.md, tasks.md, research.md templates
**Benefit**: Ensures template quality and consistency

### Decision 3: Document Template Relationships

**Rationale**: Templates reference each other (spec.md references plan.md, etc.)
**Approach**: Document cross-references in this research
**Benefit**: Clarifies template ecosystem for developers

## Template Relationships

```
spec.md (WHAT & WHY)
  ↓ references
plan.md (HOW)
  ↓ references
tasks.md (STEPS)
  ↓ uses
research.md (ANALYSIS)
  ↑ informs
rollout.md (ORCHESTRATION)
```

## Testing Strategy

**Validation requirements**:
1. spec.md template follows Catalyst standard (placeholders, instructions, headings)
2. plan.md template includes all required sections per engineering process
3. tasks.md template has proper step structure
4. research.md template encourages thorough analysis
5. rollout.md template tracks feature progress

**Testing approach**:
- Jest tests similar to validate-architecture.test.ts
- Validate FR requirements defined in spec.md
- Check token optimization (reasonable line counts)

## Recommendations

1. **Create validation tests** for remaining templates (spec.md, plan.md, tasks.md, research.md, rollout.md)
2. **Document template usage** in feature spec
3. **Ensure discoverability** - templates are findable in src/resources/templates/specs/
4. **Maintain consistency** - all templates follow same standard

## References

- Existing templates: `src/resources/templates/specs/`
- Template standard: `.xe/standards/catalyst.md`
- Product context: `.xe/product.md`
- Engineering context: `.xe/engineering.md`
- Development process: `.xe/process/development.md`
- Similar feature: engineering-context (created architecture/engineering/development templates)
