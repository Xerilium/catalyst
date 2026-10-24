# Record Design Decision

‼️ Write for **Distilled Excellence**: Highest signal per character

Decide whether a decision belongs in a design-decisions file, then record it.

## Inputs

- `scope` — `feature` (`.xe/features/{feature-id}/design-decisions.md`) or `product` (`.xe/features/design-decisions.md`)

## Instructions

1. Record the decision only if distinct options existed AND the choice changes an outcome, introduces a limitation, or could be refuted by later evidence
   - Skip execution details with negligible customer, outcome, UX, or API impact, and point-in-time choices no later evidence could refute; raise those as pull request comments
2. Create the file from `node_modules/@xerilium/catalyst/templates/specs/design-decisions.md` if missing
3. The file lists active decisions only — not a ledger. Read every existing entry first:
   - If an entry covers the same ground, or the new decision narrows, extends, or contradicts it, update that entry in place (including its Date); never append a second entry
   - If the new decision spans several entries, merge them into one
   - Delete entries the new decision fully replaces
4. Write the H2 as the decision itself, so a reader knows the outcome without opening the section; problem, reason, and alternatives go in the section body
5. Fill every field per the template: Decision, Date, Why, Rejected, Evidence
