# Playbook: Reconcile Pull Request

Sets a PR's lifecycle labels and assignees from its live state, so the labels show where it stands and the assignees show who acts next. Merges an Autopilot PR once every gate passes. Every PR workflow runs this after its last change to the PR.

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

Read every review thread with `gh api graphql`, paging until `hasNextPage` is false. For each unresolved thread, read its comment authors and its last comment. Read code owners for the changed files from `CODEOWNERS` (`.github/`, root, or `docs/`).

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
- **Finalized:** never add it. Remove it when the PR is a draft, needs attention, lacks Ready, or its head commit differs from the SHA on the certification comment (`☑️ Finalized at {sha}`).

### Phase 3: Assignees

Set assignees with `gh pr edit {pr} --add-assignee/--remove-assignee`:

- Draft or Needs Attention → the author only
- Ready → the author plus every code owner who hasn't approved
- Blocked → leave unchanged
- Otherwise → every code owner who hasn't approved

### Phase 4: Autopilot merge

Only when the PR carries Autopilot, Finalized, and Ready, carries no Needs Attention, WIP, or Paused, its head commit equals the certified SHA, every thread is resolved, and every check passes.

1. Re-read labels, head commit, and mergeability right before merging: `gh pr view {pr} --json labels,headRefOid,mergeable,mergeStateStatus,state`. Never reuse an earlier value. `MERGED` → done. Any gate now failing → skip.
2. Merge: `gh pr merge {pr} --squash --match-head-commit {sha}`. Never `--admin`; never bypass branch protection.
3. Refused or failed → report the reason and leave the PR as is. Never fail the calling workflow.

## Error Handling

- **Label missing from the repo:** skip that label's step; report it once
- **API errors:** retry once, then report and continue
- **No `CODEOWNERS`:** treat code-owner assignment as empty; keep the author rules

## Success Criteria

- [ ] Labels and assignees match the PR's live state
- [ ] No label created, no paused PR changed, Finalized never added
- [ ] Autopilot PR merged only when every gate held on a fresh read, never bypassing branch protection
- [ ] Running again on an unchanged PR changes nothing
