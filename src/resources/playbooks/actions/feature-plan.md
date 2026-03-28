# Write Plan

Design implementation approach through plan mode, enriching the plan document with architecture review, task breakdown, and alignment with engineering and product standards.

## Inputs

- `plan-id`: In progress plan ID
- `feature-id`: Kebab-case ID for the feature(s) being created, updated, or explored
- `execution-mode`: `interactive`, `checkpoint-review`, `autonomous-local`, or `autonomous-branch`

## Instructions

Specs are final. This phase is strictly **implementation design** — HOW to build what the specs define.

1. Update `.xe/sessions/plan-{id}.md`:
   - Under each `### {feature-id}` sub-heading, list scenarios and FRs being implemented
   - Update Pre/Post-implementation sections if spec work revealed additional needs
   - Leave `[INSTRUCTIONS]` blocks for later
2. Enter plan mode with all approved specs and the plan doc as context, focus on:
   - Architecture review and implementation approach
   - Task breakdown with execution order
   - Alignment with `.xe/product.md` vision and design principles
   - Alignment with `.xe/engineering.md` principles and standards
   - Alignment with `.xe/architecture.md` tech stack, structure, and patterns
   - If spec changes are required, confirm with user via **AskUserQuestion** and exit plan mode and return to spec phase
   - Plan approval gate before implementation begins
   - New/updated features: Full planning cycle — enrich plan doc, enter plan mode, get approval
   - Bug fixes: Lighter planning — may skip plan mode for small fixes. Focus on: what's broken, root cause, fix approach, regression test. For complex bugs affecting multiple files, use plan mode
3. After plan mode is approved, update `.xe/sessions/plan-{id}.md`:
   - Replace the Features section with the approved implementation plan — detailed task breakdown grouped by `### {feature-id}`, checkbox format with nested details as needed
     - Sort feature sections in order of execution, ensuring dependencies are completed before features that need them
     - If features must be updated or added to the plan, add extra `### {feature-id}` sections with corresponding details as appropriate
     - Include Test-Driven Development (TDD) workflow steps, starting with failing tests based on FRs with traceability
   - Update Pre-implementation and Post-implementation sections if the plan identified additional tasks (e.g., setup, migration, backfill)
   - This is the authoritative record of the work — if context resets, the plan doc is how work resumes
   - Follow and remove `[INSTRUCTIONS]` blocks when done

## Exit Criteria

- [ ] Plan doc updated with approved task breakdown
- [ ] Ready for implementation
