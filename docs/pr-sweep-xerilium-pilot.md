# Pilot: Catalyst `pr-sweep` on the Xerilium repos

Goal: run `/catalyst:pr-sweep` in place of the todo repo's `.claude/commands/sweep-xerilium.md` and `/pr-merge`.

## Run

Repos: `Xerilium/catalyst`, `Xerilium/stack`, `Xerilium/prime`, `Xerilium/printer`.

1. In each repo, update `@xerilium/catalyst` to the version with the merge gates, then run `npx catalyst init` to sync labels.
2. From the repo, run `/catalyst:pr-sweep` (add `update` or `review` for one role, or PR numbers for a few PRs).
3. Compare each merge with the todo sweep's result for the same PRs. Run both in parallel for one week.

The merge rule is the nine gates in `reconcile-pull-request.md`, Phase 4. They match todo `/pr-merge`: never-merge repos, Autopilot label, code owners, threads, checks, Playwright, `catalyst check`, `CLEAN`, then squash-merge.

## Check before you drop the override

- Labels exist in all four repos (Autopilot, Ready, Finalized, WIP, Needs Attention, Paused)
- `printer` merges an inactive published PR after 7 days with no approval; the other three do not
- A repo with a `CODEOWNERS` file does not merge without Ready, even when no changed file matches
- A repo with Playwright tests merges only after a clean run; a console error blocks it
- A repo with `@xerilium/catalyst` merges only with a clean `npx catalyst check` (no warnings)
- `finops-hubs` and `FinOps-Open-Cost-And-Usage-Spec` repos never merge (override with `pull-requests.merge.never` only to add repos)
- A non-Autopilot PR is reviewed or updated but never merged
- A merge-state of `BEHIND` or `DIRTY` is rebased, then the gates run again

## Differences from todo `/pr-merge`

- The sweep proves gates 7 and 8 and records the head commit with the Finalized label; the merge then needs Finalized at that commit
- Code-owner sign-off now follows "CODEOWNERS configured in the repo" (todo rule 4), not "covers a changed file"
- Not in this change: customization hooks (PR 212) and sweep roles (PR 213). Gates 7 and 8 stay built in until hooks can carry them.

## Then

Remove `sweep-xerilium.md` and the Xerilium part of `/pr-merge` from todo.
