---
id: autonomy
title: Full Autonomy
description: Opt-in repo config that lets the authoring agent apply Autopilot, with escalations, guardrails, and an audit trail.
dependencies:
  - cli-engine
  - repo-labels
---

<!-- markdownlint-disable single-title -->

# Feature: Full Autonomy

## Purpose

Let a repository run its own delivery loop, from finished change to merged pull request, without a person in the loop for routine work. People keep the decisions that need judgment, and the repository's committed config decides how far the AI may go.

## Scenarios

### FR:config: Autonomy Config

Repo owner needs to turn full autonomy on in committed config so that the decision is reviewed like any other change.

- **FR:config.@json** (P1): Interface: `.xe/config/catalyst.json`, key `autonomy`
- **FR:config.input** (P1): Autonomy config (@req FR:$autonomy-config) — from the repository's committed config file
- **FR:config.repo-only** (P1): Autonomy MUST read its on/off setting only from the repository config file
  - No environment variable, CLI flag, user-level file, or parent folder turns it on.
  - **FR:config.repo-only.merged** (P1): Autonomy MUST read the config from the default branch on GitHub
    - Rationale: Only a merged, reviewed config counts. No local file or ref decides.
    - **FR:config.repo-only.merged.missing** (P1): Autonomy MUST treat a missing or unreadable default-branch config as off
- **FR:config.default** (P1): Autonomy MUST treat a missing `autonomy` key as off
- **FR:config.explicit** (P1): Autonomy MUST treat any `enabled` value other than JSON `true` as off
- **FR:config.defaults** (P2): Autonomy MUST fill each missing budget and escalation setting from its default
- **FR:config.extend** (P1): Autonomy MUST add configured paths to the default path lists, never replace them
  - Rationale: A config edit can widen escalation but never remove a default trigger.
- **FR:config.invalid** (P1): Autonomy MUST treat an invalid `autonomy` config as off
  - Rationale: Fail closed. A typo never grants autonomy.
  - **FR:config.invalid.problems** (P1): Validator MUST name each problem with its JSON path
  - **FR:config.invalid.unknown** (P2): Validator MUST flag an unknown key under `autonomy`
  - **FR:config.invalid.range** (P2): Validator MUST flag a budget or threshold that is not a whole number in its allowed range

### FR:autopilot: Apply Autopilot

Authoring agent needs to apply Autopilot to its own clean PR so that the PR merges through the normal gates with no human hand-off.

- **FR:autopilot.@cli** (P1): Interface: `catalyst autonomy autopilot <pr> [--loop-result <result>] [--rounds <n>] [--tokens <n>] [--reason <reason>...] [--dry-run]`
  > - @req FR:cli-engine/cli.global
- **FR:autopilot.input** (P1):
  - `pr` (int) — PR number
  - `loop-result` (`clean`|`round-limit`|`failed`?) — how the last `pr-loop` ended; Default: `failed`
  - `rounds` (int?) — `pr-loop` rounds the loop ran; Default: 0
  - `tokens` (int?) — tokens the agent spent on this PR since its last record; Default: 0
  - `reason` (`ambiguity`|`ci-unfixable`|`destructive`[]?) — agent-judged escalations
  - `dry-run` (bool?) — decide and print, with no GitHub write; Default: false
- **FR:autopilot.off** (P1): Command MUST change nothing when autonomy is off
- **FR:autopilot.stop** (P1): Command MUST change nothing on GitHub when a STOP file exists
  > - @req FR:stop.files
- **FR:autopilot.author** (P1): Command MUST escalate a PR the signed-in GitHub user did not author
- **FR:autopilot.open** (P1): Command MUST escalate a PR that is closed, merged, or a draft
- **FR:autopilot.evaluate** (P1): Command MUST evaluate every escalation trigger and every budget before it decides
  > - @req FR:escalate
  > - @req FR:budget
- **FR:autopilot.apply** (P1): Command MUST add the repository's Autopilot label when no trigger fires and no budget is spent
  > - @req FR:repo-labels/catalog.autopilot
  - **FR:autopilot.apply.name** (P1): Command MUST use the Autopilot label name from the repository's label config
    - Name order: `labels.names.autopilot`, else `autopilot` when `labels.style` is `simple`, else `Status: 🤖 Autopilot`.
  - **FR:autopilot.apply.no-merge** (P1): Command MUST NOT merge the PR
    - Rationale: The Autopilot gates decide the merge.
- **FR:autopilot.escalate** (P1): Command MUST NOT add Autopilot when any trigger fires or any budget is spent
- **FR:autopilot.dry-run** (P2): Command MUST make no GitHub write and no ledger entry when `--dry-run` is set
- **FR:autopilot.output** (P1): Decision (@req FR:$decision) — printed as text, or as JSON with the global `--json` flag

### FR:escalate: Escalation Triggers

Repo owner needs risky changes handed back to a person so that autonomy covers only routine work.

- **FR:escalate.sensitive-paths** (P1): Autonomy MUST escalate a PR that changes a file matching a sensitive path
  - A renamed file matches on its old path or its new path.
  - Defaults: `.xe/config/**`, `.github/workflows/**`, `**/CODEOWNERS`, `**/.env*`, `**/*.pem`, `**/*.key`, `**/*secret*`, `**/*credential*`, `**/auth/**`, `**/security/**`
  - **FR:escalate.sensitive-paths.config** (P1): Autonomy MUST escalate a PR that changes the autonomy config itself
    - Rationale: An agent never widens its own autonomy.
- **FR:escalate.contract-paths** (P1): Autonomy MUST escalate a PR that changes a file matching a contract path
  - Defaults: `.xe/features/blueprint.md`, `.xe/product.md`, `.xe/architecture.md`, `.xe/engineering.md`
- **FR:escalate.spec-contract** (P1): Autonomy MUST escalate a PR that removes a requirement ID from a feature spec
  - A removed ID is one on a deleted line of `.xe/features/**/spec.md` that no added line declares.
- **FR:escalate.size** (P1): Autonomy MUST escalate a PR whose changed lines exceed `max-changed-lines`
  - **FR:escalate.size.files** (P1): Autonomy MUST escalate a PR whose changed files exceed `max-changed-files`
- **FR:escalate.loop** (P1): Autonomy MUST escalate a PR whose last `pr-loop` did not end `clean`
  - **FR:escalate.loop.failures** (P1): Autonomy MUST escalate a PR whose non-clean loop count reaches `max-loop-failures`
    - The count lasts across runs, read from the ledger.
- **FR:escalate.agent** (P1): Autonomy MUST escalate each agent-judged reason it receives
  - `ambiguity` — a requirement has more than one valid reading
  - `ci-unfixable` — a failing check the agent cannot fix in the PR
  - `destructive` — the work needs an action on the never-auto list
- **FR:escalate.never-auto** (P1): Autonomy MUST escalate a PR whose diff changes a release version
  > - @req FR:never.release
  - A release version change is a changed `"version"` line in a `package.json`.
- **FR:escalate.comment** (P1): Command MUST post one PR comment listing every reason when it escalates
  > - @req FR:audit.prefix
  - **FR:escalate.comment.marker** (P1): Command MUST start the escalation list with 🧭
    - Rationale: Sweep leaves 🧭 threads for the user.

### FR:never: Never-Auto Actions

Repo owner needs a fixed list of actions autonomy never takes so that no config edit can unlock them.

- **FR:never.@cli** (P1): Interface: `catalyst autonomy guard -- <command...>`
- **FR:never.fixed** (P1): Autonomy MUST NOT read the never-auto list from config
- **FR:never.release** (P1): Guard MUST block release actions
  - Examples: `gh release`, `npm publish`, `npm unpublish`, `npm dist-tag`, `npm version`, `pnpm version`, `git tag`, `git push --tags`, `gh api` writes to releases or tag refs
- **FR:never.settings** (P1): Guard MUST block settings and credential changes
  - Examples: `gh secret`, `gh variable`, `gh auth`, `gh repo edit`, `gh ruleset`, `git config --global`, `npm login`, `npm token`, `gh api` writes to repository settings, branch protection, hooks, keys, or collaborators, and GraphQL mutations that change them
- **FR:never.destructive** (P1): Guard MUST block destructive git and data actions
  - Examples: `git push --force` without a lease, `git push --delete`, `git push --mirror`, `git push --prune`, `git filter-branch`, `git filter-repo`, `gh repo delete`, `gh api -X DELETE`, `rm -rf` of `/` or `~`, SQL `DROP` or `TRUNCATE`
  - **FR:never.destructive.lease** (P1): Guard MUST allow `git push --force-with-lease`
- **FR:never.publish** (P1): Guard MUST block publishing outside the repository
  - Examples: `gh gist create`, a `gh` command whose `--repo` names another repository, a `gh api` write to another repository, `curl` or `wget` sending data
- **FR:never.merge** (P1): Guard MUST block merging a pull request
  - Rationale: The Autopilot gates decide the merge.
- **FR:never.wrapped** (P1): Guard MUST check commands inside wrappers, subshells, and command substitutions
  - Examples: `bash -c`, `sh -c`, `eval`, `sudo -u x`, `env`, `xargs -n 1`, `git -C dir`, nested `$(...)`, backticks, absolute tool paths
  - **FR:never.wrapped.unreadable** (P1): Guard MUST block a GraphQL query it cannot read

- **FR:never.exit** (P1): Guard MUST exit non-zero and name the category when it blocks a command
  > - @req FR:cli-engine/exit.codes
- **FR:never.output** (P2): Guard result — `allowed`, or `blocked` with category and reason

### FR:budget: Budget Caps

Repo owner needs hard spending limits so that a stuck PR never burns unbounded time or tokens.

- **FR:budget.rounds** (P1): Autonomy MUST escalate a PR whose recorded `pr-loop` rounds exceed `loop-rounds`
- **FR:budget.minutes** (P1): Autonomy MUST escalate a PR whose first ledger entry is older than `minutes`
- **FR:budget.tokens** (P1): Autonomy MUST escalate a PR whose recorded tokens exceed `tokens`
- **FR:budget.daily** (P1): Autonomy MUST escalate once the repository's Autopilot applies for the UTC day reach `prs-per-day`
- **FR:budget.source** (P1): Autonomy MUST compute every budget from the ledger
  > - @req FR:ledger.@file

### FR:stop: Kill Switch

Repo owner needs one file that halts every autonomous action so that they can stop runaway work in one step.

- **FR:stop.@cli** (P1): Interface: `catalyst autonomy stop [--all]` and `catalyst autonomy resume [--all]`
- **FR:stop.files** (P1): Autonomy MUST halt while a file named `STOP` exists in the repo or scheduler state folder
  - Repo: `.xe/runs/autonomy/STOP` in the main checkout, shared by every worktree. Scheduler: `$CATALYST_SCHEDULE_STATE/STOP`, else `~/.cache/catalyst/schedule/STOP`.
  - Rationale: The scheduler uses the same file, so one STOP halts both.
- **FR:stop.create** (P2): `stop` MUST create the repo STOP file
  - **FR:stop.create.all** (P2): `stop --all` MUST create the scheduler STOP file
- **FR:stop.remove** (P2): `resume` MUST delete the repo STOP file
  - **FR:stop.remove.all** (P2): `resume --all` MUST delete the scheduler STOP file
- **FR:stop.record** (P2): Command MUST write a ledger entry each time a STOP file halts a decision

### FR:ledger: Action Ledger

Repo owner needs a record of every autonomous action so that they can audit what the AI did and why.

- **FR:ledger.@file** (P1): Interface: `.xe/runs/autonomy/ledger.jsonl` in the main checkout, one Ledger entry (@req FR:$ledger-entry) per line
  - **FR:ledger.@file.shared** (P1): Autonomy MUST use one ledger for every worktree of a repository
    - Rationale: Budgets count per repository, not per worktree.
- **FR:ledger.@cli** (P2): Interface: `catalyst autonomy record --pr <n> --action <action> [--detail <text>] [--tokens <n>]`
- **FR:ledger.append** (P1): Autonomy MUST append an entry for each decision, escalation, Autopilot apply, and halt
- **FR:ledger.append-only** (P1): Autonomy MUST NOT rewrite or delete an existing ledger entry
- **FR:ledger.unreadable** (P2): Autonomy MUST skip a ledger line it cannot parse

### FR:audit: PR Audit Trail

PR reviewers need every autonomous change explained on the PR so that the trail lives where the work happened.

- **FR:audit.prefix** (P1): Command MUST start every PR comment it posts with `🤖 [AI]`
- **FR:audit.apply** (P1): Command MUST post one PR comment when it applies Autopilot
  - **FR:audit.apply.config** (P1): Comment MUST name the config file and the commit that turned autonomy on
  - **FR:audit.apply.gates** (P2): Comment MUST say that the Autopilot gates decide the merge

### FR:status: Status and Schedule Gate

Repo owner or scheduler needs the current autonomy state so that unattended runs start only when autonomy may act.

- **FR:status.@cli** (P1): Interface: `catalyst autonomy status` and `catalyst autonomy gate`
- **FR:status.show** (P2): `status` MUST show on or off, config problems, STOP files, and today's budget use
- **FR:status.exit** (P2): `status` MUST exit non-zero when the `autonomy` config is invalid
  > - @req FR:cli-engine/exit.codes
- **FR:status.gate** (P1): `gate` MUST print `run`, or `skip` with a reason, as its last output line
  - Rationale: The scheduler's gate contract reads the first word of the last line.
  - **FR:status.gate.skip** (P1): `gate` MUST print `skip` when autonomy is off, a STOP file exists, or the daily budget is spent

### Non-functional Requirements

**NFR:portable**: Portability

- **NFR:portable.core** (P1): Autonomy core MUST import only Node built-ins and other core autonomy modules
  - Rationale: The core moves to Arc later.
- **NFR:portable.ports** (P1): Autonomy core MUST reach GitHub, the filesystem, and the clock only through ports

**NFR:safety**: Safety

- **NFR:safety.fail-closed** (P1): Autonomy MUST escalate when it cannot read the PR, the diff, or the signed-in user
  - **NFR:safety.fail-closed.files** (P1): Autonomy MUST escalate when it cannot read every changed file
- **NFR:safety.ledger-first** (P1): Command MUST record an Autopilot apply before it posts the audit comment
- **NFR:safety.one-write** (P2): Command MUST make at most one label write and one comment per decision

## Data Model

- **FR:$autonomy-config** (P1): **`autonomy`** — Full autonomy settings in `.xe/config/catalyst.json`
  - `enabled` (boolean) — turns full autonomy on. Default: false
  - `budget` (object?) — per-PR and per-day caps
    - `loop-rounds` (int) — total `pr-loop` rounds per PR. Allowed: 1-20. Default: 5
    - `minutes` (int) — wall-clock minutes from a PR's first ledger entry. Allowed: 1-1440. Default: 120
    - `tokens` (int) — recorded tokens per PR. Allowed: 1-100000000. Default: 2000000
    - `prs-per-day` (int) — Autopilot applies per UTC day. Allowed: 1-1000. Default: 10
  - `escalate` (object?) — triggers that hand a PR back to a person
    - `paths` (string[]) — sensitive path globs, added to the defaults
    - `contract-paths` (string[]) — contract path globs, added to the defaults
    - `max-changed-lines` (int) — added plus deleted lines. Allowed: 1-100000. Default: 600
    - `max-changed-files` (int) — Allowed: 1-10000. Default: 30
    - `max-loop-failures` (int) — non-clean `pr-loop` runs per PR. Allowed: 1-20. Default: 2
- **FR:$decision** (P1): **`Decision`** — One Autopilot decision
  - `decision` (string) — Allowed: `apply`, `escalate`, `off`, `stopped`
  - `pr` (int)
  - `reasons` (object[]) — each with `trigger` (string) and `detail` (string); empty on `apply`
  - `applied` (boolean) — true when the label write happened
- **FR:$ledger-entry** (P1): **`LedgerEntry`** — One autonomous action
  - `at` (string) — ISO 8601 UTC time
  - `pr` (int?) — PR number
  - `action` (string) — e.g., `loop`, `autopilot`, `escalate`, `stopped`, `chain`, `sweep`
  - `detail` (string?) — short reason or summary
  - `rounds` (int?) — `pr-loop` rounds in this entry
  - `tokens` (int?) — tokens spent since the last entry
  - `result` (string?) — `pr-loop` result for `loop` entries

## Architecture Constraints

- Core lives in `src/autonomy/`. Adapters for GitHub (`gh` CLI) and the filesystem live in `src/autonomy/adapters/`. The CLI command in `src/cli/commands/autonomy.ts` wires adapters to the core.
- Decision logic is pure functions over plain data, so the same core runs from the CLI, a playbook, or Arc.

## External Dependencies

- GitHub CLI (`gh`), authenticated as the authoring agent's account
