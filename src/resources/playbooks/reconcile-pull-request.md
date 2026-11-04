# Playbook: Reconcile Pull Request

Sets a PR's lifecycle labels and assignees from its live state, so the labels show where it stands and the assignees show who acts next. Merges an Autopilot PR once every merge gate passes. Every PR workflow runs this after its last change to the PR.

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

Autopilot also matches the variant `Status: Autopilot 🤖`; treat either as the `autopilot` label.

## Process

### Phase 1: Read state

```bash
gh pr view {pr} --json author,isDraft,labels,assignees,headRefOid,latestReviews,statusCheckRollup,mergeable,mergeStateStatus
```

Read every review thread with `gh api graphql`, paging until `hasNextPage` is false. For each unresolved thread, read its comment authors and its last comment. Read code owners for the changed files from `CODEOWNERS` (`.github/`, root, or `docs/`), and note whether the repo has code owners configured (Phase 4, gate 4).

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
- **Ready** when a human reviewer's latest review is `APPROVED` and no reviewer's latest review is `CHANGES_REQUESTED`. Ready and Needs Attention can both apply.
- **Needs Review** when neither Needs Attention nor Ready applies.
- **Finalized:** never add it. Remove it when the PR is a draft, needs attention, lacks Ready while code-owner sign-off is required, or its head commit differs from the SHA on the certification comment (`☑️ Finalized at {sha}`).

### Phase 3: Assignees

Set assignees with `gh pr edit {pr} --add-assignee/--remove-assignee`:

- Draft or Needs Attention → the author only
- Ready → the author plus every code owner who hasn't approved
- Blocked → leave unchanged
- Otherwise → every code owner who hasn't approved

### Phase 4: Merge gates

This is the one merge rule. Every other workflow points here. Check the gates in order; stop at the first one that fails and name it in the refusal.

**Config:** read `pull-requests.merge` from `.xe/config/catalyst.json` on the PR's base branch (`git show origin/{base}:.xe/config/catalyst.json`), never from the PR's head, so a PR can't change its own gates. A missing key uses the default.

```json
{
  "pull-requests": {
    "merge": {
      "never": ["*/finops-hubs", "FinOps-Open-Cost-And-Usage-Spec/*"],
      "approval-waiver-days": { "*/printer": 7 }
    }
  }
}
```

Match each entry as `owner/repo`; `*` stands for any owner or any repository.

| Gate | Stop when                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | The repo matches `never` (default: any repo named `finops-hubs`, any repo in `FinOps-Open-Cost-And-Usage-Spec`). Post no comment.         |
| 2    | Read fresh: `gh pr view {pr} --json labels,headRefOid,latestReviews,mergeable,mergeStateStatus,state,isCrossRepository`. `MERGED` → done. |
| 3    | The PR lacks Autopilot. Post no comment.                                                                                                  |
| 4    | Code owners are configured and Ready is absent (see below).                                                                               |
| 5    | Any review thread is unresolved (page every thread).                                                                                      |
| 6    | Any check on the head commit is pending, failed, cancelled, or skipped while required (see below).                                        |
| 7    | The repo has Playwright tests and they fail, or the run logs a console error or uncaught page error (see below).                          |
| 8    | The repo has `@xerilium/catalyst` installed and `npx catalyst check` prints any error or warning (see below).                             |
| 9    | `mergeStateStatus` is not `CLEAN`.                                                                                                        |

Also stop when the PR lacks Finalized or its head commit differs from the certified SHA (the sweep proves gates 7 and 8 at that SHA and records it), or when it carries WIP, Paused, Blocked, or Needs Attention.

**Gate 4, code owners:** configured means a `CODEOWNERS` file (`.github/`, root, or `docs/`) has at least one owner rule. Not configured → continue; Ready is not required. Configured → Ready (a code owner's approval) must be present, and never bypass it. Waiver: when the repo matches `approval-waiver-days`, the PR is published (not draft), and nobody but the sweep has pushed, reviewed, or commented for that many days (default: any repo named `printer`, 7 days) → continue.

**Gate 6, checks:** read required checks with `gh pr checks {pr} --required`; never guess. Any required check that isn't `pass` (pending, fail, cancelled, skipping) stops the merge. A non-required check stops it only when pending, failed, or cancelled; ignore one that was skipped.

**Gate 7, Playwright:** the repo has Playwright tests when it has a `playwright.config.*` file or a `@playwright/test` dependency. Run them in a fresh worktree of the head commit, in the foreground, with the repo's own test command (a `test:e2e`/`e2e`/`playwright` script in `package.json`, else `npx playwright test`). Any failing test, or any `console.error` or uncaught page error in the output, fails the gate. Run a fork PR's tests only when the sweep's fork rule allows it.

**Gate 8, Catalyst check:** installed means `@xerilium/catalyst` is in `dependencies` or `devDependencies` of `package.json`. Run `npx catalyst check` in the same worktree. Run a fork PR's check only when the sweep's fork rule allows it.

A run outside the sweep has no worktree or no permission to run tests: take gates 7 and 8 from the Finalized certification, and stop when it is missing.

When every gate holds:

1. Re-read labels, head commit, and mergeability right before merging: `gh pr view {pr} --json labels,headRefOid,mergeable,mergeStateStatus,state`. Never reuse an earlier value. Any gate now failing → skip.
2. Merge: `gh pr merge {pr} --squash --match-head-commit {sha}` ({sha} = the head commit just re-read). Never `--admin`; never bypass branch protection.
3. Refused or failed → post the gate and reason as a PR comment (gates 1 and 3 excepted) and leave the PR as is. Never fail the calling workflow.

## Error Handling

- **Label missing from the repo:** skip that label's step; report it once
- **API errors:** retry once, then report and continue
- **No `CODEOWNERS`:** treat code-owner assignment as empty and sign-off as not required; keep the author rules

## Success Criteria

- [ ] Labels and assignees match the PR's live state
- [ ] No label created, no paused PR changed, Finalized never added
- [ ] Autopilot PR merged only when merge gates 1 to 9 held on a fresh read, never bypassing branch protection
- [ ] Running again on an unchanged PR changes nothing
