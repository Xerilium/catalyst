# Write Spec

Collaboratively define feature specifications with Purpose, dependencies, scenarios, functional requirements, architecture constraints, and optional data models.

‼️ MUST follow **AskUserQuestion** patterns: @node_modules/@xerilium/catalyst/standards/auq.md

‼️ If **execution-mode** is `autonomous-local` or `autonomous-branch`, skip **AskUserQuestion**

## Inputs

- `feature-id`: Kebab-cased ID of the feature being spec'd
- `execution-mode`: `interactive`, `checkpoint-review`, `autonomous-local`, or `autonomous-branch`

## Instructions

1. Use **AskUserQuestion** to collect the following for each feature (batch 4Qs/loop, avoid phased Qs unless required):
   - Q1: **Purpose** — 1-4 options for the mission statement
      - For new features: proposed mission statements
      - For existing features needing changes: specific proposed changes
      - "Keep as-is" option for features not needing Purpose changes
   - Q2: **Dependencies** — confirm upstream feature dependencies
      - Prevent reverse dependencies (NEVER list downstream consumers)
   - Q3+: **Scenarios and constraints** — one question per scenario or architecture constraint being created, updated, or removed:
     - Show proposed FR ID & text (no markdown formatting)
     - Nested FRs: Use 1-4 word labels
     - Options: "Approve scenario + FRs", "Approve scenario + review FRs", or others as appropriate
     - Continue until all FRs/constraints are approved
   - Qn+: **Data model** — If scenario input/output entities are detailed, ask one question per entity in condensed form:
     - Simple "Approve" or offer variations
     - Skip if no entities worth documenting beyond inline I/O
2. Confirm ALL Qs are approved (none skipped; repeat AUQ loops as needed)
3. Generate full `spec.md` and `data-model.md` (if needed) for this feature using templates:
   - `node_modules/@xerilium/catalyst/templates/specs/spec.md`
   - `node_modules/@xerilium/catalyst/templates/specs/data-model.md`
4. **AskUserQuestion**: present full spec for final approval

Repeat steps 1–4 for each feature in scope – if `autonomous-branch` execution mode, commit after each feature approval

## Exit Criteria

- [ ] All specs and data models finalized, written to disk, and user-approved (auto-approved for `autonomous-local` and `autonomous-branch` execution mode)
- [ ] Finalized specs do NOT reference downstream features (reverse dependencies)
- [ ] Finalized specs are "living" documents that represent the desired state and do NOT reference updates or changes from a previous state
- [ ] Specs use `@req` requirements traceability annotations for upstream dependencies
- [ ] No FR IDs were changed or removed without explicit user approval and, if approved, all downstream `@req` annotations in specs where identified and added to the the in-progress plan to be addressed before closure
