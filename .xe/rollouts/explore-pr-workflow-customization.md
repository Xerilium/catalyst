# Explore: PR Workflow Customization

Draft for review. No specs or code changed.

**Prompted by**: FinOps Hubs (FH) keeps a 660-line custom `/pr-sweep` command, and [FH 880](https://github.com/allytehq/finops-hubs/pull/880) adds another FH-only merge gate to it. Catalyst's `/catalyst:pr-sweep` ([133](https://github.com/Xerilium/catalyst/pull/133), [192](https://github.com/Xerilium/catalyst/pull/192)) is meant to replace it, but it has no way to carry repo-specific behavior. Question: How should the sweep (and the other PR workflows) support per-repo customization?

## Findings

### FH 880 in two lines

- Adds §5a to FH's sweep: a UI PR (`apps/portal/` beyond tests, e2e, docs) is never `Finalized` until a Playwright run of its exact head SHA in test mode passes with zero console errors
- Adds a checklist bullet that blocks `Finalized` otherwise (report `🧭 Decide`) and the matching FR in FH's `devops-review` spec; trigger was a UI PR that merged with only green CI

### Catalyst today has no repo extension point for PR workflows

- The `pr-sweep`, `pr-review`, `pr-update`, and `pr-loop` skills hardcode `@node_modules/@xerilium/catalyst/playbooks/...`; a repo cannot swap or extend the playbook
- Existing knobs cover naming and cadence only: `labels.style`, `labels.names.{id}`, and `execution-mode` in `.xe/config/catalyst.json`
- `.xe/playbooks/` is searched first, but only by the playbook engine for YAML playbooks (`FR:playbook-definition/provider.search-path`); Markdown playbooks run by reference and skip it
- Today's only override is what FH does: a project-level command that forks the whole sweep
- Every PR workflow already ends in `reconcile-pull-request.md`; sweep adds the `Finalized` certify step (Phase 3a) in front of it. Those are the natural seams

### Gap table: FH sweep vs Catalyst sweep

| Area                                                                      | Catalyst                             | FH                                                               | Gap                                              |
| ------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| Role routing (author, review), WIP claim, 🔒 and 🧭 rules, AUQ escalation | Yes                                  | Yes                                                              | None                                             |
| Label names (`Status: 🤖 Finalized`, `▶️ Ready`)                          | `labels.names` config                | FH names                                                         | Config exists                                    |
| `Finalized` certify conditions and SHA comment                            | Yes (`☑️ Finalized at {sha}`)        | Yes (hidden marker comment)                                      | Marker text differs; reconcile reads it          |
| **UI browser run gate (880)**                                             | No                                   | Playwright, per head SHA, blocks `Finalized`                     | **Custom gate, needs a certify hook**            |
| **Hotfix pass** (`sre` agent, once per head SHA)                          | No                                   | Yes                                                              | **Custom per-PR step, needs an after-pass hook** |
| **Retitle to changelog bar** (`/commit-title`)                            | No                                   | Yes, authored PRs                                                | **Custom per-PR step, needs an after-pass hook** |
| **Reconcile and merge**                                                   | Agent runs reconcile, then merges    | `pnpm pr <n>` runs FH's lifecycle core; a GitHub workflow merges | **Different actor; needs reconcile replace**     |
| Triage engine (PowerShell verdict, `rebaseNow`)                           | Inline `gh` survey, rebase if needed | Engine drives routing and rebase                                 | Out of v1: FH-specific tooling                   |
| Breadcrumb, resume, 45-minute liveness kill                               | No                                   | Yes                                                              | Generic; upstream candidate, not a customization |
| Report statuses (`☑️ Ready, pending checks`, `🚨`)                        | Fixed five statuses                  | Extra statuses                                                   | Out of v1                                        |
| Untrusted-code rule for forks                                             | Yes (confirm or read-only)           | Stricter wording, same intent                                    | Hooks must inherit it                            |

Note: Both sweeps drive Autopilot PRs the same way (certify `Finalized`, then something merges). The difference is who merges: Catalyst's reconcile playbook, FH's workflow.

## Analysis

### Design axes

- **Extension point**: Where customization attaches: named hook points, a whole-playbook swap, or free-form rules text
- **Hook target**: `.md` playbook (flexible, AI-run, non-deterministic result) or `.yaml` playbook (deterministic, engine-run, can wrap a script such as `pnpm pr`); both resolve through the existing playbook search path
- **Blocking**: Can a hook stop a PR from advancing (gate) or only add work (step)
- **Safety**: A hook must not weaken Autopilot rules; code-owner sign-off, open threads, 🔒, and head-SHA match stay Catalyst's

### Hook points (proposed)

| Hook          | Fires                                                                   | Kind                | v1  |
| ------------- | ----------------------------------------------------------------------- | ------------------- | --- |
| `certify`     | Sweep Phase 3a, after built-in conditions hold, before `Finalized`      | Gate (can block)    | Yes |
| `after-pass`  | After a PR's review or update pass, before reconcile (all PR workflows) | Step (can warn)     | Yes |
| `reconcile`   | Where `reconcile-pull-request.md` runs; `after` adds, `replace` swaps   | Step or replacement | Yes |
| `before-pass` | After claim, before the pass                                            | Step or skip        | No  |
| `survey`      | Adds or filters queue entries and supplies triage verdicts              | Source              | No  |

No `merge` hook: the merge requires `Finalized` at the same head SHA, so `certify` already gates it.

### Config shape (proposed)

In `.xe/config/catalyst.json`, same style as `labels` and `execution-mode`:

```json
{
  "pull-requests": {
    "hooks": {
      "certify": [
        {
          "id": "ui-browser-run",
          "playbook": ".xe/hooks/ui-browser-run.md",
          "when": {
            "labels": ["autopilot"],
            "paths": ["apps/portal/**", "!**/*.test.*", "!e2e/**", "!**/*.md"]
          },
          "on-error": "block"
        }
      ],
      "after-pass": [
        {
          "id": "retitle",
          "playbook": ".xe/hooks/commit-title.md",
          "when": { "role": "author" }
        },
        {
          "id": "hotfix",
          "playbook": ".xe/hooks/sre-postmortem.md",
          "when": { "labels": ["Hotfix 🔥"] }
        }
      ],
      "reconcile": { "replace": ".xe/hooks/reconcile.yaml" }
    }
  }
}
```

- **`playbook`**: Path to `.md` or `.yaml`; resolved like any playbook (`./` as-is, else `.xe/playbooks`, then package)
- **`when`**: All keys must match. `labels` accepts label ids (`autopilot`) or literal names; `paths` are globs over changed files with `!` negation; `role` is `author` or `reviewer`
- **`on-error`**: `block` (default for `certify`) or `warn` (default elsewhere); applies when the hook fails, times out, or returns no valid result
- **Inputs passed to every hook**: `pr-number`, `head-sha`, `role`, `workflow`, `changed-files`, `labels`, `is-cross-repository`, `execution-mode`
- **Result contract**: `result` (`pass`, `block`, `warn`, `skip`), `reason`, optional `report` line. YAML returns it as outputs; Markdown ends with one fenced JSON block. `block` on `certify` skips `Finalized` and the report shows `🧭 Decide` with the reason
- **Order**: Listed order, sequential; first `block` stops the chain
- **Where they fire**: Review, update, loop (once, not per round), and sweep (via the delegated pass, never twice). `certify` is sweep-only

### Precedence

1. Invocation arguments (for example `no-hooks`, `skip-hook {id}`)
2. `pull-requests.hooks` in the project config
3. Catalyst built-in behavior (no packaged hooks in v1)

Hooks add to built-in steps and gates; they never remove or loosen them. `reconcile.replace` is the only replacement and transfers merge-safety ownership to the replacement.

### How FH maps

| FH custom behavior (today)                          | Mapping                                                                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 880 UI browser run                                  | `certify` hook, Markdown playbook, `when.paths`; §5a text moves into that file, the FR stays in FH |
| Hotfix `sre` pass                                   | `after-pass` hook, `when.labels: ["Hotfix 🔥"]`; hook keeps its own once-per-SHA marker            |
| `/commit-title` retitle                             | `after-pass` hook, `when.role: author`                                                             |
| `pnpm pr <n>` + GitHub merge gate                   | `reconcile.replace` YAML wrapping `pnpm pr`; Catalyst's merge step does not run                    |
| Label names and emojis                              | Existing `labels.names`                                                                            |
| Triage engine, breadcrumb, liveness, extra statuses | Stay in FH or move to Catalyst as generic features; not hook material                              |

Result: FH's sweep shrinks from about 660 lines to three small hook files plus config.

### Options

- **Option 1: Replace the whole playbook.** Let a repo shadow `sweep-pull-requests.md` (resolve `.xe/playbooks` first for Markdown too)
  - Pros: Tiny change; total control; no schema
  - Cons: It is FH's fork with a new path; drift from upstream fixes (the problem we are solving); no tighten-only guarantee
- **Option 2: Named hook points in config (recommended).** As above
  - Pros: Small surface; upstream keeps ownership of the lifecycle and safety rules; gates are testable and visible in the report; FH's custom behavior maps cleanly
  - Cons: New spec, schema, and engine-adjacent work; Markdown hook results are AI-interpreted
- **Option 3: Free-form rules file.** A `.xe/pull-requests.md` injected into the PR workflow prompts
  - Pros: Cheapest; matches how `CLAUDE.md` works
  - Cons: No conditions, order, or blocking, so a gate like 880 becomes advisory; untestable; context cost on every run

### Risks

- **Hook config from PR head**: Read config and hook files from the repo's default branch, never the PR head; otherwise a PR (or fork) can add a hook or edit a gate and run code with the sweeper's credentials. Side effect: a PR that edits its own gate is judged by the old gate
- **Hooks that run PR code** (browser run, tests): Inherit the sweep's fork rule (confirm, or read-only when unattended). Require hooks to declare `runs-code: true` so the rule can apply
- **Replacing reconcile drops merge safety**: `reconcile.replace` must be explicit and reported in the sweep's output so it is never silent
- **Certification marker coupling**: Certify writes the `Finalized at {sha}` comment and reconcile reads it. Replacing one without the other breaks the head-SHA match; a replacement must own both or keep the marker text
- **Permissions**: Skill `allowed-tools` is static, so a hook needing `pnpm` or Playwright depends on the repo's `.claude/settings.json`. The sweep's existing denial-as-gap rule covers failures; docs must say so
- **Cost**: Each hook is a subagent and worktree; `when` filters keep it to the PRs that need it. No built-in once-per-SHA cache in v1, so hooks own idempotence (FH's hotfix and browser-run already key on SHA)
- **Fail-open vs fail-closed**: `certify` defaults to `block` so a broken gate cannot silently pass
- **Drift and typos**: Add a `catalyst check` rule that hook paths exist and ids are unique

## Recommendation

Option 2, shipped small:

1. **v1**: `certify`, `after-pass`, `reconcile` (`after` and `replace`); Markdown and YAML targets; tighten-only; config read from the default branch; fork rule inherited
2. **Later, on demand**: `before-pass`, `survey`, engine-level once-per-SHA, report statuses
3. **Separately**: Propose breadcrumb/resume/liveness upstream as generic sweep features rather than hooks

Rationale: It captures all three FH custom behaviors (880, hotfix, retitle) plus reconcile with three hook points, keeps Catalyst's safety rules authoritative, and avoids the fork-drift that Option 1 recreates.

## Open questions for Michael

1. Does FH keep its own reconcile and merge path (`pnpm pr` plus the GitHub merge workflow), so v1 needs `reconcile.replace`? Or does FH migrate to Catalyst's reconcile and retire `pr-lifecycle-core`, which would drop `replace` from v1. Recommendation: Keep FH's now, since it also runs on events when no agent is running
2. Are hooks tighten-only (can block `Finalized`, never loosen Autopilot rules), with `reconcile.replace` as the single exception? Recommendation: Yes
3. Should hooks apply to review, update, and loop as well as sweep in v1, or sweep only? Recommendation: All four for `after-pass` and `reconcile` (one shared mechanism); `certify` is sweep-only
4. Is hook-owned idempotence acceptable for v1, or do you want a Catalyst-provided once-per-head-SHA cache (adds a hidden PR comment per hook)? Recommendation: Hook-owned for now
5. Should FH's breadcrumb/resume/liveness be proposed upstream? Recommendation: Yes, as a separate item

## Next step

On approval: Run `/catalyst:change pull-request-workflow` to add `FR:hooks.*` (config shape, firing points, result contract, precedence, default-branch read, fork rule) and update `sweep-pull-requests.md`, `reconcile-pull-request.md`, and the review, update, and loop playbooks; add the config key to the `catalyst check` rules. Then port FH's three behaviors into hook files in FH.

## References

- [FH 880](https://github.com/allytehq/finops-hubs/pull/880) (changes `.claude/commands/pr-sweep.md` and `devops-review` spec)
- [Catalyst 133](https://github.com/Xerilium/catalyst/pull/133) and [192](https://github.com/Xerilium/catalyst/pull/192) (sweep and Autopilot rules)
- `src/resources/playbooks/sweep-pull-requests.md`, `reconcile-pull-request.md`
- `.xe/features/pull-request-workflow/spec.md` (`FR:sweep`, `FR:lifecycle`)
- `.xe/features/playbook-definition/spec.md` (`FR:provider.search-path`)
- `.xe/features/repo-labels/spec.md` (`FR:sync.config.override`)
- `.xe/features/workflow-context/spec.md` (`FR:execution-modes.default`)
