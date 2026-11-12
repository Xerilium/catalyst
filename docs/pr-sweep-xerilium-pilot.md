# Pilot: Catalyst `pr-sweep` on the Xerilium repos

Goal: run `/catalyst:pr-sweep` in place of the todo repo's `.claude/commands/sweep-xerilium.md` and `/pr-merge`.

## Run

Repos: `Xerilium/catalyst`, `Xerilium/stack`, `Xerilium/prime`, `Xerilium/printer`.

1. In each repo, update `@xerilium/catalyst` to the version with the merge gates, then run `npx catalyst init` to sync labels.
2. Set `pull-requests.merge` in each repo's `.xe/config/catalyst.json` on the default branch where needed. `printer` gets `"approval-waiver-days": { "Xerilium/printer": 7 }`. The defaults exclude no repo, waive no sign-off, and set `strictCheck` to `false`.
3. From the repo, run `/catalyst:pr-sweep` (add `update` or `review` for one role, or PR numbers for a few PRs).
4. Compare each merge with the todo sweep's result for the same PRs. Run both in parallel for one week.

The merge rule is `catalyst pr {number}`: the gates in `autopilot-pull-request.yaml` and the `github-pr-gates` action. They match todo `/pr-merge`, in this order:

1. Never-merge repo (`pull-requests.merge.never`)
2. PR state read fresh
3. Autopilot label (`Status: 🤖 Autopilot` or `Status: Autopilot 🤖`)
4. Code owners: a human approval when the repo has a `CODEOWNERS` owner rule, plus each owned file's owner; the printer waiver skips both
5. No unresolved thread
6. No pending, failed, or skipped required check
7. Playwright tests pass with no console error
8. `npx catalyst check` returns no error (and no warning when `strictCheck` is `true`)
9. `mergeStateStatus` is `CLEAN`
10. Squash-merge

## Check before you drop the override

- Labels exist in all four repos (Autopilot, Ready, Finalized, WIP, Needs Attention, Paused)
- `printer`, with the waiver set above, merges an inactive published PR after 7 days with no approval; the other three do not
- A repo with a `CODEOWNERS` owner rule does not merge without a human approval, even when no changed file matches
- A repo with Playwright tests merges only after a clean run; a console error blocks it
- A repo with `@xerilium/catalyst` merges when `npx catalyst check` returns no error; warnings block only where `strictCheck` is `true`
- A repo in `pull-requests.merge.never` never merges. Set it in the `finops-hubs` and `FinOps-Open-Cost-And-Usage-Spec` repos.
- A non-Autopilot PR is reviewed or updated but never merged
- A held Autopilot PR says why (`not merging; ... (Code: ...)`), and the sweep fixes that blocker and runs `npx catalyst pr` again

## Differences from todo `/pr-merge`

- The script merges only a PR the signed-in GitHub user authored. Tests and `catalyst check` run only for those PRs, and never for a fork.
- Tests run in a fresh worktree of the head commit, after a dependency install, on every `catalyst pr` run of a PR that meets the other gates. Expect a slow run on repos with Playwright.
- The waiver counts a commit, review, or non-bot comment as activity. Inline thread replies are not counted.
- Not in this change: customization hooks (PR 212) and sweep roles (PR 213). Playwright and `catalyst check` stay built in until hooks can carry them.

## Then

Remove `sweep-xerilium.md` and the Xerilium part of `/pr-merge` from todo.
