# Upgrade Spec Format

Convert spec and related files to current spec template structure, preserving all requirements and adding FR traceability IDs, as needed.

‼️ MUST follow **AskUserQuestion** patterns: @node_modules/@xerilium/catalyst/standards/auq.md

## Inputs

- `feature-id`: The feature being upgraded
- `execution-mode`: `interactive`, `checkpoint-review`, `autonomous-local`, or `autonomous-branch`

## Instructions

### 1. Review existing spec

Read the existing `spec.md` or `feature.md` and map content to new format sections:

**New format requires**:
1. **Purpose**: 1-3 sentence mission statement (what/why/boundaries)
2. **Scenarios**: Scenarios (`### FR:{scenario-id}`) with nested functional requirements
3. **Architecture Constraints**: Design guardrails (optional, only if beyond `.xe/architecture.md`)
4. **Dependencies**: Upstream features and external tools (optional)

**Content mapping examples** (adapt based on actual content):
- Problem/Goals → Purpose
- User stories/Requirements → Scenarios with nested FRs
- Success Criteria → NFRs or exit criteria
- Key Entities → inline under scenarios or separate `data-model.md`
- Implementation notes → Architecture Constraints (if they're guardrails, not implementation details)

### 2. Review companion files

If `.xe/features/{feature-id}/plan.md`, `architecture.md`, or `design.md` exists, extract any critical design guardrails (NOT implementation details) that should be captured as Architecture Constraints in the new spec.

### 3. Generate transformed spec

Transform content into new format sections following template at `node_modules/@xerilium/catalyst/templates/specs/spec.md`.

**CRITICAL**: Preserve original content verbatim where possible. Do NOT reword anything. If something MUST change, it goes through AUQ approval. If nothing changes, bypass AUQ for interactive mode (straight to final review).

Validate `@req` traceability links. Goal is 100% coverage for dependencies. Do NOT ignore warnings unless directed.

Keep content grounded, no fluff. Architecture Constraints MUST be testable guardrails only.

### 4. Present for approval (Interactive/Checkpoint-Review modes only)

If execution mode is `interactive` or `checkpoint-review`:

- **AskUserQuestion**: Confirm summary of changes:
  - Generated Purpose statement
    - Single option: "Approve"
  - Overall change summary
  - If nothing reworded: "# scenarios, # FRs, # NFRs, # constraints, # dependencies migrated as-is"
  - If anything reworded, augment with minimal explanation (e.g., "scenarios converted from user stories" or "3 FRs updated to use product personas")
  - Options: "Approve all", "Review changes only" (if applicable) / "Review each individually"

Apply any suggestions from the user and re-review until approved. If user requests to review changes individually, add the following questions in the next AUQ round, grouping up to 4 questions per round until complete:

1. **Scenarios** (if changed):
   - "# of # scenarios changed" with VERY brief summary of changes
   - Options: "Approve all" / "Review changed scenarios" / "Review individually"
   - If "Review changed scenarios" or "Review individually": One Q per scenario with L2 FR summary (1-3 words each + # of sub-FRs at all levels)

2. **FRs/NFRs** (if changed):
   - "# of # FRs/NFRs changed" with brief summary
   - Options: "Approve all" / "Review changed requirements" / "Review individually"
   - If reviewing individually: One Q per FR/NFR showing original vs new

3. **Key Entities** (if old format had them):
   - "Key entities will transition [inline under scenarios / as separate data-model.md]"
   - Options: "Approve" / "Change approach"

4. **Architecture Constraints** (extracted from plan.md):
   - "# of # architectural aspects extracted from plan.md"
   - Options: "Approve all" / "Review individually"
   - If reviewing individually: One Q per major architectural aspect from plan with summary and "why keep/remove" rationale, options: "Keep" / "Remove" (one recommended)

5. **Dependencies** (if any @req links):
   - Show FRs that depend on other features with `@req` links
   - Options: "Approve all" / "Review individually"
   - If reviewing individually: One Q per dependent feature showing which FRs reference it

### 5. Final review (Interactive/Checkpoint-Review modes only)

After spec is generated, if execution mode is `interactive` or `checkpoint-review`:

- **AskUserQuestion** — present full spec for final review:
  - Single option: "Approve"
  - User can choose "Other" to request changes

### 6. Write new spec

If approved:

- Write new `spec.md` with current template structure
- Write `data-model.md` if complex entities exist

### 7. Clean up old files

Delete deprecated feature files immediately:
- `.xe/features/{feature-id}/plan.md`
- `.xe/features/{feature-id}/research.md`
- `.xe/features/{feature-id}/tasks.md`
- `.xe/features/{feature-id}/architecture.md` (if content moved to spec)
- `.xe/features/{feature-id}/design.md` (if content moved to spec)

### 8. Commit checkpoint (Interactive/Checkpoint-Review modes only)

If execution mode is `interactive` or `checkpoint-review`:

**AskUserQuestion**: "Format transformation complete. Commit now?"

- "Commit now (clean transform-only commit)" - Recommended
- "Commit later (with other changes)"

If "Commit now": stage and commit with message "Transform {feature-id} spec to current format"

## Exit Criteria

- [ ] Old-format spec transformed to current template
- [ ] All requirements preserved with FR IDs (no rewording unless approved)
- [ ] `@req` traceability validated (100% coverage for dependencies)
- [ ] Old companion files deleted (plan.md, research.md, tasks.md, etc)
- [ ] User approved transformation (auto-approved for `autonomous-local` and `autonomous-branch` modes)
- [ ] Clean commit created if interactive/checkpoint-review mode and user approved
