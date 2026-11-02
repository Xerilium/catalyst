# Record Design Decision

‼️ Write for **Distilled Excellence**: Highest signal per character

Decide whether a decision belongs in a design-decisions file, then record it.

## Inputs

- `scope` — `feature` (`.xe/features/{feature-id}/design-decisions.md`) or `product` (`.xe/features/design-decisions.md`)

## Instructions

1. Record the decision only if distinct options existed AND the choice changes an outcome, introduces a limitation, or could be refuted by later evidence
   - Skip execution details with negligible customer, outcome, UX, or API impact, and point-in-time choices no later evidence could refute; raise those as pull request comments
2. Create the file from `node_modules/@xerilium/catalyst/templates/specs/design-decisions.md` if missing
3. The file lists active decisions only: if an entry already covers this ground, update it in place (including its Date); never add a second overlapping entry
4. Write the H2 as the decision itself, so a reader knows the outcome without opening the section; problem, reason, and alternatives go in the section body
5. Fill every field per the template: Decision, Date, Why, Rejected, Evidence
