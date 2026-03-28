# Scope Feature Work

Gather context, evaluate scope, and set up for feature work.

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
   - Read data structures: `.xe/features/{feature-id}/data-model.md` (if it exists)
   - Read product vision: `.xe/product.md`
   - Scan related features: `.xe/features/`
   - Use **AskUserQuestion** if critical context is missing or ambiguous (1-4 targeted questions only)
8. Order features by dependencies (most upstream first)

### Step 2: Present Scope for Approval

Use **AskUserQuestion** tool:

1. **Effort overview** — Succinct summary of the work (confirms AI understanding)
   - Single option: "Approve"
   - Offer more options as appropriate
2. **Impacted features** (added/updated)
   - **Single feature**: "Approve"
   - **Multiple features**: "Implement individually (review after each)" / "Implement together (review all at once)"
   - **Too large**: "Split into sequenced efforts: [Option A] / [Option B]"
   - Always recommend 1 option explicitly based on complexity and risk
3. **Execution mode**:
   - **interactive**: Interactive (progressive Q&A to build spec together) (Recommended)
   - **checkpoint-review**: Local/current branch checkpoint review (run autonomously until checkpoints; nothing staged/committed by AI)
   - **autonomous-local**: Full autonomy, local/current branch (nothing staged/committed by AI)
   - **autonomous-branch**: Full autonomy in a branch/PR

If multiple efforts approved, note follow-on plans for Phase 2 planning.

#### Step 3: Setup

After scope is confirmed:

1. Determine plan ID (kebab-case):
   - Use feature ID for a single new feature
   - Use logical short description for multi-feature efforts, enhancements, or bug fixes
2. If execution mode is `autonomous-branch`, create a `xe/{plan-id}` feature branch from origin (do not use local branch)
   - All other modes: work on the current branch
3. Create plan doc at `.xe/sessions/plan-{id}.md` using template from `node_modules/@xerilium/catalyst/templates/specs/plan.md` — fill in what's known from scoping:
   - Overview: what prompted this work (include original prompt/issue if available)
   - Features: one `### {feature-id}` sub-heading per feature from scope approval
   - Pre/Post-implementation: leave as-is with `[INSTRUCTIONS]` block for later
   - Cleanup: Document any temporary context files from scoping for cleanup
4. If execution mode is `autonomous-branch`, commit and push placeholder plan

## Exit Criteria

- [ ] Context gathered from all relevant sources
- [ ] Scope evaluated and features identified
- [ ] User approved scope and execution mode via AskUserQuestion
- [ ] Setup complete:
  - [ ] **execution-mode** set
  - [ ] Plan/session outline created
  - [ ] Feature branch created (if `autonomous-branch` mode)
