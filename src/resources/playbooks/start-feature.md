---
owner: "Architect"
reviewers:
  required: ["Engineer"]
  optional: ["Product Manager"]
---

# Playbook: Start Feature

## Description

Orchestrates feature development following a lightweight, spec-driven process. Guides users through clarification, scoping, collaborative specification, planning, implementation, and review — producing precise, testable specifications with minimal overhead.

## Inputs

- `feature-description` (optional) - Description of what the user wants to build or change. If not provided, will prompt for details.
- `issue-id` (optional) - GitHub issue number containing feature details.
- `feature-id` (optional) - Existing feature to modify.
- `execution-mode` (optional) - "interactive" (progressive AUQ prompts), "checkpoint" (autonomous with local review), "autonomous-local" (autonomous, nothing staged), or "autonomous-branch" (autonomous in branch/PR). Defaults to "interactive".

## Outputs

- Feature specification(s) at `.xe/features/{feature-id}/spec.md`
- Optional data model(s) at `.xe/features/{feature-id}/data-model.md`
- Feature plan at `.xe/features/plan-{id}.md`
- Implemented code with passing tests and `@req` traceability
- Feature branch and/or pull request (depending on execution mode and user choice)

## Phase 0: Discovery

### 0.1 Confirm context

- If `feature-description` or `issue-id` provided, use that as context
- If `feature-id` provided, read `.xe/features/{feature-id}/spec.md` for context
- If nothing provided:
  - **AUQ**: "What would you like to build?" (free text)

### 0.2 Ask clarifying questions (if needed)

- Review the provided context against `.xe/product.md` and existing features
- If context is sufficient to proceed, skip this step
- If clarity is needed, ask 1-4 targeted questions via **AUQ** — ONLY ask for information needed to complete Phase 1 scoping
- Prefer asking NO questions if context is clear

## Phase 1: Scope

### 1.1 Evaluate scope

- Read `.xe/product.md` for product context and personas
- Read `.xe/features/blueprint/spec.md` and `.xe/features/blueprint/tasks.md` if they exist
- Scan `.xe/features/` for existing feature specs
- Determine which features are added, updated, or deleted
- Identify dependency ordering (most upstream first)

### 1.2 Present scope for approval

- **AUQ** with up to 3 questions:

  1. **Overview** — succinct summary of the work
     - Approve / Edit

  2. **Impacted features** (added/updated/deleted) — options vary by scope:
     - **Single feature**: Approve / Edit
     - **Multiple features**: Option to implement dependencies first, or all together
     - **Too large**: Option to split into multiple sequenced efforts
     - Recommend 1 of up to 4 options explicitly

  3. **Execution mode**:
     - Interactive (progressive AUQ prompts to build spec together) (Recommended)
     - Local checkpoint review (run autonomously until checkpoints; nothing staged/committed by AI)
     - Full autonomy, local (nothing staged/committed by AI)
     - Full autonomy in a branch/PR

- If multiple efforts approved: note follow-on plans needed (created in Phase 3)

### 1.3 Setup

After scope is confirmed:

1. Determine plan ID (kebab-case)
   - Use the feature ID when implementing a single new feature
   - Use a logical short description for multi-feature efforts, enhancements, or bug fixes
2. Create feature branch ONLY if execution mode is `autonomous-branch`:
   - `xe/{plan-id}` for Catalyst-executed work
   - `{username}/{plan-id}` for manual work
   - All other modes: work on the current branch
3. Create plan doc at `.xe/features/plan-{id}.md` using template from `node_modules/@xerilium/catalyst/templates/specs/plan.md` — fill in what's known from scoping:
   - Overview: what prompted this work (include original prompt/issue if available)
   - Features: one `### {feature-id}` sub-heading per feature from scope approval (leave `> [INSTRUCTIONS]` for later)
   - Pre/Post-implementation: leave as-is with `> [INSTRUCTIONS]` for later

## Phase 2: Spec

Process each feature in dependency order (most upstream first).

### 2.1 Purpose, dependencies, and format

Before modifying any existing spec, read the spec template from `node_modules/@xerilium/catalyst/templates/specs/spec.md` and compare the existing spec's H2 headings against it. Old-format specs have sections like Problem, Goals, Success Criteria, or Requirements instead of Purpose and Scenarios.

- **AUQ** for each feature:

  1. **Purpose** — 1-4 options for the mission statement
     - For new features: proposed mission statements
     - For existing features needing changes: specific proposed changes
     - "Keep as-is" option for features not needing Purpose changes
  2. **Dependencies** — confirm upstream dependencies
     - Approve
     - Prevent reverse dependencies (never list downstream consumers)
  3. **Spec format** (only if existing spec uses an outdated structure) — summarize what would change (e.g., "Problem and Goals merge into Purpose, Requirements become Scenarios with FR IDs, Success Criteria removed since tests cover it") and offer:
     - Update to current format (Recommended) — preserves all requirements in the new structure
     - Tell me more — explain each structural change in detail before deciding
     - Keep existing format

### 2.2 Scenarios and constraints

- **AUQ** — one question per scenario or architecture constraint being created, updated, or removed:
  - Proposed text with FR ID
  - Prefer Approve / Edit
  - Offer variations if direction is unclear
  - Continue until all FRs are approved

### 2.3 Data model (if applicable)

- **AUQ** — one question per entity in condensed form:
  - Approve / Edit or offer variations
  - Save `data-model.md` when approved
  - Skip if no entities worth documenting beyond inline I/O

### 2.4 Full spec review

- Generate the complete `spec.md` for this feature
- **AUQ** — present full spec for final review:
  - Approve / Edit

Repeat 2.1–2.4 for each feature in scope.

## Phase 3: Plan

### 3.1 Enrich plan doc with spec context

Update `.xe/features/plan-{id}.md` (created in 1.3) with context from approved specs:

- Under each `### {feature-id}` sub-heading, list the scenarios and FRs being implemented
- Update Pre/Post-implementation sections if spec work revealed additional needs
- Leave `> [INSTRUCTIONS]` for later

### 3.2 Enter plan mode

- Enter plan mode with all approved specs and the plan doc as context
- Plan mode handles:
  - Implementation design and architecture review
  - Task breakdown
  - SOLID principles check and extensibility patterns review
- Plan approval gate before implementation begins

### 3.3 Update plan doc

After plan mode is approved, update `.xe/features/plan-{id}.md`:

- Replace the Features section with the approved implementation plan — detailed task breakdown grouped by `### {feature-id}`, checkbox format
  - Sort feature sections in order of execution, ensuring dependencies are completed before features that need them
  - If features must be updated or added to the plan, add extra `### {feature-id}` sections with corresponding details as appropriate
- Update Pre-implementation and Post-implementation sections if the plan identified additional tasks
- This is the authoritative record of the work — if context resets, the plan doc is how work resumes
- Remove `> [INSTRUCTIONS]`

## Phase 4: Implementation

### 4.1 Load context

- Read `.xe/engineering.md` for engineering principles
- Read `.xe/architecture.md` for system architecture
- Read `.xe/standards/` for code standards

### 4.2 Write tests first (TDD)

- For each FR and NFR in approved specs:
  - Write test with `@req FR:{id}` annotation
  - Tests MUST fail initially (no implementation yet)
  - Use test framework's native skip/pending mechanism for requirements that cannot be automated (with `// @req FR:{id} — cannot be automated: [reason]`)

### 4.3 Implement

- Implement features to make tests pass
- Follow spec.md for WHAT, plan doc for HOW and WHEN
- Focus only on code required for this task (YAGNI)
- Keep changes small and scoped to single responsibility

### 4.4 Validate

- Run formatting, linting, and tests per `.xe/engineering.md`
- Run `npx catalyst traceability {feature-id}` for each feature in scope

### 4.5 Track progress

- Mark completed tasks in the plan doc with `[x]` as each task finishes — do not batch
- Keep the plan doc and todo list in sync: the plan doc is the persistent record, the todo list is the session view
- If a task is blocked or the approach changes, update the plan doc Notes section

### 4.6 Drift protection

- **Never modify spec.md without user approval**
- Requirements MAY be changed with user approval — present proposed changes via AUQ
- **Never rename or remove FR/NFR IDs** without updating all `@req` references in tests and implementation
- If a requirement cannot be met: STOP and ask the user

## Phase 5: Review

Behavior depends on execution mode:

**`autonomous-branch` mode**: Create feature branch (if not done in 1.3), commit, push, and create a PR (see 5.2).

**All other modes**: Inform the user implementation is complete and invite them to review changes, ask questions, or request corrections. Once satisfied, present **AUQ** — "How would you like to proceed?"

- Commit to current branch (Recommended) — stage and commit changes
- Push to feature branch — stage, commit, and push to a new or existing feature branch
- Open a pull request — commit, push to a feature branch, and create a PR

### 5.2 Create pull request (if requested or `autonomous-branch` mode)

1. Create pull request into default branch
2. Set title: `[Catalyst][{type}] {feature-name}` where type is "Feature" or "Bug"
3. Include in PR body:
   - Requirements coverage summary (FR/NFR → test mapping)
   - Links to spec(s)
   - Summary of changes
4. Link related issues with `Fixes #{id}` or `Related to #{id}`
5. Assign reviewers per `.xe/product.md` team roles if defined
6. After merge: delete feature plan(s) at `.xe/features/plan-{id}.md`

## Error handling

**Implementation Failures:**

- If implementation task fails: preserve completed work, document blocker in feature plan
- Escalate to human review if blocker cannot be resolved

**Spec Changes During Implementation:**

- Stop current implementation immediately if spec becomes invalid
- Document what was completed in feature plan
- Never deviate from approved spec without user consent

**Context/Dependency Issues:**

- If required files missing (templates, architecture docs), halt and notify user
- If external dependencies unavailable, document blocker in feature plan and suggest alternatives

## Success criteria

- [ ] Feature plan created at `.xe/features/plan-{id}.md`
- [ ] Feature spec(s) created/updated with scenario-driven requirements
- [ ] Spec uses only personas from `.xe/product.md § Personas`
- [ ] Every FR/NFR has a corresponding `@req` annotation in code and tests
- [ ] All validation checks passing
- [ ] User confirms work is complete via Phase 5 check-in
- [ ] Feature plan deleted after merge (if PR merged)
