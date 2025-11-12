---
owner: "Product Manager"
reviewers:
  required: ["Architect"]
  optional: []
---

# Playbook: Start Blueprint

## Description

Creates or updates the product blueprint which breaks down the product vision into discrete features with clear dependencies, scope boundaries, and implementation priorities. This blueprint serves as the architectural roadmap for subsequent feature development. The playbook automatically detects blueprint state and adapts behavior: initial creation, phase planning, or task execution.

## Inputs

- `issue-id` (optional) - The GitHub issue number containing blueprint details. If not provided, will prompt for blueprint description.
- `execution-mode` (optional) - Execution approach: "manual" (human checkpoints) or "autonomous" (auto-proceed). Defaults to "manual".

## Outputs

- Feature branch at `xe/blueprint` (initial) or `xe/blueprint-phase-{N}` (phase planning)
- Blueprint specification at `.xe/features/blueprint/spec.md` - The canonical feature roadmap (all features, dependencies, priorities)
- Blueprint plan at `.xe/features/blueprint/plan.md` - Feature breakdown methodology
- Blueprint tasks at `.xe/features/blueprint/tasks.md` - Steps to populate the spec
- Blueprint research at `.xe/features/blueprint/research.md` - Product analysis and competitive research
- Pull request for code review and merge

## 1. Validate inputs

- If `issue-id` provided, validate issue exists and title matches `[Catalyst][Blueprint]*` pattern
- If `execution-mode` provided, validate it matches allowed values: "manual" or "autonomous"
- All validations are soft - system will auto-correct or prompt for clarification

## 2. Initialize

- **Check for existing blueprint state:**
  - If `.xe/rollouts/rollout-blueprint.md` exists:
    - Read `.xe/features/blueprint/tasks.md` to determine current state
    - Count completed tasks per phase
    - Identify current phase and next action
    - **State: Initial creation** → Proceed with full blueprint creation workflow
    - **State: Phase in progress** → Offer to execute next unchecked task(s)
    - **State: Phase complete** → Proceed with next phase planning workflow
  - If `.xe/rollouts/rollout-blueprint.md` does NOT exist:

- **Load context files:**
  - If `issue-id` provided: Fetch issue with comments via `node node_modules/@xerilium/catalyst/playbooks/scripts/github.js --get-issue-with-comments {issue-id}`
  - Read `.xe/process/development.md` for workflow phases
  - Read `.xe/product.md` for product context (including Product Strategy phase priorities)
  - Read `.xe/architecture.md` for technical context
  - Scan `.xe/features/` directory for existing features

- **If State = "Initial creation":**
  - Analyze blueprint content (from issue or prompt) for completeness:
    - Assess what context is missing to understand the full product scope
    - Ask dynamic clarifying questions based on gaps identified:
      - If user personas unclear → Ask about target users and their needs
      - If user journeys unclear → Ask about key workflows and use cases
      - If platform unclear → Ask about platform/technology requirements
      - If integrations unclear → Ask about external dependencies
      - If business model unclear → Ask about monetization or value delivery
    - Continue asking questions until you have enough context to define discrete, implementable features

- **If State = "Phase in progress":**
  - Identify next unchecked task(s) from tasks.md
  - Check for open PRs related to blueprint features via `node node_modules/@xerilium/catalyst/playbooks/scripts/github.js --find-open-prs "blueprint in:title"`
  - If PR exists for next task(s): Offer to review PR or respond to comments instead of starting new task
  - If no related PR: Present next task(s) for execution
  - If next tasks are parallel (marked with `[P]`), offer to launch subagents for parallel execution
  - Execute task(s) and update tasks.md checkboxes
  - Exit playbook after task execution

- **If State = "Phase complete":**
  - Identify next phase number (N) from tasks.md
  - Read existing `.xe/features/blueprint/spec.md` to understand Phase 1 through N-1 features
  - Review Phase N-1 implementation learnings and outcomes
  - Proceed to research phase to detail Phase N features

## 3. Research

### Development Process Phase 1: Analysis 🔬

1. Review `.xe/product.md` and `.xe/architecture.md` context
2. Conduct market research and save in `.xe/competitive-analysis.md` if never documented, >3 months old, or major product pivot
3. Analyze product requirements and identify core user journeys
4. Think deeply about the product architecture and feature breakdown:
   - Define a modular design with discrete features based on `.xe/engineering.md` principles (e.g., Separation of Concerns, Single Responsibility, Don't Repeat Yourself)
   - Break out independently implementable and testable sub-features for reuse and maintainability with clear scope boundaries (1-2 sentences per feature)
   - Estimate complexity for each feature (Small, Medium, Large)
5. Build feature dependency graph:
   - Identify which features depend on others
   - Ensure no circular dependencies
   - Group features into dependency tiers (features in same tier can be built in parallel)
6. Prioritize and phase features:
   - Assign features to phases based on Product Strategy from `.xe/product.md`:
     - Read the prioritized phase list from product.md (phases may be merged per project, e.g., "Enterprise + Scale")
     - Group features by which phase they belong to based on their nature and strategic priority
     - Each phase's features should be implementable independently
     - Later phase features build on earlier phases
   - Order by dependencies within each phase first (can't build X without Y)
   - Within same dependency tier, order by business value and risk
7. **Adjust research scope based on state:**
   - **If State = "Initial creation":** Research and detail Phase 1 features comprehensively; outline Phase 2+ features at high level
   - **If State = "Phase complete":** Focus research on detailing Phase N features based on Phase N-1 implementation learnings; keep future phases high-level
8. Document findings in `.xe/features/blueprint/research.md`
9. **Human Checkpoint** → Present TLDR feature list and dependency graph for review:

   |    #     | Option                     | Notes                               |
   | :------: | -------------------------- | ----------------------------------- |
   | 🔵 **A** | **Continue (review spec)** | Proceed to specification phase      |
   | 🟢 **B** | **Change feature graph**   | Describe what to change             |
   | 🟣 **Z** | **Continue autonomously**  | Auto-approve spec and proceed to PR |

   **Wait for explicit user confirmation before proceeding**

## 4. Execute

### Development Process Phase 0: Setup 🛠️

1. **If State = "Initial creation":**
   - Create feature branch: `xe/blueprint`
   - Create placeholder rollout plan at `.xe/rollouts/rollout-blueprint.md`
   - Add entry to `.xe/rollouts/README.md` index
2. **If State = "Phase complete" (next phase planning):**
   - Determine next phase number (N) from completed tasks
   - Create feature branch: `xe/blueprint-phase-{N}`
   - Rollout plan already exists - no changes needed

### Development Process Phase 2: Specification Development 📝

1. **Update `.xe/features/blueprint/spec.md`:**
   - **If State = "Initial creation":** Create new spec.md using the `node_modules/@xerilium/catalyst/templates/specs/spec.md` template
   - **If State = "Phase complete":** Update existing spec.md to detail Phase N features

   **Spec content:**
   - **Description:** Product vision and blueprint purpose
   - **Requirements:** Document all features identified in Research phase:
     - Core entities list
     - Feature dependency graph (mermaid format, must be acyclic)
     - For each feature:
       - Feature ID (kebab-case)
       - Feature name and 1-2 sentence scope description
       - Phase assignment (from Product Strategy in `.xe/product.md`)
       - Dependencies (list of feature IDs this depends on)
       - Complexity estimate (Small, Medium, Large)
       - Priority order number
   - **Success Criteria:** All features documented, dependency graph is acyclic, features are properly scoped and phased
   - **Phase detailing guidance:**
     - **Current phase features:** Detailed scope descriptions (1-2 sentences defining clear boundaries)
     - **Future phase features:** High-level descriptions with expectation they'll be detailed before phase starts
     - **Phase transitions:** Blueprint automatically re-runs when phase completes to detail next phase features
   - **IMPORTANT:** This spec IS the blueprint. It documents features to be built later via `start-rollout`. It does NOT implement them.
2. **Human Checkpoint** → Present specification for review:

   |    #     | Option                     | Notes                               |
   | :------: | -------------------------- | ----------------------------------- |
   | 🔵 **A** | **Continue (review plan)** | Proceed to planning phase           |
   | 🟢 **B** | **Change specification**   | Describe what to change             |
   | 🟣 **Z** | **Continue autonomously**  | Auto-approve plan and proceed to PR |

   **Wait for explicit user confirmation before proceeding**

### Development Process Phase 3: Planning 🏗️

1. **Create or update `.xe/features/blueprint/plan.md`:**
   - **If State = "Initial creation":** Create new plan.md using the `node_modules/@xerilium/catalyst/templates/specs/plan.md` template
   - **If State = "Phase complete":** No changes needed to plan.md (it describes meta-process, not phase-specific details)

   **Plan content:**
   - **Implementation Approach:** Describe phased rollout strategy for implementing all features
   - **Data Model:** Define feature structure (ID, phase, tier, dependencies, complexity)
   - **Constraints:** Features must be implemented in dependency order (phase by phase, tier-by-tier)
   - **Usage Examples:** Do not include - blueprints define features to be built later, not code to be implemented now
   - **Feature Counts:** Do not include specific feature counts in descriptions - they become outdated as the blueprint evolves

2. **Create or update `.xe/features/blueprint/tasks.md`:**
   - **If State = "Initial creation":** Create new tasks.md with Phase 1 implementation tasks + Phase 2-5 planning tasks based on the `node_modules/@xerilium/catalyst/templates/specs/tasks.md` template
   - **If State = "Phase complete":** Insert Phase N implementation tasks after Phase N planning task (T0XX)

   **Tasks structure:**
   - **Phase 1:** Full implementation task breakdown (T001-T014)
   - **Phase 2-5 (initial creation):** Single planning task per phase (e.g., "T015: Plan Phase 2 features via `/catalyst:blueprint`")
   - **Phase N (after planning):** Expand Phase N planning task into implementation tasks (one per feature, marked [P] if parallel)
   - Example: "T001: [P] Implement product-context via `/catalyst:rollout product-context`"
3. **Human Approval Checkpoint (if not running autonomously)** → Present Implementation Plan for review:

   |    #     | Option          | Notes                           |
   | :------: | --------------- | ------------------------------- |
   | 🔵 **A** | **Continue**    | Proceed to implementation phase |
   | 🟢 **B** | **Change plan** | Describe what to change         |

   **Wait for explicit user confirmation before proceeding**

### Development Process Phase 4: Implementation Execution 🚀

1. Execute pre-implementation actions (if any in rollout plan)
2. **IMPORTANT:** Blueprint creation is COMPLETE at this point. The spec.md, plan.md, and tasks.md files have been created.
3. Blueprint implementation (executing tasks.md to build all features) happens AFTER this PR is merged, not during blueprint creation.
4. Validate the blueprint spec:
   - All features have unique IDs (kebab-case)
   - All features have phase assignments matching Product Strategy phases
   - Dependency graph is present and acyclic
   - Features are numbered in priority/dependency order
   - Each feature has: ID, phase, dependencies, scope, complexity, priority
5. Execute post-implementation actions (if any in rollout plan)
6. Complete immediate cleanup actions
7. **Keep rollout plan and README entry** - Do NOT delete until all blueprint features are implemented

**Next Steps After Blueprint PR is Merged:**

- Features will be implemented one-by-one using `/catalyst:rollout {feature-id}`
- Each feature implementation will read `.xe/features/blueprint/spec.md` for context
- Check off tasks in `.xe/features/blueprint/tasks.md` as features are completed
- When phase completes, run `/catalyst:blueprint` to plan next phase
- Only delete rollout plan when all features are complete (all tasks in tasks.md checked)

## 5. Verify

Verify all items in Success Criteria section below are met:

- Blueprint spec at `.xe/features/blueprint/spec.md` is complete
- All features are documented with IDs, phase assignments, dependencies, scope, complexity, and priority
- Phase assignments align with Product Strategy from product.md
- Dependency graph is present and acyclic
- Features are prioritized appropriately

## 6. Request review

1. Create pull request into default branch
2. **Set title based on state:**
   - **If State = "Initial creation":** `[Catalyst][Blueprint] {product-name} Blueprint`
   - **If State = "Phase complete":** `[Catalyst][Blueprint] Phase {N} Planning`
3. Summarize product vision and feature breakdown in body description
4. Link related issues with `Fixes #{id}` or `Related to #{id}`
5. Assign reviewers per `.xe/product.md` team roles if defined (both human and AI reviewers)

## 7. Publish

Post PR comment with:

- Link to blueprint spec (`.xe/features/blueprint/spec.md`)
- Links to plan, tasks, and research docs
- Summary of features identified (count, complexity breakdown)
- Recommended starting feature based on dependencies
- Next steps: Merge blueprint, then start implementing features via `/catalyst:rollout {feature-id}`

## Error handling

**Implementation Failures:**

- If implementation task fails: preserve completed work, document blocker in rollout plan
- Escalate to human review if blocker cannot be resolved

**Plan Changes During Implementation:**

- Stop current implementation immediately if plan becomes invalid
- Document what was completed and what needs modification in rollout plan under "Changes Log"
- Never deviate from approved plan without user consent

**Rollback Procedures:**

- Clean up partial files if user cancels during implementation
- Document what was attempted in rollout plan or PR comment

**Context/Dependency Issues:**

- If required files missing (templates, architecture docs), halt and notify user
- If external dependencies unavailable, document blocker in rollout plan and suggest alternatives
- If merge conflicts detected, resolve or escalate to human review

## Success criteria

**Initial creation:**
- [ ] Feature branch created at `xe/blueprint`
- [ ] Rollout plan created at `.xe/rollouts/rollout-blueprint.md`
- [ ] Entry added to `.xe/rollouts/README.md` index
- [ ] Blueprint spec created at `.xe/features/blueprint/spec.md` with:
  - [ ] Product vision documented
  - [ ] High-level product requirements listed
  - [ ] Spec adheres to living specification principle (no references to existing implementation, migration, backward compatibility, or current state)
- [ ] Blueprint plan created at `.xe/features/blueprint/plan.md` with:
  - [ ] Feature dependency graph (acyclic, mermaid format)
  - [ ] All Phase 1 features detailed with ID, phase, dependencies, scope, complexity, and priority
  - [ ] Phase 2-5 features outlined at high level with a minimal list of features
  - [ ] Phase assignments align with Product Strategy from product.md
  - [ ] Plan adheres to living specification principle (describes implementation from scratch, not as changes to existing code)
- [ ] Blueprint tasks created at `.xe/features/blueprint/tasks.md` with Phase 1 implementation tasks and Phase 2-5 planning tasks
  - [ ] Tasks adhere to living specification principle (repeatable steps, not one-time migrations)
- [ ] Product research documented at `.xe/features/blueprint/research.md`
- [ ] Pull request created with proper title and description
- [ ] Reviewers assigned per `.xe/product.md` if defined
- [ ] Rollout plan kept active (will be deleted only when all features are complete)

**Phase in progress (State = "Phase in progress"):**
- [ ] Next task(s) identified from tasks.md
- [ ] Task(s) executed (with subagents if parallel)
- [ ] Checkboxes updated in tasks.md
- [ ] No PR needed - updates committed to existing rollout branch

**Phase planning (State = "Phase complete"):**
- [ ] Feature branch created at `xe/blueprint-phase-{N}`
- [ ] Blueprint spec updated at `.xe/features/blueprint/spec.md` with detailed Phase N features
  - [ ] Spec updates adhere to living specification principle (no references to existing implementation, migration, backward compatibility, or current state)
- [ ] Blueprint tasks updated at `.xe/features/blueprint/tasks.md` with Phase N implementation tasks inserted after planning task
  - [ ] Task updates adhere to living specification principle (repeatable steps, not one-time migrations)
- [ ] Research updated at `.xe/features/blueprint/research.md` with Phase N analysis
- [ ] Pull request created with title: `[Catalyst][Blueprint] Phase {N} Planning`
- [ ] Reviewers assigned per `.xe/product.md` if defined
