# Set Up PR Labels

Create the repository's standard PR labels, matching the naming convention it already uses.

<!-- @req FR:pr-labels/ask.ai.@action -->

‼️ Write for **Distilled Excellence**: Highest signal per character

## Instructions

<!-- @req FR:pr-labels/ask.ai.plan -->

1. Run `npx catalyst labels plan --json`. If it fails because `gh` is missing, unauthenticated, or there is no GitHub remote, tell the user once and skip this action.
2. Read `pattern` and `plan` from the output. Nothing to create and no renames → report that labels are already standard and stop.
<!-- @req FR:pr-labels/ask.ai -->
3. Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to ask, in one call, only the questions that apply:
   - **Label style** — only when `pattern.needsChoice` is true (existing labels are simple and barely used, so they say nothing about the convention). Options: `key-value` (Recommended — e.g. `Status: WIP 🚧`, `Help wanted ✨`) and `simple` (e.g. `wip`, `help wanted`). Put the evidence in the question: usage counts from `pattern.usage` and the names of the matched labels.
   <!-- @req FR:pr-labels/ask.ai.renames -->
   - **Renames** — only when `plan.renames` is non-empty. Name up to 5 renames as `from → to (reason)`. Options: apply all (Recommended — renaming keeps every assignment) and skip.
4. Run `npx catalyst labels setup --non-interactive`, adding `--style {choice}` when asked and `--rename` when approved.
5. Report what was created, renamed, and left pending.

Never delete labels.

## Exit Criteria

- [ ] Style asked only when the pattern needed a choice
- [ ] Every required label exists or the user was told why setup was skipped
- [ ] Renames applied only with approval
