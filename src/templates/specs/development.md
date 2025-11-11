# Development Process

> [INSTRUCTIONS]
> Customize this dev workflow as needed for project constraints.

## Living Specification Principle

**Critical**: All specifications (spec.md, plan.md, tasks.md) must represent the final desired state, not a chronological log of changes.

- **spec.md and plan.md** contain only timeless requirements applicable to any future implementation
- **tasks.md** describes implementation steps as if building from scratch
- Exclude one-time setup/migration steps from permanent specs
- When requirements change, update specs to reflect the new desired state (not a diff)

**Example**: If one change adds a button and another later changes it to a link, tasks.md should have one task for "Add link component" with no mention of a button.

## Development Workflow

Use the following development process when assigned to a task or asked to generate code. Each step within each phase should be committed to the branch. **NEVER** commit directly to the `main` branch.

### Phase 0. Setup

- Determine a short, kebab-cased rollout ID
  - Use the feature ID when implementing a single, new feature
  - Use a logical short description when enhancing a feature or fixing a bug
- Create a branch for the rollout
  - **Format**: `{username}/{rollout-id}` for manual work and `xe/{rollout-id}` for Catalyst-executed work
    - `{username}` should be the GitHub account that owns the feature
    - `{rollout-id}` is a short kebab-cased identifier for the change being implemented
- Create placeholder `.xe/rollouts/rollout-{rollout-id}.md` as the central, async orchestrator for this change and add an entry to `.xe/rollouts/README.md` index for discovery

**Note**: Rollout plans can cover multiple features or a subset of a single feature depending on the scope of change.

### Phase 1. Analysis

1. **Product & Architecture Context**
   - Determine if change affects new or existing features
   - Review `.xe/product.md` and `.xe/architecture.md` for system understanding
   - Review existing features in `.xe/features/` folder
   - Create `.xe/features/{feature-id}/research.md` documenting key findings with date

2. **Market Research** (if new feature or major enhancement)
   - Review `.xe/competitive-analysis.md` (if exists and <3 months old)
     - Update competitive analysis if never documented, >3 months old, or major product pivot
   - Update `research.md` with market insights

3. **Feature Requirements & Source Code**
   - Review related source code per `.xe/architecture.md` structure
   - **For bugs**: Identify faulty component, map to feature, review spec.md/plan.md for intended behavior
   - **For existing feature changes**:
     - Review spec.md (requirements) and plan.md (implementation)
     - Identify refactoring opportunities and technical debt
     - Assess cleanup scope, risk vs benefit, and rollout timing
   - **For multi-feature changes**:
     - Identify primary feature and create dependency tree
     - Process primary feature first, then dependencies
   - Update `research.md` with:
     - Code paths and component ownership
     - Related specs, plans, tasks
     - Dependencies and integrations
     - Migration and technical debt implications

### Phase 2. Specification

- Define WHAT and WHY (user value, business needs), not HOW (implementation)
  - **New features**: Create `.xe/features/{feature-id}/spec.md` from template
  - **Enhancements**: Update existing spec.md; consider extracting to separate feature if compartmentalized
  - **Bugs**: Update spec.md only if requirements were unclear
- Focus on user value and business needs
- Write for non-technical stakeholders and AI code generation
- Define platform/integration requirements, not technology constraints
- Ensure requirements are testable and unambiguous
- Ensure success criteria are measurable
- Document all dependencies and assumptions

### Phase 3. Planning

**Purpose**: Create implementation plan that serves as design approval checkpoint before code generation.

**CRITICAL**: All planning documents (plan.md, tasks.md) describe implementation from scratch, as if no code exists. Use "Create", "Implement", "Build" - NOT "Modify", "Add to", "Update".

- Step 0: Research & Design Decisions
  - _Prerequisites: spec.md complete_
  - Think deeply about how to best implement this feature within technical constraints
  - Consider design alternatives and document pivotal decisions in `research.md`
  - Validate architecture fit with `.xe/architecture.md` patterns

- Step 1: Data Model
  - _Prerequisites: research.md complete_
  - Define data entities this feature introduces or modifies
  - **ALWAYS document entities inline in `plan.md` `## Data Model` section**
  - Only create separate `data-model.md` if entities are complex (3+ entities with state machines/complex validation)

- Step 2: Contracts
  - _Prerequisites: Data model complete_
  - **ALWAYS document contracts inline in `plan.md` `## Contracts` section**
  - Define function signatures, API endpoints, or GraphQL schemas
  - Generate contract tests from contracts (must fail initially)
  - Extract test scenarios from user stories

- Step 3: Implementation Approach
  - _Prerequisites: Contracts complete_
  - Create `plan.md` based on template
  - Document HOW the feature will be built from scratch
  - Structure using H3 subsections: Data Structures, Core Algorithms, Integration Points, Error Handling, Performance Considerations, Testing Strategy
  - Include code examples for complex logic
  - Reference `research.md` for design rationale

- Step 4: Usage Examples
  - _Prerequisites: Implementation Approach complete_
  - Document how future developers will consume this feature
  - Create `plan.md ## Usage Examples` section with 2-3 practical examples

- Step 5: Task Breakdown
  - _Prerequisites: plan.md complete_
  - Generate `tasks.md` with implementation task breakdown
  - Contains ONLY repeatable implementation steps (code, tests, docs)
  - Never includes one-time migration/setup actions
  - Written as if building from scratch

- Step 6: Rollout Orchestration
  - _Prerequisites: tasks.md complete_
  - Update `.xe/rollouts/rollout-{rollout-id}.md` with full details
  - Add feature references to rollout frontmatter
  - One-time migration/setup actions go in rollout, NOT in tasks.md

- Step 7: Approval Checkpoint
  - Review and approve `plan.md` before implementation
  - Review and approve `tasks.md`
  - Review and approve rollout plan
  - **DO NOT proceed to implementation without explicit approval**

### Phase 4. Implementation

**Entry point**: Follow rollout plan as the orchestrator for the entire workflow

**Rollout orchestrated workflow**:

1. Execute pre-implementation actions (if any)
2. Execute `.xe/features/{feature-id}/tasks.md` implementation checklist:
   - Extract reusable code from existing code first
   - Create new reusable code next (with unit tests and high coverage)
   - AI-assisted code generation following approved `spec.md` and plan.md
   - Focus only on code required for this task (YAGNI)
   - Keep changes small and scoped to single responsibility
   - Generate or update tests per architecture spec
   - Validate behavior, not internal implementation details
3. Execute post-implementation actions (if any)
4. Complete immediate cleanup actions
5. Delete rollout plan file when complete
6. Remove entry from `.xe/rollouts/README.md`

### Phase 5. Validation

All validation steps below must pass before proceeding to Phase 6.

- Format all markdown and code files
- Run linting checks (zero critical issues required)
- Execute all unit and integration tests (no failures or warnings)
- Verify code coverage meets target per `.xe/engineering.md`
- Ensure all standards in `.xe/standards/` are applied
- Code quality review (readability, maintainability, patterns)
- Security review (input validation, sanitization, vulnerabilities)
- Performance review (efficiency, resource usage, bottlenecks)
- Documentation completeness (`spec.md`, `plan.md`, code comments)

### Phase 6. Documentation

- Ensure all public functions have comprehensive documentation
- Update relevant README files with new features/changes
- Document breaking changes and migration paths
- Update architecture diagrams if system design changed
- Verify all code comments are accurate and helpful

### Phase 7. Review

- Create a new pull request into the default branch
  - Set the title to `[Catalyst][{type}] {feature-name}`, where `{type}` is "Feature" or "Bug"
  - Summarize the feature or bug fixed in the body description
  - If related to an issue, include `Fixes #{id}` (if fully resolved) or `Related to #{id}` (if not)
- Assign appropriate reviewers based on project configuration

## Quality Requirements

### Code Quality
- Generated functions must include comprehensive documentation
- Parameter validation is mandatory
- Consistent error handling patterns following project conventions
- All code must follow established naming conventions (see `.xe/standards/`)

### Integration Requirements
- Module loading and export validation with existing ecosystem
- Comprehensive testing per coverage target in `.xe/engineering.md`
- Engineering standards compliance validation

### Security and Performance
- Input validation and sanitization patterns implemented
- File system access and path validation security reviewed
- Performance impact assessed for existing project operations
- Memory usage and resource consumption validated

## Testing Strategy

### Unit Testing
- Test individual functions in isolation
- Target >90% code coverage per `.xe/engineering.md`
- Mock external dependencies
- Test edge cases and error conditions

### Integration Testing
- Test end-to-end processing pipeline validation
- Test file system operations with various directory structures
- Test error handling with malformed input scenarios
- Validate performance under load conditions

### Continuous Integration
- Automated testing on changes
- Automated linting for code quality
- Automated formatting for consistency
