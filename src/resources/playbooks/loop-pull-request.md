# Playbook: Loop Pull Request

Runs autonomous review→update rounds against a PR until no significant findings remain, then reports one consolidated recap. Review runs in a subagent; update runs in the primary agent.

**CRITICAL**: This playbook runs unsupervised. It MUST NOT run indefinitely — every round MUST evaluate the exit conditions in Phase 3 before starting the next one. It applies only non-controversial or quality/usability-improving changes; anything risky or unclear gets a comment and a flag, deferred to a single end-of-loop AUQ (Phase 4).

## Inputs

- **pr-number** (optional) — GitHub PR number to loop. If omitted, resolved via Phase 0.
- **max-rounds** (optional) — Maximum review→update iterations. Defaults to 3.
- **ai-platform** (optional) — AI platform name for comment prefixes. Defaults to "AI".

## Process

### Phase 0: Resolve PR Number

If `pr-number` known, go to Phase 1

1. Check session context for PR
2. If no context → query your 4 most recent open PRs:

   ```bash
   gh pr list --author @me --state open --limit 4 --json number,title,headRefName
   ```

   Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to ask "Which PR to loop?", list each (number, title)
   If none, ask user for PR number

Resolving the PR is the one interactive step — everything after Phase 1 runs without prompting.

### Phase 1: Setup

1. **Verify PR:** `gh pr view {pr-number} --json number,title,body,state,baseRefName,headRefName,url`
2. **Check for uncommitted changes** — if present, STOP and ask the user. The loop commits and pushes on the PR branch; it MUST NOT discard or absorb unrelated work.
3. **Check out PR branch:** `gh pr checkout {pr-number}` — verify with `git branch --show-current` that it matches the PR's `headRefName`. If not, stop and ask the user.
4. **Initialize round ledger** — track per round: findings by severity, changes applied, items flagged for review, tests run. The ledger feeds Phases 4–5 and MUST persist across all rounds.
5. **Create tracking todo list** — one entry per round, plus the end-of-loop consultation and summary.

### Phase 2: Round Loop

Repeat until an exit condition in Phase 3 fires. Each round is a review step followed by an update step.

#### Step A: Review (subagent)

Dispatch @node_modules/@xerilium/catalyst/playbooks/review-pull-request.md to a **subagent** with `pr-number` and `ai-platform`. A fresh subagent per round keeps the review unbiased — it evaluates the PR as it stands, without inheriting the update step's reasoning about why a change was made.

Instruct the subagent to run **autonomously**: skip the Phase 5 user-consultation AUQ entirely and post all findings it would have proposed, as if every group were approved. It still posts exactly one cohesive review and still makes no code changes.

The subagent MUST return structured counts to the primary agent: blockers, should-fix, and suggestions, each with file:line and a one-line description. It MUST also mark each should-fix as **material** (a real correctness, safety, maintainability, or coverage gap) or **polish** (stylistic nits, optional refactors, subjective preferences) — the loop uses this to detect diminishing returns.

If the review reports zero blockers and zero material should-fix, do not run Step B — go to Phase 3.

#### Step B: Update (primary agent)

Execute @node_modules/@xerilium/catalyst/playbooks/update-pull-request.md in the **primary agent**, which holds the ledger and round history needed for the final summary.

Run it **autonomously**: bypass the update workflow's Phase 4 user-consultation AUQ and decide in place of the user, subject to these boundaries:

- **Non-controversial fixes, and changes that improve quality or usability** — apply without prompting (routine fixes, clear bugs, targeted improvements)
- **Controversial recommendations, or ones whose correctness is unclear** — do NOT apply. Post a reply describing the risk, and flag the item in the ledger for end-of-loop review. Deferring is the default whenever the AI is uncertain — never guess and apply.
- **Commit and push** — proceed without the update workflow's Phase 7 approval gate, since the loop caller has authorized unsupervised operation for this PR branch

Validation is not optional: tests MUST pass before the round closes. If tests fail and cannot be fixed, exit via `blocked`.

Record changes applied, replies posted, and items flagged in the ledger, then evaluate Phase 3.

### Phase 3: Exit Conditions

Evaluate after every round, in order. The first match ends the round loop. Use the plain-language reason in the summary, not a code.

- ✅ **All findings resolved** — the review round found no blockers and no material should-fix findings
- 📉 **Diminishing returns** — a round applied changes but its findings are now only polish (no blockers, no material should-fix), OR two consecutive rounds surfaced only newly-invented should-fix items without resolving pre-existing ones. The significant work is done; further rounds would chase nits
- 🚧 **Blocked, needs you** — a step failed, a merge conflict appeared, or a test failure couldn't be fixed
- 🔁 **Stopped making progress** — the round resolved no findings and changed nothing, so more rounds won't help
- ⏱️ **Hit the round limit** — reached `max-rounds` with findings still outstanding

Polish-only should-fix, suggestions, and flagged items never keep the loop running — they are advisory or handled in Phase 4. Waiting on them would prevent the loop from converging and burn rounds on low-value churn.

When blocked, stop immediately and surface the reason to the user; do not start another round. Merge conflicts MUST NOT be resolved by force push.

### Phase 4: Consult on Flagged Items

Skip if nothing was flagged. Otherwise, now that autonomous rounds are done, execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md **once** to present every flagged item together for a decision. This is the only interactive gate after Phase 0 — it fires at the end, not mid-round, so the user reviews all judgment calls in a single pass.

Each flagged item MUST name what the AI was uncertain about or disagreed with, its recommendation, and the risk of applying vs. deferring. Apply the user's decisions, post replies, then re-validate tests.

### Phase 5: Summary

Report to the console — **TLDR, not verbose**. This is the deliverable the user reads instead of per-round prompts.

```markdown
## PR #{pr-number} loop complete — {plain-language stop reason}

**Rounds:** {n} of {limit}

**Per round:** {one line each — Round N: 🚫 {n}→{resolved} · ⚠️ {n}→{resolved} · 💡 {n}}

**Overall:**

- Feedback applied: {count}
- Bugs fixed: {count}
- Improvements made: {count}

**Flagged / unresolved:** {count} — {one line, or "none"}. Stopped because {plain-language stop reason}.
```

## CLI Reference

| Command                                                     | Purpose                               |
| ----------------------------------------------------------- | ------------------------------------- |
| `gh pr list --author @me --state open --limit 4 --json ...` | List your recent open PRs (discovery) |
| `gh pr view {pr} --json ...`                                | PR details                            |
| `gh pr checkout {pr}`                                       | Check out PR branch                   |
| `git branch --show-current`                                 | Verify checked-out branch             |

## Error Handling

- **PR not found:** Verify PR number and `gh` CLI authentication
- **Uncommitted changes:** Stop before round 1; never stash or discard user work
- **Merge conflicts:** Stop as "blocked, needs you" and notify user; do not force push
- **Subagent review failure:** Retry the round once; if it fails again, stop as "blocked, needs you"
- **Test failures:** Fix within the round; if unfixable, stop as "blocked, needs you" with the failing output
- **Non-converging loop:** the "stopped making progress" exit prevents repeated rounds that change nothing

## Success Criteria

- [ ] PR verified and branch checked out before round 1
- [ ] Each round ran review in a subagent and update in the primary agent
- [ ] Rounds ran autonomously; only non-controversial or quality/usability-improving changes applied
- [ ] Controversial or unclear items commented and flagged, not applied
- [ ] Exit conditions evaluated after every round
- [ ] Loop stopped on all-resolved, diminishing-returns, blocked, no-progress, or round-limit — never ran unbounded or chased nits
- [ ] Flagged items presented to the user in a single end-of-loop AUQ
- [ ] Tests passed before each round closed
- [ ] Summary is TLDR: per-round recap plus aggregate feedback applied, bugs fixed, improvements made, with flagged/unresolved and stop reason
