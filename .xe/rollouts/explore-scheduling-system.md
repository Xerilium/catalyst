# Explore: Scheduling System (Time and Action Triggers)

Draft for review. No specs or code changed.

**Prompted by**: Michael: "I'm hitting more and more cases where actions need to be scheduled. Some are time-based and some are action-based. Similar to how GH Actions work." Question: What is the smallest system that runs Catalyst playbooks on a schedule or on events, on any OS, with no tokens spent while idle?

## Findings

- **Six ad hoc schedulers exist**: PR sweep (launchd, `updatedAt` gate), Printer (6 launchd plists, `DONE` marker), Maenifold, 8 Claude Code scheduled tasks (an AI session per fire), Stack Autopilot (GH Actions events + cron backstop), Stack email (launchd, `lastOk` heartbeat). Each one solves lock, catch-up after sleep, env, and "did it run?" again in shell
- **Common pattern**: a cheap scripted check decides if AI is needed. Idle cost is 0 tokens
- **Catalyst already has the parts**: `catalyst run` runs playbooks headless; `if`, `return`, `script`, `bash`, `powershell`, `playbook-run`, and `ai-prompt` actions; run state and resume in `.xe/runs/`; ACP ([157](https://github.com/Xerilium/catalyst/pull/157)) for AI steps
- **`Playbook.triggers[]` exists but nothing runs it**: `update-pull-request.yaml` declares GitHub events only. There is no timer, cron parser, or watcher

## Decisions

### 1. A schedule is a playbook in `.xe/schedules/`

- `.xe/schedules/{id}.yaml` is a normal playbook. No new schema
- Its `triggers` activate it. The folder tells readers "this runs on its own"
- The scheduler reads only `.xe/schedules/` (default branch only). Triggers on playbooks in other folders stay inert
- `catalyst check` warns on `triggers` in `.xe/playbooks/`, so an inert trigger is never a silent mystery
- A schedule is usually thin: a gate, then `playbook-run`, a script, or an `ai-prompt` step via ACP

### 2. Triggers: cron plus GitHub events

| Trigger       | Syntax                                                                     | Notes                                         |
| ------------- | -------------------------------------------------------------------------- | --------------------------------------------- |
| Time          | `event: schedule`, `args: { cron: "20 16 * * 1-5", tz: America/New_York }` | Raw 5-field cron, same as GH Actions; IANA tz |
| GitHub events | Existing `event`, `action`, `args`                                         | Later phase; polled token-free, or GH Actions |

- **Cron is the only time syntax**. AI writes it. `catalyst schedule list` prints each cron in plain English plus the next 3 run times. One format, still readable
- **Type change**: `action` becomes optional, because `schedule` has none
- **Dropped**: `every`, `at`, `window`, `file`, `run`, `manual`. Cron plus a gate covers them:
  - Manual = `catalyst run <playbook>`. No trigger needed
  - Chaining = a `playbook-run` step at the end of the playbook
  - File watch, soak delays, quota windows = cron plus a gate that checks the file, age, or quota

### 3. Gates are playbook steps

- First step checks cheaply (`script` or `if`), then `return` exits if nothing to do. Never AI
- The ledger records `return: { skipped: <reason> }` as a skip. No new gate concept

### 4. Fixed scheduler rules, not config

- **Concurrency**: one run per schedule. A due run is skipped while the last one runs
- **Catch-up**: after sleep, run the latest missed slot once. Older slots (over 24 h) are dropped
- **Dedupe**: key = schedule id + slot. A slot runs at most once
- **Failure**: one escalation per failed slot. Never success notices
- Add per-schedule settings only when a real schedule needs one

### 5. Runner: one OS heartbeat runs `catalyst schedule tick` (OS agnostic)

- All logic (cron math, DST, catch-up, locks, ledger) is TypeScript in Catalyst. Behavior is the same on every OS
- `catalyst schedule install` creates one heartbeat (every 5 min): launchd on macOS, Task Scheduler on Windows, systemd timer on Linux. It shows the entry and waits for a yes. Users never write OS config
- New schedules are files in a PR, not new OS entries
- Gates and steps must be OS agnostic: use `script` (JavaScript) or Catalyst actions, not `bash`-only code
- CI: `catalyst schedule tick` as a workflow step
- **Not chosen**: one OS entry per schedule (3 backends, approval per job); a daemon (still needs an OS entry); Claude Code scheduled tasks (an AI session per fire); Stack as host (Catalyst must work without Stack)

### 6. State and visibility

- State in `~/.cache/catalyst/schedule/` (per user, out of git): `state.json` (last slot, last run) and `runs.jsonl` (same writer and shape as the 213 ledger)
- CLI: `catalyst schedule list`, `explain <id>` (why it did or did not run), `doctor`
- Dead-man check: Stack or the morning check-in flags a stale `lastTick`

## Use case fit

| Use case                                                           | Schedule                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| PR sweep ([213](https://github.com/Xerilium/catalyst/pull/213))    | Cron every 2 h; gate: any `updatedAt` changed; `playbook-run: sweep-pull-requests`              |
| Merge gates ([214](https://github.com/Xerilium/catalyst/pull/214)) | GitHub label events plus a cron backstop                                                        |
| Printer daily loop                                                 | Cron `20 16 * * 1-5` ET; gate: market open and not done today                                   |
| Quota maxxing                                                      | Cron daily; gate: quota left (token-free); pick a help-wanted issue; `/catalyst:change` via ACP |
| Stack email triage                                                 | Cron every 15 min; gate: new mail since cursor                                                  |

Hooks ([212](https://github.com/Xerilium/catalyst/pull/212)) are in-run seams, not schedules.

## Phased plan

| Phase | Scope                                                                                                 | Size   |
| ----- | ----------------------------------------------------------------------------------------------------- | ------ |
| 1     | Spec `scheduling`; cron with tz and DST; slot, dedupe, catch-up; ledger writer. Fixture tests, no OS  | Small  |
| 2     | `catalyst schedule tick`, `list`, `explain`; runs `catalyst run`; `check` warning for inert triggers  | Medium |
| 3     | `install`, `uninstall`, `doctor` for macOS, Windows, Linux. Pilot: replace the PR sweep launchd timer | Medium |
| 4     | GitHub event triggers (polled); migrate Printer plists and Claude scheduled tasks                     | Medium |

## Next step

Run `/catalyst:create scheduling` for Phases 1-2. Share the ledger writer with 213 Phase 1.
