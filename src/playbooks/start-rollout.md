---
owner: "Architect"
reviewers:
  required: ["Product Manager"]
  optional: ["Engineer"]
---

# Playbook: Start Rollout

## Description

Orchestrates feature development following the development process defined in `.xe/process/development.md`. Supports both manual execution (with human checkpoints) and autonomous execution (auto-proceed through phases).

## Inputs

- `feature-description` (optional) - Description of the feature to implement. If not provided, system will identify next high-priority feature.
- `rollout-id` (optional) - Short kebab-cased identifier for the rollout. If not provided, system will determine from feature.
- `execution-mode` (optional) - Execution approach: "manual" (human checkpoints) or "autonomous" (auto-proceed). Defaults to "manual".

## Outputs

- Feature branch at `xe/{username}/{rollout-id}`
- Feature specification at `.xe/specs/{feature-id}/spec.md`
- Implementation plan at `.xe/specs/{feature-id}/plan.md`
- Task breakdown at `.xe/specs/{feature-id}/tasks.md`
- Engineering research at `.xe/specs/{feature-id}/research.md`
- Pull request for code review and merge

## 1. Validate inputs

- If `feature-description` provided, validate it's a non-empty string
- If `rollout-id` provided, validate kebab-case pattern
- If `execution-mode` provided, validate it matches allowed values: "manual" or "autonomous"
- All validations are soft - system will auto-correct or prompt for clarification

## 2. Initialize

- Read `.xe/process/development.md` for workflow phases
- Read `.xe/product.md` for product context
- **Check for product blueprint:**
  - If `.xe/specs/blueprint/spec.md` exists:
    - Read it to understand full product context
    - Extract this feature's dependencies, scope, and priority from the blueprint
    - Use blueprint to guide implementation scope and integration points
    - Identify features this feature depends on (must be implemented first)
  - If blueprint does NOT exist:
    - **Prompt user:** "No product blueprint found. This feature may be part of a larger product."
      - **(A) Create lightweight blueprint** - Quick breakdown of full product (recommended for product features)
      - **(B) Skip blueprint** - Implement this feature standalone (recommended for one-off tasks/fixes)
    - If user chooses A:
      - Ask: "Briefly describe the full product vision and key capabilities (2-3 paragraphs)"
      - Run minimal blueprint creation (inline, not full start-blueprint playbook)
      - Create `.xe/specs/blueprint/spec.md` only well-defined features (even if this is the only one)
      - Continue with current feature as first implementation
- Scan `.xe/specs/` directory for existing features

## 3. Research

### Development Process Phase 1: Analysis 🔬

1. Review product & architecture context
2. Conduct market research and save in `.xe/competitive-analysis.md` if never documented, >3 months old, or major product pivot
3. Analyze feature requirements & source code
4. **Check blueprint alignment:**
   - If blueprint exists (`.xe/specs/blueprint/spec.md`) and this feature is IN the blueprint:
     - Use blueprint scope as guidance for feature boundaries
     - Validate dependencies listed in blueprint are already implemented
     - Update `rollout-blueprint.md` to mark this feature as "In Progress"
   - If blueprint exists but this feature is NOT in blueprint:
     - **Pause and prompt user with options:**
       - **(A) Add to blueprint** - Update blueprint spec to include this feature (requires blueprint PR update)
       - **(B) Implement as one-off** - Proceed without blueprint tracking (not recommended for product features)
       - **(C) Cancel** - Stop and update blueprint first
5. Think deeply about the requested change and rollout goals
   - Determine if rollout creates new features or updates existing features
   - Define a modular design based on `.xe/engineering.md` principles (e.g., Separation of Concerns, Single Responsibility, Don't Repeat Yourself)
   - Break out independently implementable and testable sub-features for reuse and maintainability with clear scope boundaries (1-2 sentences per feature)
   - Identify the primary feature and define a dependency tree
6. Review existing features in dependency tree and identify technical debt and cleanup opportunities relevant to the current task
   - Assess implementation scope: How much additional work to include cleanup?
   - Evaluate risk vs. benefit: Does cleanup justify increased complexity?
   - Determine rollout strategy: Should debt cleanup be pre-implementation, during, or post-implementation?
7. Document findings in `.xe/specs/{feature-id}/research.md`
8. **Human Checkpoint** → Present TLDR feature dependency graph for review:

   |    #     | Option                     | Notes                               |
   | :------: | -------------------------- | ----------------------------------- |
   | 🔵 **A** | **Continue (review spec)** | Proceed to specification phase      |
   | 🟢 **B** | **Change feature graph**   | Describe what to change             |
   | 🟣 **Z** | **Continue autonomously**  | Auto-approve spec and proceed to PR |

   **Wait for explicit user confirmation before proceeding**

## 4. Execute

### Development Process Phase 0: Setup 🛠️

1. Determine rollout ID from feature description
2. Create feature branch: `xe/{username}/{rollout-id}`
3. Create placeholder rollout plan at `.xe/rollouts/rollout-{rollout-id}.md`
4. Add entry to `.xe/rollouts/README.md` index

### Development Process Phase 2: Specification Development 📝

1. Loop thru feature dependency tree and create or update every `.xe/specs/{feature-id}/spec.md` feature spec
   - For new features, use the `.xe/templates/specs/spec.md` template
   - Define WHAT and WHY (user value, business needs), not HOW
   - Write for non-technical stakeholders and AI code generation
   - Define platform/integration requirements, not technology constraints
   - Ensure requirements are testable and success criteria measurable
   - Incorporate technical debt assessment from Phase 1 into specification
2. **Human Checkpoint** → Present specification for review:

   |    #     | Option                     | Notes                               |
   | :------: | -------------------------- | ----------------------------------- |
   | 🔵 **A** | **Continue (review plan)** | Proceed to planning phase           |
   | 🟢 **B** | **Change specification**   | Describe what to change             |
   | 🟣 **Z** | **Continue autonomously**  | Auto-approve plan and proceed to PR |

   **Wait for explicit user confirmation before proceeding**

### Development Process Phase 3: Planning 🏗️

1. Loop thru feature dependency tree and:
   1. Research & Design Decisions → Document in `research.md`
   2. Data Model → Define entities (inline in `plan.md` or separate `data-model.md`)
   3. Contracts → Define function signatures/APIs and generate contract tests
   4. Implementation Approach → Create `plan.md` with algorithms and integration
   5. Usage Examples → Document consumption patterns
   6. Task Breakdown → Create `tasks.md` with implementation steps
   7. Rollout Orchestration → Update rollout plan with pre/post/cleanup actions
2. **Human Approval Checkpoint (if not running autonomously)** → Present Data Model, Contracts, and Implementation Approach for review:

   |    #     | Option          | Notes                           |
   | :------: | --------------- | ------------------------------- |
   | 🔵 **A** | **Continue**    | Proceed to implementation phase |
   | 🟢 **B** | **Change plan** | Describe what to change         |

   **Wait for explicit user confirmation before proceeding**

### Development Process Phase 4: Implementation Execution 🚀

1. Load implementation context:
   - Read `.xe/engineering.md` for engineering principles
   - Read `.xe/architecture.md` for system architecture
   - Read `.xe/standards/` for code standards
2. Execute pre-implementation actions (if any in rollout plan)
3. Loop thru feature dependency tree and execute `.xe/specs/{feature-id}/tasks.md` implementation checklist
4. Execute post-implementation actions (if any in rollout plan)
5. Complete immediate cleanup actions
6. **Update blueprint status (if blueprint exists):**
   - Mark this feature as "Complete" in `.xe/rollouts/rollout-blueprint.md`
   - Check if all blueprint features are now complete
   - If all complete, note in rollout-blueprint.md that product build is finished
7. Delete rollout plan file when complete
8. Remove entry from `.xe/rollouts/README.md`

## 5. Verify

Run validation checks per `.xe/engineering.md` quality standards and verify all items in Success Criteria section below are met.

## 6. Request review

1. Create pull request into default branch
2. Set title: `[Catalyst][{type}] {feature-name}` where type is "Feature" or "Bug"
3. Summarize feature/bug in body description
4. Link related issues with `Fixes #{id}` or `Related to #{id}`
5. Assign reviewers per `.xe/product.md` team roles if defined (both human and AI reviewers)

## 7. Publish

Post PR comment with:

- Links to spec, plan, tasks, and research docs
- Summary of changes and next steps
- Notes on technical debt cleanup completed (if applicable)

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

- [ ] Feature branch created at `xe/{username}/{rollout-id}`
- [ ] Rollout plan created at `.xe/rollouts/rollout-{rollout-id}.md` and tracked in index
- [ ] Feature spec created at `.xe/specs/{feature-id}/spec.md`
- [ ] Implementation plan created at `.xe/specs/{feature-id}/plan.md`
- [ ] Task breakdown created at `.xe/specs/{feature-id}/tasks.md`
- [ ] Engineering research documented at `.xe/specs/{feature-id}/research.md`
- [ ] All implementation tasks completed
- [ ] All validation checks passing
- [ ] Pull request created with proper title and description
- [ ] Reviewers assigned per `.xe/product.md` if defined
- [ ] Rollout plan cleaned up after completion
