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

**Next**: Commit specs; write Phase 2 task breakdown

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

## Final Review

- [ ] Confirm all runs complete — no unchecked tasks, no unresolved blockers in Notes
- [ ] Clean up temporary files and this rollout plan
- [ ] Close out — commit, PR, or defer
