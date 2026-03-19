---
owner: "Architect"
reviewers:
  required: ["Engineer"]
  optional: ["Product Manager"]
---

# Playbook: Start Change

## Description

Orchestrates feature development following a lightweight, spec-driven process. Guides users through clarification, scoping, collaborative specification, planning, implementation, and review — producing precise, testable specifications with minimal overhead.

## Inputs

- `change-description` (optional) - Description of what the user wants to change. If not provided, will prompt for details.
- `issue-id` (optional) - GitHub issue number containing change details.
- `feature-id` (optional) - Existing feature to modify.
- `execution-mode` (optional) - "interactive" (progressive AUQ prompts), "checkpoint" (autonomous with local review), "autonomous-local" (autonomous, nothing staged), or "autonomous-branch" (autonomous in branch/PR). Defaults to "interactive".

## Outputs

- Feature specification(s) at `.xe/features/{feature-id}/spec.md`
- Optional data model(s) at `.xe/features/{feature-id}/data-model.md`
- Change tracker at `.xe/features/change-{change-id}.md`
- Implemented code with passing tests and `@req` traceability
- Feature branch and/or pull request (depending on execution mode and user choice)

## Phase 0: Discovery

### 0.1 Confirm context

- If `change-description` or `issue-id` provided, use that as context
- If `feature-id` provided, read `.xe/features/{feature-id}/spec.md` for context
- If nothing provided:
  - **AUQ**: "What would you like to change?" (free text)

### 0.2 Ask clarifying questions (if needed)

- Review the provided context against `.xe/product.md` and existing features
- If context is sufficient to proceed, skip this step
- If clarity is needed, ask 1-4 targeted questions via **AUQ** — ONLY ask for information needed to complete Phase 1 scoping
- Prefer asking NO questions if context is clear

## Phase 1: Scope

### 1.1 Evaluate change

- Read `.xe/product.md` for product context and personas
- Read `.xe/features/blueprint/spec.md` and `.xe/features/blueprint/tasks.md` if they exist
- Scan `.xe/features/` for existing feature specs
- Determine which features are added, updated, or deleted
- Identify dependency ordering (most upstream first)

### 1.2 Present scope for approval

- **AUQ** with up to 3 questions:

  1. **Change request overview** — succinct summary of the change
     - Approve / Edit

  2. **Impacted features** (added/updated/deleted) — options vary by scope:
     - **Single feature**: Approve / Edit
     - **Multiple features**: Option to implement dependencies first, or all together
     - **Too large**: Option to split into multiple sequenced changes
     - Recommend 1 of up to 4 options explicitly

  3. **Execution mode**:
     - Interactive (progressive AUQ prompts to build spec together) (Recommended)
     - Local checkpoint review (run autonomously until checkpoints; nothing staged/committed by AI)
     - Full autonomy, local (nothing staged/committed by AI)
     - Full autonomy in a branch/PR

- If multiple changes approved: create `change-{name}.md` for each, add task in primary change linking to follow-on change docs

### 1.3 Setup

After scope is confirmed:

1. Determine change ID (kebab-case)
   - Use the feature ID when implementing a single new feature
   - Use a logical short description for multi-feature changes, enhancements, or bug fixes
2. Create feature branch ONLY if execution mode is `autonomous-branch`:
   - `xe/{change-id}` for Catalyst-executed work
   - `{username}/{change-id}` for manual work
   - All other modes: work on the current branch
3. Create change tracker at `.xe/features/change-{change-id}.md` using template
   - Overview: what prompted this change (include original prompt/issue if available)
   - Tasks: high-level task list optimized for AI resumption

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

- Enter plan mode with all approved specs as context
- Plan mode handles:
  - Implementation design and architecture review
  - Task breakdown
  - SOLID principles check and extensibility patterns review
- Plan approval gate before implementation begins

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
- Follow spec.md for WHAT, plan for HOW
- Focus only on code required for this task (YAGNI)
- Keep changes small and scoped to single responsibility

### 4.4 Validate

- Run formatting, linting, and tests per `.xe/engineering.md`
- Run `npx catalyst traceability {feature-id}` for each feature in scope
- Update change tracker with progress

### 4.5 Drift protection

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
6. After merge: delete change tracker(s) at `.xe/features/change-{change-id}.md`

## Error handling

**Implementation Failures:**

- If implementation task fails: preserve completed work, document blocker in change tracker
- Escalate to human review if blocker cannot be resolved

**Spec Changes During Implementation:**

- Stop current implementation immediately if spec becomes invalid
- Document what was completed in change tracker
- Never deviate from approved spec without user consent

**Context/Dependency Issues:**

- If required files missing (templates, architecture docs), halt and notify user
- If external dependencies unavailable, document blocker in change tracker and suggest alternatives

## Success criteria

- [ ] Change tracker created at `.xe/features/change-{change-id}.md`
- [ ] Feature spec(s) created/updated with scenario-driven requirements
- [ ] Spec uses only personas from `.xe/product.md § Personas`
- [ ] Every FR/NFR has a corresponding `@req` annotation in code and tests
- [ ] All validation checks passing
- [ ] User confirms work is complete via Phase 5 check-in
- [ ] Change tracker deleted after merge (if PR merged)
