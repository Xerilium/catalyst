# Init Render

Render every foundational `.xe/` artifact from its bundled template using the confirmed input set, stripping template instruction blocks and replacing placeholders.

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- Confirmed input set from `init-interview.md` covering project overview, goals, technology preferences, engineering preferences, team roles, product strategy priorities, customer journey (when in scope), competitive context (when in scope), blueprint kickoff opt-in

## Instructions

1. For each template:
   1. Read source
   2. Fill `{project-name}` and `{placeholder}` tokens
   3. Strip `> [INSTRUCTIONS]` blocks
   4. Write to destination

   Templates:
   - `src/resources/templates/specs/product.md` → `.xe/product.md`
   - `src/resources/templates/specs/customer-journey.md` → `.xe/customer-journey.md` (when in scope)
   - `src/resources/templates/specs/competitive-analysis.md` → `.xe/competitive-analysis.md` (when in scope)
   - `src/resources/templates/specs/engineering.md` → `.xe/engineering.md`
   - `src/resources/templates/specs/architecture.md` → `.xe/architecture.md`
   - `src/resources/templates/process/development.md` → `.xe/process/development.md`

2. If `.xe/customer-journey.md` included, ensure `.xe/product.md § Customer Journey` references it
   - If skipped, omit Customer Journey section from `.xe/product.md`

3. Verify:
   - Every in-scope artifact exists under `.xe/`
   - No `{placeholder}` tokens remain
   - No `> [INSTRUCTIONS]` blocks remain
   - `.xe/product.md` references `.xe/customer-journey.md` when scoped, omits when not

## Exit Criteria

- [ ] Every in-scope artifact rendered under `.xe/`
- [ ] All placeholders replaced and instructions stripped; no template residue
- [ ] Customer Journey linked or omitted
