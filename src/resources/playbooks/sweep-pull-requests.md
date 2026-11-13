# Playbook: Sweep Pull Requests

Works every open PR that involves the user, routed by the user's role in each, then reports only what needs the user. Authored PRs go through the update workflow; PRs awaiting the user's review go through the review workflow.

**CRITICAL**: Autonomous by default. Applies only non-controversial fixes, never approves, and keeps going until nothing dispatchable remains.

## Inputs

- **pr-numbers** (optional) — Limit the sweep to these PRs.
- **scope** (optional) — `update` or `review`, matching the update and review commands. Defaults to both.
- **execution-mode** (optional) — `autonomous` (default) or `interactive`. `interactive` keeps the delegated workflows' own consultation, like the review and update commands.
- **ai-platform** (optional) — AI platform name for comment prefixes. Defaults to "AI".

## Labels

Use the repo's label names, never hardcoded ones. Per label: `labels.names.{id}` in `.xe/config/catalyst.json` if set; else the simple name when `labels.style` is `simple`; else the standard name.

| Id                 | Standard name          | Simple name        |
| ------------------ | ---------------------- | ------------------ |
| `release-blocker`  | `Release: Blocker ⛔`  | `release blocker`  |
| `release-priority` | `Release: Priority ⭐` | `release priority` |
| `release-stretch`  | `Release: Stretch 🍒`  | `release stretch`  |
| `paused`           | `Status: ⏸️ Paused`    | `paused`           |
| `wip`              | `Status: 🚧 WIP`       | `wip`              |

Never create labels. Add or remove only WIP; `npx catalyst pr` sets every other label. When one is missing from the repo, skip the step that uses it:

- **WIP missing:** warn once that parallel agents may overlap, and suggest `npx catalyst init` to sync labels

## Process

### Phase 1: Survey

One read-only pass, no subagents. The user is the current `gh` login (`@me`).

Given `pr-numbers`: skip the search and fetch those PRs. Otherwise list open PRs the user authored or was asked to review:

```bash
gh search prs --state open --author @me -- -label:"{paused}" --json repository,number,title,url,isDraft,labels,updatedAt
gh search prs --state open --review-requested @me --draft=false -- -label:"{paused}" --json repository,number,title,url,labels,updatedAt
```

Per candidate, fetch once: `gh pr view {pr} --json title,url,author,isDraft,reviewDecision,mergeable,mergeStateStatus,statusCheckRollup,headRefOid,isCrossRepository,labels,updatedAt`. Fetch unresolved threads for authored PRs only.

Then drop what the query can't express:

- Draft PRs the user did not author, unless `pr-numbers` names them
- PRs the user already approved

Order the queue by release label: blocker, priority, none, stretch. Within each, reviews before updates, so others get unblocked before the user's own work. Then failing checks and conflicts, then unresolved threads, then longest waiting.

### Phase 2: Claim

Never update a PR another agent is updating.

- **Stale WIP:** remove the WIP label from any PR with no commit in 24 hours and no local or remote session on its worktree (`git worktree list`, open sessions).
- **Filter:** drop any PR with a WIP label this run did not apply. Re-read its labels before starting each PR's pass.
- **Start:** add the WIP label when you start sweeping a PR, and add the PR to this run's own list.
- **Finish:** remove the WIP label when you're done processing the PR, before reconciling it, and also when its pass fails. A leftover WIP label holds the Autopilot merge.

### Phase 3: Work each PR

Work every PR the same way, Autopilot or Blocked or not. Each PR takes exactly one pass, in its own subagent and its own fresh worktree off the PR head (`git fetch` + `git worktree add`). NEVER recycle worktrees/folders! Carry forward only the result summary, never the transcript. Re-run a failed subagent once.

- **User authored it** → Execute @node_modules/@xerilium/catalyst/playbooks/update-pull-request.md (update pass)
- **User reviews it** → Execute @node_modules/@xerilium/catalyst/playbooks/review-pull-request.md (review pass)

In `autonomous` mode, bypass the delegated workflow's consultation and commit approvals.

#### Update pass

Only for PRs with unresolved threads, failing checks, or conflicts.

1. Classify each unresolved thread:
   - Last comment only confirms a fix → resolve
   - The user's own last comment defers to the reviewer, or the last comment carries 🧭 → leave
   - Claims a fix is absent but the pushed head has it → resolve with evidence
   - Root comment carries 🔒 → never resolve or fix; respond only if it asks something actionable, leave unresolved
   - Reviewer request stands unanswered, or class unclear → address (step 2)
2. Verify each reviewer claim against the real code. Valid: implement the best fix, not just the literal suggestion. Wrong: refute in the thread with evidence.
3. Run tests in the **foreground**. Push the fix before resolving its thread.
4. Rebase ONLY when required: the PR needs an already-merged commit to pass its gates (a bug fix, a feature it depends on), or the rebase is the last step before the PR can merge. Never rebase just because the PR is behind or conflicting; that burns tokens rebasing endlessly. Never skip a required rebase when that would leave the action on the author. Rebase onto the base branch and push with `--force-with-lease`. Never merge the base branch in; it shows every merged file as changed in the PR.
5. Failing checks: fix only code the PR touches, unless a human reviewer explicitly asks for a boy-scout fix.
6. Escalate instead of applying anything that changes scope or design, affects customers or system reliability, changes a user interface, user experience, or public API, or changes security or legal posture. Escalate once when a review keeps widening a partly done set of changes. Put it in the report only, never as a PR comment. A reply that hands a question back to the user on an authored PR carries 🧭.

Never discard or overwrite uncommitted work you did not create. If the PR's branch is checked out in another worktree with uncommitted changes, defer the PR.

Stash only in this pass's own worktree, on a PR whose WIP label this run added. Never stash in the main repo folder.

Never approve or merge a PR; `npx catalyst pr` merges Autopilot PRs.

Fork PRs from someone without write access to the repo: never execute their code without confirmation. If no one can answer (an unattended run), treat it as declined: review by reading only, never run the head another way, and report that checks were not run locally.

#### Review pass

Post one `COMMENT` review whose findings are line-level or file-level comments. The body is a short summary and never repeats those comments. Never post findings as PR comments. Never `APPROVE`.

#### Title pass

Part of every PR's one pass, authored or reviewed, even when nothing else needs work. A squash merge makes the PR title a permanent changelog line; nothing after the merge can fix it.

- **User authored it** → run the title step of the update pass (Phase 8 of the update playbook)
- **User reviews it** → run the title check of the review pass (Phase 3 of the review playbook)

#### Reconcile

After a PR's last change (push, reply, or review), and for every other PR in scope: remove this run's WIP label first, then run `npx catalyst pr {pr-number}` to reconcile labels/assignees before the report.

### Phase 4: Report and continue

Publish the report first, then keep going: re-survey (add this run's own list back in), and run Phases 2–3 again for any PR that needs a sweep, including ones that came in during the run. DO NOT STOP while PRs remain to sweep.

- **Checks running on a PR you pushed to:** set a background timer for the repo's usual check time (median duration of its last 10 successful runs from `gh run list`) and re-check when it fires; never block waiting. Still pending after two waits → report it as testing.
- **Stop when:** nothing dispatchable remains for the user, a decision blocks progress, a full pass makes no progress, or 10 iterations pass. Never end with a PR still assigned to the user for something you could do yourself.
- **Escalations:** once all other work is done, ask the user about every escalation in one AUQ pass (@node_modules/@xerilium/catalyst/playbooks/actions/auq.md), in every execution mode. Apply the answers. When no one can answer (an unattended run), leave them in the report only.
- **Permissions:** every command this sweep needs is in the skill's allowed tools. A denial is a sweep failure: finish everything else, then report the exact denied command and the allowed-tools entry that would permit it. Never work around it. Retry a failed bulk `gh` call once as individual per-PR calls.

#### Report format

Refresh any PR whose status is older than 10 minutes before every report. One row per PR, decisions first. Columns: PR, Title, Status, Next action. Link every PR as `[{number}]({url})`, with no `#`, and never mention a PR number without its link. In **Next action**, link each thread awaiting the user's answer.

```markdown
| PR                | Title   | Status   | Next action                      |
| ----------------- | ------- | -------- | -------------------------------- |
| [{number}]({url}) | {title} | {status} | {next action, with thread links} |

{n} PRs still to sweep · {n} in progress
**Gaps:** {each tool, permission, or environment gap once}
```

Statuses: `🧭 Decide` (your call), `👀 Review` (your approval), `⏳ Author` (waiting on the author), `⏳ Testing` (checks running), `✅ Ready` (ready to merge). Omit any line below the table that has nothing to show.

## Error Handling

- **PR not found / auth failure:** report once as a gap, continue with the rest
- **Rebase conflict:** resolve when both sides' intent is clear; if both sides changed the same logic, escalate
- **Test failure unfixable:** stop that PR as blocked, report the failing check
- **Subagent failure:** retry once, then report as blocked

## Success Criteria

- [ ] One read-only survey built the queue; no subagents spent surveying
- [ ] Each PR claimed with WIP, then took exactly one pass by role, in its own fresh worktree and subagent
- [ ] Only non-controversial fixes applied; escalations in the report only
- [ ] Never approved or merged a PR, merged the base branch in, or stashed outside this run's own worktree
- [ ] Every WIP label this run added was removed when its PR was done
- [ ] Every PR in scope was reconciled before the report
- [ ] Escalations asked through AUQ when someone could answer
- [ ] Report published, then the sweep kept going until nothing dispatchable remained
