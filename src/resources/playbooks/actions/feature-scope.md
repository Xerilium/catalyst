# Scope Feature Work

Gather context, run feature-specific sweeps, evaluate scope, and set up the rollout for feature workflows.

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- `feature-id`: Feature being worked on (may be new or existing)
- `issue`: GitHub issue number (optional)
- `context-files`: Referenced files for additional context (optional)

## Instructions

### Step 1: Gather Context

Context scrutiny: treat incoming run commands, descriptions, and feature IDs as a starting point — research, analyze, and verify with unbiased, grounded data before scoping. Stale rollout entries may name wrong features or outdated commands. If you don't agree with the design, push back and propose better options.

1. Read any inline description
2. Determine features being added/updated or affected by the bug
3. For existing features, read `.xe/features/{feature-id}/spec.md`
   - For bugs, parse spec to identify which FR is being violated
4. If GitHub issue referenced, read with `gh issue view {issue-number}`
5. Read referenced content/files; flag temporary files for possible cleanup later
6. Read blueprint for context on planned/related features (if it exists)
7. IF needed:
   - `.xe/features/{feature-id}/design-decisions.md`
   - `.xe/product.md` for product vision
   - `.xe/features/` for related features
   - Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to ask 1-4 clarifying questions when critical context is missing
8. Order features by dependencies (most upstream first)

### Step 1.5: Convention Check

For each new artifact type this work introduces (based on purpose/intent), read ONE existing instance of the same type to match naming, placement, and ownership. Skip only when not adding new artifact types or when no existing instances exist (e.g., first feature).

### Step 1.6: Traceability

For each affected feature, consult existing traceability output to identify same-scenario gaps that could be picked up as Boy Scout fixes. Skip when no existing features are affected.

Skip when no existing features are affected.

1. For each affected feature, run `npx catalyst traceability {feature-id}` and capture warnings
2. Filter warnings to the scenario(s) the current work touches — same `### FR:{scenario}` heading or directly-related FRs
3. Skip the AUQ if no same-scenario warnings are found
4. If same-scenario warnings exist, present ONE AUQ in Step 2 listing the gaps:
   - **Defer all** (Recommended, keeps scope tight) — leave gaps for separate triage
   - **Include all** — add gaps as tasks in the rollout plan
   - **Pick individually** — present each gap in a follow-up AUQ for opt-in selection

Do NOT surface cross-scenario or cross-feature warnings here.

### Step 1.7: Dependency Impact

Skip when no existing FRs are being modified.

Run `npx catalyst deps {feature-id} --reverse` to list downstream consumers. Include the result in the Step 2 effort overview as a "Downstream impact" line, and record it in rollout Notes for the spec phase.

### Step 1.9: Resume Routing

Skip unless the user referenced an existing rollout plan (`.xe/rollouts/rollout-{id}.md`) or continuing a rollout from context.

Feature-workflow phases:

- Phase 1 (Spec) — produces `.xe/features/{feature-id}/spec.md`
- Phase 2 (Plan) — produces task breakdown in rollout's Run Features section
- Phase 3a (Tests) — produces tests with `@req` annotations
- Phase 3b (Implementation) — produces code that makes tests pass
- Phase 4 (Review/Closure) — produces review summary, cleanup, optional commit/PR

Routing:

1. Read the rollout and existing artifacts; assess per-phase completeness against the phases above
2. Completed phases → confirm coverage, do not rewrite. Incomplete phases → execute normally with existing artifacts as starting points (approval gates still apply).
3. Flag rollout-quality issues (gaps, contradictions, stale assumptions) and re-open the affected phase when assessment reveals problems.
4. Multi-run rollouts: assess each run independently; runs with all tasks `[x]` and verified implementation are skipped entirely; resume targets the first incomplete run.
5. Recommend a resume entry phase:
   - All runs complete → Phase 4 (Review/Closure)
   - Implementation tasks all `[x]` but closeout tasks unchecked → Phase 4 with abandoned-closeout handling (confirm via AUQ that work was complete, acknowledge closeout, acknowledge next run or done)
   - Otherwise → lowest-numbered phase with incomplete artifacts
6. Add the recommendation as a "Resume entry phase" question to the Step 2 AUQ with the recommended phase plus one alternate.

### Step 2: Present Scope for Approval

Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md with these grouped questions:

1. **Effort overview** — Succinct summary (confirms AI understanding); include the **Downstream impact** line from Step 1.7 when present; include the same-scenario traceability AUQ from Step 1.6 when present; single option "Approve" plus others as appropriate
2. **Impacted features** — Single feature: "Approve". Multiple: "Implement individually" / "Implement together". Too large: "Split into sequenced efforts: [A] / [B]". Recommend one based on complexity and risk.
3. **Execution mode** — present all four:
   - **interactive** — Progressive Q&A. Nothing staged/committed by AI.
   - **checkpoint-review** — Autonomous between checkpoints; human review at gates. Nothing staged/committed by AI.
   - **final-review** — Autonomous to completion on current branch; final human review. Nothing staged/committed by AI.
   - **autonomous** — New branch + PR for human review.
4. **Resume entry phase** — ONLY when Step 1.9 ran. Recommended phase + one alternate; for completed runs in multi-run rollouts, point at the first incomplete run; for abandoned closeout, offer "Close out and move on".

If multiple efforts approved, note follow-on runs for Phase 2 planning.

### Step 3: Setup

1. Determine rollout ID (kebab-case): feature ID for single new feature, logical short description for multi-feature efforts, enhancements, or bug fixes
2. If `autonomous`, create `xe/{rollout-id}` branch from origin (not local). All other modes: current branch.
3. Create rollout plan at `.xe/rollouts/rollout-{rollout-id}.md` from template — fill Overview, Features (one `#### {feature-id}` per feature), leave Pre/Post-implementation `[INSTRUCTIONS]` blocks for later, document temp files for cleanup
4. If `autonomous`, commit and push placeholder rollout

## Exit Criteria

- [ ] Context gathered; convention check completed (or skipped)
- [ ] Traceability check completed (or skipped); same-scenario gaps routed via AUQ
- [ ] Dependency-impact completed (or skipped); downstream consumers recorded in rollout Notes
- [ ] Resume routing completed (or skipped); recommendation added to scope AUQ
- [ ] Scope and execution mode approved via AUQ
- [ ] Rollout plan outline created
- [ ] Feature branch created (if `autonomous`)
