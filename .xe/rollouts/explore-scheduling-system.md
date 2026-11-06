# Explore: Scheduling System (Time and Action Triggers)

Draft for review. No specs or code changed.

**Prompted by**: Michael: "I'm hitting more and more cases where actions need to be scheduled. Some are time-based and some are action-based. Similar to how GH Actions work." Question: What is the smallest scheduling system that runs Catalyst playbooks on time or on events, on macOS, Windows, Linux, and CI, with no tokens spent while idle?

## Findings

### Five schedulers exist today and none shares a model

| Where                           | Mechanism                                                                    | Evidence                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| PR sweep (todo)                 | launchd `StartCalendarInterval`, 7 fires/day, no-AI `updatedAt` gate         | `~/Library/LaunchAgents/com.flanakin.pr-sweep.plist`, `todo/scripts/Install-SweepTimer.ps1`, `Invoke-SweepPipeline.ps1`               |
| Printer                         | 6 launchd plists (`loop`, `triage`, `prep`, `backtest`, `collect-fast/slow`) | `~/Library/LaunchAgents/com.xerilium.printer.*.plist`; `loop` fires every 2 h and `cycle.sh` exits if `DONE` exists                   |
| Printer (docs)                  | Maenifold `Schedule` (cron to launchd), run history                          | `printer/prototypes/learning-loop/README.md`, `FR:cycle.trigger`; rule: "No new recurring jobs (launchd, cron, schedules) without OK" |
| Claude Code scheduled tasks     | 8 tasks, each a `SKILL.md` prompt that starts a fresh AI session per fire    | `~/.claude/scheduled-tasks/*/SKILL.md` (for example `pr-sweep-pilot`)                                                                 |
| Stack Autopilot (GH Actions)    | Events plus a 10-minute cron backstop                                        | `stack/.xe/features/autopilot/spec.md` (`FR:triggers.events`, `FR:triggers.sweep`, `FR:triggers.serial`)                              |
| Stack email assistant (launchd) | One LaunchAgent, 15 min, `lastOk` heartbeat, cursor catch-up                 | [stack 78](https://github.com/Xerilium/stack/pull/78) (`FR:auto.schedule`)                                                            |

Result: every job re-solves the same six problems (lock, catch-up after sleep, env stripped by launchd, retries, "did it run?", cost cap) in shell.

### Use cases and what each needs

| #   | Use case                                                                                                 | Source                                                                                                                              | Trigger type                      | Needs                                                    |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------- |
| 1   | PRR watches the ledger and raises new blockers                                                           | [213](https://github.com/Xerilium/catalyst/pull/213) (PRR "watch ledger (file watch, no polling by AI)")                            | `file`                            | Predicate on new lines; zero tokens                      |
| 2   | PRO kicks sweeps; re-sweep loop after each round (cap 5)                                                 | 213 Flow; today's `Invoke-SweepPipeline.ps1`                                                                                        | `every` + `run` (chain)           | Gate (`updatedAt`), chain cap, concurrency per run       |
| 3   | Human answer (`decision` event) re-enters the loop                                                       | 213 "Answers re-enter the loop"                                                                                                     | `file`                            | Dedupe by event key                                      |
| 4   | Customization hooks fire at `certify`, `pass:after`, `reconcile`                                         | [212](https://github.com/Xerilium/catalyst/pull/212)                                                                                | None (in-run seams)               | Shared `when` filter and result contract; not a schedule |
| 5   | Merge gates: `Autopilot` or `Finalized` label events start a reconcile; thread resolution fires no event | [214](https://github.com/Xerilium/catalyst/pull/214); Stack `FR:triggers.sweep` rationale                                           | `github` + `every` backstop       | Event trigger plus cron backstop; head-SHA dedupe        |
| 6   | Printer daily loop after the US close, market-calendar aware, resumable                                  | `printer/.../learning-loop/README.md`, `cycle.sh`, `FR:cycle.catch-up`, `FR:cycle.one-at-a-time`, `FR:cycle.deadline`               | `cron` + gate                     | Time zone, gate script, lock, catch-up, deadline, budget |
| 7   | Printer 08:30 ET pre-open news check, no AI                                                              | `learning-loop/spec.md` `FR:cycle.pre-open`                                                                                         | `cron` + gate                     | Token-free playbook                                      |
| 8   | Phased release rollouts: next phase after a soak time if checks are green (Catalyst 0.3.4 line)          | `.github/workflows/release.yml` (dispatch only; `0.3.4-dev` bump); no phased-rollout doc found in the repo, so this case is derived | `run` + `delay`, or one-shot `at` | One-shot, dynamic creation from a run, gate              |
| 9   | Stack v2: email triage every 15 min; due checks need "a caller (GH Actions cron or the Mac host)"        | Stack 78; `stack/.xe/features/email-runner/spec.md` ("The Stack host has no timers"); `iphone-access/plan.md`                       | `every`                           | Heartbeat, stale detection, cursor catch-up              |
| 10  | Quota-window jobs: heavy work between Wed night and Thu 10am, before the weekly reset                    | `todo/.stack/xe-vision.md` ("Wed night to Thu 10am (quota window)"); Printer `PRINTER_MAX_WEEKLY_RUNS` (~15% of weekly usage)       | `window`                          | Named window, deadline, quota budget                     |

Patterns that repeat:

- **Poll and gate**: a cheap scripted probe decides whether anything needs AI (sweep `updatedAt`, Printer calendar, email cursor). Idle cost is 0 tokens
- **Fire often, make the job idempotent**: Printer fires every 2 h and a `DONE` marker makes extra fires exit. This is catch-up by design
- **Event plus cron backstop**: events are fast but incomplete (no event on thread resolution). A slow cron closes the gap (Autopilot, 214)
- **Lock, then clear stale**: `mkdir` lock cleared when no process runs (Printer), `FR:cli.lock` (email)
- **launchd has no shell**: PATH and env stripped, so jobs read `~/.config/printer/env` (mode 600) and use absolute paths

### What Catalyst already has

- **Playbooks run headless**: `catalyst run <playbook> --input k=v` (`src/cli/commands/run.ts`); YAML playbooks are deterministic and engine-run; `bash`, `powershell`, `shell` script actions; `github-*` actions; `try`/`catch`; `playbook-run`
- **State and resume**: `.xe/runs/run-{runId}.json`, resume of `paused` and `failed` runs (`FR:playbook-engine/state.resume`)
- **Declared but unused triggers**: `Playbook.triggers[]` (`event`, `action`, `args`) exists in the type and YAML schema and is set on `update-pull-request.yaml`, but nothing executes it (GitHub events only)
- **ACP provider** ([157](https://github.com/Xerilium/catalyst/pull/157), merged): runs any Agent Client Protocol agent over stdio for AI steps. ACP carries AI calls, not timers; it is not a scheduling channel
- **No scheduler**: no timer, no cron parser, no watcher, no run ledger across playbooks

## Analysis

### Design principle

A schedule is data: **when** (triggers) + **whether** (gate) + **what** (playbook) + **how safely** (concurrency, retry, timeout, budget). The scheduler never does work and never uses a model. It decides "is a run due?" and starts `catalyst run`. This is PRO's rule from 213 ("orchestrators never do work") applied to time.

### Trigger model (GH Actions vocabulary)

| Type     | Syntax                                                        | Fires                                                       | Notes                                                                     |
| -------- | ------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| `cron`   | `cron: "20 16 * * 1-5"`, `tz: America/New_York`               | On each match                                               | 5 fields; IANA tz; DST gap runs once after the gap, DST overlap runs once |
| `every`  | `every: 2h` (`m`, `h`, `d`), optional `jitter`                | Interval after the last slot, not after the last finish     | Slot-based so a slow run does not drift                                   |
| `at`     | `at: 2026-11-12T09:00-08:00`                                  | Once, then disabled                                         | Runs and playbooks may create one-shots (`catalyst schedule at ...`)      |
| `window` | `window: weekly-quota`                                        | Once at window start; `deadline` at window end              | Windows are named in config (`start`, `end`, `tz`)                        |
| `github` | `event: pull_request`, `types: [labeled]`, `where: {...}`     | New matching event since the last cursor                    | Detected by token-free polling; GH Actions bridge gives real webhooks     |
| `file`   | `path: ~/.cache/pr-sweep/ledger.jsonl`, `when: new-line`      | File change that matches a predicate                        | Poll `mtime`/size, then predicate; OS file watch only in `watch` mode     |
| `run`    | `playbook: sweep-pull-requests`, `status: completed`, `delay` | A run of another playbook ended with this status            | Chaining; `max-chain` caps loops                                          |
| `manual` | Implicit on every schedule                                    | `catalyst schedule run <id>` or Actions `workflow_dispatch` | Same code path as automatic runs                                          |

Shared rules:

- **Filters**: `where` uses the same keys as 212's hook `when` (`labels`, `paths` with `!` negation, `role`, `branch`, `author`) so one filter grammar serves hooks and schedules
- **Gate**: optional `gate:` is a YAML playbook or script that returns `run` or `skip` with a reason; never an AI playbook (lint error). Examples: market calendar, `updatedAt` changed, `lastOk` stale
- **Concurrency**: `concurrency: { group, on-conflict }`; `group` is a template (`pr-sweep:{{repo}}`); `on-conflict` is `skip` (default), `queue` (1 deep), or `cancel` (only for read-only runs). Lock is a file with PID and heartbeat, cleared when the PID is gone (Printer's rule)
- **Dedupe and idempotency**: each run has a key: time = `id + slot`; event = `id + event id (+ head SHA)`. A key with a `done` in the ledger never runs again. Playbooks must be idempotent or resumable (engine already resumes)
- **Retries**: `retry: { max: 2, backoff: 5m, on: [error, timeout] }`. A `skip` from the gate is not a failure. After the last retry: one escalation, deduped by key
- **Missed runs**: `catch-up: none | latest | all` with `max-age`. Default `latest`: a laptop asleep for 6 h runs the missed slot once, not six times. Printer's `FR:cycle.catch-up.no-late-calls` is a gate (`skip` if past `deadline`), not a scheduler rule
- **Timeouts**: `timeout: 1h` per run, kills the process tree, records `timeout`, then follows `retry`
- **Backstop**: a schedule may list an event trigger and a `cron` trigger together; the key dedupes the overlap (Autopilot pattern)

### Actions are playbooks

- `run.playbook` resolves like `catalyst run` (`.xe/playbooks`, then the package). `run.inputs` maps to `--input`
- **Scripted first**: polling, gating, and bookkeeping are YAML playbooks or script actions (token-free). AI enters only through the `ai-prompt` action, which uses the ACP or Claude provider
- **AI is declared**: a schedule whose playbook can call AI sets `ai: true`. It counts against `budget` and needs a `gate`, or lint warns
- **Reuse `triggers`**: the existing `Playbook.triggers[]` stays as author-side metadata ("this playbook is meant to run on PR comments"). A schedule file is the only thing that activates a run (explicit, reviewable, per-repo). Option for later: `catalyst schedule suggest` reads `triggers` and drafts schedules

### Config location and schema

**Location** (recommended): `.xe/schedules/{id}.yaml`, one file per schedule.

| Option                              | Pros                                                                  | Cons                                                                       |
| ----------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A. `.xe/config/catalyst.json` array | Same file as hooks and labels                                         | Grows large; no comments; merge conflicts; JSON-only                       |
| **B. `.xe/schedules/*.yaml`**       | One diff per schedule; comments; same YAML as playbooks; easy to lint | New folder                                                                 |
| C. `.xe/playbooks/` front matter    | Schedule sits next to its playbook                                    | Mixes "what" with "when and where"; one playbook, many schedules is common |

- **Repo scope**: `.xe/schedules/` in the repo; runs only on machines that registered the checkout
- **User scope**: `~/.config/catalyst/schedules/` for cross-repo jobs (PR sweep spans repos, as 213's per-human ledger does) and for personal windows
- **Settings only** in `.xe/config/catalyst.json`: `schedule.enabled`, `schedule.provider`, `schedule.defaults` (timeouts, retry)
- **Read from the default branch only** (as 214 does for merge config). A PR cannot add a job that runs on a laptop before merge

**Schema** (proposed):

```yaml
id: string # kebab-case, equals file name
description: string
enabled: true # false pauses without deleting
tz: America/Los_Angeles # default: machine tz

on: # one or more triggers; any can start a run
  - cron: "min hour dom mon dow"
  - every: 2h
    jitter: 2m
  - at: 2026-11-12T09:00-08:00
  - window: weekly-quota
  - github:
      { event: pull_request, types: [labeled], where: { labels: [autopilot] } }
  - file: { path: ~/.cache/x/ledger.jsonl, when: new-line }
  - run: { playbook: name, status: completed, delay: 24h, max-chain: 5 }

gate: # optional; YAML playbook or script, returns run|skip
  playbook: name # or script: path
  timeout: 30s

run:
  playbook: name
  inputs: { key: value }
  ai: false # true if the playbook may call AI
  cwd: ~/dev/repo # user scope only; repo scope uses the checkout

concurrency: { group: "id", on-conflict: skip } # skip | queue | cancel
catch-up: latest # none | latest | all
max-age: 6h # ignore missed slots older than this
timeout: 1h
retry: { max: 2, backoff: 5m, on: [error, timeout] }
deadline: 17:30 # optional hard stop for starting runs, in tz

permissions: { github: read, ai: read-only, network: [api.github.com] } # least privilege
env: [GH_TOKEN] # names only; values come from the env file or keychain
budget: { runs-per-day: 12, ai-runs-per-week: 225, ai-tokens-per-day: 200000 }
on-fail: escalate # escalate | ignore (never "notify on success")
```

**Example 1: PR sweep** (replaces the 7-fire launchd timer; keeps the no-AI gate)

```yaml
id: pr-sweep
description: Kick a PR sweep when a PR changed; cheap check first
tz: America/Los_Angeles
on:
  - every: 2h
  - github:
      {
        event: pull_request,
        types: [labeled, synchronize],
        where: { labels: [autopilot, finalized] },
      }
gate: { playbook: sweep-survey } # no AI: lists PRs whose updatedAt/head SHA changed; skip if none
run: { playbook: sweep-pull-requests, ai: true }
concurrency: { group: pr-sweep, on-conflict: skip }
catch-up: latest
timeout: 1h
retry: { max: 1, backoff: 10m, on: [timeout] }
budget: { ai-runs-per-week: 60 }
```

**Example 2: Printer daily loop** (replaces `loop` launchd, which fires every 2 h to catch up)

```yaml
id: printer-daily-loop
description: Paper-trading cycle after the US close on trading days
tz: America/New_York
on:
  - cron: "20 16 * * 1-5"
gate: { script: prototypes/learning-loop/market-open.sh } # calendar: skip holidays and done days
run: { playbook: printer-daily-cycle, ai: true } # resumable: step markers stay in the playbook
concurrency: { group: printer-loop, on-conflict: skip }
catch-up: latest
max-age: 12h
deadline: "08:30" # next day; no new stock runs after this (FR:cycle.deadline)
timeout: 8h
retry: { max: 3, backoff: 20m, on: [error, timeout] }
env: [APCA_API_KEY_ID, APCA_API_SECRET_KEY, SEC_EDGAR_USER_AGENT]
budget: { ai-runs-per-week: 225 }
```

**Example 3: Quota-window architect run** (heavy work before the weekly reset)

```yaml
# user scope: ~/.config/catalyst/schedules/weekly-quota-window.yaml
id: architect-heavy
description: Run the queued heavy exploration jobs inside the quota window
# windows are named once (user scope, or any schedule file) and referenced by `on`
windows:
  weekly-quota:
    { start: "Wed 22:00", end: "Thu 10:00", tz: America/Los_Angeles }
on:
  - window: weekly-quota
gate: { playbook: heavy-queue-nonempty } # no AI: reads the queue file
run: { playbook: run-heavy-queue, ai: true }
deadline: window-end # stop starting jobs at window end
concurrency: { group: heavy, on-conflict: skip }
catch-up: none # a missed window waits for next week; never run heavy work out of window
budget: { ai-tokens-per-day: 2000000 }
```

Phased release (short form): `on: [{ run: { playbook: release-phase-1, status: completed, delay: 24h } }]` with a `gate` that checks CI and open regressions, then `run: release-phase-2`.

### Runner options

Runner = what wakes up Catalyst when time passes. Triggers and semantics (cron math, DST, catch-up, dedupe, gates) live in Catalyst in all options, so behavior is the same everywhere. Only the wake-up differs.

| Option                                         | How                                                                                                 | Pros                                                                                                                       | Cons                                                                                                                                                                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. OS scheduler, one entry per schedule        | Generate launchd plist / systemd timer or cron line / Task Scheduler task from each file            | Native; survives reboot; no daemon                                                                                         | 3 backends to keep correct; a new OS entry per schedule (needs approval each time); no events; env stripped; sleep semantics differ by OS                                                                                        |
| **B. OS heartbeat + `catalyst schedule tick`** | One OS entry (every 5 min) runs `tick`: reads schedules and state, computes due slots, starts runs  | One approval; 3 tiny OS templates; catch-up is Catalyst logic, same everywhere; handles events by polling; zero tokens     | 5-minute floor; node start cost per tick (about 0.1-0.3 s); needs the machine awake (catch-up covers sleep)                                                                                                                      |
| C. Long-running daemon (`schedule watch`)      | A process loops `tick` and watches files                                                            | Sub-minute latency; real file watch; one process                                                                           | Needs an OS entry to start it anyway; crash and memory handling; sleep still pauses it. Cheap to add later because `watch` is a loop around `tick`                                                                               |
| D. GH Actions bridge                           | Generated workflow with `schedule:` and event triggers calls `catalyst schedule fire <id>`          | No laptop; real webhooks; native concurrency groups and retries; works in CI                                               | Cron is best-effort and can lag (Stack autopilot spec says so); 5 min minimum; shared runners have no Claude login or local state; secrets in Actions; scheduled workflows pause after 60 days of repo inactivity (public repos) |
| E. Claude Code schedulers as a provider        | `CronCreate` / `/loop` / `ScheduleWakeup` (session-bound), mcp scheduled-tasks (`cron` or `fireAt`) | Already installed; uses the user's login; has notifications; mcp tasks survive sessions and run missed jobs on next launch | Every fire starts an AI session (tokens even when idle); the prompt is a `SKILL.md`, not a playbook; needs the app open; session-bound tools die with the session; macOS/Windows app only; no CI                                 |
| F. Stack v2 as host                            | Stack runs timers and starts Catalyst                                                               | Stack already owns priority, asks, and the live UI                                                                         | Stack host "has no timers" today; Catalyst must work without Stack; layering says Stack decides what runs next, Prime executes; makes engineering workflows depend on a product still in wrap-up                                 |

Notes on the OS layer:

| OS      | Wake-up                                                            | Catch-up after sleep                                                                                                   |
| ------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| macOS   | launchd `StartInterval` 300                                        | Interval fires can be skipped during sleep (Stack 78 lists this as a live check); `tick` computes missed slots on wake |
| Linux   | systemd user timer (`Persistent=true`), cron fallback              | `Persistent=true` runs a missed activation; cron has none, so `tick` covers it                                         |
| Windows | Task Scheduler with `-StartWhenAvailable`                          | Runs a missed start when the machine is back; `tick` covers the rest                                                   |
| CI      | `catalyst schedule tick` as a step, or `fire <id>` from a workflow | State is not persisted; use `fire` with explicit slot and key                                                          |

### ACP and Claude schedulers

- ACP is the AI-call protocol ([157](https://github.com/Xerilium/catalyst/pull/157)). Scheduled playbooks use it for their AI steps (headless, permissions rejected unless allowed). It does not schedule anything
- Claude schedulers fit one narrow job: a **heartbeat provider** on a machine where the Claude app is the only thing the user will install or approve. One task whose prompt is "run `catalyst schedule tick`, print nothing" costs tokens per fire, so it stays an opt-in fallback (every 30+ min), not the default
- Existing 8 Claude tasks migrate one by one into `.xe/schedules/` or user scope. Prompts that are really "run this script then summarize" become a playbook with a scripted gate and one AI step

### Recommendation

1. **Runner**: **B** (OS heartbeat + `tick`) as the default. Add **D** (GH Actions bridge, generated `fire` workflow) for repo-only, secretless, event-driven schedules where the laptop is not needed (Autopilot-style). Keep **C** as `catalyst schedule watch` for dev and containers. **E** is an opt-in heartbeat provider. **F**: not a host; Stack renders state and receives escalations
2. **Why B**: one install the user approves once (fits "No new recurring jobs without OK"); new schedules are reviewable PRs, not new OS entries; catch-up, DST, dedupe, and locks are written once, in TypeScript; works with sleep; idle cost is zero tokens
3. **Why not A**: it multiplies OS entries and bugs by three platforms. **Why not C first**: it still needs an OS entry and adds a lifecycle to manage

## State, observability, security, cost

### State

Location: `~/.cache/catalyst/schedule/` per human (override `CATALYST_SCHEDULE_STATE`), matching 213's per-human ledger. Repo state stays out of git.

- `state.json`: per schedule `lastTick`, `lastSlot`, `lastRun { key, status, start, end, runId }`, `lastSuccess`, `nextRun`, `cursor` (event position), `failures` (consecutive), `paused`
- `runs.jsonl`: append-only, one line per event: `due`, `skip` (with gate reason), `start`, `done`, `failed`, `retry`, `timeout`, `missed`, `escalated`. Same shape and writer as 213's `ledger.jsonl` so one script, one reader. Join to the playbook run in `.xe/runs/run-{runId}.json`
- **PR facts are never stored** (213 rule): gates read live data

### Observability: escalations only

- CLI: `catalyst schedule list` (next run, last run, last status), `status <id>`, `explain <id>` (why it did or did not run), `doctor` (checks OS entry, env file, clock, state)
- **Humans see only**: a run that failed after its retries (`blocked` event, `kind: unblock`, one line, recommendation, default), a stale heartbeat (no tick for 3 intervals), a blown budget. Same blocker shape as 213 so PRR cards and Stack asks render them unchanged
- **Never**: success notices, skip notices, run lists
- **Dead-man check**: a dead scheduler cannot report itself. The reader flags it: the tick writes `lastTick`; Stack or the morning check-in flags it when stale (Stack 78 does this with `lastOk`, stale at 12 h). Optional GH Actions watchdog for repos with CI

### Security (least privilege)

- **No secrets in schedules**: `env:` lists names only. Values come from `~/.config/catalyst/env` (mode 600, the Printer pattern) or the OS keychain. `catalyst check` flags literal tokens, URLs with credentials, and webhook URLs in schedule files
- **Default branch only** for repo schedules; forks and PR heads never schedule anything (Autopilot `FR:safety.forks`, `FR:safety.base`)
- **Permissions block** maps to existing controls: `ai: read-only` leaves ACP permissions rejected (`CATALYST_ACP_PERMISSIONS` unset); `github: read` uses a read-scoped token; scripts run only from the repo's `.xe/` or the package
- **Install is explicit**: `catalyst schedule install` shows the OS entry and waits for approval; `uninstall` removes it. No schedule can install an OS entry
- **Output hygiene**: logs name labels, counts, SHAs, never comment text or tokens (Autopilot `FR:safety.noleak`)

### Cost controls

| Control            | How                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Token-free first   | Gate before any AI; `ai: true` without a gate warns at lint                                                               |
| Budgets            | `runs-per-day`, `ai-runs-per-week`, `ai-tokens-per-day` read from the usage ledger; over budget = `skip` + one escalation |
| Windows            | Heavy jobs run only inside named windows; `catch-up: none` keeps them out of other hours                                  |
| Kill switch        | `catalyst schedule pause [id                                                                                              | --all]`and a`STOP` file (Printer pattern) |
| Backoff on failure | After `retry.max`, the schedule pauses itself and escalates once; no silent retry storms                                  |
| Dedupe             | Same key never runs twice; chains capped by `max-chain` (213 caps rounds at 5)                                            |

## Relation to PR 213 and the layering

Layering from `todo/.stack/xe-vision.md`: Prime = execution (playbooks are scripts, AI only where needed), Stack = prioritization, Catalyst = engineering workflow on Prime. Prime v0 is proposed as the Catalyst engine, extracted.

| Concern                             | Home                                            | Why                                                                                                                           |
| ----------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Schedule schema, tick, ledger, CLI  | Catalyst now; moves with the engine to Prime v0 | Needs only playbooks and the run state, which the engine owns                                                                 |
| What runs next, priority, quota use | Stack                                           | Stack may write `at` and `window` schedules and read `runs.jsonl`; it does not run timers                                     |
| Escalation cards                    | Stack v2 asks / PRR                             | Reads `blocked` events from the same ledger shape                                                                             |
| PR sweep rounds                     | PRO (213)                                       | PRO keeps the round loop inside its playbook; the schedule only starts a sweep run. Two loops would fight over the same state |
| Hooks (212)                         | Catalyst workflows                              | In-run seams, not schedules. They share the `when` filter and the `result` contract                                           |

Concrete effects on open work:

- **213**: PRR's "file watch" becomes a `file` trigger; PRO's start condition becomes `pr-sweep` (Example 1). 213's ledger and this ledger share one writer, so build the shared script once (213 Phase 1)
- **214**: label events plus a cron backstop is the exact `github` + `every` pair. Reconcile stays the only merge rule; the schedule never merges
- **212**: define `when` once and reuse
- **todo `Install-SweepTimer.ps1`, Printer plists, Stack email `schedule --install`**: all become `catalyst schedule install` plus a schedule file

## Risks

- **Event detection by polling lags**: 5 minutes at worst. Mitigation: GH Actions bridge for latency-sensitive events; `watch` mode for local files
- **Duplicate runs when two machines schedule the same repo**: keys are per machine. Mitigation: `where-host:` pin and a claim comment or label for GitHub-event schedules (213's `claim` idea)
- **Scheduler becomes the thing that fails silently**: Mitigation: dead-man check by readers, `doctor`
- **A schedule starts an expensive AI run in a loop**: Mitigation: `max-chain`, budgets, backoff pause
- **Clock and DST bugs**: Mitigation: one cron implementation with IANA tz, fixture tests for gaps and overlaps
- **Scope creep into a workflow engine**: Mitigation: no DAGs, no matrix, no secrets store; chaining is `run` triggers only

## Phased plan

| Phase | Scope                                                                                                                                                            | Size   | Depends on                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------- |
| 1     | Spec (new feature `scheduling`), schema, pure core: cron/every/at/window math with tz and DST, dedupe keys, catch-up, ledger writer. Fixture tests, no OS, no AI | Small  | Shared ledger writer (213 Phase 1) |
| 2     | `catalyst schedule list/status/explain/run/pause` and `tick` for time triggers + gate + concurrency + retry + timeout. Runs `catalyst run`                       | Medium | 1                                  |
| 3     | OS heartbeat installers (launchd, systemd/cron, Task Scheduler), `install/uninstall/doctor`, env file loader. Pilot: migrate the PR sweep timer                  | Medium | 2                                  |
| 4     | Event triggers: `github` polling with cursors and `file`; `run` chaining. Pilot: PRR file trigger, 214 label events                                              | Medium | 2, 213 Phase 4                     |
| 5     | Budgets, windows, escalations (blocker events), dead-man check; migrate Printer plists and Claude scheduled tasks                                                | Medium | 3, 4                               |
| 6     | GH Actions bridge generator (`fire`), `watch` mode, Stack reader (next/last run, escalation cards)                                                               | Small  | 4, Stack v2 asks                   |

Phases 1-2 are testable with no OS, no network, and no AI.

## Open questions for Michael

1. **Runner default**: OS heartbeat + `tick` (B), GH Actions bridge second? Recommendation: Yes. Default if silent: B first, D in Phase 6
2. **Config home**: `.xe/schedules/*.yaml` (repo) + `~/.config/catalyst/schedules/` (user)? Recommendation: Yes. Default if silent: Yes
3. **Heartbeat interval**: 5 minutes? Recommendation: 5 min (matches the GH Actions floor); sub-minute needs `watch`. Default if silent: 5 min
4. **Catch-up default**: `latest`, not `all`? Recommendation: `latest` (one run for missed slots). Default if silent: `latest`
5. **Spec home**: new feature `scheduling`, not an extension of `playbook-engine`? Recommendation: New feature; engine stays free of time. Default if silent: New feature
6. **Package home**: Catalyst now, moves with the engine to Prime v0? Recommendation: Catalyst now. Default if silent: Catalyst now
7. **Playbook `triggers`**: keep as author metadata and make schedule files the only activation? Recommendation: Yes. Default if silent: Yes
8. **Claude schedulers**: opt-in fallback only, and migrate the 8 existing tasks over time? Recommendation: Yes. Default if silent: Yes, migrate when each is next edited
9. **Install approval**: `install` always shows the OS entry and waits for a yes (Printer rule)? Recommendation: Yes. Default if silent: Yes
10. **Sweep loop ownership**: PRO owns rounds inside its playbook; the schedule only starts runs? Recommendation: Yes. Default if silent: Yes
11. **Quota window source**: declare windows in config by hand until a usage source exists? Recommendation: Yes (no API gives the reset time). Default if silent: Yes
12. **Multi-machine**: one scheduling host per human, others disabled? Recommendation: Yes (`where-host` pin). Default if silent: One host

## Next step

On approval: Run `/catalyst:create scheduling` for Phases 1-2 (pure core and CLI, no OS). Coordinate the shared ledger writer with 213 Phase 1. Pilot Phase 3 on the PR sweep timer.

## References

- [Catalyst 212](https://github.com/Xerilium/catalyst/pull/212) (hooks), [213](https://github.com/Xerilium/catalyst/pull/213) (sweep roles, ledger), [214](https://github.com/Xerilium/catalyst/pull/214) (merge gates), [157](https://github.com/Xerilium/catalyst/pull/157) (ACP provider), [223](https://github.com/Xerilium/catalyst/pull/223) (engine comparison)
- [Stack 78](https://github.com/Xerilium/stack/pull/78) (email assistant, 15-minute launchd); `stack/.xe/features/autopilot/spec.md`, `email-runner/spec.md`, `iphone-access/plan.md`
- `printer/prototypes/learning-loop/README.md`, `cycle.sh`; `printer/.xe/features/prototypes/learning-loop/spec.md`; `printer/CLAUDE.md`
- `todo/.stack/xe-vision.md`; `todo/scripts/Install-SweepTimer.ps1`, `Invoke-SweepPipeline.ps1`; `~/.claude/scheduled-tasks/*/SKILL.md`
- `src/playbooks/types/playbook.ts` (`triggers`), `src/resources/playbooks/update-pull-request.yaml`, `.xe/features/playbook-engine/spec.md` (`FR:state.*`), `.github/workflows/release.yml`
