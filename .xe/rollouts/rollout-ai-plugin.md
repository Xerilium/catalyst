---
features: [ai-plugin, ai-provider, ai-provider-claude, ai-provider-copilot, ai-provider-cursor, cli-init, feedback-loop, session-status]
status: in-progress
created: 2026-09-24
last_updated: 2026-09-24
---

<!-- markdownlint-disable no-duplicate-heading -->

# Rollout: ai-plugin

## Active State

**Model**: Plugin = distribution layer only. Thin skills point at repo-pinned npm playbooks; one bootstrap module (SessionStart hook + skill fallback + `catalyst-bootstrap` bin) installs the package with the repo's package manager.

**Decisions**:

- Dual output in the npm package: Claude plugin at package root (bare skill names → `/catalyst:{name}`), Agent Plugins 1.0.0 package at `agent-plugin/` (`catalyst-{name}` skills) — rejected single dual-manifest folder (Claude always scans `skills/`, forcing `/catalyst:catalyst-*` names)
- Claude marketplace uses npm source — rejected committing generated plugin into repo
- Skill fallback: `${CLAUDE_PLUGIN_ROOT}` script (Claude) / `npx -y -p @xerilium/catalyst catalyst-bootstrap` (portable) — rejected YAML CLI command (`catalyst://` resolves to repo `node_modules`, absent in the exact case bootstrap serves)
- Dogfood via project skills-dir plugin `.claude/skills/catalyst/` — rejected keeping generated `.claude/commands/`
- Plan mode tool skipped under autonomous overnight run (would block on approval); planning captured here instead

**Open**:

- None

**Next**: Phase 4 — audit, commit implementation, open PR, regenerate feature index

**Pins**:

- `src/resources/playbooks/install-ai-providers.yaml` — legacy generator being retired
- `scripts/build.ts` — build pipeline integration point
- `scripts/inject-feedback.ts` — dogfood feedback injection

**Assumptions**:

- Claude Code loads project `.claude/skills/<name>/.claude-plugin/plugin.json` as `<name>@skills-dir` (docs; verify with `claude plugin details`)
- Claude marketplace npm source installs the package root as the plugin root

## Overview

Ship Catalyst as a cross-platform AI agent plugin (explore session 2026-09-22/24). Replaces per-provider command generation (`catalyst init` writing `.claude/commands/`, `.github/prompts/`, `.cursor/commands/`) with:

- Claude Code plugin (`.claude-plugin/plugin.json` + `skills/` + SessionStart hook) at the npm package root, installable via a `xerilium` marketplace (npm source)
- Agent Plugins 1.0.0 package at `agent-plugin/` for Cursor, VS Code/Copilot, Codex, Kiro, Antigravity
- Thin skills (one per command template) that ensure the repo-pinned `@xerilium/catalyst` package exists, then run its playbook
- Bootstrap: detects package manager (`packageManager` field → lockfile → npm), workspace root, Yarn PnP; installs silently; never fails a session
- `catalyst init` removes legacy generated command files
- Deprecate `ai-provider` command-generation FRs; update downstream specs, blueprint, architecture, product, README

Source context: explore conversation (no issue). User direction: autonomous, current branch, PR when done.

## Run 1: ai-plugin

> **Execute**: `/catalyst:create ai-plugin — cross-platform AI agent plugin + retire per-provider command generation`

### Pre-implementation

- [x] Build package so CLI works in worktree (`npm run build`)
- [x] Capture ai-provider traceability + reverse deps

### Features

#### ai-plugin

- [x] Spec `.xe/features/ai-plugin/spec.md`
- [x] Design decisions `.xe/features/ai-plugin/design-decisions.md`

#### ai-provider

- [x] Deprecate `FR:provider.command-config`, `FR:commands.*`; drop `commands` from `FR:provider.interface`; mark superseded design decisions

#### ai-provider-claude / ai-provider-copilot / ai-provider-cursor

- [x] Deprecate `FR:{claude,copilot,cursor}.commands`

#### cli-init

- [x] Deprecate `FR:init.ai-commands` → `FR:init.ai-plugin`; update handoff + purpose + deps

#### feedback-loop

- [x] Retarget `FR:inject.*` to self-hosted plugin skills; deprecate `inject.all-providers`, `inject.provider-conventions`

#### blueprint-workflow / init-workflow / feature-workflow / pull-request-workflow

- [x] `@req FR:ai-plugin/skills.@file` on `@ai-command` interfaces; `platform` FRs → `skills.transform.platform-*`

#### product / architecture / blueprint

- [x] product.md FR:multi-agent → plugin; architecture.md distribution + plugin architecture; blueprint adds ai-plugin (Wave 1.6), renames plugin-system → extension-system

#### session-status

- [x] Retarget `FR:checkin.@ai-command` `@req` to ai-plugin

### Implementation (TDD)

Source layout: templates `git mv src/resources/ai-config/commands → src/resources/ai-plugin/skills`; hook template `src/resources/ai-plugin/hooks/hooks.json`; runtime `src/ai/plugin/bootstrap.ts` (built-ins only, single file so it can be copied standalone); generator `scripts/generate-plugin.ts` (exported pure functions + `main`, like `inject-feedback.ts`); bin shim `bin/catalyst-bootstrap.js`.

Package output (dist = package root): `.claude-plugin/plugin.json`, `skills/{name}/SKILL.md`, `hooks/hooks.json`, `ai/plugin/bootstrap.js`, `agent-plugin/{plugin.json,skills/catalyst-{name}/SKILL.md}`.

- [x] 🔗 Execute in sequence:
  - [x] `git mv` templates to `src/resources/ai-plugin/skills/`; update template-path tests (backward-compat, pull-request-workflow, validate-*-command)
  - 🔀 Execute in parallel (failing tests first):
    - [x] `tests/ai/plugin/bootstrap.test.ts` — FR:bootstrap.* + NFR:performance.noop + NFR:portability.zero-deps (temp dirs, injected runner)
    - [x] `tests/scripts/generate-plugin.test.ts` — FR:skills.*, FR:manifest.* (Agent Plugins 1.0.0 schema vendored at `tests/fixtures/agent-plugins/plugin.schema.json`, Ajv2020), FR:marketplace.*, FR:bootstrap.@hook, FR:build.self-host, AC:*
    - [x] `tests/integration/build/plugin-package.test.ts` — built `dist/` layout, bin + hook script run, `claude plugin validate`
    - [x] `tests/integration/cli/init.test.ts` — rewrite for FR:install.* + FR:cli-init/init.ai-plugin + handoff
    - [x] `tests/scripts/inject-feedback.test.ts` — retarget to self-hosted skills
  - [x] Implement `src/ai/plugin/bootstrap.ts` + `bin/catalyst-bootstrap.js` + package.json `bin`
  - [x] Implement `scripts/generate-plugin.ts` + `src/resources/ai-plugin/hooks/hooks.json` + repo `.claude-plugin/marketplace.json`
  - [x] Implement `src/resources/playbooks/install-ai-plugin.yaml`; `init.yaml` → install-ai-plugin + new handoff; delete `install-ai-providers.yaml`
  - [x] Retarget `scripts/inject-feedback.ts` to `.claude/skills/catalyst/skills/*/SKILL.md`
  - [x] `scripts/build.ts`: drop command-config generation + `ai-config` move; run generate-plugin; self-host; inject feedback; package.json `files`; `.gitignore` `.claude/skills/catalyst/`
  - [x] Remove `AIProviderCommandConfig`, provider `commands`, `scripts/generate-command-configs.ts`; update `@req` annotations
  - [x] README install section; `.github/workflows/release.yml` stale command `git add` lines
- [x] Verify: build ✔, `claude plugin validate` ✔ (dist + self-host), `catalyst@skills-dir` loaded (12 skills, hook harness-only), jest 3051 pass / 6 fail (all pre-existing, inputs unchanged from base), changed files lint-clean, traceability ai-plugin 100% test / 91% code (gaps = JSON/.gitignore data files, test-verified)
- [x] TDD gate: every in-scope P1-P3 FR has a test `@req` (annotation-enforcement suite reports no ai-plugin gaps)

### Post-implementation

- [ ] Present work for review
- [ ] Route external issues discovered during implementation

## Notes

- Downstream impact (`catalyst deps ai-provider --reverse`): ai-provider-{claude,copilot,cursor,gemini,ollama,openai}, cli-init, feedback-loop, playbook-actions-ai, session-status
- Downstream review: (b) cli-init, feedback-loop, session-status, ai-provider-{claude,copilot,cursor} — tasks above; (a) ai-provider-{gemini,ollama,openai}, playbook-actions-ai — no command FRs, no impact
- ai-provider traceability same-scenario gaps: `provider.command-config` test gap — moot (FR deprecated)
- Temp files: none
- Boy Scout: ai-provider Purpose referenced downstream features — rewrote as contract-only mandate
- Boy Scout: cli-init actor "Framework consumer" → "Developer" (recognized persona)
- Boy Scout: workflow specs gained `@req FR:ai-plugin/skills.@file` — closes blueprint-workflow feedback "Missing upstream FR — AI commands location" (item removed)
- Boy Scout: `scripts/validate-spec.ts` rejected sigil IDs (`@`, `$`) and heading IDs with priority markers — aligned with FR:req-traceability/id.format (20 → 1 errors; remaining `FR:interface.interpolateObject.output` is a real camelCase ID in playbook-template-engine, left for triage)
- Boy Scout: ai-provider design-decisions TODO dates resolved (2025-12-19, #117); command decisions marked superseded
- Plan mode: skipped the plan-mode tool (autonomous overnight run; ExitPlanMode would block on approval) — design + tasks recorded here instead
- Spec edit during implementation (unreleased, same run): AC:thin-skills reworded — the Claude plugin root is the npm package root, so "plugin MUST NOT bundle playbooks" was untrue; constraint now targets how skills reach resources
- Boy Scout: `pr-loop` template had `argument-hint: [pr-number] [max-rounds]` (invalid YAML) — Claude silently dropped all its frontmatter; template quoted, generator now quotes hints, YAML-parse test added for every skill
- Boy Scout: `.github/workflows/release.yml` `git add` of gitignored generated commands would fail the release job — removed
- Boy Scout: stale `ai-config` / `command-configs.json` examples in `json-read-action.ts` and `list-action.ts` docs
- Boy Scout: architecture.md listed nonexistent `src/setup/` — removed
- Pre-existing failures (not caused here; inputs identical to base b2912db): `tests/templates/validate-spec.test.ts` (3), `tests/templates/feature-context-dogfood.test.ts` (2), `annotation-enforcement` (feature-context test gaps)
- External: `setup/postinstall.js` stub is unreferenced (no `postinstall` script) — candidate for removal
- External: `FR:playbook-template-engine/interface.interpolateObject.output` uses camelCase ID
- Deferred: portable hook configs (Copilot/Cursor/Codex SessionStart formats unverified) — portable skills rely on the in-skill check
- Deferred: publishing — npm release (ships plugin + marketplace source), Cursor/VS Code/Copilot marketplace listings for `agent-plugin/`

## Final Review

- [ ] Confirm all runs complete — no unchecked tasks, no unresolved blockers in Notes
- [ ] Clean up temporary files and this rollout plan
- [ ] Close out — commit, PR, or defer
