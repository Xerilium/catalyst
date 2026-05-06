# Write Plan

Design implementation approach through plan mode, enriching the rollout plan with architecture review, task breakdown, and alignment with engineering and product standards.

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- `rollout-id`: In progress rollout ID
- `feature-id`: Kebab-case ID for the feature(s) being created, updated, or explored
- `execution-mode`: `interactive`, `checkpoint-review`, `final-review`, or `autonomous`

## Instructions

Specs are final. This phase is strictly **implementation design** — HOW to build what the specs define.

1. Update `.xe/rollouts/rollout-{id}.md`:
   - Under each `### {feature-id}` sub-heading, list scenarios and FRs being implemented
   - Update Pre/Post-implementation sections if spec work revealed additional needs
   - Leave `[INSTRUCTIONS]` blocks for later
2. **Enter plan mode** BEFORE any task breakdown or architecture work. To skip (small, single-file bug fixes only — multi-file or cross-feature bugs MUST use plan mode), execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md with "Use plan mode" recommended, explaining the work needed and reason for & risk of skipping. Do NOT skip plan mode silently.
3. Within plan mode, focus on:
   - Architecture review and implementation approach
   - Task breakdown with execution order
   - Traceability verification: confirm plan covers all FRs and `@req` dependency annotations from approved specs — flag any gaps before approval
   - Alignment with `.xe/product.md` vision and design principles
   - Alignment with `.xe/engineering.md` principles and standards
   - Alignment with `.xe/architecture.md` tech stack, structure, and patterns
   - If spec changes are required, execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to confirm the spec change, then exit plan mode and return to spec phase
   - Plan approval gate before implementation begins
4. Record significant design decisions made during planning:
   - Feature decisions → `.xe/features/{feature-id}/design-decisions.md`
   - Product/architecture decisions → `.xe/features/design-decisions.md`
   - Create the file from template (`src/resources/templates/specs/design-decisions.md`) if it doesn't exist; append if it does
   - A decision is significant when alternatives were considered and a tradeoff was made
   - Each entry must include Decision, Date, Why, Rejected, and Evidence fields per template
5. After plan mode is approved, update `.xe/rollouts/rollout-{id}.md`:
   - Replace Features section with approved implementation plan — detailed task breakdown grouped by `### {feature-id}`, checkbox format with nested details as needed
     - For phased, multi-feature rollouts (or a rollout of rollouts): use H2 runs for each phase, H3 sections for each tier, and list features as tasks — feature tasks are executed in separate rollouts
     - Sort feature sections in order of execution, ensuring dependencies complete before features that need them
     - If features must be updated or added, add extra tasks or H3 sections with details as appropriate
     - Include Test-Driven Development (TDD) workflow steps when required and not covered — failing tests first, based on FRs with traceability
   - Update Pre-implementation and Post-implementation sections if the plan identified additional tasks (e.g., setup, migration, backfill)
   - This is the authoritative record of the work — if context resets, the rollout plan is how work resumes
   - Follow and remove `[INSTRUCTIONS]` blocks when done
6. **Downstream-task coverage** — for each (b) outcome from FR:spec.downstream-review, ensure the rollout plan has tasks under `#### {downstream-feature-id}` covering `@req`, test, and code updates as applicable.

## Exit Criteria

- [ ] Plan mode entered (or skip-plan-mode AUQ confirmed)
- [ ] Rollout plan updated with approved task breakdown
- [ ] Plan covers all FRs and `@req` dependency annotations from approved specs
- [ ] Each (b) outcome from FR:spec.downstream-review has tasks under `#### {downstream-feature-id}`
- [ ] Ready for implementation
