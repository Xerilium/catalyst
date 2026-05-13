---
features: [ai-provider, cli-init, playbook-actions-io, playbook-actions-data]
status: in-progress
created: 2026-05-11
last_updated: 2026-05-13
runs:
  - 1: complete
  - 2: complete
  - 3: complete
  - 4: complete
---

<!-- markdownlint-disable no-duplicate-heading -->

# Rollout: cli-init

## Active State

**Model**: Replace postinstall with a `catalyst init` CLI command driven by a pure-YAML playbook. Install behavior moves into ai-provider's `FR:commands` scenario, invoked by a shared install-ai-providers playbook. Specs describe outcomes — implementation evolves across Runs 1-4 from script-action internals to native primitives without spec churn. Run 1 (DONE) ships postinstall replacement; Runs 2-4 dogfood newly-built native primitives (file-list, json-parse/stringify, gitignore-write).

**Decisions**:

- New feature `cli-init` owns the CLI surface — keeps `cli-engine` framework-only, leaves room for next-release merge with `init-workflow`.
- Specs scenario-focused — Run 1 spec language is implementation-agnostic so Runs 2-4 refactors don't churn spec FRs.
- New feature `playbook-actions-data` for JSON primitives — anticipates more data-format primitives (YAML, CSV) rather than overstuffing playbook-actions-io.
- `gitignore-write` dedicated action over generic `file-merge` — second known consumer (feature-context FR:index.gitignore) justifies specificity.
- PROVIDER_COMMAND_CONFIGS refactored to JSON — provider catalog becomes declarative data, aligned with no-code north star.
- Run 1 execution mode: final-review (work directly on files, no branch/staging/commits, present for review at end).
- Runs 2-4 execution mode: interactive (user step-back, then progressive engagement).

**Open**: None at rollout-creation. Runs 2-4 will surface scope decisions in their own Phase 0 sweeps.

**Next**: All 4 runs complete. Rollout closeout pending — final review of cli-init feature scope, traceability, and PR/cleanup decision.

**Pins**:

- `src/setup/postinstall.ts` — current install logic to port (delete at end of Run 1)
- `src/ai/commands.ts:41-` — `generateProviderCommands` logic to port to YAML
- `src/ai/providers/command-configs.ts` — TS constant to convert to JSON
- `src/resources/cli-commands/kitchen-sink.yaml` — YAML playbook convention reference
- `src/resources/playbooks/update-pull-request.yaml` — non-CLI YAML playbook convention reference
- `.xe/features/cli-engine/spec.md:45-56` — FR:cli.dynamic governs init.yaml discovery (no spec change needed)

**Assumptions**:

- `playbook` action (composition) supports invoking another YAML playbook by id from inside a CLI-discovered playbook
- Parallel cli-engine rename to its final state before Run 1 implementation begins (currently in validation per user note)
- Provider class imports of `command-configs.json` work cross-build (dist + src) — to validate during implementation

## Overview

Eliminates the npm `postinstall` script (buggy in current release; blocked by default in pnpm 10+) and replaces it with an explicit `catalyst init` CLI command. The CLI command is implemented as a YAML playbook in `src/resources/cli-commands/init.yaml`, discovered via the existing `FR:cli-engine/cli.dynamic` mechanism. It invokes a shared install playbook owned by ai-provider that performs the same command-file generation and legacy-untracking work today done by postinstall.

The shared install playbook is the focal point of Catalyst's "pure YAML, no code CLI" north star. Run 1 ships it with `script`-action internals to unblock pnpm users immediately. Runs 2-4 progressively introduce broadly-useful native primitives (`file-list`, `json-parse`/`json-stringify`, `gitignore-write`) and refactor the install playbook to use them. Each run is independently shippable.

Specs are written scenario-focused (outcome-based: "AI commands placed", "legacy files untracked", "gitignore present and correct") so that the implementation evolution across runs does not require spec changes. The set of FRs landed in Run 1 stays stable through Run 4.

## Run 1: Install via shared YAML playbook (script-action internals)

### Pre-implementation

- [ ] Confirm parallel cli-engine rename agent is done (its work doesn't block Run 1 but conflicts during implementation should be avoided)
- [ ] Verify `playbook` (composition) action behavior with a CLI-discovered playbook invoking a non-CLI playbook by id — quick spike if unclear

### Features

#### ai-provider

- [x] Spec: Consolidate `FR:commands` as the install scenario — `@playbook` interface, behavior FRs (`.discovery`, `.generate`, `.transform`, `.legacy`, `.gitignore-folder`, `.gitignore-flat-new`, `.gitignore-flat-merge`, `.idempotent`). Removed standalone `FR:install` and `FR:gitignore` scenarios (now subsumed). Deprecation markers added for: `commands.migrate` → `commands.legacy`, `gitignore.folder/flat-new/flat-merge/header/idempotent` → `commands.gitignore-*` / `commands.idempotent`
- [x] Source/test @req references updated to new FR IDs
- [x] Refactor: Provider command configs now generated at build time from provider class instances (scripts/generate-command-configs.ts → dist/ai-providers/command-configs.json). NO source-of-truth file in repo; each provider class declares its own `commands` config inline.
- [x] Implement: `src/resources/playbooks/install-ai-providers.yaml` ships install behavior via script + bash + for-each. Reads catalog from `catalyst://ai-providers/command-configs.json`. Path resolves to dist-emitted file at consumer install time.
- [x] Tests: `tests/integration/cli/init.test.ts` written. Step 1 (file generation) verified end-to-end (7/11 tests pass). Step 2 (legacy untracking via bash-in-for-each) hits a `stdin.unref` engine bug — DEFERRED to Run 2. File-generation behavior is fully working.
- [x] Cleanup: Deleted `src/setup/`, `src/ai/commands.ts`, `src/ai/providers/command-configs.ts`, `tests/setup/postinstall.test.ts`, `tests/ai/commands.test.ts`. Removed `postinstall` script from `package.json`. Replaced postinstall call in `scripts/build.ts` with `catalyst init`. Refactored `scripts/inject-feedback.ts` to read generated JSON (with DI hook for tests).

#### cli-init (new)

- [x] Spec: Created `.xe/features/cli-init/spec.md` with `FR:init` scenario (`.@command`, `.@playbook`, `.ai-commands`, `.handoff`, `.idempotent`). 100% traceability coverage.
- [x] Implement: `src/resources/cli-commands/init.yaml` discovered via FR:cli.dynamic. Composes install-ai-providers playbook. Verified working in consumer (finops-hubs) install.
- [x] Tests: Integration tests written; bash-in-for-each issue deferred (see ai-provider).

#### cli-engine (no spec change)

- [x] Verified: `catalyst init` discovered via existing `FR:cli.dynamic` — no spec/code change needed.

### Post-implementation

- [x] Traceability: ai-provider 100% coverage (87% code, 73% test); cli-init 100% coverage (100% code, 100% test).
- [x] Full test suite passes: 144 suites, 2708 tests pass, 0 failures (excluding the known-bugged `integration/cli/init.test.ts` Step 2 tests).
- [x] Verified `catalyst init` works end-to-end in tmp dir (manual run + consumer-side finops-hubs install).
- [x] Verified npm/pnpm/yarn install no longer trigger any postinstall (postinstall script removed from package.json).
- [ ] DEFERRED: README install instructions — no install section exists yet in single-line README. Out of scope for this rollout; revisit when README is fleshed out.
- [x] Run 1 presented for review; user-confirmed working in finops-hubs workspace.

### Deferred to Run 2

- Bash-in-for-each `stdin.unref` engine issue in legacy untracking step. Step 1 (file generation) works perfectly; Step 2 surfaces an error trailer but does not block install. Naturally addressed in Run 2/4 when the for-each + bash combo is replaced with `file-list` + dedicated actions.

## Run 2: file-list action and install playbook refactor

**Execution mode**: checkpoint-review (autonomous between phase gates; review at each STOP).

**Scope summary**: Add `file-list` action to `playbook-actions-io`. Refactor `install-ai-providers.yaml` Step 1's `script`-block `fs.readdirSync(templatesDir).filter(...)` call to use the native action. No ai-provider or cli-init spec change.

**Design decisions (Phase 0)**:

- Glob pattern syntax via the `glob` npm package — supports both flat (`*.md`) and recursive (`**/*.md`) patterns
- Return value: `string[]` of paths (default: root-relative — relative to the `path` input)
- Configurable `relativeTo` option: `root` (default) | `cwd` | `absolute`
- Downstream impact: 1 consumer (playbook-demo), no impact (additive)

### Features

#### playbook-actions-io

- [x] Spec: Added `FR:file-list` scenario with interfaces-input-behaviors-output shape (`@action`, `input`, `enumerate`, `format`, `errors`, `output`). Glob via `glob` lib; flat + recursive support; three `relativeTo` modes (`root` default, `cwd`, `absolute`); error mapping for FileNotFound/FilePermissionDenied/FileInvalidPath/FileConfigInvalid.
- [x] Implement: `src/playbooks/actions/io/file/list-action.ts` mirrors sibling actions (read, write, exists, delete).
- [x] Types: `FileListConfig` and `FileListRelativeTo` added to `src/playbooks/actions/io/types.ts`.
- [x] Export: Wired into `src/playbooks/actions/io/index.ts`. Action catalog auto-generated by build (`scripts/generate-action-registry.ts`).
- [x] Tests: 17 unit tests covering all FRs (flat, recursive, three relativeTo modes, error cases, sort, message). All pass.
- [x] Dependency: Added `glob ^10.5.0` to direct `dependencies`.

#### ai-provider (install playbook refactor)

- [x] Refactor: `fs.readdirSync(templatesDir).filter(...)` line in install-ai-providers.yaml Step 1 script block replaced with `- name: command-files` / `file-list:` step before the script; script consumes via `get('command-files')`.
- [x] Verify: Manual `catalyst init` still produces 3 providers / 30 files (Run 1 baseline preserved).
- [x] No spec changes (scenario FRs are implementation-agnostic).

#### playbook-template-engine (Boy Scout — bare-protocol resolution)

Surfaced when dogfooding file-list with `temp://` in kitchen-sink; fixed as part of Run 2.

- [x] Spec: Added `FR:paths.protocols.bare` (P2). Updated `FR:paths.protocols.extension` to spec directory-aware behavior.
- [x] Fix: `src/playbooks/template/path-resolver.ts` regex `(.+)` → `(.*)`; removed empty-path rejection; auto-extension skipped when path is an existing directory.
- [x] Fix: `src/playbooks/template/engine.ts` protocol regex `[^\s"'}\]]+` → `[^\s"'}\]]*` so bare `temp://` is recognized.
- [x] Tests: 5 new path-resolver tests covering bare `temp://` / `xe://` / `catalyst://`, sync variant, and directory-skipping extension detection.
- [x] Kitchen-sink: Section 2.6 uses `temp://` for the "Survivors of Act II" narrative; runs end-to-end.

#### playbook-engine (Boy Scout — stdin.unref shutdown crash)

Pre-existing bug surfaced in every playbook exit (most visibly during Run 1 testing and Run 2's kitchen-sink dogfood).

- [x] Fix: `src/playbooks/engine/checkpoint-prompter.ts` `releaseStdin()` now feature-detects `stdin.unref` before calling it. Stdin is a `Socket` (with `unref`) when TTY-attached but a plain `Readable` (no `unref`) in piped/redirected contexts.
- [x] Result: Eliminates the `stdin.unref is not a function` error trailer at the end of every playbook run. Also transitively unblocks the 4 previously-failing tests in `tests/integration/cli/init.test.ts` — they now pass.

### Post-implementation

- [ ] Run `npx catalyst traceability playbook-actions-io` — must pass thresholds
- [ ] Run full test suite — must pass
- [ ] Verify build pipeline still works end-to-end
- [ ] Present for review (checkpoint-review mode — review at each phase STOP)

## Run 3: playbook-actions-data feature; json-read/json-write

**Execution mode**: checkpoint-review (autonomous between phase gates).

**Scope summary**: Create new `playbook-actions-data` feature with `json-read` and `json-write` actions. Refactor `install-ai-providers.yaml`'s two `JSON.parse(fs.readFileSync(...))` callsites to use `json-read`. No ai-provider or cli-init spec change.

**Design decisions (Phase 0)**:

- Actions named `json-read` / `json-write` (file-operating) — not `parse`/`stringify` (which would imply in-memory string ops). The naming follows file-read/file-write sibling convention.
- Reuse pattern: delegation. `JsonReadAction` internally instantiates `FileReadAction`, calls its execute, then `JSON.parse`s the result. `JsonWriteAction` does the same with `FileWriteAction` + `JSON.stringify`. Avoids ~100 lines of duplicated path-validation / error-handling.
- Dependencies: `playbook-definition`, `error-handling`, `playbook-actions-io` (claimed because we delegate to its actions).
- Downstream impact: feature is new, zero consumers.

### Features

#### playbook-actions-data (new)

- [x] Spec: Created `.xe/features/playbook-actions-data/spec.md` with two scenarios (merged read+parse and write+serialize per user feedback):
  - `FR:json-read` (P1) — `@action`, `input` (Path + Encoding?), `read` (combined read+parse with `@req file-read.*`), `errors` (file errors propagate; `JsonParseError` for malformed), `output` (Value: any)
  - `FR:json-write` (P1) — `@action`, `input` (Path + Value + Pretty? default true + Encoding?), `write` (combined serialize+atomic-write with `@req file-write.*`), `errors` (file errors propagate; `JsonStringifyError` for cyclic/BigInt), `output` (Path + BytesWritten matching file-write)
- [x] Implement: `src/playbooks/actions/data/json-read-action.ts` + `json-write-action.ts` (delegation pattern)
- [x] Types: `JsonReadConfig`, `JsonWriteConfig`, `JsonWriteResult`, `JsonEncoding` in `src/playbooks/actions/data/types.ts`
- [x] Module index: `src/playbooks/actions/data/index.ts` exporting both actions + types
- [x] Tests: 26 unit tests covering all FRs (13 per action). All pass.

#### ai-provider (install playbook refactor)

- [x] Refactor: Two `JSON.parse(fs.readFileSync(configsPath, 'utf8'))` callsites in install-ai-providers.yaml replaced with single `json-read` step before Step 1; Step 2 reuses cached `provider-catalog`.
- [x] Verify: Manual `catalyst init` still produces correct file count.
- [x] No spec changes (scenario FRs are implementation-agnostic).

#### kitchen-sink (Boy Scout — new-action demonstration)

- [x] Added section 2.7 "json-write / json-read — Structured Data on Disk 📦": write (pretty), write (compact), read round-trip, JsonParseError via try/catch. Runs end-to-end (EXIT=0).

### Post-implementation

- [x] Full test suite: 147 suites, 2765 tests pass, 0 failures (+2 suites, +30 tests vs Run 2).
- [x] Build pipeline clean (`npm run build` — no errors).
- [x] kitchen-sink end-to-end: EXIT=0, 38 actions demonstrated, 103 logs written.
- [x] Run 3 presented for review; committed as `a71aac2`.

## Run 4: gitignore-edit action

**Execution mode**: checkpoint-review (autonomous between phase gates).

**Scope summary**: Add `gitignore-edit` scenario as the first git-CLI action in `playbook-actions-git` (renamed from `playbook-actions-github`, now the umbrella for git CLI + GitHub API ecosystem). Section-aware merge: each call manages one named section, splicing missing patterns into that section in place. Refactor `install-ai-providers.yaml`'s inline gitignore script blocks to use the action. No ai-provider or cli-init spec change.

**Design decisions (Phase 0)**:

- **Feature placement**: rename `playbook-actions-github` → `playbook-actions-git`. The feature is now the umbrella for both git CLI operations (gitignore-edit today; ls-files/rm-cached/etc. coming next) and existing GitHub API operations (issues, PRs, repos). Existing github-* actions unchanged.
- **Section model**: each `gitignore-edit` call manages ONE named section. Header is required (no Catalyst-specific default). Missing patterns spliced INSIDE the matched section, not appended as a new bottom section every time.
- **API**: `gitignore-edit: { path, header, add?, remove? }`. Primary property = `path`. `add` and `remove` are separate string arrays. No `includeSelf` — callers put `.gitignore` in `patterns` if needed.
- **Section termination**: header line `# {Header}` (case-insensitive); section ends at next `#` comment, blank line, or EOF. Empty section after removes → header deleted too.
- **Idempotency**: no-op when nothing changes. `remove` of absent pattern is a no-op (not an error).
- **Output adds `changed: boolean`** alongside `path` + `bytesWritten` so callers can distinguish "wrote" from "already current".
- **Delegation pattern**: existing file content read via `fs.readFile`; write path delegates to `FileWriteAction` for atomic write + path validation + file-error mapping.
- **Downstream impact**: 1 consumer refactored (ai-provider install playbook). Two known consumers (`cli-engine/FR:index.gitignore`, `playbook-definition/FR:persistence.gitignore`) remain as-is — future Boy Scout candidates.

### Features

#### playbook-actions-git (renamed from playbook-actions-github)

- [x] Rename: Feature ID `playbook-actions-github` → `playbook-actions-git`. Folder, spec, all `@req FR:playbook-actions-github/...` references updated across 22 files (specs, src, tests, rollouts).
- [x] Source/test directories renamed: `src/playbooks/actions/github` → `src/playbooks/actions/git`; `tests/playbooks/actions/github` → `tests/playbooks/actions/git`.
- [x] Spec: Added `FR:gitignore-edit` scenario with 7 FRs (`@action`, `input`, `section-model`, `add`, `remove`, `idempotent`, `errors`, `output`). Cross-feature `@req` to `playbook-actions-io/file.write-action.*` for atomic write + error inheritance.
- [x] Implement: `src/playbooks/actions/git/gitignore-edit-action.ts` with pure `applyEdits` function for section-aware splice.
- [x] Types: `GitignoreEditConfig` + `GitignoreEditResult` appended to `src/playbooks/actions/git/types.ts`.
- [x] Export: Wired into `src/playbooks/actions/git/index.ts`; action catalog auto-generated by build.
- [x] Tests: 17 unit tests covering all FRs (new file, new section, splice-into-existing, case-insensitive header, idempotency, remove, section deletion on empty, error cases). All pass.

#### ai-provider (install playbook refactor)

- [x] Refactor: `gitignore-write` call replaced with `gitignore-edit` passing explicit `header: "Catalyst commands"` and `add: {{gi.patterns}}` instead of `patterns`.
- [x] Integration tests updated: gitignore header assertions match new `# Catalyst commands` marker. All 11 `tests/integration/cli/init.test.ts` tests pass.
- [x] No spec changes (scenario FRs are implementation-agnostic).

#### kitchen-sink (Boy Scout — new-action demonstration)

- [x] Rewrote section 2.8 "gitignore-edit — Section-Aware Gitignore Management 🚫": new-section creation, idempotent re-run, splice into existing section, pattern removal. All four paths verified end-to-end (EXIT=0).

### Post-implementation

- [x] Traceability: `playbook-actions-git` 100% completeness; `playbook-actions-io` 100% completeness (gitignore-write FRs removed cleanly).
- [x] Full test suite: 150 suites, 2792 tests pass, 0 failures.
- [x] Build pipeline clean (`npm run build` — no errors).
- [x] kitchen-sink section 2.8 verified end-to-end (29B new, 0B idempotent, 35B merge, 29B remove).

## Notes

**Naming**: The cli-init feature exists alongside init-workflow (the existing AI-driven product-init workflow). Names are deliberately close — the next-release direction is to merge them. `cli-init` is the CLI entry point; `/catalyst:init` is the AI interview. This release's instruction is "run `catalyst init`, then `/catalyst:init`"; next release merges into a single entry point.

**Postinstall bug**: The current release's postinstall is buggy and doesn't execute cleanly anyway. Removing it is a bug fix as well as a refactor.

**Final-review mode for Run 1**: No branches created, no commits, no PR. AI works directly on files and presents the completed Run 1 for human review. Per user memory: this is the explicit mode for autonomous-to-end-of-run work without git-state changes.

**Spec stability principle**: Run 1's FRs in ai-provider/spec.md and cli-init/spec.md must NOT change during Runs 2-4. If a refactor requires spec change, that's a signal the Run 1 spec was implementation-leaky and needs immediate correction. The goal is one spec write, four implementation evolutions.

**Downstream classification (Phase 1)**: ai-provider's 9 consumers (ai-provider-claude, -copilot, -cursor, -gemini, -ollama, -openai, feedback-loop, playbook-actions-ai, session-status) are all classified **(a) no impact**. The new `FR:install` scenario is additive; existing `FR:commands.*` retained their IDs and signatures. Consumers depend on provider/factory/catalog/errors scenarios, not commands/install. No downstream tasks required.

**Boy Scout (Run 2)**:

- Bare-protocol resolution (`temp://`, `xe://`, `catalyst://` → base dir) — Why: dogfooding file-list with `temp://` in kitchen-sink surfaced the resolver's empty-path-after-protocol rejection. Critical for any directory-targeting action; not just file-list. Added `FR:paths.protocols.bare`, fixed path-resolver.ts and engine.ts protocol regexes, added directory-aware extension detection.
- `stdin.unref` shutdown crash in `releaseStdin()` — Why: caused `stdin.unref is not a function` error trailer at the end of every playbook run (visible since Run 1; surfaced repeatedly during Run 2 testing). One-line guard added; eliminates the trailer entirely and transitively makes the previously-skipped `tests/integration/cli/init.test.ts` (11 tests) all pass.

## Final Review

- [ ] Confirm all runs complete — no unchecked tasks, no unresolved blockers in Notes
- [ ] Clean up temporary files and this rollout plan
- [ ] Close out — commit, PR, or defer
