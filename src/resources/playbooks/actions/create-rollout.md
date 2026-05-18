# Create Rollout

Scaffold a new rollout doc with a populated overview, run structure, and declared commands.

## Instructions

1. Read any inline description or goal; ask 1-3 targeted questions if scope is unclear
2. Determine rollout ID (kebab-case): feature ID for single-feature, short description for multi-feature or cross-cutting
3. Draft runs: title, kick-off command (`/catalyst:create`, `/catalyst:change`, `/catalyst:fix`, or `/catalyst:explore`), and brief description of what the run accomplishes
4. Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md: 1 question per run using progressive approval when multi-run. Each question: run title, command, and what it will do. Options: "Approve" / up to 3 alternatives. Mark 1 recommended.
5. Create `.xe/rollouts/rollout-{rollout-id}.md` from `node_modules/@xerilium/catalyst/templates/specs/rollout.md` template

## Exit Criteria

- [ ] Runs approved
- [ ] Doc written with instructions blocks removed
