# Scope Feature Work

Gather context, evaluate scope, and set up for feature work.

‼️ Write for **Distilled Excellence**.

## Inputs

- `feature-id`: Feature being worked on (may be new or existing)
- `issue`: GitHub issue number (optional)
- `context-files`: Referenced files for additional context (optional)

## Instructions

### Step 1: Gather Context

1. Read any inline description
2. Determine features being added/updated or affected by the bug
3. For existing features, read `.xe/features/{feature-id}/spec.md`
   - For bugs, parse spec to understand expected behavior and identify which FR is being violated
4. If GitHub issue referenced, read with `gh issue view {issue-number}`
5. Read any referenced content/files (proposals, notes, transcripts)
   - If files seem temporary and only needed for context (notes, proposals, old artifacts, etc), note them for possible cleanup later
6. For context on planned/related features, read blueprint (if it exists):
   - `.xe/features/blueprint/plan.md` (BEST: Feature roadmap & details)
   - `.xe/features/blueprint/spec.md` (OPTIONAL: Original requirements)
   - `.xe/features/blueprint/tasks.md` (OPTIONAL: Progress tracker)
7. IF and ONLY if needed:
   - Read design decisions: `.xe/features/{feature-id}/design-decisions.md` (if it exists)
   - Read product vision: `.xe/product.md`
   - Scan related features: `.xe/features/`
   - If critical context is missing or ambiguous, execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to gather 1-4 targeted clarifying questions
8. Order features by dependencies (most upstream first)
9. **If resuming from an existing rollout** (user referenced `.xe/rollouts/rollout-{id}.md`), route to the correct entry phase — do not redo completed work or rubber-stamp rollout contents:
   - Read the rollout and existing artifacts to assess per-phase completeness:
     - Spec: does `.xe/features/{feature-id}/spec.md` exist and cover the rollout's intent? (Phase 1 done if yes)
     - Plan: does the rollout have a task breakdown in each Run's Features section? (Phase 2 done if yes)
     - Tests: are tests written for in-scope FRs? (Phase 3a done if yes)
     - Implementation: does code exist that would make tests pass? (Phase 3b done if yes)
   - Completed phases → confirm coverage, do not rewrite. Incomplete phases → execute normally with existing artifacts as starting points, approval gates still apply.
   - Rollouts vary in quality — flag gaps, contradictions, or stale assumptions and re-open the affected phase when assessment reveals problems.
   - For multi-run rollouts, assess each run independently — a completed run (all tasks `[x]` with verified implementation) is skipped entirely; resume evaluation targets the first incomplete run.
   - Recommend a resume entry phase based on assessment:
     - All runs complete → go straight to Phase 4 (Review/Closure)
     - Implementation tasks all `[x]` but closeout tasks unchecked → Phase 4 with abandoned-closeout handling (confirm work was complete via AUQ, acknowledge closeout and next run or done)
     - Otherwise → lowest-numbered phase with incomplete artifacts

### Step 1.5: Convention Check

For each new artifact type this work introduces (based on purpose/intent), read ONE existing instance of the same type to match naming, placement, and ownership. Skip only when not adding new artifact types.

### Step 1.6: Traceability Sweep

For each affected feature, consult existing traceability output to identify same-scenario gaps that could be picked up as Boy Scout fixes.

1. For each feature being touched, run `catalyst traceability {feature-id}` and capture any warnings
2. Filter warnings to the scenario(s) the current work touches — same `### FR:{scenario}` heading or directly-related FRs
3. Skip this step (no AUQ) if no same-scenario warnings are found
4. If same-scenario warnings exist, present ONE AUQ in Step 2 (alongside the scope approval) listing the gaps and offering:
   - **Defer all** (Recommended, keeps scope tight) — leave gaps in the traceability report for separate triage
   - **Include all** — add same-scenario gaps as tasks in the rollout plan
   - **Pick individually** — present each gap in a follow-up AUQ for opt-in selection

Do NOT surface cross-scenario or cross-feature warnings here — those bloat scope and belong in separate triage.

### Step 1.7: Dependency Impact Sweep

Skip when no existing FRs are being modified.

Run `npx catalyst deps {feature-id} --reverse` to list downstream consumers. Include the result in the Step 2 effort overview as a "Downstream impact" line, and record it in rollout Notes for the spec phase.

### Step 2: Present Scope for Approval

Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to confirm scope approval — present questions below grouped in a single AUQ call.

1. **Effort overview** — Succinct summary of the work (confirms AI understanding); include a **Downstream impact** line when Step 1.7 ran
   - Single option: "Approve"
   - Offer more options as appropriate
2. **Impacted features** (added/updated)
   - **Single feature**: "Approve"
   - **Multiple features**: "Implement individually (review after each)" / "Implement together (review all at once)"
   - **Too large**: "Split into sequenced efforts: [Option A] / [Option B]"
   - Always recommend 1 option explicitly based on complexity and risk
3. **Execution mode** — present ALL four modes as AUQ options:
   - **interactive** – Label: Interactive, Description: Progressive Q&A to build spec together. Nothing will be staged/committed by AI.
   - **checkpoint-review** – Label: Checkpoint review, Description: Run autonomously in the current branch until regular checkpoints, then do a human review. Nothing will be staged/committed by AI.
   - **autonomous-local** – Label: Autonomous (local), Description: Run autonomously in the current branch, driving to full completion. Final human review when complete. Nothing will be staged/committed by AI.
   - **autonomous-branch** – Label: Autonomous (branch), Description: Run autonomously in a new branch and create a PR for human review.
4. **Resume entry phase** — ONLY include this question when resuming from a rollout (Step 1 item 9). Based on the per-phase completeness assessment, recommend the lowest incomplete phase. Offer:
   - Recommended phase (from assessment) — Label: `Phase N: {name}`, Description: "{assessment summary} — resume here and walk phases forward; earlier phases skipped as complete."
   - One alternate phase (usually one earlier) to let user override if assessment is wrong
   - For completed runs in a multi-run rollout: do NOT offer this question; note the skip in the effort overview and point the resume question at the first incomplete run
   - For abandoned closeout: Label: "Close out and move on", Description: "All implementation tasks checked; confirm work was complete, acknowledge closeout, and acknowledge next run or done."

If multiple efforts approved, note follow-on runs for Phase 2 planning.

#### Step 3: Setup

After scope is confirmed:

1. Determine rollout ID (kebab-case):
   - Use feature ID for a single new feature
   - Use logical short description for multi-feature efforts, enhancements, or bug fixes
2. If execution mode is `autonomous-branch`, create a `xe/{rollout-id}` feature branch from origin (do not use local branch)
   - All other modes: work on the current branch
3. Create rollout plan at `.xe/rollouts/rollout-{id}.md` using template from `node_modules/@xerilium/catalyst/templates/specs/rollout.md` — fill in what's known from scoping:
   - Overview: what prompted this work (include original prompt/issue if available)
   - Features: one `#### {feature-id}` sub-heading per feature from scope approval
   - Pre/Post-implementation: leave as-is with `[INSTRUCTIONS]` block for later
   - Cleanup: Document any temporary context files from scoping for cleanup
4. If execution mode is `autonomous-branch`, commit and push placeholder rollout plan

## Exit Criteria

- [ ] Context gathered from all relevant sources
- [ ] Scope evaluated and features identified
- [ ] User approved scope and execution mode via AskUserQuestion
- [ ] Setup complete:
  - [ ] **execution-mode** set
  - [ ] Rollout plan outline created
  - [ ] Feature branch created (if `autonomous-branch` mode)
