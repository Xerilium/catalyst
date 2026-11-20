# Full Autonomy Chain

Drive a pull request you just opened toward Autopilot, when the repository turned full autonomy on. The repository's committed config is the human gate: it decides whether you, the author agent, may add Autopilot.

‼️ Write for **Plain Language**: like a human explaining it to a teammate

## Inputs

- `pr-number`: The pull request this workflow just opened
- `ai-platform`: AI platform name for comment prefixes

## Rules for the whole chain

- **Kill switch:** Before each step, run `npx catalyst autonomy status --json`. If it reports a `stopFile`, stop the chain, record nothing else, and report the file. Never delete a STOP file.
- **Never-auto list:** Before any command that could release, change settings or credentials, delete data or history, or publish outside this repository, run `npx catalyst autonomy guard -- <command>`. If it exits non-zero, do NOT run the command. Escalate with `--reason destructive`.
- **Separate context:** Every review step runs in a subagent. Never review your own work in your own context.
- **Never merge.** The Autopilot gates (`catalyst pr <n>`) decide the merge. Never add Autopilot yourself with `gh`; only the Autopilot command adds it.
- **Ledger:** Record each step with `npx catalyst autonomy record --pr {pr-number} --action <step> --detail "<one line>" [--tokens <n>]`. Report tokens when your platform shows them.

## Instructions

### 1. Check autonomy

Run `npx catalyst autonomy status --json`.

Read the result in this order:

1. If it exits non-zero, the config is invalid and autonomy is off. Report the problems and skip the chain.
2. If `note` is set, GitHub could not be read and autonomy is off. Report the note and skip the chain.
3. If `enabled` is `false`, skip the chain. Return to the caller. Say nothing about autonomy.

- Read `loopRounds` from the JSON. It is the `loop-rounds` budget.

Record `--action chain --detail "start"`.

### 2. Loop to a clean round

▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/loop-pull-request.md with `pr-number`, and `max-rounds` set to the `loop-rounds` budget.

The loop runs its review step in a subagent, so review stays in a separate context.

Map the loop's stop reason to a loop result:

- ✅ All findings resolved → `clean`
- ⏱️ Hit the round limit → `round-limit`
- Any other stop reason → `failed`

Pass `--loop-result clean` only when the loop met its resolved exit. Diminishing returns is not clean.

The loop defers controversial or unclear items to its end-of-loop AUQ. Under this chain, treat each flagged item that no person decided as `--reason ambiguity`. A clean loop with open judgment calls never gets Autopilot.

While the loop runs, note each agent-judged escalation you find:

- `ambiguity` — a requirement has more than one valid reading
- `ci-unfixable` — a failing check you cannot fix in this PR
- `destructive` — the work needs an action on the never-auto list

### 3. Apply Autopilot or escalate

Run:

```bash
npx catalyst autonomy autopilot {pr-number} --json --loop-result <result> --rounds <rounds> [--tokens <n>] [--reason <reason> ...]
```

Read `decision` from the JSON:

- `apply` → go to step 4.
- `escalate` → skip `pr-sweep`. The command already posted the 🧭 comment and recorded the ledger entry. Go to step 5.
- `stopped` → stop the chain and report the STOP file.
- `off` → skip the chain.

### 4. Sweep the pull request

▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/sweep-pull-requests.md with `pr-numbers` = `{pr-number}`, `scope` = `update`, `execution-mode` = `autonomous`.

The sweep fixes what `catalyst pr {pr-number}` reports as holding the merge. It never merges.

Record `--action sweep --detail "<sweep status>"`.

### 5. Report

Add one line to this workflow's final output, after closure and before celebration: `Full autonomy: {decision} — {reasons or "Autopilot added; gates decide the merge"}`. Under `autonomous` mode this lands in the review summary, which runs after closure. In other modes, review already ran, so print the line on its own.

If the decision was `escalate`:

- When someone can answer, execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md once, with one question per reason. Options: "I'll review it" / "Fix and rerun the chain" / "Leave it".
- When no one can answer (a scheduled or unattended run), list each reason in the report and stop. The 🧭 comment on the PR carries it.

## Exit Criteria

- [ ] Chain skipped when autonomy is off or the config is invalid
- [ ] STOP checked before each step
- [ ] `pr-loop` ran with `max-rounds` from the budget, review in a subagent
- [ ] Autopilot added only by `catalyst autonomy autopilot`, never by hand
- [ ] `pr-sweep` ran only after `apply`
- [ ] Every step recorded in the ledger
- [ ] No merge, release, settings change, or outside publish
