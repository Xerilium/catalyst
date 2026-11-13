# Explore: Workflow Customization and Built-in Defaults

Draft for review. No specs or code changed. File renamed from `explore-pr-workflow-customization.md`: scope now covers all workflows plus built-in defaults (repo setup, feature layout), not only PR hooks. Design (Impeccable) moved to its own explore: [236](https://github.com/Xerilium/catalyst/pull/236).

**Prompted by**:

1. FinOps Hubs (FH) keeps a 660-line custom `/pr-sweep` command, and [FH 880](https://github.com/allytehq/finops-hubs/pull/880) adds another FH-only merge gate to it. Catalyst's `/catalyst:pr-sweep` ([133](https://github.com/Xerilium/catalyst/pull/133), [192](https://github.com/Xerilium/catalyst/pull/192)) is meant to replace it, but it has no way to carry repo-specific behavior. Question: How should the sweep (and the other PR workflows) support per-repo customization?
2. Roland's repo-setup feedback (Allyte marketplace repo) hits the same gap in `init`, `create`, `change`, `fix`, and `blueprint`. Question: Does one customization model cover every workflow, and what must be built-in behavior instead?
3. Review of Roland's allyte-marketplace spec PR 24: 9 flat, prefix-named feature specs that assume still-open stack decisions, and no `engineering.md`, `customer-journey.md`, `standards/`, or `process/` ever created. `init` was not run in full and the one `blueprint` was deleted. Question: What should Catalyst make the default so a repo cannot end up there?

**Sections**: Findings through Risks cover the PR slice. [Every workflow](#every-workflow) generalizes it, [Roland feedback map](#roland-feedback-map) maps his five points. [Default feature patterns](#default-feature-patterns-pit-of-success) covers item 3. Then [Phased plan](#phased-plan) and [Open questions](#open-questions-for-michael).

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

### Hook points (proposed, PR slice)

Addressed as `at: "{workflow}.{phase}:{kind}"` (grammar is shared with every other workflow; see [Every workflow](#every-workflow)).

| `at`                     | Fires                                                                   | Kind             | v1  |
| ------------------------ | ----------------------------------------------------------------------- | ---------------- | --- |
| `pr-sweep.certify:gate`  | Sweep Phase 3a, after built-in conditions hold, before `Finalized`      | Gate (can block) | Yes |
| `pr-*.pass:after`        | After a PR's review or update pass, before reconcile (all PR workflows) | Step (can warn)  | Yes |
| `pr-*.reconcile:after`   | After `reconcile-pull-request.md`                                       | Step             | Yes |
| `pr-*.reconcile:replace` | In place of `reconcile-pull-request.md`                                 | Replacement      | Yes |
| `pr-*.pass:before`       | After claim, before the pass                                            | Step or skip     | No  |
| `pr-sweep.survey:source` | Adds or filters queue entries and supplies triage verdicts              | Source           | No  |

No `merge` hook: the merge requires `Finalized` at the same head SHA, so `certify` already gates it.

### Config shape (proposed)

In `.xe/config/catalyst.json`, same style as `labels` and `execution-mode`. One flat, ordered `hooks` array (replaces the earlier `pull-requests.hooks` object so one schema serves every workflow):

```json
{
  "hooks": [
    {
      "id": "ui-browser-run",
      "at": "pr-sweep.certify:gate",
      "playbook": ".xe/hooks/ui-browser-run.md",
      "when": {
        "labels": ["autopilot"],
        "paths": ["apps/portal/**", "!**/*.test.*", "!e2e/**", "!**/*.md"]
      },
      "runs-code": true,
      "on-error": "block"
    },
    {
      "id": "retitle",
      "at": "pr-*.pass:after",
      "playbook": ".xe/hooks/commit-title.md",
      "when": { "role": "author" }
    },
    {
      "id": "hotfix",
      "at": "pr-*.pass:after",
      "playbook": ".xe/hooks/sre-postmortem.md",
      "when": { "labels": ["Hotfix 🔥"] }
    },
    {
      "id": "fh-reconcile",
      "at": "pr-*.reconcile:replace",
      "playbook": ".xe/hooks/reconcile.yaml"
    }
  ]
}
```

- **`at`**: `{workflow}.{phase}:{kind}`; `*` and groups (`feature` = create+change+fix, `pr-*`) allowed
- **`playbook`**: Path to `.md` or `.yaml`; resolved like any playbook (`./` as-is, else `.xe/playbooks`, then package)
- **`when`**: All keys must match. `labels` accepts label ids (`autopilot`) or literal names; `paths` are globs over changed files with `!` negation; `role` is `author` or `reviewer`
- **`on-error`**: `block` (default for `:gate`) or `warn` (default elsewhere); applies when the hook fails, times out, or returns no valid result
- **Inputs passed to every PR hook**: `pr-number`, `head-sha`, `role`, `workflow`, `changed-files`, `labels`, `is-cross-repository`, `execution-mode`
- **Result contract**: `result` (`pass`, `block`, `warn`, `skip`), `reason`, optional `report` line. YAML returns it as outputs; Markdown ends with one fenced JSON block. `block` on `certify` skips `Finalized` and the report shows `🧭 Decide` with the reason
- **Order**: Array order, sequential; first `block` stops the chain
- **Where they fire**: Review, update, loop (once, not per round), and sweep (via the delegated pass, never twice). `certify` is sweep-only

### Precedence

1. Invocation arguments (for example `no-hooks`, `skip-hook {id}`)
2. `hooks` in the project config
3. Catalyst built-in behavior (no packaged hooks in v1)

Hooks add to built-in steps and gates; they never remove or loosen them. `reconcile:replace` is the only replacement and transfers merge-safety ownership to the replacement.

### How FH maps

| FH custom behavior (today)                          | Mapping                                                                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 880 UI browser run                                  | `certify` hook, Markdown playbook, `when.paths`; §5a text moves into that file, the FR stays in FH |
| Hotfix `sre` pass                                   | `after-pass` hook, `when.labels: ["Hotfix 🔥"]`; hook keeps its own once-per-SHA marker            |
| `/commit-title` retitle                             | `after-pass` hook, `when.role: author`                                                             |
| `pnpm pr <n>` + GitHub merge gate                   | `pr-*.reconcile:replace` YAML wrapping `pnpm pr`; Catalyst's merge step does not run               |
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
- **Replacing reconcile drops merge safety**: `reconcile:replace` must be explicit and reported in the sweep's output so it is never silent
- **Certification marker coupling**: Certify writes the `Finalized at {sha}` comment and reconcile reads it. Replacing one without the other breaks the head-SHA match; a replacement must own both or keep the marker text
- **Permissions**: Skill `allowed-tools` is static, so a hook needing `pnpm` or Playwright depends on the repo's `.claude/settings.json`. The sweep's existing denial-as-gap rule covers failures; docs must say so
- **Cost**: Each hook is a subagent and worktree; `when` filters keep it to the PRs that need it. No built-in once-per-SHA cache in v1, so hooks own idempotence (FH's hotfix and browser-run already key on SHA)
- **Fail-open vs fail-closed**: `certify` defaults to `block` so a broken gate cannot silently pass
- **Drift and typos**: Add a `catalyst check` rule that hook paths exist and ids are unique

## Every workflow

### Same mechanism, more seams

PR hooks are one case of "run repo-specific context, steps, or gates at a phase boundary". Every Catalyst workflow already has named phases with STOP gates, so the same `hooks` array and `at` grammar apply.

| Workflow                                        | Phases (the `phase` in `at`)                    | Seams that matter                                                                      |
| ----------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `init`                                          | `scope`, `implement`, `review`                  | `implement:scaffold` (repo files), `scope:context`                                     |
| `blueprint`                                     | `scope`, `plan`, `implement`, `review`          | `plan:context` (standards, roadmap rules)                                              |
| `create`, `change`, `fix`                       | `scope`, `spec`, `plan`, `implement`, `closure` | `spec:context`, `plan:gate`, `implement:after`, `closure:gate` (`feature` = all three) |
| `explore`                                       | `scope`, `investigate`, `review`                | `investigate:context`                                                                  |
| `rollout`                                       | none (dispatcher)                               | Fires the target workflow's hooks; no hooks of its own                                 |
| `pr-review`, `pr-update`, `pr-loop`, `pr-sweep` | `pass`, `certify` (sweep), `reconcile`          | As in Findings                                                                         |

| Kind              | What it does                                                        | Runs code    | Example                                          |
| ----------------- | ------------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| `context`         | Injects files or globs as read-only input to the phase; no playbook | No           | `design-system.md` into `create.spec`            |
| `before`, `after` | Runs a playbook around a phase                                      | Yes          | Lighthouse run after `create.implement`          |
| `gate`            | Blocks phase exit until `pass`; agent cannot skip                   | Yes          | Security review before `create.plan` is approved |
| `scaffold`        | `init` only: files or steps to create; `detect` skips when present  | Writes files | CI pipeline, issue templates                     |
| `replace`         | Swaps a built-in step; `reconcile` only                             | Yes          | FH reconcile                                     |

New `when` keys for local workflows: `feature` (feature-id globs), `phase-input` (for example `ui: true` from scope). Existing keys (`paths`, `labels`, `role`) unchanged.

```json
{
  "hooks": [
    {
      "id": "design-system",
      "at": "feature.spec:context",
      "files": [".xe/standards/design-system.md"],
      "when": { "feature": ["landing-*", "*-ui"] }
    },
    {
      "id": "a11y-audit",
      "at": "feature.closure:gate",
      "playbook": ".xe/hooks/a11y-audit.md",
      "when": { "feature": ["landing-*", "*-ui"] },
      "runs-code": true
    },
    {
      "id": "ci-pipeline",
      "at": "init.implement:scaffold",
      "playbook": ".xe/hooks/ci-pipeline.md",
      "detect": ".github/workflows/ci.yml"
    }
  ]
}
```

### Shared rules

| Rule                 | Behavior                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tighten-only         | Hooks add context, steps, and gates; never skip or loosen a built-in gate. `reconcile:replace` stays the single exception                         |
| Where config is read | Local workflows: working tree (the user's own repo). PR workflows on someone else's PR: default branch only (see Risks)                           |
| Execution modes      | `gate` under `final-review` and `autonomous` blocks and surfaces at the final review; under `interactive` it asks. `context` never prompts        |
| Context cost         | `context` files load only when `when` matches; each file listed in the phase's report so the user sees what shaped the output                     |
| Inputs and results   | Same result contract (`pass`, `block`, `warn`, `skip`); local hooks also get `workflow`, `phase`, `feature-id`, `execution-mode`, `changed-files` |
| Config check         | `catalyst check` validates `at` values against known workflow phases, unique ids, and that `files` and `playbook` paths exist                     |

### What hooks are not for

Hooks carry repo-specific extras. Behavior every Catalyst user needs (amend a spec, size a feature, honor context docs) must be built in, or each repo re-solves it. Three of Roland's five points are built-in fixes; hooks only close the repo-specific tail.

## Roland feedback map

Source: Roland, Allyte marketplace repo setup. "Today" is verified against the current playbooks and specs.

| #   | Feedback                                       | Cause today                                                                                                                                                                                           | Built-in behavior (all repos)                                                                                                                                      | Init scaffold                                                           | Hook point (this repo only)                                               |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | DevOps foundation before features              | `init` renders only `.xe/` context docs (product, engineering, architecture, process). Nothing scaffolds the repo; blueprint's first wave is product features                                         | Blueprint seeds a Phase 0 "Foundation" wave from init's foundation rollout                                                                                         | Catalog of foundation items, detected vs missing (below)                | `init.implement:scaffold` for repo-specific pipelines                     |
| 2   | Agent resists requirement changes mid-build    | `create`, `change`, `fix` say: stop immediately, return to the spec phase, never deviate without approval. `feature-scope` says push back on the design. No light path; the agent defends the spec    | New `spec-amend` action (below); stance rule: requirement changes after learning are expected                                                                      | None                                                                    | Optional `feature.amend:gate` for orgs that need sign-off                 |
| 3   | Fear of low-quality output; no guardrails      | Architecture and engineering templates hold principles and stack. Spec template has Architecture Constraints but nothing enforces NFRs, security, stability, or design. Nothing guides a landing page | NFR coverage check in spec; code reviewed against standards in closure; design support is out of scope here ([236](https://github.com/Xerilium/catalyst/pull/236)) | Standards stubs from 3-4 init questions: `nfr`, `security`, `stability` | `feature.spec:context`, `feature.closure:gate` filtered by `when.feature` |
| 4   | Checkpoint mode spec ignored gathered know-how | `context-files` is read at scope (Step 1.5) but `feature-spec.md` has no context input and no step requires FRs to trace to those docs. No persistent home for know-how                               | Context binding and coverage table (below)                                                                                                                         | `.xe/context/` library with `index.md`; init offers to import docs      | `feature.spec:context` for always-on docs                                 |
| 5   | Unclear feature sizing                         | `feature-scope` offers "Too large: split" with no criteria; blueprint records `complexity` with no rubric                                                                                             | Sizing rubric in scope and blueprint plan; `catalyst check` warns on oversize spec                                                                                 | `sizing` thresholds written to config with defaults                     | None                                                                      |

### 1. Foundation scaffolding

Init writes cheap, deterministic items directly and emits the rest as a foundation rollout that blueprint runs first.

| Item                                   | Init action                                       | Exists in Catalyst                                                 |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| Labels                                 | Direct: run label sync                            | `sync-repo-labels.yaml`                                            |
| AI instructions (`CLAUDE.md`, etc.)    | Direct: render from product and engineering docs  | `setup-claude-plugin.yaml`, `setup-copilot-plugin.yaml`            |
| Standards stubs (#3), context dir (#4) | Direct: render templates                          | New templates                                                      |
| PR sweep and Autopilot config          | Direct: write `execution-mode` and `labels` keys  | Config keys exist                                                  |
| CI pipelines, test infra               | Foundation rollout feature: needs stack decisions | `devops-build`, `devops-release` specs (Catalyst's own, as models) |
| Release and environments               | Foundation rollout feature, optional              | None                                                               |

### 2. Spec amendment path

New action `spec-amend.md`, called from Phase 3 of `create`, `change`, and `fix` instead of "stop immediately":

1. Trigger: new information from the code or tests, or the user changes a requirement mid-build
2. Record one line of what was learned; classify the change (clarify, add, change, remove FR)
3. Edit the spec in place (it is a living document); log the reason via `decision-record.md` (Why = what was learned, Rejected = the old behavior); run `catalyst check`
4. List affected tests and code; resume Phase 3 at the tests
5. Approval by mode: `interactive`, `checkpoint-review`, `spec-review` ask once (AUQ); `final-review`, `autonomous` apply, log `Amend: {what} — {why}` in rollout Notes, and surface at the final review. Removing or renumbering an FR always asks (existing rule)
6. Stance line in each playbook: new information changing the plan is the process working; amend, do not defend the old spec

### 3. Guardrails

| Layer          | Behavior                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Standards docs | `.xe/standards/{nfr,security,stability}.md`: short stubs rendered at init from 3-4 questions (uptime target, data sensitivity, UI or brand present). Design is separate ([236](https://github.com/Xerilium/catalyst/pull/236)) |
| Auto-read      | Spec, plan, and closure read every standards doc by convention; no config needed                                                                                                                                               |
| Spec           | Each NFR category in `nfr.md` needs a line in the spec or `N/A: {reason}`; `catalyst check` flags a missing category                                                                                                           |
| Closure        | Review compares the diff to the standards and lists deviations; repo-specific audits (a11y, Lighthouse) attach as `feature.closure:gate` hooks                                                                                 |

### 4. Context binding

| Step             | Behavior                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope            | Record `context-files` and matching `.xe/context/index.md` entries in rollout `## Context`; offer matches by feature id and keywords                  |
| Spec             | `feature-spec.md` takes `context` as input; every Q round shows which docs informed the proposed FRs                                                  |
| Before approval  | Coverage table in the approval AUQ: each context doc or section maps to an FR id or `Not used: {reason}`. Unmapped items block approval in every mode |
| Autonomous modes | Table is written to rollout Notes so a reviewer can see what was ignored                                                                              |

### 5. Sizing rubric (defaults to calibrate on Roland's repo)

Recommend a split when any holds: more than one persona outcome that ships alone; more than about 6 scenarios or 40 FRs; more than one layered interface; plan over about 15 tasks; spans more than one blueprint wave. Output: sequenced efforts as a multi-run rollout (existing mechanism). Thresholds live in config `sizing` so repos can tune them.

## Default feature patterns (pit of success)

### Roland's gap: init and blueprint never ran

Evidence from PR 24: `.xe/engineering.md`, `.xe/standards/`, and `.xe/process/development.md` never existed in history; `.xe/features/blueprint.md` was created once (2 features) and deleted on 2026-09-25; the 9 service specs were added ad hoc through `create`/`change` with no decomposition. Catalyst did not stop him: `feature-code.md` halts on missing templates and architecture docs, but no playbook checks `engineering.md`, `process/development.md`, or a blueprint.

### Preflight (proposal)

Runs at the start of `create`, `change`, and `fix`, before Phase 0 scope. Read-only checks, one report line each.

| Check                                                                    | If missing                                                                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `.xe/product.md`, `.xe/architecture.md`                                  | Offer `/catalyst:init`                                                                          |
| `.xe/engineering.md`, `.xe/process/development.md`                       | Offer `/catalyst:init` (renders them)                                                           |
| `.xe/customer-journey.md` when the product has actor workflows           | Offer `/catalyst:init` (renders it; `product.md` links it)                                      |
| Blueprint or feature map (`.xe/features/architecture-map.md`)            | Offer `/catalyst:blueprint` when the repo has more than N features or the request spans several |
| `architecture.md` rows still `Open decision` that the new FRs would name | Block FRs that name the technology until settled, or the user passes `spike`                    |

| Mode                                        | Behavior                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `interactive`, `checkpoint-review`          | AUQ: run init/blueprint now, skip once (logged in rollout Notes), or cancel                             |
| `spec-review`, `final-review`, `autonomous` | Cannot ask mid-run: stop before scope and report what is missing; `--skip-preflight` logs and continues |

Cheap to run, skippable, and logged, so it never traps a repo that chose a lean setup. `catalyst check` reports the same missing files so CI sees them.

### Layout: feature kinds

Global defaults, renameable in `.xe/config/catalyst.json`. The kind is a feature ID prefix (works today: `{feature-id}` is a kebab slug); nested `features/api/...` directories need ID support and are a later option.

| Kind   | Feature ID         | Code path               | Owns                                                                       |
| ------ | ------------------ | ----------------------- | -------------------------------------------------------------------------- |
| API    | `api-<resource>`   | `src/api/<resource>/`   | HTTP surface for one resource; auth, validation, calls to domain; no logic |
| Client | `client-<system>`  | `src/clients/<system>/` | One outbound system; its fake lives beside it                              |
| Page   | `page-<name>`      | `src/pages/<name>/`     | UI only; calls `api-*`                                                     |
| Hook   | `hook-<source>`    | `src/hooks/<source>/`   | Inbound events (webhooks)                                                  |
| Job    | `job-<name>`       | `src/jobs/<name>/`      | Timers and batch work                                                      |
| Domain | `domain-<concept>` | `src/domain/<concept>/` | Entities and rules (entitlement, assignment); shared entities live here    |
| Shared | `shared-<concern>` | `src/shared/<concern>/` | Cross-cutting (sign-in, telemetry)                                         |
| Infra  | `infra-<scope>`    | `infra/<scope>/`        | Hosting, identity, store provisioning                                      |

Rules:

| Rule                 | Default                                                                                                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One kind per feature | A spec with a page and an API is two features. `catalyst check` warns on no kind, or more than one interface kind                                                                                                                      |
| Naming               | `<kind>-<noun>`; the noun is the thing owned, not the project (`api-purchases`, not `marketplace-purchases-api`). Resource names match across API, domain, and page                                                                    |
| Dependency direction | `page -> api -> domain -> client`; `hook, job -> domain -> client`; `shared` may be used by `api`, `page`, `hook`, `job`; `client` depends on nothing; no feature depends on `infra-*`; shared entities never live in an infra feature |
| Enforcement          | `catalyst deps` fails on a violation of `layers` in config; `catalyst check` warns on naming                                                                                                                                           |
| Code layout          | `architecture.md` template's Repository Structure mirrors the kinds; `init`/`blueprint` fill it; `traceability.paths.code` is derived from it; `check` fails when a code root is not in `catalyst.json`                                |
| Where does this go?  | `create` asks it from the tree and proposes a path; never a flat `*-core` file name                                                                                                                                                    |
| Grouping             | Blueprint groups features by functional area; a committed, generated `.xe/features/README.md` index lists them by kind and area (survives deleting the working `blueprint.md`)                                                         |

Config shape (proposed):

```json
{
  "featureKinds": {
    "api": "src/api",
    "client": "src/clients",
    "page": "src/pages",
    "hook": "src/hooks",
    "job": "src/jobs",
    "domain": "src/domain",
    "shared": "src/shared",
    "infra": "infra"
  },
  "layers": {
    "page": ["api", "shared"],
    "api": ["domain", "shared"],
    "hook": ["domain", "shared"],
    "job": ["domain", "shared"],
    "domain": ["domain", "client"],
    "shared": ["domain", "client"],
    "client": [],
    "infra": ["infra"]
  }
}
```

Applied to PR 24: `client-saas-fulfillment`, `client-hub-service`, `api-purchases` (activation), `api-purchase-intents`, `api-saas-subscriptions` (list, assign, share), `domain-entitlement`, `domain-saas-subscription` (shared entities), `hook-marketplace-webhook`, `job-reconciliation`, `page-activation`, `page-subscriptions`, `shared-sign-in`, `infra-service`. This removes the god feature, the backwards webhook-to-sign-in dependency, and the 3 naming schemes.

### Rename path

Kinds are defaults, not a cage; repos with existing flat IDs need a migration path.

| Need                        | Behavior                                                                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rename a kind or prefix     | Edit `featureKinds`; `catalyst check` uses the new names                                                                                                                                  |
| Rename or split one feature | New `catalyst rename-feature <old> <new>`: moves `.xe/features/<old>/`, rewrites `FR:<old>/` refs in specs, `@req` tags, `dependencies:`, rollouts, and config globs; prints a diff first |
| Existing flat repos         | `check` warns only (no failures) until a `layers` block exists; `blueprint` offers a one-time "propose kind mapping" pass that emits a rename rollout                                     |
| Opt out                     | `featureKinds: {}` disables kind and layering checks                                                                                                                                      |

### Other PR 24 findings folded in

| PR 24 problem                                                                  | Catalyst change                                                                                                   | Where it lands                                     |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Specs name tech while the stack is an open decision (#5)                       | Spec gate (preflight row above); spec lint flags GUIDs, `api-version`, SKUs, routes inside FRs (#13)              | Phase 5 (gate), Phase 6 (lint)                     |
| Query-shaped FR vs store limits (#6)                                           | `feature-plan.md` checklist item: each query FR checked against the chosen store                                  | Phase 5                                            |
| Project-wide decisions filed per feature; stray docs (#9)                      | Route to `.xe/features/design-decisions.md`; allow only `spec`, `design-decisions`, `research`, `runbook`         | Phase 5 (text), Phase 6 (check)                    |
| Stale PR body, "Addressed" replies, no PR CI, over-long `description` (#10-12) | Default CI workflow running `catalyst check`; PR-body generator from the diff; `pr-update` shows the changed line | Separate follow-up (PR workflows; ties to Phase 3) |

## Recommendation

Option 2 for hooks, but ship behavior fixes first because most of Roland's feedback does not need hooks:

1. **Built-in first**: spec amendment, context binding, sizing rubric (playbook edits, no engine work), plus the preflight and kind-naming text (same playbooks, same PR)
2. **Then defaults for quality**: standards stubs and foundation scaffolding at init/blueprint
3. **Then enforcement**: kind and layering rules in `catalyst check`/`deps`, rename command
4. **Then hooks**: PR slice (unblocks FH), then the same schema across every workflow
5. **Separately**: Propose breadcrumb/resume/liveness upstream as generic sweep features rather than hooks

Rationale: Smallest changes close the loudest complaints (2, 4, 5). Hooks are the right tool for repo-specific gates (FH 880, an a11y audit) and wrong for universal behavior. Feature layout is universal too, so they ship as defaults that a repo can rename or turn off, not as hooks each repo must write. One schema for all workflows avoids a PR-only mechanism that later needs a second one.

## Phased plan

| Phase | Scope                                                                                                                                                                                                                                                                                                                                                                                          | Size   | Closes                                        | Depends on                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------- | ----------------------------------------- |
| 1     | Playbook text only: `spec-amend.md` + stance line in `create`, `change`, `fix`; sizing rubric in `feature-scope` and blueprint plan; `context` input and coverage table in `feature-spec.md`; FRs in `feature-workflow`                                                                                                                                                                        | Small  | Roland 2, 4, 5                                | None                                      |
| 2     | Templates and init: standards stubs, `.xe/context/` library, init questions, direct scaffolds (labels, AI instructions, config), foundation rollout, blueprint Phase 0 wave; FRs in `init-workflow`, `engineering-context`, `blueprint-workflow`                                                                                                                                               | Medium | Roland 1, 3 (default)                         | Phase 1 for context binding               |
| 3     | Hook engine v1, PR slice: unified `hooks` schema, `pr-sweep.certify:gate`, `pr-*.pass:after`, `pr-*.reconcile`, default-branch read, fork rule, `catalyst check` rules; port FH's three behaviors                                                                                                                                                                                              | Medium | FH 880, hotfix, retitle                       | None (parallel to 1 and 2)                |
| 4     | Generalize hooks: `context`, `before`, `after`, `gate`, `scaffold` across `init`, `blueprint`, `feature`, `explore`; local-workflow inputs                                                                                                                                                                                                                                                     | Medium | Roland 1, 3 (repo-specific)                   | Phase 3                                   |
| 5     | **Preflight + feature-kind text**: preflight at start of `create`/`change`/`fix` (offer init/blueprint, open-decision spec gate); `<kind>-<noun>` naming and "where does this go?" in `feature-scope` and blueprint plan; `architecture.md` template Repository Structure by kind; store-capability check in `feature-plan`; decision routing; FRs in `feature-workflow`, `blueprint-workflow` | Small  | Roland PR 24 #1-3, 5-7, 9; init/blueprint gap | None; share Phase 1's PR (same playbooks) |
| 6     | **Kind enforcement**: `featureKinds` and `layers` config, `catalyst check` naming/one-kind/code-root rules, `catalyst deps` layering failure, derived `traceability.paths.code`, generated `.xe/features/README.md`, spec lint (GUID, `api-version`, SKU), `catalyst rename-feature`, `blueprint` kind-mapping pass for flat repos                                                             | Medium | PR 24 #1, 4, 7, 9, 13                         | Phase 5                                   |
| Later | `pr-*.pass:before`, `survey`, engine-level once-per-SHA cache, report statuses, packaged hooks shipped with Catalyst (a11y, security), init profiles by stack, nested `features/<kind>/` directories, default PR CI workflow and PR-body generator (PR 24 #10-12)                                                                                                                              | n/a    | n/a                                           | On demand                                 |

### Ordering

| Wave | Run in parallel                                                                       | Why                                                                               |
| ---- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A    | Phase 1 + 5 (one PR, `feature-workflow`), Phase 3 (PR slice, `pull-request-workflow`) | All text/engine work with no dependencies; Phase 1 and 5 touch the same playbooks |
| B    | Phase 2 (init/blueprint templates)                                                    | Shares the init and blueprint playbooks and templates                             |
| C    | Phase 6, Phase 4                                                                      | Need the schema from 5 and 3; independent of each other                           |

Phases 1 and 3 are independent and can run in parallel as separate PRs. Phase 5 is the cheapest fix for Roland's PR 24 problems and should not wait for anything.

## Open questions for Michael

Hooks and PR slice (from the earlier draft):

1. Does FH keep its own reconcile and merge path (`pnpm pr` plus the GitHub merge workflow), so v1 needs `reconcile:replace`? Or does FH migrate to Catalyst's reconcile and retire `pr-lifecycle-core`, which would drop `replace` from v1. Recommendation: Keep FH's now, since it also runs on events when no agent is running
2. Are hooks tighten-only (can block `Finalized`, never loosen Autopilot rules), with `reconcile:replace` as the single exception? Recommendation: Yes
3. Should `pr-*.pass:after` and `reconcile` apply to review, update, and loop as well as sweep in v1, or sweep only? Recommendation: All four (one shared mechanism); `certify` is sweep-only
4. Is hook-owned idempotence acceptable for v1, or do you want a Catalyst-provided once-per-head-SHA cache (adds a hidden PR comment per hook)? Recommendation: Hook-owned for now
5. Should FH's breadcrumb/resume/liveness be proposed upstream? Recommendation: Yes, as a separate item

All-workflow extension and Roland's feedback:

6. **Ship order**: Do Phase 1 (playbook-only amend, context, sizing) and Phase 5 (preflight, kind text) before any hook engine work, since they close three of Roland's five plus PR 24's worst problems without new schema? Recommendation: Yes; run Phase 3 in parallel for FH
7. **Init scaffolding stance**: Does init write foundation files directly with opinionated defaults (labels, AI instructions, config, standards stubs) and only roll out CI and test infra as features? Or only emit a foundation rollout and write nothing itself? Recommendation: Direct for cheap deterministic items, rollout for anything needing stack decisions
8. Amend autonomy: Under `final-review` and `autonomous`, may the agent apply a spec amendment without asking and surface it at the end? Recommendation: Yes, with the `Amend:` log; FR removal or renumbering still asks
9. Standards and know-how location: New project-owned `.xe/standards/` (NFR, security, stability) and `.xe/context/` (know-how library) next to existing `.xe/` docs, or fold both into `.xe/architecture.md` and `.xe/engineering.md` sections? Recommendation: Separate files, short stubs, so `context` hooks and the coverage table can point at them
10. Sizing thresholds: Start with the defaults above (6 scenarios, 40 FRs, 15 tasks) and tune from Roland's repo, or set none and rely on judgment? Recommendation: Defaults, warn only
11. Should Catalyst ship packaged hooks (a11y, security, Lighthouse) later, or stay hook-free and let repos write them? Recommendation: Defer; learn from Allyte's first hooks

Feature patterns (PR 24):

12. **Kind layout as default**: Ship the `<kind>-<noun>` feature IDs, `src/` paths, and `page -> api -> domain -> client` rule as global defaults (warn-only, renameable or off via `featureKinds`), or make it opt-in at init? Recommendation: Default on, warn-only; `catalyst deps` fails only once a repo adds a `layers` block
13. **Preflight stance**: When `engineering.md`, `process/development.md`, or a blueprint is missing, ask in interactive modes and stop with a report in autonomous modes, or always only warn? Recommendation: Ask/stop as proposed, skippable and logged
14. **Phase 5 sharing Phase 1's PR**: Fold preflight and kind text into the Phase 1 `feature-workflow` change, or keep a separate PR? Recommendation: Same change (same playbooks, avoids conflicts); sized Small

## Next step

On approval: Run `/catalyst:change feature-workflow` for Phases 1 and 5 together (`FR:amend.*`, `FR:context.binding.*`, `FR:sizing.*`, `FR:preflight.*`, `FR:feature-kinds.naming`; edit `create-feature.md`, `update-feature.md`, `repair-feature.md`, `feature-scope.md`, `feature-spec.md`, `feature-plan.md`, the `architecture.md` template; add `spec-amend.md`). In parallel, `/catalyst:change pull-request-workflow` for Phase 3 (`FR:hooks.*`: config shape, firing points, result contract, precedence, default-branch read, fork rule; update `sweep-pull-requests.md`, `reconcile-pull-request.md`, and the review, update, and loop playbooks; add the config key to `catalyst check`). Then port FH's three behaviors into hook files in FH.

## References

- [FH 880](https://github.com/allytehq/finops-hubs/pull/880) (changes `.claude/commands/pr-sweep.md` and `devops-review` spec)
- [Catalyst 133](https://github.com/Xerilium/catalyst/pull/133) and [192](https://github.com/Xerilium/catalyst/pull/192) (sweep and Autopilot rules)
- `src/resources/playbooks/sweep-pull-requests.md`, `reconcile-pull-request.md`
- `.xe/features/pull-request-workflow/spec.md` (`FR:sweep`, `FR:lifecycle`)
- `.xe/features/playbook-definition/spec.md` (`FR:provider.search-path`)
- `.xe/features/repo-labels/spec.md` (`FR:sync.config.override`)
- `.xe/features/workflow-context/spec.md` (`FR:execution-modes.default`)
- `src/resources/playbooks/create-feature.md`, `update-feature.md`, `repair-feature.md` (§ Spec Changes During Implementation)
- `src/resources/playbooks/actions/feature-scope.md` (Step 1.5, Step 2 sizing), `feature-spec.md`, `decision-record.md`
- `src/resources/playbooks/start-initialization.md`, `start-blueprint.md`
- `.xe/features/init-workflow/spec.md`, `.xe/features/feature-workflow/spec.md`
- `src/resources/playbooks/actions/feature-code.md` (halts on missing templates and architecture docs only), `feature-plan.md`
- `src/resources/templates/specs/architecture.md` (Repository Structure), `src/resources/standards/auq.md` (model for a shipped standard)
- allyte-marketplace PR 24 (Roland): flat feature specs, no `engineering.md`/`standards/`/`process/`, deleted `blueprint.md`
