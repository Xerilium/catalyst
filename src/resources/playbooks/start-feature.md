---
owner: "Architect"
reviewers:
  required: ["Engineer"]
  optional: ["Product Manager"]
---

# Playbook: Start Feature (Deprecated)

> **DEPRECATION NOTICE**: This monolithic playbook has been decomposed into modular micro-playbooks and work-type orchestrators for improved AI execution reliability, token efficiency, and playbook reusability.
>
> **New users**: Use the work-type orchestrators directly:
>
> - `/catalyst:create` → `create-feature.md` (new features)
> - `/catalyst:change` → `update-feature.md` (updates to existing features)
> - `/catalyst:fix` → `repair-feature.md` (bug fixes)
> - `/catalyst:explore` → `explore-feature.md` (research and investigation)
>
> **Existing workflows**: This file redirects to `create-feature.md` for backward compatibility.

## Redirect

Execute the instructions in `node_modules/@xerilium/catalyst/playbooks/create-feature.md`

## Inputs

Parse the following from the user's input. All are optional:

- **issue**: A GitHub issue number
- **feature-id**: A kebab-cased ID of the feature(s) to create or update (references `.xe/features/{feature-id}/spec.md`); generate if not specified
- **context files**: Any referenced files (proposals, notes, meeting transcripts, etc.) — read them and use their content as additional context
  - If files seem temporary and only necessary for context (notes, proposals, old artifacts, etc), note them for potential cleanup later — NEVER delete without confirmation
- **work-type**: General category of the type of work being performed — used to tune the workflow:
  - **create**: New features or capabilities — full spec-driven cycle
  - **change**: Update or refactor existing features — lighter spec updates
  - **fix**: Investigate and fix bugs — validate against existing specs, focus on reproduction and root cause
  - **explore**: Research and brainstorm — read and analyze, no code changes or spec modifications

**Resuming from a plan**: If the user references an existing plan file (`.xe/sessions/plan-{id}.md`), read it and determine the resume point:

- If all tasks are checked `[x]` → skip to Phase 5 (Review/Closure)
- If some tasks are checked and implementation code exists → resume at Phase 4 (Implementation)
- If plan has task breakdown but no implementation → resume at Phase 4 (Implementation)
- If plan has feature sub-headings but no task breakdown → resume at Phase 3 (Plan)
- If plan has overview only → resume at Phase 2 (Spec)

## Outputs

- Feature specification(s) at `.xe/features/{feature-id}/spec.md`
- Optional data model(s) at `.xe/features/{feature-id}/data-model.md`
- Feature plan at `.xe/sessions/plan-{id}.md`
- Implemented code with passing tests and `@req` traceability
- Feature branch and/or pull request (depending on execution mode and user choice)

## Phase 0: Discovery

### 0.1 Confirm context

- If the user referenced an existing plan file, follow "Resuming from a plan" above
- If the user referenced context files, read them and incorporate their content
- If the user provided a description or issue number, use that as context
- If the user named existing features, read `.xe/features/{feature-id}/spec.md` for context
- If nothing provided:
  - **AskUserQuestion**: "What would you like to build?" (free text)

### 0.2 Ask clarifying questions (if needed)

- Review the provided context against `.xe/product.md` and existing features
- If context is sufficient to proceed, skip this step
- If clarity is needed, ask 1-4 targeted questions via **AskUserQuestion** — ONLY ask for information needed to complete Phase 1 scoping
- Prefer asking NO questions if context is clear

### Phase 0 Exit Criteria

- Sufficient context to evaluate scope
- Work category determined (create, change, fix, explore)

## Phase 1: Scope

### 1.1 Evaluate scope

- Read `.xe/product.md` for product context and personas
- Read `.xe/features/blueprint/spec.md` and `.xe/features/blueprint/tasks.md` if they exist
- Scan `.xe/features/` for existing feature specs
- Determine which features are added, updated, or deleted
- Identify dependency ordering (most upstream first)

### 1.2 Present scope for approval

- **AskUserQuestion** with up to 3 questions:

  1. **Overview** — succinct summary of the work
     - Approve / Edit

  2. **Impacted features** (added/updated/deleted) — options vary by scope:
     - **Single feature**: Approve / Edit
     - **Multiple features**: Option to implement dependencies first, or all together
     - **Too large**: Option to split into multiple sequenced efforts
     - Recommend 1 of up to 4 options explicitly

  3. **Execution mode**:
     - **interactive**: Interactive (progressive AskUserQuestion prompts to build spec together) (Recommended)
     - **checkpoint-review**: Local/current branch checkpoint review (run autonomously until checkpoints; nothing staged/committed by AI)
     - **autonomous-local**: Full autonomy, local/current branch (nothing staged/committed by AI)
     - **autonomous-branch**: Full autonomy in a branch/PR

- If multiple efforts approved: note follow-on plans needed (created in Phase 3)

### 1.3 Setup

After scope is confirmed:

1. Identify any temporary context files used during discovery/scoping. Note them in the plan doc for cleanup during Phase 5.
2. Determine plan ID (kebab-case)
   - Use the feature ID when implementing a single new feature
   - Use a logical short description for multi-feature efforts, enhancements, or bug fixes
3. If execution mode is `autonomous-branch`, create a feature branch:
   - `xe/{plan-id}` for Catalyst-executed work
   - `{username}/{plan-id}` for manual work
   - Create new branch from origin (do not use local branch)
   - All other modes: work on the current branch
4. Create plan doc at `.xe/sessions/plan-{id}.md` using template from `node_modules/@xerilium/catalyst/templates/specs/plan.md` — fill in what's known from scoping:
   - Overview: what prompted this work (include original prompt/issue if available)
   - Features: one `### {feature-id}` sub-heading per feature from scope approval (leave full `[INSTRUCTIONS]` block for later)
   - Pre/Post-implementation: leave as-is with `[INSTRUCTIONS]` block for later

### Phase 1 Exit Criteria

- Scope approved (auto-approved for `autonomous-local` and `autonomous-branch` execution mode)
- Plan doc created
- Branch created (only for `autonomous-branch` execution mode)

## Phase 2: Spec

**Work-type adaptations**:

- **create**: Full spec creation — new scenarios, new FRs, new architecture constraints
- **change**: Update existing specs — modify scenarios, adjust FRs, evolve constraints. Foundation exists; focus on what's changing.
- **fix**: Do NOT create new specs. Validate expected behavior against the existing spec. If the spec is wrong or incomplete (bug reveals a requirements gap), propose spec updates via AskUserQuestion before fixing. If spec is correct, proceed to Phase 3.
- **explore**: Read existing specs for context to inform the investigation. Do not create or modify specs.

Process each feature in dependency order (most upstream first).

### 2.1 Purpose, dependencies, and format

Before modifying existing specs, compare spec H2 headings with the template at `node_modules/@xerilium/catalyst/templates/specs/spec.md`. Old-format specs have sections like Problem, Goals, Success Criteria, or Requirements instead of Purpose and Scenarios.

- **AskUserQuestion** for each feature:

  1. **Purpose** — 1-4 options for the mission statement
     - For new features: proposed mission statements
     - For existing features needing changes: specific proposed changes
     - "Keep as-is" option for features not needing Purpose changes
  2. **Dependencies** — confirm upstream feature dependencies
     - Prevent reverse dependencies (never list downstream consumers)
  3. **Spec format** (only if existing spec uses an outdated structure) — list the old headings that would be replaced and offer:
     - Update to current format (Recommended) — all requirements preserved in new structure
     - Tell me more — explain structural changes before deciding
     - Keep existing format

### 2.2 Scenarios and constraints

If converting an old-format spec, review and extract the Scenarios, Requirements, and Key Entities from the old-format `spec.md` and use to generate the Scenarios with nested functional requirements and inline data model (where appropriate). Follow spec template instructions. Then review the companion `plan.md` file and extract any critical details for the Architectural Constraints in the spec template. Keep content grounded, no fluff. Only required technical guardrails.

If updating an existing spec, review Scenarios and Architectural Constraints and determine if they need to updates based on the requested changes.

- **AskUserQuestion** — one question per scenario or architecture constraint being created, updated, or removed:
  - Proposed text with FR ID (no markdown formatting)
  - Simple "Approve" or offer variations if direction is unclear
  - If long, summarize FRs and include options: "Approve scenario + FRs", "Approve scenario + review FRs"
  - Continue until all FRs are approved

### 2.3 Data model (if applicable)

If entities used in scenario inputs/outputs are detailed, extract them into a dedicated `data-model.md` file based on the template at `node_modules/@xerilium/catalyst/templates/specs/spec.md`.

- **AskUserQuestion** — one question per entity in condensed form:
  - Simple "Approve" or offer variations
  - Save `data-model.md` when approved
  - Skip if no entities worth documenting beyond inline I/O

### 2.4 Full spec review

- Generate the complete `spec.md` and `data-model.md` (if needed) for this feature
- **AskUserQuestion** — present full spec for final review:
  - Approve / Other

Repeat 2.1–2.4 for each feature in scope.

### Phase 2 exit criteria

- All specs and data models finalized, written to disk, and user-approved (auto-approved for `autonomous-local` and `autonomous-branch` execution mode)
- Finalized specs do NOT reference downstream features (reverse dependencies)
- Finalized specs are "living" documents that represent the desired state and do NOT reference updates or changes from a previous state

## Phase 3: Plan

Specs are final (Phase 2). Phase 3 is strictly **implementation design** — HOW to build what the specs define.

**Work-type adaptations**:

- **create/change**: Full planning cycle — enrich plan doc, enter plan mode, get approval
- **fix**: Lighter planning — may skip plan mode for small fixes. Focus on: what's broken, root cause, fix approach, regression test. For complex bugs affecting multiple files, use plan mode.
- **explore**: This is the investigation phase. Read code, analyze patterns, compare approaches, assess trade-offs. Document findings and present them in Phase 5. No plan doc needed.

### 3.1 Enrich plan doc with spec context

Update `.xe/sessions/plan-{id}.md` (created in 1.3) with context from approved specs:

- Under each `### {feature-id}` sub-heading, list the scenarios and FRs being implemented
- Update Pre/Post-implementation sections if spec work revealed additional needs
- Leave `> [INSTRUCTIONS]` for later

### 3.2 Enter plan mode

- Enter plan mode with all approved specs and the plan doc as context
- Plan mode focuses on:
  - Architecture review and implementation approach
  - Task breakdown with execution order
  - Alignment with .xe/product.md vision and design principles (skip for **fix** work-type)
  - Alignment with .xe/engineering.md principles and standards
  - Alignment with .xe/architecture.md tech stack, structure, and patterns
- If spec changes are required, confirm with user via **AskUserQuestion** and exit plan mode and return to Phase 2
- Plan approval gate before implementation begins

### 3.3 Update plan doc

After plan mode is approved, update `.xe/sessions/plan-{id}.md`:

- Replace the Features section with the approved implementation plan — detailed task breakdown grouped by `### {feature-id}`, checkbox format with nested details as needed
  - Sort feature sections in order of execution, ensuring dependencies are completed before features that need them
  - If features must be updated or added to the plan, add extra `### {feature-id}` sections with corresponding details as appropriate
  - Include Test-Driven Development (TDD) workflow steps, starting with failing tests based on FRs with traceability
- Update Pre-implementation and Post-implementation sections if the plan identified additional tasks (e.g., setup, migration, backfill)
- This is the authoritative record of the work — if context resets, the plan doc is how work resumes
- Follow and remove `[INSTRUCTIONS]` blocks when done

### Phase 3 exit criteria

- Plan doc updated with approved task breakdown
- Ready for implementation

## Phase 4: Implementation

**Work-type adaptations**:

- **create/change**: Full TDD cycle — write failing tests, implement, validate traceability
- **fix**: Write a failing test that reproduces the bug FIRST, then fix. `@req` annotations link to the existing FR being violated.
- **explore**: Skip this phase entirely.

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
- Requirements MAY be changed with user approval — present proposed changes via AskUserQuestion
- **Never rename or remove FR/NFR IDs** without updating all `@req` references in tests and implementation
- If a requirement cannot be met: STOP and ask the user

### Phase 4 exit criteria

- All tests passing
- Traceability validated
- Plan doc tasks complete and checked off

## Phase 5: Review and Closure

**Work-type adaptations**:

- **create/change/fix**: Full review cycle — present work, handle external issues, clean up temporary files, close out plan
- **explore**: Present findings. Offer to save them for later use with `/create`, `/change`, or `/fix`. No plan doc to clean up.

### 5.1 Present work

If execution mode is `autonomous-branch`: commit, push, and create a PR (see 5.5). Then proceed to 5.2.

All other modes: **AskUserQuestion** — present a summary of what was done, highlight anything notable, confirm plan is ready to delete, and ask whether the user wants to review changes, request corrections, or proceed to closure.

### 5.2 Resolve external issues

Before closing out the plan, surface any unresolved items discovered during implementation or review — issues that are related to this work but outside its scope (e.g., bugs in other features, missing capabilities, framework limitations, spec gaps in other features).

If unresolved items exist, present **AskUserQuestion** for each:

- Add to an existing tracking file (specify which file)
- Create a new tracking file at a suggested path
- Create a GitHub issue
- Drop it (not worth tracking)

Once all external issues are routed, proceed to closure.

### 5.3 Clean up temporary files

Identify any temporary files that should be cleaned up:

- Context files noted during Phase 1.3 setup
- Deprecated feature files removed during spec transforms (plan.md, research.md, tasks.md in `.xe/features/{feature-id}/`)
- The plan file itself (`.xe/sessions/plan-{id}.md`)

**Rules for file cleanup**:

- Never delete files outside the repository
- The plan file should be deleted before work is committed, unless a PR is pending merge or the user wants to continue later
- Always confirm deletions with the user

### 5.4 Close out

If execution mode is `autonomous-branch`, skip this prompt and proceed directly to 5.5.

Present **AskUserQuestion** — "How would you like to proceed?":

- Commit to current branch — stage and commit changes
- Create a pull request — branch (if needed), commit, push, create PR (see 5.5)
- Keep working — plan stays open for continued work in a future session

### 5.5 Create pull request (if requested or `autonomous-branch` mode)

1. Verify the current branch is not the default branch — if it is, create a feature branch first (`xe/{plan-id}`)
2. Create pull request into default branch
3. Set title: `[Catalyst][{type}] {feature-name}` where type is "Feature" or "Bug"
4. Include in PR body:
   - Requirements coverage summary (FR/NFR → test mapping)
   - Links to spec(s)
   - Summary of changes
5. Link related issues with `Fixes #{id}` or `Related to #{id}`
6. Assign reviewers per `.xe/product.md` team roles if defined
7. After merge: delete feature plan(s) at `.xe/sessions/plan-{id}.md`

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

- [ ] Each phase exit criteria met
- [ ] Spec uses only personas from `.xe/product.md § Personas` (skip for explore)
- [ ] Every FR/NFR has a corresponding `@req` annotation in code and tests (skip for explore)
- [ ] External issues routed via Phase 5.2
- [ ] Temporary files cleaned up with user confirmation via Phase 5.3
- [ ] User confirms work is complete via Phase 5.4 closure
