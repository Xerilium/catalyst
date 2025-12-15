---
id: product-context
title: Product Context Research
date: 2025-11-06
---

# Research: Product Context

## Overview

This feature establishes the foundational context files that define product vision, strategy, team structure, and success metrics for AI-powered software development. This is the first feature in Phase 1 (POC) of the Catalyst product blueprint and enables all subsequent features to operate with consistent product understanding.

## Blueprint Analysis

**Feature Position**: Phase 1, Tier 1.1 - Context Foundation
**Dependencies**: None (foundational feature)
**Dependents**:
- feature-context (Tier 1.2) - requires product context to generate feature templates
- project-init (Tier 1.5) - uses product context templates for new projects
- blueprint-creation (Tier 1.5) - references product vision for breaking down features

**Scope from Blueprint**: PM-owned context files (product.md, competitive-analysis.md) defining product vision, strategy, team, and success metrics

## Current State Assessment

### Existing Context Files

The `.xe/` directory currently contains:
- `product.md` - Product context already exists with comprehensive product vision, strategy, design principles, technical requirements, success metrics, and team structure
- `architecture.md` - Technical architecture patterns and repository structure
- `engineering.md` - Core engineering principles and technical standards
- `process/development.md` - Development workflow and implementation process

### Missing Context Files

- `competitive-analysis.md` - Market analysis and competitive landscape (mentioned in blueprint scope but not yet created)

### Observations

1. **Product.md is comprehensive**: The existing product.md file contains all the elements mentioned in the blueprint scope:
   - Product vision and system overview
   - Product strategy with phased implementation priorities
   - Design principles (Collaborative, Transparent, Autonomous, Accountable)
   - Technical requirements
   - Success metrics
   - Team structure with roles

2. **Competitive analysis missing**: The competitive-analysis.md file referenced in the blueprint scope does not exist yet

3. **Templates needed**: To make this feature reusable for other projects, we need templates that can be instantiated during project initialization

## Additional Market Research

Research on successful SaaS product management practices for scaling to enterprise reveals key documentation requirements:

**Strategic Documentation Needs:**
1. **Product Vision & Strategy**: System overview, phased priorities, design principles
2. **Competitive Analysis**: Market positioning, competitor features, differentiation
3. **Go-to-Market Strategy**: Target markets, buyer personas, value proposition, channels, pricing
4. **Success Metrics**: OKRs, adoption rates, performance benchmarks

**Enterprise Scaling Requirements:**
- Workspace management for users/collaborators
- Data & analytics for data-driven decisions
- IT & admin for centralized authentication
- Security for data protection
- Integration capabilities
- Availability monitoring

## Feature Decomposition

Based on the blueprint scope, current state analysis, and market research, the product-context feature includes:

1. **Primary Templates** (this feature):
   - product.md template (already exists in `src/resources/templates/specs/` - needs validation)
   - competitive-analysis.md template (needs creation)
   - go-to-market.md template (needs creation based on market research)
   - Dependencies: None
   - Outputs: Reusable templates in `src/resources/templates/specs/`

2. **No sub-features needed** - This is a focused, foundational feature

## Technical Debt and Cleanup Opportunities

1. **Existing templates**: Product context templates (product.md, architecture.md, engineering.md) already exist in `src/resources/templates/specs/`

2. **Only missing template**: competitive-analysis.md template needs to be created

3. **Template location**: Consistent with existing templates - should live in `src/resources/templates/specs/` (source) and be compiled to `node_modules/@xerilium/catalyst/templates/specs/` (published package)

4. **Consistency**: Ensure competitive-analysis.md template structure aligns with existing template format (frontmatter, sections, instruction blocks)

## Design Decisions

### Decision: Reuse Existing Template Location

**What was chosen**: Create competitive-analysis.md template in existing `src/resources/templates/specs/` directory

**Rationale**:
- Product context templates (product.md, architecture.md, engineering.md) already exist in `src/resources/templates/specs/`
- Maintaining consistency with existing template organization
- "specs" folder contains all context and feature specification templates
- No need to create new folder structure or move existing templates

**Alternatives considered**:
- Create separate `src/resources/templates/context/` folder (rejected - unnecessary reorganization, would require updating all references)
- Skip template creation (rejected - competitive analysis is mentioned in blueprint scope and development.md)

### Decision: Competitive Analysis Template Structure

**What was chosen**: Create comprehensive competitive-analysis.md template with structured sections

**Rationale**:
- Market analysis is critical for product-market fit
- Structured template ensures consistency across projects
- Template guides PMs through competitive analysis process
- Reusable across projects of different scales

**Alternatives considered**:
- Skip competitive analysis (rejected - reduces product quality)
- Include competitive analysis in product.md (rejected - violates separation of concerns)

### Decision: Template Placeholder Format

**What was chosen**: Use `{placeholder-name}` format for variables and `> [INSTRUCTIONS]` blocks for guidance

**Rationale**:
- Consistent with existing spec.md template format
- Clear distinction between template instructions and final content
- Easy for AI to parse and replace placeholders
- Familiar pattern for developers

**Data flow**:
1. PM provides product vision, strategy, and competitive insights
2. Templates are populated with project-specific values
3. Templates are instantiated in `.xe/` directory during project initialization
4. AI reads these files to understand product context for all subsequent features

## Integration Points

**Templates integrate with**:
- `project-init` playbook - uses templates to create initial `.xe/` structure
- `blueprint-creation` playbook - references product.md for product vision
- All feature implementation - features read product.md for product context

**Template location**:
- Source: `src/resources/templates/specs/competitive-analysis.md` (new), alongside existing product.md, architecture.md, engineering.md
- Published: `node_modules/@xerilium/catalyst/templates/specs/competitive-analysis.md`
- Consumer instantiation: Copied to `.xe/competitive-analysis.md` during project initialization or market research updates

## Market Research

This is a foundational framework feature, not a user-facing product feature. Market research for competitive frameworks is documented at the product level in `.xe/product.md` under "Product Strategy" and will be further detailed in the competitive-analysis.md file created by this feature.

## Rollout Strategy

**Pre-implementation**: None - no dependencies

**Implementation**:
1. Create template standard at `.xe/standards/catalyst.md` (prerequisite for all templates)
2. Validate existing product.md template against standard and add missing sections (Target Personas, High-Level Scenarios)
3. Create competitive-analysis.md template in `src/resources/templates/specs/` following standard
4. Create go-to-market.md template in `src/resources/templates/specs/` following standard
5. Ensure templates are included in build pipeline (already configured for specs folder)

**Post-implementation**: Update project-init playbook to use these templates (deferred to project-init feature in Tier 1.5)

**Cleanup**: None - this is a new feature with no legacy code

## Risk Assessment

**Low Risk**:
- Template creation with no runtime dependencies
- No breaking changes to existing code
- Templates are passive until used by project-init playbook
- Can be validated through inspection and test instantiation

**Validation approach**:
- Manual review of template structure and completeness
- Test instantiation with sample values
- Verify templates match existing product.md structure (for Catalyst itself)

## Success Validation

This feature is successful when:
- [ ] Template standard exists at `.xe/standards/catalyst.md` (prerequisite)
- [ ] product.md template validated with all required sections (System Overview, Product Strategy, Target Personas, High-Level Scenarios, Design Principles, Technical Requirements, Success Metrics, Non-Goals, Team)
- [ ] competitive-analysis.md template exists with structured analysis sections (Market Overview, Competitor Analysis, Competitive Advantages, Market Gaps, Positioning Strategy)
- [ ] go-to-market.md template exists with GTM sections (Strategy Overview, Target Market & Personas, Value Proposition & Positioning, Channels, Pricing, Success Metrics, Launch Timing)
- [ ] All templates follow `.xe/standards/catalyst.md` template standard
- [ ] Templates can be successfully instantiated for new projects

## Playbook Improvements Identified

The following playbook gaps and optimization opportunities were identified during this rollout:

1. **Circular Dependency Prevention**: AI commonly references features that depend on the current feature, creating circular dependencies. Playbook should explicitly instruct: "Do not reference features that depend on this feature. This feature should only know about its own scope and features it depends on."

2. **Scope Isolation**: AI includes references to downstream systems (e.g., build pipelines, distribution mechanisms) that depend on the feature rather than being dependencies. Playbook should clarify: "Do not mention systems that will consume this feature's output unless they are prerequisites."

3. **Instruction Block Audience**: Templates guide AI agents through completion, not human PMs. Playbook should clarify that instruction blocks are for AI consumption during project initialization.

4. **Startup Time Optimization**: The rollout took significant time to get started due to research phase and context gathering. Consider optimization strategies for faster startup.

5. **Non-goal Specificity**: Non-goals should be specific to what this feature doesn't include (e.g., "engineering context") rather than naming specific files from other features (e.g., "architecture.md, engineering.md").

6. **Success Criteria Isolation**: Success criteria should not reference specific files from other features that this feature doesn't depend on.

7. **NFR Section Clarity**: Observability NFRs were misunderstood - templates may not have observability requirements. Playbook should provide clearer examples or guidance on when NFR categories apply vs. when to skip them.

8. **Blueprint as Starting Point**: Rollout playbook should clarify that blueprint analysis provides a starting point, but running a playbook requires independent research to build the best possible solution. This may necessitate updating the blueprint if research reveals better approaches. Blueprint is guidance, not gospel.

9. **Template Standards**: ✅ RESOLVED - Created `.xe/standards/catalyst.md` (optimized to 30 lines) to document instruction block format (`> [INSTRUCTIONS]`) and placeholder pattern (`{placeholder-name}`).

These improvements should be reviewed and incorporated into playbook updates after this feature is complete.

## Aggressive Optimization Decision

**Decision Date**: 2025-11-07 (post-implementation review)

**Problem**: Original implementation created 415 lines of template content with low token ROI:
- Content not consumed by AI during feature implementation
- Content AI cannot reliably generate (market size, positioning)
- Mixed PM/engineering concerns (technical requirements in product.md)
- Future-focused content not yet consumed by any features (GTM)

**Token ROI Analysis**:
- **High ROI** (keep): Vision, strategy, principles, non-goals, team, competitive landscape, revolutionary differentiation
- **Low ROI** (defer): Personas (UX only), scenarios (UX only), metrics (measurement features only), technical requirements (engineering artifact)
- **Zero ROI** (delete): GTM (no consuming features), frontmatter (unnecessary), market size (AI hallucinates)

**Optimizations**:
1. product.md: 156 → 56 lines (64% cut) - Removed frontmatter, personas, scenarios, technical reqs, metrics
2. competitive-analysis.md: 108 → 69 lines (36% cut) - Restructured around go/no-go + 10x differentiation
3. go-to-market.md: DELETED (deferred until features consume it)

**Total**: 70% token reduction (415 → 125 lines)

**Revolutionary Focus**: Competitive analysis forces honesty - world-changing 10x products only, no copycats.

## GTM Strategy Timing Consideration

**Decision**: DEFERRED - Delete go-to-market.md template (zero ROI currently)

**Rationale**: No features consume GTM content yet. Add later when distribution/launch features need it.

**Blueprint Impact**: GTM finalization feature recommended for Phase 2 when needed.

## Standards Validation Tooling Consideration

**Question for Blueprint Review**: Should Catalyst standards compliance be validated via automated tooling?

**Options:**
1. **Custom linting rules**: Extend markdownlint for Catalyst-specific conventions
2. **Dedicated standards validator**: Node.js script that validates all `.xe/standards/` compliance
3. **Manual review only**: Rely on human/AI review during implementation

**Recommendation**: Option 2 (Dedicated validator) - Validates all standards (templates, code, processes) as they're added

**Blueprint Impact**: Add "catalyst-standards" feature to blueprint (Phase 2, Platform tier) that:
- Depends on: Any feature that creates standards (starting with product-context)
- Provides: Automated validation of compliance with all `.xe/standards/*.md` files
- Scope: Node.js validator script, CI/CD integration, validation reports, extensible for future standards
- Benefits: Consistent quality across all Catalyst conventions, automated compliance, extensible as standards grow
