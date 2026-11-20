# Full autonomy

Full autonomy lets a repository run from finished change to merged pull request with no person in the loop for routine work. It is off by default.

## What changes

Without full autonomy, a person adds the Autopilot label to each PR. With it, the agent that wrote the PR adds Autopilot itself, after the PR passes review. The [Autopilot gates](../.xe/features/pull-request-workflow/spec.md) (`catalyst pr <n>`) still decide the merge: checks, approvals, code owners, threads, and branch rules all still apply.

The human gate moves into your committed config. Turning full autonomy on is a reviewed commit. That commit always escalates, so an agent can never approve its own wider autonomy.

## Turn it on

Add an `autonomy` key to `.xe/config/catalyst.json` and merge it through a normal review:

```json
{
  "autonomy": {
    "enabled": true
  }
}
```

Only the repository's file decides. No environment variable, CLI flag, or user-level file turns it on. Anything other than `"enabled": true`, or any invalid setting, keeps it off.

Check it:

```bash
npx catalyst autonomy status
npx catalyst check --rules config.autonomy
```

`catalyst init` also says whether it is on, lists the risks when it is, and reports config problems. It never turns it on.

## What runs

Every workflow that opens a PR (`/catalyst:create`, `/catalyst:change`, `/catalyst:fix`, `/catalyst:blueprint`, `/catalyst:init`) ends with this chain:

1. `/catalyst:pr-loop` until a round is clean, capped at the `loop-rounds` budget. Review runs in a subagent, separate from the author.
2. `catalyst autonomy autopilot <pr>` checks every trigger and budget. It adds Autopilot, or escalates.
3. `/catalyst:pr-sweep` on that PR fixes what holds the merge. It never merges.

## Escalations

An escalation leaves the PR without Autopilot and posts one `🤖 [AI]` comment with a 🧭 list of reasons. Add Autopilot yourself after review.

| Trigger         | Default                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sensitive paths | `.xe/config/**`, `.github/workflows/**`, `**/CODEOWNERS`, `**/.env*`, `**/*.pem`, `**/*.key`, `**/*secret*`, `**/*credential*`, `**/auth/**`, `**/security/**` |
| Contract paths  | `.xe/features/blueprint.md`, `.xe/product.md`, `.xe/architecture.md`, `.xe/engineering.md`                                                                     |
| Spec contract   | A PR removes a requirement ID from a feature spec                                                                                                              |
| Release version | A PR changes a `"version"` line in a `package.json`                                                                                                            |
| Size            | More than 600 changed lines or 30 changed files                                                                                                                |
| Loop            | The last `pr-loop` did not end clean, or 2 loops did not end clean                                                                                             |
| Agent-judged    | `ambiguity`, `ci-unfixable`, `destructive`                                                                                                                     |
| Author or state | Another user opened the PR, or it is a draft or closed                                                                                                         |
| Unreadable      | The PR, diff, or signed-in user cannot be read                                                                                                                 |

You can add paths and tune the numbers. You cannot remove a default path.

## Never-auto list

Full autonomy never takes these actions. The list is code, not config:

- Releases: `gh release`, `npm publish`, `npm version`, `git tag`, `git push --tags`
- Settings and credentials: `gh secret`, `gh variable`, `gh auth`, `gh repo edit`, `gh ruleset`, `git config --global`, `npm login`, `npm token`, `gh api` writes to repo settings
- Destructive git and data: force push without a lease, remote deletes, history rewrites, `gh repo delete`, `gh api -X DELETE`, `rm -rf /`, SQL `DROP` or `TRUNCATE`
- Publishing outside the repo: gists, `--repo` naming another repo, `curl` or `wget` sending data

Agents check a command with `npx catalyst autonomy guard -- <command>`. It exits non-zero when blocked.

## Budgets

| Setting              | Default   | Meaning                                     |
| -------------------- | --------- | ------------------------------------------- |
| `budget.loop-rounds` | 5         | Total `pr-loop` rounds per PR               |
| `budget.minutes`     | 120       | Minutes from a PR's first autonomous action |
| `budget.tokens`      | 2,000,000 | Tokens per PR (agents self-report)          |
| `budget.prs-per-day` | 10        | Autopilot applies per UTC day, for the repo |

A spent budget escalates the PR.

## Full config

```json
{
  "autonomy": {
    "enabled": true,
    "budget": {
      "loop-rounds": 5,
      "minutes": 120,
      "tokens": 2000000,
      "prs-per-day": 10
    },
    "escalate": {
      "paths": ["infra/**"],
      "contract-paths": ["docs/api.md"],
      "max-changed-lines": 600,
      "max-changed-files": 30,
      "max-loop-failures": 2
    }
  }
}
```

## Stop it

```bash
npx catalyst autonomy stop        # this clone: writes .xe/runs/autonomy/STOP
npx catalyst autonomy stop --all  # also the scheduler's STOP file
npx catalyst autonomy resume [--all]
```

A STOP file halts every chain step, `pr-loop` round, and `pr-sweep` PR. It uses the same `STOP` file as the scheduler (`$CATALYST_SCHEDULE_STATE`, else `~/.cache/catalyst/schedule`), so one file halts both.

A STOP file is local. It does not touch PRs that already have Autopilot: the GitHub workflow still merges them. To hold one, add Paused or remove Autopilot.

## Audit trail

- Every PR comment starts with `🤖 [AI]`. An apply comment names the config commit that turned autonomy on.
- `.xe/runs/autonomy/ledger.jsonl` records every decision, escalation, apply, and halt, one JSON line each. It is append-only and stays on the machine.

## Run it unattended

Pair full autonomy with a scheduled sweep. Use `npx catalyst autonomy gate` as the schedule's gate: it prints `run`, or `skip` with a reason when autonomy is off, a STOP file exists, or the daily budget is spent. With no one to answer, escalations stay on the PR and in the report.

## Risks

- Code can merge with no human review when no trigger fires. Code owners and branch rules still apply.
- Triggers are heuristics. Add `escalate.paths` for anything sensitive in your repo.
- Token use is self-reported. Rounds and minutes are measured.
- The guard checks commands the chain runs. It does not sandbox the agent.
