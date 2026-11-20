---
id: scheduling
title: Scheduling
description: Token-free time scheduling with one OS heartbeat, a scripted gate, and a playbook run only when work exists.
dependencies:
  - cli-engine
---

<!-- markdownlint-disable single-title -->

# Feature: Scheduling

## Purpose

Run playbooks on a schedule without spending tokens while idle. The scheduler decides whether a run is due and starts it. It never does the work itself and never calls a model.

## Scenarios

### FR:file: Schedule Files

Developer needs to declare a schedule as a reviewable file so that timed work is data, not shell glue.

- **FR:file.@yaml** (P1): Interface: `.xe/schedules/{id}.yaml` in a registered repo, and `~/.config/catalyst/schedules/{id}.yaml` for cross-repo jobs
- **FR:file.input** (P1): Schedule (@req FR:$schedule) — one per file
- **FR:file.id** (P1): Loader MUST reject a schedule whose `id` differs from its file name
- **FR:file.invalid** (P1): Loader MUST report each invalid schedule by file and field and keep the other schedules
- **FR:file.triggers** (P1): Loader MUST accept only `cron`, `every`, and `at` triggers in `on`
  - **FR:file.triggers.unknown** (P2): Loader MUST reject any other trigger type by name
- **FR:file.gate** (P1): Loader MUST reject a `gate` that names neither a `script` nor a `playbook`
- **FR:file.script-path** (P1): Loader MUST reject a repo-scope `script` that resolves outside the repo's `.xe/` folder
- **FR:file.secrets** (P1): Loader MUST reject an `env` entry that is not a bare variable name
- **FR:file.ai-gate** (P2): Loader MUST warn when `run.ai` is true and no `gate` exists
- **FR:file.default-branch** (P1): Repo schedules MUST load only while the checkout is on its default branch
- **FR:file.output** (P1): Loaded schedules with their scope, plus warnings

### FR:slots: Trigger Slots

Developer needs each trigger to produce exact, repeatable run slots so that every machine agrees on what is due.

- **FR:slots.input** (P1):
  - Trigger (string) — `cron`, `every`, or `at` from the schedule
  - Window (string) — start and end instants to enumerate
  - Time zone (string) — IANA name; default the machine zone
- **FR:slots.cron** (P1): Scheduler MUST fire a `cron` trigger at each local time matching its five fields
  - **FR:slots.cron.fields** (P2): Scheduler MUST support `*`, lists, ranges, and steps in every field
  - **FR:slots.cron.dow** (P2): Scheduler MUST fire when either day-of-month or day-of-week matches if both are restricted
  - **FR:slots.cron.gap** (P1): Scheduler MUST fire a slot that falls in a daylight-saving gap once, moved forward by the length of the gap
  - **FR:slots.cron.overlap** (P1): Scheduler MUST fire a slot that falls in a daylight-saving overlap once, at its first occurrence
- **FR:slots.every** (P1): Scheduler MUST fire an `every` trigger at each multiple of its interval since the Unix epoch
  - **FR:slots.every.units** (P2): Scheduler MUST accept the interval units `m`, `h`, and `d`
  - **FR:slots.every.minimum** (P2): Loader MUST reject an interval under five minutes
- **FR:slots.at** (P1): Scheduler MUST fire an `at` trigger once at its instant
- **FR:slots.output** (P1): Slots — ascending instants, with no duplicates across triggers

### FR:due: Due Runs

Developer needs missed and repeated slots handled predictably so that a sleeping laptop runs a job once, not six times.

- **FR:due.input** (P1):
  - Now (string) — current instant
  - First tick (string) — instant the scheduler first saw the schedule
  - Ledger (@req FR:$ledger-event) — events for this schedule
- **FR:due.key** (P1): Scheduler MUST give each run the key `{id}@{slot}`
- **FR:due.dedupe** (P1): Scheduler MUST NOT start a run whose key already has a `done` or `skip` event
- **FR:due.grace** (P1): Scheduler MUST treat a slot as missed only after a five-minute grace past the slot
  - **FR:due.grace.on-time** (P1): Scheduler MUST run a slot inside the grace whatever the `catch-up` value
- **FR:due.catch-up** (P1): Scheduler MUST apply the schedule's `catch-up` to missed slots
  - **FR:due.catch-up.latest** (P1): Scheduler MUST run only the newest missed slot under `latest`, the default
  - **FR:due.catch-up.all** (P2): Scheduler MUST run every missed slot, oldest first, under `all`
  - **FR:due.catch-up.none** (P2): Scheduler MUST run no missed slot under `none`
  - **FR:due.catch-up.missed** (P2): Scheduler MUST record each slot it does not run as a `missed` event
- **FR:due.max-age** (P2): Scheduler MUST ignore a slot older than the schedule's `max-age`
- **FR:due.first-tick** (P2): Scheduler MUST NOT run slots before a schedule's first tick, except an `at` slot inside `max-age`
- **FR:due.output** (P1): Due slots — oldest first, each with its key

### FR:tick: Heartbeat Tick

Developer needs one cheap check on every OS wake so that the model starts only when work exists.

- **FR:tick.@cli** (P1): Interface: `catalyst schedule tick`
- **FR:tick.input** (P1): The user-scope schedules and every registered repo's schedules
- **FR:tick.tokens** (P1): Tick MUST NOT call an AI provider
- **FR:tick.stop** (P1): Tick MUST start nothing while a `STOP` file exists in the state folder
- **FR:tick.stop.late** (P2): Tick MUST start nothing when a `STOP` file or a pause appears while its gate runs
- **FR:tick.paused** (P1): Tick MUST skip a paused or disabled schedule
- **FR:tick.host** (P2): Tick MUST skip a schedule whose `host` differs from the machine name
- **FR:tick.gate** (P1): Tick MUST run the gate for each due slot before starting a run
  - **FR:tick.gate.contract** (P1): Gate MUST print `run` or `skip` as the first word of its last output line
  - **FR:tick.gate.skip** (P1): Tick MUST record a `skip` event with the reason and start nothing when the gate says `skip`
  - **FR:tick.gate.error** (P1): Tick MUST record a `failed` event when the gate exits non-zero, times out, or prints neither word
  - **FR:tick.gate.timeout** (P2): Tick MUST stop a gate after its timeout, 30 seconds by default
- **FR:tick.start** (P1): Tick MUST start `catalyst run` for the schedule's playbook in a detached process when the gate says `run`
  > - @req FR:cli-engine/run.execute
  - **FR:tick.start.inputs** (P1): Tick MUST pass each `run.inputs` entry as `--input key=value`
  - **FR:tick.start.cwd** (P2): Tick MUST run in the repo root, or in `run.cwd` for user scope
- **FR:tick.concurrency** (P1): Tick MUST NOT start a schedule while a live run of it holds its lock
  - **FR:tick.concurrency.stale** (P2): Tick MUST clear a lock whose process no longer exists
  - **FR:tick.concurrency.stale.expired** (P2): Tick MUST clear a lock older than the run timeout plus five minutes
- **FR:tick.concurrency.gate** (P1): Tick MUST hold the schedule's lock while its gate runs
- **FR:tick.concurrency.owner** (P2): Tick and worker MUST clear only a lock that still belongs to their own run
- **FR:tick.env** (P1): Tick MUST pass the child only `PATH`, `HOME`, `USERPROFILE`, `SystemRoot`, and the variables in `env`, read from `~/.config/catalyst/env`
- **FR:tick.env-mode** (P2): Tick MUST ignore the env file and warn when others can read it
- **FR:tick.exit** (P2): Tick MUST exit 0 when it finishes, whatever the schedules did
- **FR:tick.output** (P2): Silent on success; one stderr line per failed schedule

### FR:worker: Run Worker

Developer needs a started run to finish, retry, and stop on its own so that no tick waits on a long run.

- **FR:worker.@cli** (P2): Interface: `catalyst schedule exec <id> --scope <key> --key <key> --slot <ms>` (internal; started by tick and `run`)
- **FR:worker.events** (P1): Worker MUST record `start`, then `done`, `failed`, or `timeout`, each with the key
- **FR:worker.timeout** (P1): Worker MUST stop the whole process tree when the run exceeds `timeout`, 1 hour by default
- **FR:worker.retry** (P1): Tick MUST restart a failed or timed-out key after `retry.backoff` until `retry.max` retries are used
  - **FR:worker.retry.on** (P2): Tick MUST retry only the causes listed in `retry.on`
- **FR:worker.pause** (P1): Tick MUST pause a schedule that exhausted its retries and record one `escalated` event
- **FR:worker.dead** (P2): Tick MUST record a `failed` event for a lock whose process ended without an end event, including before `start`
- **FR:worker.release** (P1): Worker MUST release the lock when it ends

### FR:ledger: Run Ledger

Developer needs a durable record of every decision so that "did it run, and why not" has an answer.

- **FR:ledger.@file** (P1): Interface: `~/.cache/catalyst/schedule/{scope}/runs.jsonl`, plus `{scope}/state/{id}.json` per schedule
  - **FR:ledger.@file.override** (P3): The folder MAY move with `CATALYST_SCHEDULE_STATE`
- **FR:ledger.append** (P1): Scheduler MUST append one JSON line per event and never rewrite a line
- **FR:ledger.events** (P1): Scheduler MUST write only these event types: `due`, `skip`, `start`, `done`, `failed`, `retry`, `timeout`, `missed`, `escalated`
  > - @req FR:$ledger-event
- **FR:ledger.state** (P1): Scheduler MUST keep per schedule the first tick, last tick, paused flag, and consecutive failures
- **FR:ledger.no-content** (P1): Scheduler MUST NOT write run output or tokens to the ledger

### FR:cli: Schedule Commands

Developer needs to inspect and steer schedules from the CLI so that nothing runs unseen.

- **FR:cli.@cli** (P1): Interface: `catalyst schedule <list|status|explain|run|pause|resume|tick|install|uninstall|doctor> [id]`
- **FR:cli.list** (P1): `list` MUST print each schedule's ID, scope, next slot, last status, and warnings
- **FR:cli.status** (P2): `status <id>` MUST print the schedule's state and last run
- **FR:cli.explain** (P1): `explain <id>` MUST print why the latest slots ran, skipped, or did not run
- **FR:cli.run** (P2): `run <id>` MUST start the schedule now, skipping the gate, keyed `{id}@manual-{instant}`
- **FR:cli.pause** (P1): `pause [id]` MUST set the paused flag
  - **FR:cli.pause.resume** (P1): `resume [id]` MUST clear the paused flag
  - **FR:cli.pause.all** (P2): `--all` MUST target every schedule
- **FR:cli.json** (P3): Commands MUST print JSON when the global `--json` flag is set
  > - @req FR:cli-engine/cli.global
- **FR:cli.unknown** (P2): Commands MUST fail with an `InvalidInput` error naming an unknown schedule ID
  > - @req FR:cli-engine/errors.InvalidInput

### FR:install: OS Heartbeat

Developer needs one approved OS entry that calls `tick` every five minutes so that no schedule needs its own OS entry.

- **FR:install.@cli** (P1): Interface: `catalyst schedule install [--yes]`, `uninstall [--all]`, `doctor`
- **FR:install.approval** (P1): `install` MUST print the OS entry and install it only after the user answers yes or passes `--yes`
  - **FR:install.approval.no-tty** (P1): `install` MUST install nothing and exit 2 when it has no terminal and no `--yes`
- **FR:install.entry** (P1): `install` MUST install one entry that runs `catalyst schedule tick` every five minutes
  - **FR:install.entry.macos** (P1): On macOS the entry MUST be a launchd user agent with `StartInterval` 300
  - **FR:install.entry.linux** (P1): On Linux the entry MUST be one user crontab line
  - **FR:install.entry.windows** (P1): On Windows the entry MUST be a Task Scheduler task that starts when available
- **FR:install.register** (P1): `install` MUST register the current checkout for tick to read
- **FR:install.idempotent** (P2): `install` MUST leave an identical existing entry untouched
- **FR:install.uninstall** (P1): `uninstall` MUST unregister the current checkout and remove the OS entry when no checkout stays registered
  - **FR:install.uninstall.all** (P2): `uninstall --all` MUST remove the OS entry and every registration
- **FR:install.doctor** (P2): `doctor` MUST report the OS entry, env file mode, state folder access, and tick age
  - **FR:install.doctor.stale** (P2): `doctor` MUST flag a tick older than fifteen minutes

### Non-functional Requirements

- **NFR:idle-cost** (P1): A tick with nothing due MUST finish in under 1 second and make no network call
- **NFR:portable** (P1): Core modules MUST import nothing from outside `src/scheduling/` except Node built-ins and `js-yaml`

## Data Model

- **FR:$schedule** (P1): **`Schedule`** — One declared job.
  - `id` (string) — Kebab-case; equals the file name
  - `description` (string?)
  - `enabled` (boolean) — Default true
  - `tz` (string?) — IANA zone; default machine zone
  - `on` (Trigger[]) — One or more
    - Trigger: `{ cron: string }`, `{ every: string }`, or `{ at: string }` (ISO 8601 with offset)
  - `gate` (Gate?) — `{ script: string, timeout?: string }` or `{ playbook: string, timeout?: string }`
  - `run` (Run) — `{ playbook: string, inputs?: map, ai?: boolean, cwd?: string }`
    - `cwd` applies to user scope only
  - `catch-up` (string) — Allowed: none, latest, all. Default: latest.
  - `max-age` (string) — Default 6h
  - `timeout` (string) — Default 1h
  - `retry` (Retry) — `{ max: number, backoff: string, on: string[] }`
    - Default: max 2, backoff 5m, on error and timeout.
    - `on` Allowed: error, timeout.
  - `host` (string?) — Run only on this machine
  - `env` (string[]?) — Variable names only

- **FR:$ledger-event** (P1): **`LedgerEvent`** — One line of `runs.jsonl`.
  - `t` (string) — ISO 8601 instant
  - `schedule` (string) — Schedule ID
  - `type` (string)
    - Allowed: due, skip, start, done, failed, retry, timeout, missed, escalated
  - `key` (string) — `{id}@{slot}`
  - `reason` (string?) — Gate reason or failure cause, no content
  - `attempt` (number?) — 1-based

## Architecture Constraints

- Core logic runs behind ports for clock, storage, process start, and host checks, so a host other than Catalyst can supply them (@req NFR:portable)
- No repo schedule file can create an OS entry; only `install` does

## External Dependencies

- `launchctl`, `crontab`, and PowerShell scheduled-task cmdlets: the OS schedulers `install` configures
