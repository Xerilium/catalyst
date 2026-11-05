# Playbook: Reconcile Pull Request

Sets a PR's lifecycle labels and assignees from its live state, so the labels show where it stands and the assignees show who acts next. Certifies and merges an Autopilot PR once every merge gate holds. This playbook is the only place lifecycle labels are applied. Every PR workflow runs it after its last change to the PR.

## Inputs

- **pr-number** (required) — GitHub PR number to reconcile.

## Labels

Use the repo's label names, never hardcoded ones. Per label: `labels.names.{id}` in `.xe/config/catalyst.json` if set; else the simple name when `labels.style` is `simple`; else the standard name. Never create labels; skip any step whose label is missing from the repo.

| Id                | Standard name          | Simple name       |
| ----------------- | ---------------------- | ----------------- |
| `autopilot`       | `Status: 🤖 Autopilot` | `autopilot`       |
| `blocked`         | `Status: ⛔ Blocked`   | `blocked`         |
| `finalized`       | `Status: ☑️ Finalized` | `finalized`       |
| `needs-attention` | `Needs: Attention 👋`  | `needs attention` |
| `needs-review`    | `Needs: Review 👀`     | `needs review`    |
| `paused`          | `Status: ⏸️ Paused`    | `paused`          |
| `ready`           | `Status: ✅ Ready`     | `ready`           |
| `wip`             | `Status: 🚧 WIP`       | `wip`             |

## Process

### Phase 1: Read state

```bash
gh pr view {pr} --json author,isDraft,labels,assignees,headRefOid,latestReviews,statusCheckRollup,mergeable,mergeStateStatus
```

Read every review thread with `gh api graphql`, paging until `hasNextPage` is false. For each unresolved thread, read its comment authors and its last comment. Read code owners for the changed files from `CODEOWNERS` (`.github/`, root, or `docs/`), and note whether the repo has code owners configured (see the code-owner gate in Phase 4).

**Paused PR:** stop. Change nothing.

### Phase 2: Labels

Compute the target, then add and remove only the differences with `gh pr edit {pr} --add-label/--remove-label`.

- **Draft:** remove Needs Review, Needs Attention, Ready, and Finalized. Skip the rest of this phase.
- **Needs Attention** when any of these is true:
  - An unresolved thread's last comment is not from the PR author
  - Every comment in an unresolved thread is from the PR author (a self-note nobody answered)
  - An unresolved thread's last comment carries 🧭
  - A check on the head commit failed (latest run per check; skipped, cancelled, and pending runs don't count)
  - Never for a merge conflict alone
- **Ready** shows code-owner sign-off, whether or not Needs Attention applies. Apply it when no reviewer's latest review is `CHANGES_REQUESTED` and the approver's latest review is `APPROVED`. The approver is a code owner when code owners are configured, otherwise any human reviewer.
- **Needs Review** when neither Needs Attention nor Ready applies.
- **Finalized:** remove it when the PR is a draft, needs attention, lacks Ready while code-owner sign-off is required, or its head commit differs from the SHA on the certification comment (`☑️ Finalized at {sha}`). Apply it only in Phase 4.

### Phase 3: Assignees

Set assignees with `gh pr edit {pr} --add-assignee/--remove-assignee`:

- Draft or Needs Attention → the author only
- Ready → the author plus every code owner who hasn't approved
- Blocked → leave unchanged
- Otherwise → every code owner who hasn't approved

### Phase 4: Merge gates

The gates below are the one merge rule. Every other workflow points here. A PR merges only when every gate holds. Check the gates in the order listed and stop at the first one that fails.

**Config:** read the lists below from `pull-requests.merge` in `.xe/config/catalyst.json` on the PR's base branch (`git show origin/{base}:.xe/config/catalyst.json`), never from the PR's head, so a PR can't change its own gates. A missing list is empty: no repo is excluded and no sign-off is waived. A missing `strictCheck` is `false`.

```json
{
  "pull-requests": {
    "merge": {
      "never": ["owner/repo", "other-owner/*"],
      "approval-waiver-days": { "owner/repo": 7 },
      "strictCheck": false
    }
  }
}
```

Match each entry as `owner/repo`; `*` stands for any owner or any repository.

| Gate           | The PR merges only when                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Excluded       | The repo does not match `never`. Post no comment.                                                                                         |
| Fresh read     | Read fresh: `gh pr view {pr} --json labels,headRefOid,latestReviews,mergeable,mergeStateStatus,state,isCrossRepository`. `MERGED` → done. |
| Autopilot      | The PR carries Autopilot. Post no comment.                                                                                                |
| Code owner     | Code owners are not configured, or Ready is present (see below).                                                                          |
| Threads        | Every review thread is resolved (page every thread).                                                                                      |
| Checks         | No check on the head commit is pending, failed, cancelled, or skipped while required (see below).                                         |
| Playwright     | The repo has no Playwright tests, or they pass with no console error or uncaught page error (see below).                                  |
| Catalyst check | The repo has no `@xerilium/catalyst` install, or `npx catalyst check` prints no error (see below).                                        |
| Clean          | `mergeStateStatus` is `CLEAN`.                                                                                                            |
| Finalized      | The PR carries Finalized and its head commit equals the certified SHA. See Certify.                                                       |
| Not in flight  | The PR carries none of WIP, Paused, Blocked, or Needs Attention.                                                                          |

**Code owner:** configured means a `CODEOWNERS` file (`.github/`, root, or `docs/`) has at least one owner rule. Not configured → continue; Ready is not required. Configured → Ready (a code owner's approval) must be present, and never bypass it. Waiver: when the repo matches `approval-waiver-days`, the PR is published (not draft), and nobody but the sweep has pushed, reviewed, or commented for that many days → continue.

**Checks:** read required checks with `gh pr checks {pr} --required`; never guess. Any required check that isn't `pass` (pending, fail, cancelled, skipping) stops the merge. A non-required check stops it only when pending, failed, or cancelled; ignore one that was skipped.

**Playwright:** the repo has Playwright tests when it has a `playwright.config.*` file or a `@playwright/test` dependency. Run them in a fresh worktree of the head commit, in the foreground, with the repo's own test command (a `test:e2e`/`e2e`/`playwright` script in `package.json`, else `npx playwright test`). Any failing test, or any `console.error` or uncaught page error in the output, fails the gate. Run a fork PR's tests only when the sweep's fork rule allows it.

**Catalyst check:** installed means `@xerilium/catalyst` is in `dependencies` or `devDependencies` of `package.json`. Run `npx catalyst check` in the same worktree. Any error fails the gate. A warning fails it only when `strictCheck` is `true`. Run a fork PR's check only when the sweep's fork rule allows it.

**Certify:** when every gate above holds except Finalized, apply Finalized and, in the same step, create or update one PR comment `☑️ Finalized at {sha}` (edit it in place; never post a second). The two test gates run here, in the worktree. When this run can't run the tests or the check the repo has (no worktree or no permission), don't certify.

**Finalized gate:** take the Playwright and Catalyst check results from the certification at the same head commit; never run them again for the merge.

When every gate holds:

1. Re-read labels, head commit, and mergeability right before merging: `gh pr view {pr} --json labels,headRefOid,mergeable,mergeStateStatus,state`. Never reuse an earlier value. Any gate now failing → skip.
2. Merge: `gh pr merge {pr} --squash --match-head-commit {sha}` ({sha} = the head commit just re-read). Never `--admin`; never bypass branch protection.
3. Refused or failed → post the failed gate and reason as a PR comment (the Excluded and Autopilot gates excepted) and leave the PR as is. Never fail the calling workflow.

## Error Handling

- **Label missing from the repo:** skip that label's step; report it once. Never merge when Autopilot, Finalized, or (with code owners configured) Ready is missing from the repo.
- **API errors:** retry once, then report and continue
- **No `CODEOWNERS`:** treat code-owner assignment as empty and sign-off as not required; keep the author rules

## Success Criteria

- [ ] Labels and assignees match the PR's live state
- [ ] No label created, no paused PR changed, Finalized applied only here
- [ ] Autopilot PR merged only when every merge gate held on a fresh read, never bypassing branch protection
- [ ] Running again on an unchanged PR changes nothing
