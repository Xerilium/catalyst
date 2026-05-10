# Scope Workflow

Gather context, evaluate scope, and set up the rollout for any workflow.

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- `issue`: GitHub issue number (optional)
- `context-files`: Referenced files for additional context (optional)
- `artifacts`: Artifact identifiers the calling playbook is operating on (feature IDs, `blueprint`, etc.)

## Instructions

### Step 1: Gather Context

1. Read any inline description
2. For each `artifacts` entry, read the artifact file when it exists:
   - Feature spec at `.xe/features/{feature-id}/spec.md` for feature IDs
   - Blueprint at `.xe/features/blueprint.md` for `blueprint`
   - For bug fixes targeting a feature, identify which FR is being violated
3. If GitHub issue referenced, read with `gh issue view {issue-number}`
4. Read referenced content/files; flag temporary files for possible cleanup later
5. Read blueprint for context on planned/related features (if it exists)
6. IF needed:
   - `.xe/features/{feature-id}/design-decisions.md` for feature work
   - `.xe/product.md` for product vision
   - `.xe/features/` for related features
   - Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to ask 1-4 clarifying questions when critical context is missing
7. Order in-scope artifacts by dependency (most upstream first)

### Step 1.5: Convention Check

For each new artifact type the work introduces, read ONE existing instance to match naming, placement, and ownership. Skip when no new types or no existing instances.

### Step 2: Present Scope for Approval

Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md with these grouped questions:

1. **Effort overview** — Succinct summary (confirms AI understanding); single option "Approve" plus others as appropriate
2. **Impacted scope** — Single artifact: "Approve". Multiple: "Implement individually" / "Implement together". Too large: "Split into sequenced efforts: [A] / [B]". Recommend one based on complexity and risk.
3. **Execution mode** — present all four:
   - **interactive** — Progressive Q&A. Nothing staged/committed by AI.
   - **checkpoint-review** — Autonomous between checkpoints; human review at gates. Nothing staged/committed by AI.
   - **final-review** — Autonomous to completion on current branch; final human review. Nothing staged/committed by AI.
   - **autonomous** — New branch + PR for human review.

If multiple efforts approved, note follow-on runs for the calling playbook's planning phase.

### Step 3: Setup

1. Determine rollout ID (kebab-case): natural identifier for single-artifact work, logical short description for multi-artifact efforts
2. If `autonomous`, create `xe/{rollout-id}` branch from origin (not local). All other modes: current branch.
3. Create rollout plan at `.xe/rollouts/rollout-{rollout-id}.md` from the appropriate template — fill Overview, Features (one `#### {artifact-id}` per artifact), leave Pre/Post-implementation `[INSTRUCTIONS]` blocks for later, document temp files for cleanup. Template selection:
   - `artifacts` = `blueprint` → `node_modules/@xerilium/catalyst/templates/specs/rollout-blueprint.md` (multi-run shape: Run 0 creation + Run 1+ phased implementation)
   - Otherwise → `node_modules/@xerilium/catalyst/templates/specs/rollout.md` (generic single-run or feature-grouped shape)
     If `autonomous`, commit and push placeholder rollout — Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-commit.md with `feature-id` = primary artifact ID (feature ID, `init`, or `blueprint`; omit for cross-cutting rollouts), `files` = `[.xe/rollouts/rollout-{rollout-id}.md]`, `description` = `Start rollout {rollout-id}`

## Exit Criteria

- [ ] Context gathered
- [ ] Scope and execution mode approved via AUQ
- [ ] Rollout plan outline created
- [ ] Feature branch created (if `autonomous`)
