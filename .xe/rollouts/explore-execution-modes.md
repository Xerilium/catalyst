# Explore: Execution Modes

Draft for review. No specs or code changed. Read from `origin/main` at `7c3cead8`.

**Prompted by**: Michael's review of all execution modes. Question: Do we have the right set of modes, and does each one work well?

## Today

Five modes. The mode list is copied in two places: `src/resources/playbooks/actions/workflow-scope.md:23-28` and `src/resources/playbooks/actions/feature-scope.md:90-94`. The spec is `.xe/features/workflow-context/spec.md:26-71`.

| Mode                | Human gates                          | Branch                | AI commits                  | PR                 |
| ------------------- | ------------------------------------ | --------------------- | --------------------------- | ------------------ |
| `interactive`       | Q&A, scope, spec, plan, final review | Current               | Only if user picks at close | Only if user picks |
| `checkpoint-review` | Scope, spec, plan, final review      | Current               | Only if user picks at close | Only if user picks |
| `spec-review`       | Spec, final review                   | Current               | Only if user picks at close | Only if user picks |
| `final-review`      | Final review                         | Current               | Only if user picks at close | Only if user picks |
| `autonomous`        | None (PR is the review)              | New `xe/{rollout-id}` | After each spec, at close   | Always             |

Facts that drive the answers below:

- Each mode mixes two choices: **when a human reviews** and **where the work lands**. Only `autonomous` lands work on a branch and a PR.
- Rollout plans are gitignored (`.gitignore`: `.xe/rollouts/rollout-*.md`). Only the blueprint rollout is tracked.
- `autonomous` resets a session branch that has commits ahead of the default branch. It calls them "foreign" (`workflow-scope.md:61`).
- The default-mode setting is spec only. All its sub-FRs are `[deferred]` (`workflow-context/spec.md:61-69`). `.xe/config/catalyst.json` has no `execution-mode` key. The [PR 312](https://github.com/Xerilium/catalyst/pull/312) catalog has no mode key.
- PR workflows use a different mode list. `sweep-pull-requests.md:11` takes `autonomous` or `interactive`. `loop-pull-request.md` is always autonomous.

## Answers

### 1. Does spec-review commit the rollout with the specs?

**No.** Spec-review commits nothing (`workflow-context/spec.md:47-51`, "No state-changing git operations"). The rollout is gitignored. The spec gate is a live AUQ in the same session (`feature-spec.md:5`).

Effects:

- The run cannot pause and resume in another session, clone, or worktree. The rollout file stays on one disk.
- Spec feedback cannot come from PR comments. Only the live chat can answer the gate.
- An unattended run (scheduler, [PR 309](https://github.com/Xerilium/catalyst/pull/309)) blocks forever at the gate.

**Recommendation**: Make spec-review a two-session flow when delivery is a PR.

1. After the spec phase, commit the specs, design decisions, and the rollout plan. Force-add the rollout (`git add -f`) on the feature branch only.
2. Push. Open a **draft** PR titled for the feature. Body says "Spec review: plan and code follow after approval."
3. Write Active State (`workflow-state.md`) with `Next: Resume with /catalyst:rollout {rollout-id}`. STOP.
4. On resume, run `pr-update` on the PR first. Apply spec feedback. Then plan, test, and code on the same branch.
5. At close, delete the rollout from the branch (closure already does this, `workflow-closure.md:64`). Mark the PR ready.

Keep today's live gate when delivery is `local` or `none`.

### 2. Split autonomous into autonomous-local and autonomous-branch?

**No.** It doubles the problem, not the fix. The same split is needed for every mode (spec-review needs a PR, final-review may want one). Five modes become ten.

The real bug is `workflow-scope.md:61`. In a worktree with my own earlier commits, `autonomous` resets them as "foreign". Additive work in one branch is not possible today.

### 3. Separate execution style from where the work lands? Auto-pick from worktree?

**Yes, separate them.** Two settings:

- **Mode** (when a human reviews): `interactive`, `checkpoint-review`, `spec-review`, `final-review`, `autonomous`, `autopilot` (new, see Q6).
- **Delivery** (where the work lands): `auto`, `new-branch`, `current-branch`, `local`, `none`.

**Auto-pick, but not from "am I in a worktree" alone.** A worktree can hold a fresh branch, my open PR, or someone else's work. Use branch state:

| State                                                   | `auto` picks                                |
| ------------------------------------------------------- | ------------------------------------------- |
| On the default branch                                   | `new-branch` from `origin/{default}`        |
| On a branch with an open PR I authored                  | `current-branch` (add commits, push)        |
| On a branch with no commits ahead of `origin/{default}` | `current-branch` (fresh worktree)           |
| On a branch with commits ahead and no PR                | Ask. Unattended: `new-branch`. Never reset. |
| On a branch with an open PR I did not author            | `new-branch`. Never push to others' PRs.    |

Delivery meanings:

- `new-branch`: today's `autonomous` path. Branch `xe/{rollout-id}`, PR.
- `current-branch`: commit on this branch, push, open or update its PR. No reset.
- `local`: commit on this branch. No push. No PR.
- `none`: no AI commits. Closure asks (today's gated modes).

Gated modes keep the closure AUQ. The `auto` pick becomes its recommended option.

### 4. Config settings for local vs PR runs?

**Yes.** Add to the [PR 312](https://github.com/Xerilium/catalyst/pull/312) registry. This also fills the gap in `FR:execution-modes.default`.

| Key                          | Type   | Default | Read from    |
| ---------------------------- | ------ | ------- | ------------ |
| `workflows.mode.default`     | string | `ask`   | working tree |
| `workflows.mode.{command}`   | string | unset   | working tree |
| `workflows.delivery.default` | string | `auto`  | working tree |
| `CATALYST_MODE`              | string | empty   | environment  |
| `CATALYST_DELIVERY`          | string | empty   | environment  |

Order: user request, then environment, then command key, then default key, then ask. The environment keys hold personal choices. Repo config holds team choices.

`autopilot` is never valid in config. `catalyst check` must reject it. The repo-wide switch is `autonomy.enabled` ([PR 311](https://github.com/Xerilium/catalyst/pull/311)).

Effect on each mode:

| Mode                | `new-branch` / `current-branch`         | `local`                    | `none`                 |
| ------------------- | --------------------------------------- | -------------------------- | ---------------------- |
| `interactive`       | Commit and PR after final review        | Commit after final review  | Closure asks (today)   |
| `checkpoint-review` | Same as above                           | Same as above              | Same as above          |
| `spec-review`       | Two-session flow (Q1)                   | Live spec gate, commit end | Live spec gate (today) |
| `final-review`      | Commit and PR after final review        | Commit after final review  | Closure asks (today)   |
| `autonomous`        | PR is the review (today, plus no reset) | Commit, no push            | Invalid: no review     |
| `autopilot`         | PR, then loop, Autopilot, sweep (Q6)    | Invalid: needs a PR        | Invalid                |

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

- Trigger: the user names `autopilot` in the request. Never from config, a file, or a PR comment.
- Delivery must be `new-branch` or `current-branch`. Otherwise refuse before scope.
- Keeps all PR 311 guards: escalation paths, never-auto list, budgets, STOP file, ledger, subagent review.
- New CLI flag: `catalyst autonomy autopilot <pr> --run-opt-in`. It skips only the `enabled` check. All other checks still run.
- Ledger and the 🤖 audit comment record `scope: run`, so a reader can tell it from repo-wide autonomy.
- When `autonomy.enabled` is already true, `autonomous` already runs the chain. `autopilot` adds nothing there.

**Risk**: PR 311 puts the human gate in committed config ("an agent can never approve its own wider autonomy"). A per-run opt-in moves the gate back to the chat request. An agent can pass `--run-opt-in` by itself. This is a trust change. Only Michael can accept it.

**Depends on**: PR 311 merged.

### 7. Other findings

- **Naming**: `autonomous` clashes with "full autonomy" (PR 311) and "Autopilot". Keep the name, but define the ladder in one place.
- **Overlap**: `interactive` and `checkpoint-review` have the same gates and git rules. They differ only in clarifying Q&A. Keep both. They are cheap and users pick them.
- **Copies drift**: the mode list and branch steps are in both `workflow-scope.md` and `feature-scope.md`. Make `feature-scope.md` call `workflow-scope.md`.
- **Two mode lists**: sweep takes `autonomous|interactive` only. Fine for PR work. Document it as a separate, smaller list.
- **Default**: every run asks for a mode, because the config key is deferred. Q4 fixes this.
- **Resume**: `workflow-scope.md:59` resumes only when the rollout file exists. Gitignored rollouts do not exist in a new worktree. Q1 (tracked rollout on the branch) fixes this for PR delivery.
- **Unattended runs**: a gated mode in a scheduled run waits forever. Refuse gated modes when no one can answer, unless delivery is a PR (spec-review two-session flow).
- **Bootstrap bug**: the plugin bootstrap (`scripts/bootstrap.js`) added `@xerilium/catalyst` as a dev dependency of the Catalyst repo itself. It must skip the Catalyst repo. Reverted locally; not in this PR.

## Proposed final modes

| Mode                | Trigger                 | Where it runs                             | AI commits                   | PR                                        | Human gates                   |
| ------------------- | ----------------------- | ----------------------------------------- | ---------------------------- | ----------------------------------------- | ----------------------------- |
| `interactive`       | Request, config, or ask | Per delivery                              | At close, per delivery       | Per delivery                              | Q&A, scope, spec, plan, final |
| `checkpoint-review` | Request, config, or ask | Per delivery                              | At close, per delivery       | Per delivery                              | Scope, spec, plan, final      |
| `spec-review`       | Request, config, or ask | Per delivery                              | Specs + rollout at spec gate | Draft PR at spec gate; ready at close     | Spec (live or on PR), final   |
| `final-review`      | Request, config, or ask | Per delivery                              | At close, per delivery       | Per delivery                              | Final                         |
| `autonomous`        | Request, config, or ask | `new-branch` or `current-branch` (`auto`) | Per spec, at close           | Always; loop + Autopilot if repo opted in | PR review                     |
| `autopilot`         | Request only            | `new-branch` or `current-branch` (`auto`) | Per spec, at close           | Always; loop, Autopilot, sweep            | None; escalations only        |

Delivery is a second setting (`auto` default). See Q3.

## Next steps

1. Michael decides the open items below.
2. `/catalyst:change workflow-context`: split mode and delivery; add `auto` delivery rules; remove the foreign-commit reset for `current-branch`; spec-review two-session flow.
3. `/catalyst:change config-settings` (after PR 312): add the mode and delivery keys.
4. `/catalyst:change pull-request-workflow` (after PR 311): add `autopilot` and `--run-opt-in`.
5. `/catalyst:change cli-clean` (after PR 305): sweep worktree removal, then `--apply`.
6. `/catalyst:fix ai-plugin`: bootstrap must skip the Catalyst repo.

## Decisions for Michael

1. Accept per-run `autopilot` opt-in from chat, given PR 311 puts the gate in config?
2. Accept the mode and delivery split (Q3) over a `-local`/`-branch` split (Q2)?
