# Explore: Local-only Usage Telemetry

Draft for review. No specs or code changed.

**Prompted by**: Michael wants to know which execution modes and Catalyst features a repo uses most, so Catalyst can tune itself for that repo. Hard rules: no data goes to Xerilium automatically, data stays in the local repo, and a config setting turns it on or off. Bonus: a public command drafts improvement requests that the user sends by hand.

## Findings

- **Execution mode is an AI choice in markdown**: `feature-scope.md` (create, change, fix) and `workflow-scope.md` (blueprint) pick the mode through AUQ. `init` and `pr-sweep` take a mode with no rollout plan. `explore` takes no mode. No code sees the choice. So mode cannot be recorded at exactly 0 tokens
- **No mode leaves a reliable trace**: `autonomous` always opens `xe/{rollout-id}` and a PR. The other 4 modes commit or open a PR only if the user picks it at closure. No commit, branch, or label names the mode. Git history over-counts `autonomous`
- **Code runs at a few points**: `catalyst` commands (`pr`, `pr-retarget`, `check`, `traceability`, `deps`, `init`, `run`) and the `catalyst-github` and `catalyst-bootstrap` launchers. These can record events in process at 0 tokens
- **Some runs are in CI**: `pr` and `pr-retarget` also run in the Catalyst GitHub workflows. CI runners are not the local clone, so v1 records local runs only and skips CI (`CI=true`)
- **`Xerilium/catalyst` is public too**: `ai-plugins` holds only `marketplace.json`, which points to the Catalyst repo. Skills ship from `src/resources/ai-plugin/skills/`
- **Skills have no hook today**: the plugin ships skills and agents only. Claude Code plugin hooks (`PreToolUse` on `Skill`, `UserPromptSubmit`) can see the skill name at 0 tokens. Copilot and other hosts differ
- **The config catalog has no `execution-mode` key**: the setting is in the `workflow-context` spec, but most parts are `[deferred]`. The catalog in [312](https://github.com/Xerilium/catalyst/pull/312) does not list it. "Suggest a default mode" needs that key first

### Existing signals

| Signal                         | What it shows                  | Gap                                 |
| ------------------------------ | ------------------------------ | ----------------------------------- |
| PR branches `xe/*` and labels  | Autonomous runs, Autopilot use | No other modes, no read-only skills |
| `.xe/runs/`                    | Headless YAML playbook runs    | Not skills; run state, not counts   |
| `.xe/rollouts/*.md`            | Multi-run work, phases         | No mode field; most files ignored   |
| `feedback.md` (retrospective)  | Quality notes per feature      | Qualitative, opt-in each run        |
| `CATALYST_DIAGNOSTICS` logging | Framework logs                 | Console only, not kept              |

## Analysis

### What to track (event schema v1)

One JSON line per event. Every value comes from a fixed list. Code drops any value not on the list.

```json
{
  "v": 1,
  "t": "2026-11-25T10:00Z",
  "kind": "skill",
  "name": "explore",
  "mode": null,
  "src": null,
  "host": "claude",
  "cat": "0.4.1",
  "ok": true
}
```

| Field  | Values                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| `v`    | Schema version                                                                                             |
| `t`    | UTC ISO time, rounded down to the hour                                                                     |
| `kind` | `skill`, `cli`, `mode`                                                                                     |
| `name` | Catalyst skill or CLI command name; custom playbook runs are `other`; other plugins' skills are not logged |
| `mode` | One of the 5 modes, or `null`                                                                              |
| `src`  | Mode source: `ask`, `config`, `request`, or `null`                                                         |
| `host` | `claude`, `copilot`, `cursor`, `cli`, `other`; from the hook that wrote it, `cli` for CLI events           |
| `cat`  | Catalyst version                                                                                           |
| `ok`   | Exit result for CLI events only                                                                            |

- **Never record**: arguments, prompts, paths, branch names, PR numbers, user names, emails, file content, error text, secrets
- **No user ID**: one log per clone is enough for repo tuning

### Where to store it

| Option                                                   | Merge conflicts                   | Worktrees               | Leak risk                                              | Verdict        |
| -------------------------------------------------------- | --------------------------------- | ----------------------- | ------------------------------------------------------ | -------------- |
| `$(git rev-parse --git-common-dir)/catalyst/usage.jsonl` | None (append, never committed)    | Shared by all worktrees | None; git never pushes it                              | **Pick**       |
| Branch `xe/catalyst/telemetry`                           | Ref races between parallel agents | Needs plumbing writes   | High: one `git push --all` or a mirror makes it public | Reject now     |
| Git notes                                                | Notes merge is manual             | Shared                  | Medium: `git push` of notes refs                       | Reject         |
| Tracked file in `.xe/`                                   | Every branch                      | Per branch              | High: lands in PRs                                     | Reject         |
| User cache (`~/.cache/catalyst`)                         | None                              | Shared                  | None                                                   | Loses repo tie |

- **Why not the branch**: it shares data with every collaborator and, in a public repo, with everyone. That breaks "stays in the local repo". It also adds commits on each event and ref races when agents run in parallel
- **Team view later**: the analysis command can export an aggregate the user commits by choice

### How the data tunes a repo

- **Default mode**: 9 of 10 runs pick `autonomous` → suggest `execution-mode: autonomous` in config
- **Stale settings**: `traceability.*` set but `traceability` never ran in 90 days → suggest removal
- **Mode override rate** (after config modes ship): config says `spec-review`, but 70% of runs have `src: request` and `mode: autonomous` → config is wrong
- **Failing commands**: high `ok: false` rate on a CLI command → draft a bug for Xerilium
- **Dead skills**: a skill never used → drop it from suggestions in this repo

### Privacy, consent, retention

- **Data never leaves the clone**. No network code in the recorder. A test enforces it
- **Setting**: `usage.enabled` (boolean), file setting, working tree
- **Machine opt out**: env `CATALYST_USAGE=0` also turns it off. The catalog in [312](https://github.com/Xerilium/catalyst/pull/312) gives each entry one source, so this needs a new rule: "either source off wins". Simpler v1: file setting only
- **Recommended default: `true`** (opt out). Reason: data is local, like `git reflog` or shell history, and an opt-in log stays empty, so it tunes nothing
- **Notice**: on its first write in a clone, the recorder shows one line with the file path and how to turn it off. The CLI prints it to stderr. The Claude hook returns JSON with `systemMessage`, because Claude Code does not show plain hook stdout. This covers users who never run `init`
- **Retention**: fixed 90 days in v1, no setting (the catalog has no `number` type). The recorder drops lines older than 90 days at most once per day, on write
- **Delete**: `npx catalyst usage --clear`

### Token cost

| Event            | How                                                                                                                                   | Tokens      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| CLI command      | In process, at exit                                                                                                                   | 0           |
| Skill start      | Claude hooks: `PreToolUse` on `Skill`, and `UserPromptSubmit` for typed `/catalyst:*` commands; none on other hosts yet               | 0           |
| Mode, any source | Rollout plan gets a `**Mode**: {mode} ({src})` line; a `PostToolUse` hook on `Write`/`Edit` of `.xe/rollouts/rollout-*.md` records it | ~10 per run |

- **Why the rollout plan**: today `feature-scope.md` and `workflow-scope.md` always ask through AUQ, so `src` is always `ask`. The `config` and `request` paths are `[deferred]` (`FR:workflow-context/execution-modes.default.*`, `FR:scope.approve.mode`). When they ship, they end in the same setup step that writes the plan. The AI already writes that file, so the cost is one short line, not a tool call
- **Dedup**: the AI rewrites the plan many times, and a resumed rollout already has the line. The hook records a mode event only when the `**Mode**` value differs from the last one it saw for that rollout. The dedup file stores a salted hash of the rollout ID, never the ID, since it equals the branch name. `--clear` and the 90-day trim cover it too
- **Prompt privacy**: `UserPromptSubmit` gets the full prompt. The hook reads only a leading `/catalyst:{name}` token, checks `name` against the list, and never stores the rest
- **Mode gaps**: `init` and `pr-sweep` write no plan, so v1 does not record their mode. `explore` has no mode
- **Rejected**: a `npx catalyst usage record` Bash call costs a full tool call (hundreds of tokens) and can trigger a permission prompt. A hook that parses the AUQ answer misses config and request modes
- **Repo guard**: the plugin is on in every repo. The hooks do nothing when the folder is not a git repo or has no `.xe/config/catalyst.json`
- **Hook speed**: the hook is a small `node` script that appends one line. It does not start `npx`, so it adds only Node start time to each skill call
- **Other hosts**: no mode data until they offer hooks

### Analysis command

- **Name**: `/catalyst:usage`, a Catalyst skill in `src/resources/ai-plugin/skills/`. The Catalyst repo is public, so users can read it. `ai-plugins` is only the marketplace that lists it
- **Step 1**: run `npx catalyst usage --json`. Code does all counting. 0 AI tokens for math
- **Step 2**: AI compares counts with `.xe/config/catalyst.json` and lists repo changes (above)
- **Step 3**: AI drafts an issue body for Xerilium with aggregates only. It writes the draft to a local file
- **Step 4**: user reads, edits, and sends it by hand. The command never calls `gh` write APIs
- **Why a skill, not the CLI**: steps 2-3 need AI

## Alternatives

| Option                         | Value                 | Cost          | Verdict                                     |
| ------------------------------ | --------------------- | ------------- | ------------------------------------------- |
| Do nothing                     | No new surface        | 0             | Loses mode data                             |
| Git history + PR labels        | Free, already shared  | Low           | Biased to autonomous; use as a second input |
| GitHub API stats               | Cross-clone view      | Network, auth | PR-only; same bias                          |
| Host telemetry (OpenTelemetry) | Rich data             | User setup    | Not repo-scoped; not ours                   |
| Local log (this doc)           | All modes, all skills | Small         | **Pick**                                    |

## Risks

- **Trust**: the word "telemetry" alarms users. Name it "usage log". Show the file path in `init`
- **Host gaps**: only Claude has skill hooks now. Copilot data starts at CLI events only
- **CI blind spot**: most `pr` runs and all Autopilot merges run in GitHub Actions and are not logged. PR labels and `.github` workflow history cover them
- **Schema creep**: each new field needs a privacy check. Keep the allowlist in code with tests
- **Small samples**: one developer, few runs. Suggest changes only after 20+ events
- **Dependency**: needs [312](https://github.com/Xerilium/catalyst/pull/312) merged; default-mode and override advice also need an `execution-mode` catalog entry and the `[deferred]` `FR:execution-modes.default.*` and `FR:scope.approve.mode` work

## Recommendation

- **Local log in the git common dir**, not a branch. It meets every hard rule and needs no merges
- **Default on, local only**, with `usage.enabled` to opt out and a first-write notice
- **Code counts, AI suggests**: recording costs 0 tokens, except ~10 for the mode line; AI only drafts suggestions

### Smallest first slice

1. `usage.enabled` in the catalog
2. Recorder for local CLI commands, with the first-write notice and 90-day trim
3. `npx catalyst usage` prints counts; `--json` and `--clear`

Next slices: skill hook (Claude), `**Mode**` line in the rollout plan, `execution-mode` catalog key, then `/catalyst:usage`.

## Decisions for Michael

- **Default**: on (opt out, recommended) or off (opt in)?
- **Branch idea**: accept "no shared branch" for v1?
- **Mode cost**: accept ~10 tokens per run for the rollout `**Mode**` line?
- **Command home**: `/catalyst:usage` in the Catalyst plugin (recommended), not `ai-plugins`? The premise was that `ai-plugins` is the only public repo, but `Xerilium/catalyst` is public
- **Machine opt out**: add `CATALYST_USAGE` now, or file setting only in v1 (recommended)?

## References

- `src/resources/playbooks/actions/feature-scope.md` and `workflow-scope.md` (mode choice)
- `.xe/features/workflow-context/spec.md` (`FR:execution-modes.default`)
- [312](https://github.com/Xerilium/catalyst/pull/312) (config-settings catalog)
- `.xe/features/feedback-loop/spec.md` (existing retrospective signal)
- [Claude Code plugin hooks](https://code.claude.com/docs/en/plugins-reference)
