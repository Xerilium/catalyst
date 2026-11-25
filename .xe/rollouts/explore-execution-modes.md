# Explore: Execution Modes

Draft for review. No specs or code changed. Read from `origin/main` at `7c3cead8`.

**Prompted by**: Michael's review of all execution modes. Question: Do we have the right set of modes, and does each one work well?

## Today

Five modes. The mode list is copied in two places: `src/resources/playbooks/actions/workflow-scope.md:43-47` and `src/resources/playbooks/actions/feature-scope.md:90-94`. The spec is `.xe/features/workflow-context/spec.md:26-71`.

| Mode                | Human gates                          | Branch                | AI commits                  | PR                 |
| ------------------- | ------------------------------------ | --------------------- | --------------------------- | ------------------ |
| `interactive`       | Q&A, scope, spec, plan, final review | Current               | Only if user picks at close | Only if user picks |
| `checkpoint-review` | Scope, spec, plan, final review      | Current               | Only if user picks at close | Only if user picks |
| `spec-review`       | Spec, final review                   | Current               | Only if user picks at close | Only if user picks |
| `final-review`      | Final review                         | Current               | Only if user picks at close | Only if user picks |
| `autonomous`        | None (PR is the review)              | New `xe/{rollout-id}` | After each spec, at close   | Always             |

Facts that drive the answers below:

- Each mode mixes two choices: **when a human reviews** and **where the work lands**. Gated modes can open a PR at closure, but only when the user picks it (`workflow-closure.md:31,52`). Only `autonomous` opens a PR without asking.
- Rollout plans are gitignored (`.gitignore`: `.xe/rollouts/rollout-*.md`). Only the blueprint rollout is tracked.
- `autonomous` resets a session branch that has commits ahead of the default branch. It calls them "foreign" (`workflow-scope.md:61`, copied at `feature-scope.md:109`). Closure removes them again before the PR (`workflow-closure.md:53-63`).
- The default-mode setting is spec only. All its sub-FRs are `[deferred]` (`workflow-context/spec.md:61-69`). `.xe/config/catalyst.json` has no `execution-mode` key. The [PR 312](https://github.com/Xerilium/catalyst/pull/312) catalog has no mode key.
- PR workflows use a different mode list. `sweep-pull-requests.md:11` takes `autonomous` or `interactive`. `loop-pull-request.md` is always autonomous.

## Answers

### 1. Does spec-review commit the rollout with the specs?

**No.** Spec-review commits nothing (`workflow-context/spec.md:47-51`, "No state-changing git operations"). The rollout is gitignored. The spec gate is a live AUQ in the same session (`feature-spec.md:5`).

Effects:

- The run cannot pause and resume in another session, clone, or worktree. The rollout file stays on one disk.
- Spec feedback cannot come from PR comments. Only the live chat can answer the gate.
- An unattended run (scheduler, [PR 309](https://github.com/Xerilium/catalyst/pull/309)) blocks forever at the gate. It also blocks at the final review, a live STOP in every gated mode (`workflow-review.md:54-58`).

**Recommendation**: Make spec-review a two-session flow when delivery is a PR.

1. After the spec phase, commit the specs, design decisions, and the rollout plan. Force-add the rollout (`git add -f`) on the feature branch only. This changes closure, which says "never commit" the rollout (`workflow-closure.md:42,46`).
2. Push. Open a **draft** PR titled for the feature. Body says "Spec review: plan and code follow after approval."
3. Write Active State (`workflow-state.md`) with `Next: Resume with /catalyst:rollout {rollout-id}`. STOP.
4. On resume, run `pr-update` on the PR first. Apply spec feedback. Then plan, test, and code on the same branch.
5. At close, run closure before review, as `autonomous` does (`feature-complete.md` step 3). Remove the rollout with `git rm` and commit the removal. Today closure only runs `rm` (`workflow-closure.md:64`), which leaves a tracked file in the PR. Mark the PR ready. The PR is the final review, so no live STOP remains.

Keep today's live gate when delivery is `local` or `none`.

### 2. Split autonomous into autonomous-local and autonomous-branch?

**No.** It adds modes but does not fix the cause. The same split is needed for every mode (spec-review needs a PR, final-review may want one). Five modes become ten.

The real bug is three foreign-commit resets: `workflow-scope.md:61` and `feature-scope.md:109` at scope, and `workflow-closure.md:53-63` before the PR. Resumed rollouts keep their commits (`workflow-scope.md:59`, `workflow-closure.md:57`). But a new rollout in a worktree with my own earlier commits drops them. Additive work from a new rollout is not possible today. `current-branch` must skip all three.

### 3. Separate execution style from where the work lands? Auto-pick from worktree?

**Yes, separate them.** Two settings:

- **Mode** (when a human reviews): `interactive`, `checkpoint-review`, `spec-review`, `final-review`, `autonomous`, `autopilot` (new, see Q6).
- **Delivery** (where the work lands): `auto`, `new-branch`, `current-branch`, `local`, `none`.

**Auto-pick, but not from "am I in a worktree" alone.** A worktree can hold a fresh branch, my open PR, or someone else's work. Use branch state. First match wins:

| State                                                   | `auto` picks                                  |
| ------------------------------------------------------- | --------------------------------------------- |
| On the default branch                                   | `new-branch` from `origin/{default}`          |
| On `xe/{rollout-id}` (resumed rollout, PR or not)       | `current-branch` (add commits, push)          |
| On another branch with an open PR I authored            | Ask. Unattended: `new-branch`.                |
| On a branch with no commits ahead of `origin/{default}` | `current-branch`; rename to `xe/{rollout-id}` |
| On a branch with commits ahead and no PR                | Ask. Unattended: `new-branch`. Never reset.   |
| On a branch with an open PR I did not author            | `new-branch`. Never push to others' PRs.      |

Delivery meanings:

- `new-branch`: today's `autonomous` path. Branch `xe/{rollout-id}`, PR.
- `current-branch`: commit on this branch, push, open or update its PR. No reset.
- `local`: commit on this branch. No push. No PR.
- `none`: no AI commits. Closure asks (today's gated modes).

Gated modes ask at closure when delivery is `auto` or `none`. The `auto` pick becomes the recommended option. An explicit value (`new-branch`, `current-branch`, `local`) skips the ask.

### 4. Config settings for local vs PR runs?

**Yes.** Add to the [PR 312](https://github.com/Xerilium/catalyst/pull/312) registry. This also fills the gap in `FR:execution-modes.default`.

| Key                       | Type   | Default | Read from    |
| ------------------------- | ------ | ------- | ------------ |
| `execution-mode`          | object | `{}`    | working tree |
| `delivery`                | object | `{}`    | working tree |
| `CATALYST_EXECUTION_MODE` | string | empty   | environment  |
| `CATALYST_DELIVERY`       | string | empty   | environment  |

Each object holds a `default` key and optional command keys (for example `{ "default": "spec-review", "pr-sweep": "autonomous" }`). One object key fits the PR 312 fixed catalog, which rejects unknown keys (`FR:lookup.unknown`). It keeps the spec name `execution-mode` (`FR:execution-modes.default`). Unset means `ask` for mode and `auto` for delivery.

Order: user request, then environment, then command key, then `default`, then ask. The environment keys hold personal choices. Repo config holds team choices. This is an exception to PR 312, which ranks outside sources below the repo file. The exception must be stated in the `config-settings` spec. When a command does not accept the chosen mode (for example `pr-sweep` takes only `autonomous` or `interactive`), it skips that source and reads the next one.

`autopilot` is never valid in config or in `CATALYST_EXECUTION_MODE`. `catalyst check` rejects it in config. Workflows ignore it in the environment and warn. The repo-wide switch is `autonomy.enabled` ([PR 311](https://github.com/Xerilium/catalyst/pull/311)).

Effect on each mode:

| Mode                | `new-branch` / `current-branch`         | `local`                    | `none`                                                    |
| ------------------- | --------------------------------------- | -------------------------- | --------------------------------------------------------- |
| `interactive`       | Commit and PR after final review        | Commit after final review  | Closure asks (today)                                      |
| `checkpoint-review` | Same as above                           | Same as above              | Same as above                                             |
| `spec-review`       | Two-session flow (Q1)                   | Live spec gate, commit end | Live spec gate (today)                                    |
| `final-review`      | Commit and PR after final review        | Commit after final review  | Closure asks (today)                                      |
| `autonomous`        | PR is the review (today, plus no reset) | Commit, no push            | Invalid: closure skips the ask (`workflow-closure.md:25`) |
| `autopilot`         | PR, then loop, Autopilot, sweep (Q6)    | Invalid: needs a PR        | Invalid                                                   |

### 5. Are branches and worktrees cleaned after merge?

**Remote branches: yes, by GitHub.** The merge action leaves it to the repo setting (`FR:github-pr-merge.delete-branch`, `.xe/features/playbook-actions-git/spec.md:268`). Catalyst has `delete_branch_on_merge: true`. Repos without it keep stale remote branches.

**Local branches: no.** No playbook deletes them. Squash merges also make `git branch -d` fail, so a PR-state check is needed.

**Worktrees: no.** Only `pr-gates` removes its own temp worktree (`pr-gates-action.ts:436`). The sweep makes a new worktree for every pass and never reuses one (`pull-request-workflow/spec.md:291-293`). It never removes them. Evidence: about 60 worktrees sit in `~/dev/catalyst.worktrees/` today.

**The clean action**: [PR 305](https://github.com/Xerilium/catalyst/pull/305) (draft) adds `catalyst clean`. It is read-only. `--apply` fails. Its own body lists what is missing: sessions, branch prune, and delete-branch-on-merge.

**Missing, in order of value:**

1. **Sweep removes its own pass worktree** at the end of each pass. It made the worktree, so this is safe. This stops most of the growth.
2. **`catalyst clean --apply`** for safe candidates only (PR merged or closed, clean, nothing unpushed). Also delete the local branch and run `git fetch --prune`.
3. **Closure and Autopilot merge hook**: after a merge, run clean for that one branch.
4. **`catalyst init` checks `delete_branch_on_merge`** and offers to turn it on. This is a settings change, so it must ask.

### 6. New mode: auto-autopilot

**Yes, but name it `autopilot`.** "auto-autopilot" repeats itself. The name ladder then reads in order of trust: `interactive` → `checkpoint-review` → `spec-review` → `final-review` → `autonomous` → `autopilot`.

**What it does**: same as `autonomous`, then runs the [PR 311](https://github.com/Xerilium/catalyst/pull/311) chain (`autonomy-chain.md`) on this run's PR only. Loop to clean, `catalyst autonomy autopilot`, then sweep. Gates still decide the merge.

**Spec:**

- Trigger: the user names `autopilot` in the request. Never from config, the environment, a file, or a PR comment.
- Delivery must be `new-branch` or `current-branch`. Otherwise refuse before scope.
- Keeps all PR 311 guards: escalation paths, never-auto list, budgets, STOP file, ledger, subagent review.
- New CLI flag: `catalyst autonomy autopilot <pr> --run-opt-in`. It skips only the `enabled` check. All other checks still run. `autonomy-chain.md` step 1 and closure step 6 must also take the opt-in; today step 1 stops the chain when `enabled` is false.
- Ledger and the 🤖 audit comment record `scope: run`, so a reader can tell it from repo-wide autonomy.
- When `autonomy.enabled` is already true, closure runs the chain on every PR it opens, in any mode (`workflow-closure.md` step 6 in PR 311). `autopilot` adds nothing there.

**Risk**: PR 311 puts the human gate in committed config ("an agent can never approve its own wider autonomy"). A per-run opt-in moves the gate back to the chat request. An agent can pass `--run-opt-in` by itself. This is a trust change. Only Michael can accept it.

Options:

1. **Chat opt-in** (as above): simple; trusts the agent to pass the flag only when asked.
2. **Person-only grant**: `catalyst autonomy grant <pr>` asks for a yes on a TTY. Safer, but not proof: an agent can fake a TTY (`script`, `expect`) and shares the account. A real person-only gate needs a GitHub action by a human, such as a label or an approving review.
3. **No per-run mode**: a person adds the Autopilot label by hand, as today.

**Depends on**: PR 311 merged.

### 7. Other findings

- **Naming**: `autonomous` clashes with "full autonomy" (PR 311) and "Autopilot". Keep the name, but define the ladder in one place.
- **Overlap**: `interactive` and `checkpoint-review` have the same gates and git rules. They differ only in clarifying Q&A. Keep both. They are cheap and users pick them.
- **Copies drift**: the mode list and branch steps are in both `workflow-scope.md` and `feature-scope.md`. Make `feature-scope.md` call `workflow-scope.md`.
- **Two mode lists**: sweep takes `autonomous|interactive` only. Fine for PR work. Document it as a separate, smaller list.
- **Default**: every run asks for a mode, because the config key is deferred. Q4 fixes this.
- **Resume**: `workflow-scope.md:59` resumes only when the rollout file exists. Gitignored rollouts do not exist in a new worktree. Q1 (tracked rollout on the branch) fixes this for PR delivery.
- **Unattended runs**: a gated mode in a scheduled run waits forever. Refuse gated modes when no one can answer. Only exception: `spec-review` with PR delivery (two-session flow).
- **Bootstrap bug**: the plugin bootstrap (`src/ai/plugin/bootstrap.ts`) adds `@xerilium/catalyst` as a dev dependency of the Catalyst repo itself. It must skip the Catalyst repo. Track it in an issue.

## Proposed final modes

| Mode                | Trigger                 | Where it runs                              | AI commits                                                | PR                                                                     | Human gates                                     |
| ------------------- | ----------------------- | ------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| `interactive`       | Request, config, or ask | Per delivery                               | At close, per delivery                                    | Per delivery                                                           | Q&A, scope, spec, plan, final                   |
| `checkpoint-review` | Request, config, or ask | Per delivery                               | At close, per delivery                                    | Per delivery                                                           | Scope, spec, plan, final                        |
| `spec-review`       | Request, config, or ask | Per delivery                               | PR delivery: specs + rollout at spec gate. Else: at close | PR delivery: draft PR at spec gate, ready at close. Else: per delivery | PR delivery: spec on PR. Else: spec live, final |
| `final-review`      | Request, config, or ask | Per delivery                               | At close, per delivery                                    | Per delivery                                                           | Final                                           |
| `autonomous`        | Request, config, or ask | `new-branch`, `current-branch`, or `local` | Per spec, at close                                        | Unless `local`                                                         | PR review (`local`: commits)                    |
| `autopilot`         | Request only            | `new-branch` or `current-branch` (`auto`)  | Per spec, at close                                        | Always; loop, Autopilot, sweep                                         | None; escalations only                          |

Delivery is a second setting (`auto` default). See Q3. When `autonomy.enabled` is true, every PR that closure opens runs the PR 311 chain, in any mode.

## Next steps

1. Michael decides the open items below.
2. `/catalyst:change workflow-context`: split mode and delivery; add `auto` delivery rules; remove the foreign-commit reset for `current-branch`; spec-review two-session flow.
3. `/catalyst:change config-settings` (after PR 312): add the mode and delivery keys.
4. `/catalyst:change pull-request-workflow` (after PR 311): add `autopilot` and `--run-opt-in`.
5. `/catalyst:change cli-clean` (after PR 305): sweep worktree removal, then `--apply`.
6. `/catalyst:fix ai-plugin`: bootstrap must skip the Catalyst repo.

## Decisions for Michael

1. Per-run `autopilot`: chat opt-in, person-only grant, or none (Q6 options)?
2. Accept the mode and delivery split (Q3) over a `-local`/`-branch` split (Q2)?
