# Pilot: Catalyst `pr-sweep` on the Xerilium repos

Goal: run `/catalyst:pr-sweep` in place of the todo repo's `.claude/commands/sweep-xerilium.md` and `/pr-merge`.

## Run

Repos: `Xerilium/catalyst`, `Xerilium/stack`, `Xerilium/prime`, `Xerilium/printer`.

1. In each repo, update `@xerilium/catalyst` to the version with the merge gates, then run `npx catalyst init` to sync labels. Set `pull-requests.merge` in each repo's `.xe/config/catalyst.json` where needed: `printer` gets `"approval-waiver-days": { "Xerilium/printer": 7 }`. The defaults exclude no repo, waive no sign-off, and set `strictCheck` to `false`.
2. From the repo, run `/catalyst:pr-sweep` (add `update` or `review` for one role, or PR numbers for a few PRs).
3. Compare each merge with the todo sweep's result for the same PRs. Run both in parallel for one week.

The merge rule is the gate table in `reconcile-pull-request.md`, Phase 4. It matches todo `/pr-merge`: never-merge repos, Autopilot label, code owners, threads, checks, Playwright, `catalyst check`, `CLEAN`, then squash-merge.

## Check before you drop the override

- Labels exist in all four repos (Autopilot, Ready, Finalized, WIP, Needs Attention, Paused)
- `printer` (with the waiver set above) merges an inactive published PR after 7 days with no approval; the other three do not
- A repo with a `CODEOWNERS` file does not merge without Ready, even when no changed file matches
- A repo with Playwright tests merges only after a clean run; a console error blocks it
- A repo with `@xerilium/catalyst` merges only when `npx catalyst check` returns no error; warnings block only where `pull-requests.merge.strictCheck` is `true` (default `false`)
- A repo listed in `pull-requests.merge.never` never merges (set it in the `finops-hubs` and `FinOps-Open-Cost-And-Usage-Spec` repos)
- A non-Autopilot PR is reviewed or updated but never merged
- A merge-state of `BEHIND` or `DIRTY` is rebased, then the gates run again

## Differences from todo `/pr-merge`

- The reconcile playbook proves the Playwright and `catalyst check` gates and records the head commit with the Finalized label; the merge then needs Finalized at that commit
- Code-owner sign-off now follows "CODEOWNERS configured in the repo" (todo rule 4), not "covers a changed file"
- Not in this change: customization hooks (PR 212) and sweep roles (PR 213). The Playwright and `catalyst check` gates stay built in until hooks can carry them.

## Then

Remove `sweep-xerilium.md` and the Xerilium part of `/pr-merge` from todo.
