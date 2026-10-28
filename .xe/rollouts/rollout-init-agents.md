---
features: [init-agents, cli-init, ai-provider, ai-provider-claude, ai-provider-copilot, ai-provider-cursor, ai-provider-gemini, ai-provider-ollama, ai-provider-openai]
status: in-progress
created: 2026-10-27
last_updated: 2026-10-27
---

<!-- markdownlint-disable no-duplicate-heading -->

# Rollout: init-agents

## Active State

**Model**: One editable source (`.xe/standards/agent-rules.md`) syncs into the file each provider most reliably loads. The target file is per-provider, declared in the provider catalog beside `commands` — NOT one file for all tools. `AGENTS.md` is the cross-tool baseline, not the universal answer.

**Decisions**:

- Single source at `.xe/standards/agent-rules.md` — seeded once if absent, user-owned thereafter; sync reads it and writes managed blocks outward. Rejected generating content per target file (N sources).
- Per-provider target resolution via a new `AIProviderInstructionsConfig` on `ai-provider`, independent of `commands` so headless providers opt out. Rejected gating on `commands`, which would have excluded Gemini CLI.
- Copilot gets `.github/copilot-instructions.md`, NOT `AGENTS.md` — reverses the earlier call. GitHub docs rank `AGENTS.md` in the lowest "agent instructions" tier and state it is not supported by every Copilot feature; repository-wide custom instructions rank higher.
- Gemini gets `GEMINI.md`, NOT `AGENTS.md` — Gemini CLI defaults to `GEMINI.md`; reading `AGENTS.md` needs non-default `context.fileName` config, and the PR to default it was still open.
- Claude gets `CLAUDE.md` with an `@AGENTS.md` import — the one legitimate import, because it is Claude-only plumbing that resolves at load time.
- Cursor gets `AGENTS.md` inline — read at project root by default.
- Ollama and OpenAI declare nothing — no repository-file surface. The criterion is the platform surface, not whether Catalyst runs the provider headless.
- Size budget in characters, not lines, matching the existing template validators: 1,200 for seeded content, 4,000 warn ceiling for the whole file. Derived from the reference block in `~/dev/finops-hubs/CLAUDE.md` § Catalyst, measured at 776 chars / 6 lines.
- Simple `file-read`/`file-write` implementation now; TODO to adopt `markdown-edit` once `playbook-actions-markdown` merges (sibling session, task_c2ff2196).

**Open**: None — spec is at the review gate.

**Next**: Human spec review on the draft PR. On approval, Phase 2 (Plan), then TDD implementation.

**Pins**:

- `.xe/features/init-agents/spec.md` — 31 FRs across 3 scenarios plus `NFR:cost`
- `.xe/features/ai-provider/spec.md:125-139` — `AIProviderInstructionsConfig` interface
- `src/resources/playbooks/install-ai-providers.yaml` — the per-provider transform pattern to mirror
- `.xe/features/playbook-actions-git/spec.md` § `FR:gitignore-edit` — managed-section prior art

**Assumptions**:

- `catalyst init` runs from the consumer project root (`init.yaml` captures it via `__dirname`)
- Consumers may be on Claude Code older than v2.1.277; the `CLAUDE.md` import covers them regardless

## Overview

Catalyst's engineering principles live in `.xe/engineering.md` and nothing loads them. Six playbooks cite the file by name; 18 files carry a one-line banner naming `Distilled Excellence` without carrying it. Result: AI does not apply the principles at the moment of writing.

This rollout adds `init-agents`: `catalyst init` seeds `.xe/standards/agent-rules.md` as the one place the team edits agent rules, then syncs that content into the instruction file each configured AI provider actually loads. Resolution is per-provider because the platforms disagree — Claude ignores `AGENTS.md` whenever a `CLAUDE.md` exists at or above cwd, Copilot reads `AGENTS.md` only at its lowest precedence tier, and Gemini CLI defaults to `GEMINI.md`.

Out of scope: per-provider path-scoped write-time rules (`.claude/rules/`, `.github/instructions/`, `.cursor/rules/`) stay with `ai-provider`; inlining the writing rule into the 18 playbook banners; the `catalyst check` document linter.

## Run 1: Spec and implement init-agents

> **Execute**: `/catalyst:create init-agents — seed agent-rules.md and sync it into per-provider instruction files`

### Features

#### init-agents

- [x] Write `.xe/features/init-agents/spec.md`
- [ ] Write failing tests with `@req` links
- [ ] Implement `src/resources/playbooks/install-agent-rules.yaml` and the `agent-rules.md` seed template
- [ ] Run tests and `npx catalyst traceability init-agents`

#### ai-provider

- [x] Add `FR:provider.instructions-config` and `FR:provider.instructions` to the spec
- [ ] Add `AIProviderInstructionsConfig` to the TypeScript interface and the generated provider catalog
- [ ] Declare `instructions` on claude, copilot, cursor, gemini; omit on ollama, openai

#### ai-provider-{claude,copilot,cursor,gemini,ollama,openai}

- [x] Add one `instructions` FR per provider spec

#### cli-init

- [x] Add `FR:init.agent-rules` and the `init-agents` dependency to the spec
- [ ] Add the `playbook` composition step to `src/resources/cli-commands/init.yaml`
- [ ] Run tests and `npx catalyst traceability cli-init`

### Post-implementation

- [ ] Present work for review
- [ ] Route external issues discovered during implementation

## Notes

- Execution mode: `spec-review` with the spec gate on a draft PR. Branch created; spec committed; implementation resumes after approval.
- Scope grew during Phase 1 at user direction ("support all agents, not just Claude ... via our `ai-provider-*` features"): 2 features became 9. The 6 `ai-provider-*` edits are one FR each; `ai-provider` gains one interface FR.
- Reversal worth keeping: the exploration that produced this rollout concluded "never write `.github/copilot-instructions.md` — Copilot reads AGENTS.md". GitHub's own precedence table shows `AGENTS.md` is Copilot's lowest tier and not universally supported, so Copilot gets the repository-wide file after all.
- Dropped a reverse dependency mid-spec: `ai-provider-ollama` and `ai-provider-openai` initially cited `@req FR:init-agents/resolve.platform-surface`, which pointed a provider feature at a downstream consumer. Rationale now lives as prose in those FRs.
- `cli-init` traceability was 100% / 5 requirements before this work and has no reverse dependencies, so there is no downstream impact and no same-scenario gaps to pick up.
- Observed out of scope: `cli-init` is not listed in `.xe/features/blueprint.md`. Flagging only; not fixing here.
- The rebase onto `main` is blocked: merging touches `.claude/settings.json`, a sandbox-protected file, and this repository's origin was pinned before the app asked the user to confirm it. Branch was cut from the current worktree HEAD instead.

## Final Review

- [ ] Confirm all runs complete — no unchecked tasks, no unresolved blockers in Notes
- [ ] Clean up temporary files and this rollout plan
- [ ] Close out — commit, PR, or defer
