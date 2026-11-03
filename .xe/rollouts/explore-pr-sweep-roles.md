# Explore: PR Sweep Roles (Reporter, Orchestrator, Sweepers)

Draft for review. No specs or code changed.

**Prompted by**: Michael's PR-sweep redesign. The sweep failed daily (see [todo 98](https://github.com/flanakin/todo/pull/98)): one long chat session held all state, delivery waited on PRs that never finish, and rules drifted across copies. Question: What is the smallest design where agents do all PR work and the human sees only what needs a human?

**Sources found**: No standalone process doc exists yet. The design is spread over the sources below. This doc is the first single write-up. It builds on them and does not repeat them.

| Source                                                                                                                                | What it holds                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Michael's sweep-design notes (Nov 3)                                                                                                  | The three roles, merge rule, FH exception, "orchestrators never work", scripted playbooks, blocker-only human output       |
| [todo 98](https://github.com/flanakin/todo/pull/98) (open)                                                                            | Diagnosis of 5 failures. Interim fix: one Autopilot section, state in files, deliver on worker report or 30 min            |
| `flanakin/todo` `.claude/commands/sweep*.md`, `.stack/pr-sweep-state.md`, `.stack/cos-charter.md`, `scripts/Invoke-SweepPipeline.ps1` | Today's manager, 7 worker files, report format, state file, pwsh headless pipeline with a no-AI `updatedAt` gate           |
| [Catalyst 133](https://github.com/Xerilium/catalyst/pull/133) (merged)                                                                | `/catalyst:pr-sweep`: one agent surveys, claims, passes per PR, reconciles, reports                                        |
| [Catalyst 193](https://github.com/Xerilium/catalyst/pull/193) (open)                                                                  | One FR per rule. Removes `Finalized` and head-SHA certify from the Catalyst workflow. Gates: label, checks, owner, threads |
| [Catalyst 212](https://github.com/Xerilium/catalyst/pull/212) (open draft)                                                            | Hook points `certify`, `after-pass`, `reconcile` for per-repo customization                                                |
| [Prime 4](https://github.com/Xerilium/prime/pull/4) (open)                                                                            | Scripted `gather` → `classify` → `render` sweep with one batched AI triage call. 95-98% fewer tokens than a worker run     |

## Problem

1. **State lives in chat.** The manager is one long session. Compaction loses facts. Restarts lose the run.
2. **Delivery waits on the wrong thing.** The table ships only when every PR is terminal. FH never is. The human hears nothing.
3. **Orchestrators do work.** Managers survey, judge, and act. They spend tokens and fail in ways workers cannot recover from.
4. **The human sees too much.** Status tables list running, waiting, and parked PRs. Only blockers need him.
5. **Rules drift.** Autopilot and merge rules are copied across worker files and contradict each other.
6. **Sweep scope is tied to Autopilot.** Non-Autopilot PRs that need an answer are skipped.
7. **Catalyst's sweep is one agent.** It surveys, works, and asks in one loop (133 Phase 4 asks every escalation in one AskUserQuestion pass at the end). It does not scale across repos and it blocks on the human.

## Design in one paragraph

Three roles with one shared file. The Reporter (PRR) talks to the human. The Orchestrator (PRO) starts and tracks workers. Sweepers (PRS) do the PR work. Roles talk through an append-only ledger file, never through chat. PRR and PRO keep no context: each restart reads the ledger and continues. Only PRS keep context, because only they do PR work.

## Roles

| Role                      | Does                                                                                                                                            | Never does                                                 | Context          | AI?                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------- | ------------------------------------- |
| **PR Reporter (PRR)**     | Reads blockers. Starts a sweep through PRO. Watches the ledger. Resolves blockers with the human. Writes answers to the ledger. Renders reports | Fix, review, merge, or judge a PR. Poll PRs                | None, from files | Thin: only for the human conversation |
| **PR Orchestrator (PRO)** | Assigns PRs to PRS. Asks each PRS to sweep. Records when each reports done. Re-surveys after a round and starts the next                        | Touch a PR. Read a thread. Answer a blocker                | None, from files | No. A script (playbook)               |
| **PR Sweeper (PRS)**      | Works its PRs end to end: update, review, rebase, resolve threads, fix CI, reconcile, merge when the gate holds. Writes events and blockers     | Ask the human. Pick its own PRs. Work a PR not in its list | Keeps its own    | Yes                                   |

Rules for all roles:

- **Orchestrators never do work.** PRR and PRO read and write state. That is all.
- **The only state is who worked on what.** PR facts (state, checks, threads) are never stored. Each role reads them live from GitHub before acting.
- **Fresh restarts are normal.** Kill any PRR or PRO at any time. The next one resumes from the ledger.
- **One PRS per repo group.** A PRS may run several PRs in sequence. It owns a PR from `claim` to `done`.
- **FH is a PRS with a different engine.** See [FH](#finops-hubs-fh).

## State files (proposed)

Location: `~/.cache/pr-sweep/` (per human, across repos; matches today's pwsh pipeline). Override with `CATALYST_SWEEP_STATE`. Two files.

### `run.json` (PRO writes, all read)

```json
{
  "run": "2026-11-03T07:43Z",
  "round": 2,
  "phase": "sweeping",
  "started": "2026-11-03T07:43:10Z",
  "workers": [
    {
      "id": "xerilium",
      "scope": ["Xerilium/catalyst", "Xerilium/printer"],
      "engine": "catalyst",
      "session": "…",
      "status": "working",
      "heartbeat": "2026-11-03T08:02:11Z"
    }
  ]
}
```

- **`phase`**: `survey`, `sweeping`, `resurvey`, `done`
- **`engine`**: `catalyst` (default) or `fh` (FH's own command)
- **`status`**: `queued`, `working`, `done`, `failed`, `timeout`; `heartbeat` older than the timeout marks `timeout`

### `ledger.jsonl` (append-only; any role appends one line per event)

```json
{ "ts": "2026-11-03T07:44:02Z", "round": 1, "pr": "Xerilium/catalyst#193", "sha": "ab12cd3", "actor": "PRS:xerilium", "event": "claim" }
{ "ts": "2026-11-03T07:51:40Z", "round": 1, "pr": "Xerilium/catalyst#193", "sha": "ab12cd3", "actor": "PRS:xerilium", "event": "blocked",
  "blocker": { "kind": "decide", "ask": "Drop Finalized label in FH too?", "link": "https://github.com/Xerilium/catalyst/pull/193#discussion_r1", "recommendation": "Yes", "default": "Yes after 24h" } }
```

| `event`      | Actor   | Meaning                                                                                      |
| ------------ | ------- | -------------------------------------------------------------------------------------------- |
| `claim`      | PRS     | Took the PR (replaces the WIP label race as the source of truth; label still set for humans) |
| `progress`   | PRS     | Optional counters: `{threads-resolved: n}`                                                   |
| `blocked`    | PRS     | PR cannot move without a human. Carries `blocker`                                            |
| `waiting`    | PRS     | PR waits on another person, CI, or a bot. Not shown to the human                             |
| `merged`     | PRS     | PR merged by the merge rule                                                                  |
| `done`       | PRS     | PRS finished this PR for this round (no work left it can do)                                 |
| `failed`     | PRS/PRO | PRS stopped with work left and no blocker. This is a sweep fail                              |
| `reported`   | PRR     | Blocker was shown to the human. Blocks repeats                                               |
| `decision`   | PRR     | Human answer. Carries `answer` and `by` (`human` or `default`)                               |
| `round-done` | PRO     | Every PRS reported for this round                                                            |

- **`blocker.kind`**: `decide` (UX, API, quality, scope), `approve` (someone else's PR, sweeper reviewed), `review` (human must review), `unblock` (access, permissions, workflow-run approval, other gate only a human clears)
- **`blocker.ask`**: one line, up to 10 words, action first
- **`blocker.recommendation`** and **`blocker.default`**: required. The PRS did the research (no echo of the feedback)
- **Dedup key**: `pr` + `sha` + `blocker.ask` hash. PRR shows each key once. A new head SHA or a new ask is a new blocker

Everything else (counts, tables, "what is new") is derived from these two files plus live `gh`.

## Flow

```
PRR start
 ├─ script: survey (gh, classify)  → open escalations (pre-report) + actionable PRs
 ├─ pre-report non-empty? → ledger `failed` (prior sweep did not clear what it should have)
 ├─ start PRO (async)               → PRR is free
 └─ PRR: show blockers now, one at a time (see Blocker UX)

PRO (script loop)
 round n:
   assign actionable PRs to PRS by repo group
   message each PRS: "sweep {pr-list}"          (exact text, nothing else)
   wait for ledger: `done`/`failed`/timeout per PRS
   append `round-done`
   resurvey (script)
   actionable PRs left, or new `decision` events? → round n+1   (cap 5)
   else → phase `done`

PRS (per PR)
 claim → read live PR → update/review pass → reconcile → merge if gate holds
 → append `blocked` | `waiting` | `merged` | `done`

PRR (during the run)
 watch ledger (file watch, no polling by AI)
 new `blocked` not yet `reported` → raise to human → append `reported`
 human answers → append `decision` → PRO routes it in the next round
 phase `done` → final report
```

- **Async start.** PRR does not wait for PRO. The human answers old blockers while PRS work on new ones.
- **Answers re-enter the loop.** A `decision` makes that PR actionable again. PRO sends it to its PRS (or a fresh one) next round.
- **Re-sweep loop.** After every round PRO re-surveys. New commits, comments, reviews, or answers make PRs actionable. The run ends when a full round finds nothing to do and no answer is pending.
- **Pre-report.** The pre-report is for escalations: the human-needed blockers open when a new sweep starts. Decided rule (Michael, on 213): if it has anything, the prior sweep failed to clear what it should have. PRR logs `failed` and the fix goes to the sweep owner. Escalations still open show once, as cards.
- **Failure paths.** A PRS that stops with work left and no blocker is `failed`. PRO restarts it once, then raises one `unblock` blocker. Timeout defaults: 1h per PRS, FH 6h (today's pwsh values).
- **Never block on the human.** A blocked PR blocks only itself.

## Report format

The human sees only blocker recon. No running, waiting, or parked lists.

**Pre-sweep (PRR start)**: carried-over blockers, newest first, 1 line each. Plus nothing else. Empty → `Nothing needs you.`

**Final (phase `done`)**: only blockers not yet `reported`, plus two counts.

```
🧭 [193](url) Drop Finalized in FH? rec: Yes ([thread](url))
👍 [212](url) Approve hook design. rec: Yes ([thread](url))
⛔ [880](url) Approve Playwright workflow run
---
Unblocked 14 threads · Merged 5 PRs
```

- **Line**: status emoji, linked PR number, up to 10 words, recommendation, thread link. Status emojis as in today's report: 🧭 decide, 👍 approve, 👀 review, ⛔ unblock
- **Counts**: threads PRS resolved this run (from `progress`), PRs merged this run (from `merged`)
- **Second report** (after answers and another round): only NEW blockers. A blocker already `reported` and still open is never listed again. Answered blockers drop out
- **Merged PRs** appear only as a count. No list, no summary
- **Sweep failed** (any `failed` event): one extra line `⚠️ Sweep fail: {worker}. {reason}`

## Blocker UX options

PRR must resolve many blockers fast. Today it uses AskUserQuestion (AUQ). AUQ shows up to 4 questions, modal, with little room for context. It does not fit a queue of 10.

| Option                    | How                                                                                                                                                                            | Pros                                                                                                                                 | Cons                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| A. AUQ batch (today)      | PRR asks up to 4 at once                                                                                                                                                       | Built in                                                                                                                             | Cap of 4. No order. Hides the recommendation. Modal                        |
| **B. Card queue in chat** | PRR shows one card: PR, 1-line ask, recommendation, default, thread link. Human answers with one word: `go` (take rec), `skip`, `later`, or free text. PRR shows the next card | One screen, one action, no context switch. Fits 1-word acks. Works with any number of blockers. New cards stream in as PRS find them | Serial. Needs the human present                                            |
| C. Live ask page          | PRR writes the ledger. Stack v2 Asks UI (needs-you view) renders it. Answer = tap                                                                                              | Best glance UX. No chat. Phone friendly                                                                                              | Needs Stack v2 Asks (not ready; first use was unusable). Extra moving part |
| D. Answer on the thread   | PRR posts nothing. Human reacts 👍/👎 or comments `go` on the thread. PRR reads reactions                                                                                      | Answer lives where the PR lives. Async. No tool needed                                                                               | Slow. Reaction parsing. Writes to public PR from the human's account       |
| E. Decision file          | PRR writes `blockers.md` with `[ ]` boxes and a recommendation. Human edits and saves                                                                                          | Simple. Offline                                                                                                                      | Editing a file is more work than one word                                  |

**Recommendation: B now, on the ledger contract, with C as a second renderer later.**

- B needs no new product. Cards use data the ledger already holds.
- Because blockers live in `ledger.jsonl`, C and B read the same data. Adding C later changes no PRS and no PRO.
- Use AUQ only when 4 or fewer blockers are single-choice and independent. Never for a longer queue.
- Add a **default-if-silent** timer to each blocker: when the human does not answer in the stated window, PRR may apply the default only for reversible items (`by: default`). Never for irreversible, external, or costly actions.
- Add a **research pass** for questions aimed at the human on a PR thread: PRS must already have answered with research. PRR shows a blocker only when PRS could not.

## Merge rule

A PR merges when all hold:

1. **Autopilot** label present (a human applies it; agents never add it)
2. **Zero unresolved threads**, read with full pagination (a single page misses PRs with over 100 threads)
3. **Code owner approved**: required when `CODEOWNERS` matches a changed file; present approvals satisfy branch rules
4. **All checks pass**: none pending, failed, or skipped-required
5. **Not an FH PR**: Catalyst takes over auto-merge for every repo except FH (FH merges itself)

How:

- The merge is a **scripted step** in the PRS's reconcile (squash, `--match-head-commit` on the SHA read just before). No AI call.
- **Autopilot is a milestone, not a scope.** It records the human's sign-off. The sweep still works every PR that involves the human, with or without the label. Only the merge needs the label.
- Orchestrators and the Reporter never merge. Only a PRS reconcile does, and only through this rule.
- A gate a PRS cannot clear becomes a `blocked` event with the exact gate named. Autopilot PRs never sit unseen.

Gap to resolve (Q5): today's `sweep-rules.md` in todo adds three more gates: `npx catalyst check` clean, `mergeStateStatus` is `CLEAN`, and a final-head run end to end (UI: Playwright). Michael's rule above lists four. 193 removes `Finalized` and the SHA certify. Recommendation: keep his four, add `CLEAN` (it is a branch-policy fact, free to read), move the end-to-end/UI run to a 212 pre-merge hook so each repo owns it.

### FinOps Hubs (FH)

- FH keeps its own sweep command and merges itself (workflow). Catalyst `pr-sweep` excludes the FH repo by config.
- FH is one PRS with `engine: fh`. PRO sends it the same message form (`/pr-sweep for {pr-list}`) and waits for it to report.
- A small adapter script turns FH's report into ledger events (`blocked`, `waiting`, `done`). FH code does not change.
- FH never finishes. It reports `done` per round. PRR does not wait for it: blockers stream as they appear.

## Scripted vs AI

Principle: script every step whose result is a rule. Use AI only to judge or to write code or text.

| Step                                                                         | Scripted   | AI         | Where                                      |
| ---------------------------------------------------------------------------- | ---------- | ---------- | ------------------------------------------ |
| Find PRs (queries), paginate threads                                         | Yes        |            | survey script (reuse Prime 4 `gather`)     |
| Classify (needs-author / needs-review / ready / blocked / skip)              | Yes        |            | rules (Prime 4 `classify`)                 |
| No-AI gate: skip PRs with no change since last round (`updatedAt`, head SHA) | Yes        |            | survey                                     |
| Assign PRs to PRS, send messages, timeouts, restarts, round loop             | Yes        |            | PRO playbook                               |
| Ledger read/write, dedup, counts, report render                              | Yes        |            | shared script                              |
| Watch ledger, raise cards                                                    | Yes        |            | PRR (file watch)                           |
| Merge when gate holds, label sync, WIP claim/release                         | Yes        |            | reconcile step                             |
| Thread classification (confirm-only, stale, 🧭, 🔒)                          | First pass | Yes (rest) | PRS                                        |
| Fix code, reply, review, rebase conflicts                                    |            | Yes        | PRS (existing update and review playbooks) |
| Research an escalation and write the 1-line blocker                          |            | Yes        | PRS (it has the PR context)                |
| Human conversation, "why" on a card                                          |            | Yes        | PRR (only on request)                      |

Result: PRO is a playbook with no model. PRR spends tokens only while the human talks to it. Idle sweeps cost zero tokens. Prime 4 measured the survey and classify layer at 0 tokens and one batched triage call at about 3-26K billed-equivalent versus about 197K for one agent worker run.

## Relation to existing work

| Item                            | Relation                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **133** `/catalyst:pr-sweep`    | Becomes the PRS engine. Keep Phases 2-3, 3a (without certify), 3b. Phase 1 survey moves to the shared script (it already accepts `pr-numbers`). Phase 4 report and the AUQ escalation pass move to ledger events and PRR       |
| **193**                         | Prerequisite. Its simplified gates (label, checks, owner, threads; no `Finalized`, no SHA certify) are Michael's merge rule minus the FH exclusion. Land it first                                                              |
| **212** hooks                   | Still needed for non-FH repos (Allyte, FTK). With `Finalized` gone, `pr-sweep.certify:gate` has nothing to gate. Rename it to a pre-merge gate (`pr-sweep.merge:gate`). Hooks fire inside PRS passes only, never in PRR or PRO |
| **todo 98** interim rules       | Superseded when this lands. Its guardrails become design: state in files (ledger), deliver on worker report (PRR streams), one Autopilot rule (merge rule). Until then 98 stays the stopgap                                    |
| **Prime 4**                     | Source of the survey, classify, and render scripts. Move them into Catalyst as a `sweep-survey` playbook so one engine serves every repo                                                                                       |
| todo `Invoke-SweepPipeline.ps1` | Same idea as PRO (headless worker per group, no-AI change gate) but pwsh-only and text-parsed. PRO replaces it                                                                                                                 |
| todo `sweep.md` + `sweep-*.md`  | Shrink to per-repo config: the query list, the worker scope, FH exclusion. The manager text goes away                                                                                                                          |

## Risks

- **Ledger corruption.** Two writers append at once. Mitigation: one `appendFileSync` per line (atomic for small lines); readers skip bad lines and log them.
- **PRS silent death.** No `done`. Mitigation: heartbeat in `run.json`; PRO marks `timeout`, restarts once.
- **Dedup too strong.** A changed ask on the same SHA is hidden. Mitigation: key includes the ask hash.
- **Default-if-silent misfire.** Applies a default the human would reject. Mitigation: reversible items only; always logged as `by: default`.
- **Two PRS on one PR.** Mitigation: `claim` event plus WIP label; PRS re-reads the ledger before starting each PR.

## Recommendation

Build it in Catalyst in six small steps. Each step ships alone.

| Phase | Scope                                                                                                                       | Size   | Depends on  |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| 1     | Ledger and `run.json` schema, shared read/write/dedup/count script, FRs in the spec                                         | Small  | 193 merged  |
| 2     | Survey script into Catalyst (from Prime 4). `pr-sweep` gets a PRS mode: takes `pr-numbers`, writes events, no AUQ, no table | Medium | 1           |
| 3     | PRO playbook: assign, message, wait, resurvey, rounds, timeouts. Includes the merge step as a script in reconcile           | Medium | 2           |
| 4     | PRR: pre-report, async start, ledger watch, card queue (option B), final report, default-if-silent                          | Medium | 1, 3        |
| 5     | FH adapter (report → events). Pilot in todo against the live sweep; replace `sweep.md` manager text                         | Small  | 3, 4        |
| 6     | Option C renderer for Stack v2 Asks. Rename 212's `certify` hook to `merge`                                                 | Small  | 4, Stack v2 |

Phases 1-3 are testable with no human and no AI (fixture ledgers, fake PRS).

## Open questions for Michael

1. **Pre-report meaning.** Decided (Michael, on 213): "Pre report is for escalations." The pre-report lists human-needed escalations (blockers). If it has anything, the prior sweep failed to clear what it should have. Not an open question; kept here for the record.
2. **Ledger location.** `~/.cache/pr-sweep/` per human, or `.xe/` in a repo? Recommendation: Per human (a sweep spans repos). Default if silent: Per human.
3. **PRO as a script.** Playbook with no model, or an agent? Recommendation: Script; an agent only for failure triage. Default if silent: Script.
4. **Blocker UX.** B (card queue) now, C (Stack v2 page) later? Recommendation: Yes. Default if silent: B.
5. **Merge gates.** Keep your four, add `mergeStateStatus CLEAN` and `--match-head-commit`, move the UI/end-to-end run to a 212 pre-merge hook, and drop `catalyst check`-must-pass from the merge rule? Recommendation: Yes. Default if silent: Your four plus `CLEAN`.
6. **Default-if-silent actions.** May PRR apply a blocker's default after the window passes, for reversible items only? Recommendation: Yes, 24h, logged. Default if silent: No auto-apply (cards stay open).
7. **Spec home.** New feature (`sweep-orchestration`) or extend `pull-request-workflow` `FR:sweep`? Recommendation: New feature; the roles and ledger are a separate concern, and `pull-request-workflow` keeps the single-PR rules. Default if silent: New feature.
8. **PRS runtime.** One headless session per repo group (keeps context across rounds, attachable) or a subagent per run? Recommendation: Session per group. Default if silent: Session per group.
9. **FH adapter.** Wrap FH's report with an adapter, or change FH's command to write events? Recommendation: Adapter (no FH change, FH 880 still lands). Default if silent: Adapter.
10. **Round cap and timeouts.** Cap 5 rounds per run, 1h per PRS, 6h for FH? Recommendation: Yes. Default if silent: Yes.

## Next step

On approval: Run `/catalyst:create sweep-orchestration` (per Q7). Phase 1 first (schema and script), after [193](https://github.com/Xerilium/catalyst/pull/193) merges. Tell the todo sweep owner that [98](https://github.com/flanakin/todo/pull/98) stays as the stopgap until Phase 5.

## References

- [todo 98](https://github.com/flanakin/todo/pull/98): sweep failure diagnosis and interim rules
- [Catalyst 133](https://github.com/Xerilium/catalyst/pull/133), [193](https://github.com/Xerilium/catalyst/pull/193), [212](https://github.com/Xerilium/catalyst/pull/212)
- [Prime 4](https://github.com/Xerilium/prime/pull/4): scripted sweep playbook and token comparison
- `src/resources/playbooks/sweep-pull-requests.md`, `reconcile-pull-request.md`
- `.xe/features/pull-request-workflow/spec.md` (`FR:sweep`, `FR:lifecycle`)
- `flanakin/todo`: `.claude/commands/sweep.md`, `sweep-rules.md`, `sweep-report.md`, `.stack/pr-sweep-state.md`, `.stack/cos-charter.md`, `scripts/Invoke-SweepPipeline.ps1`
