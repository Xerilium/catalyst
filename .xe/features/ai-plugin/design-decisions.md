# Design Decisions: ai-plugin

## Two plugin roots in one package

**Decision**: Generate a Claude Code plugin at the npm package root (skills `skills/{name}/`) and a separate Agent Plugins 1.0.0 package at `agent-plugin/` (skills `skills/catalyst-{name}/`), both from the same templates.

**Date**: 2026-09-24

**Why**: Claude Code namespaces plugin skills as `/{plugin}:{skill}` and always scans `skills/`, so bare names keep today's `/catalyst:create`. Agent Plugins clients don't namespace skills, so bare names like `init` or `run` would collide with built-in commands; they need a `catalyst-` prefix. The Agent Skills spec requires `name` to equal the directory name, so one folder can't serve both naming schemes.

**Rejected**:

- Single folder with both manifests — Claude would expose `/catalyst:catalyst-create`, or portable clients would expose bare `/init`
- Claude-only plugin — excludes Cursor, VS Code/Copilot, Codex, Kiro, Antigravity

**Evidence**:

- [Claude Code plugins reference](https://code.claude.com/docs/en/plugins-reference) — `skills` custom paths add to, never replace, the default `skills/` scan
- [Agent Plugins 1.0.0 specification](https://agent-plugins.org/specification) — fixed `skills/` location, `name` must match directory

## Thin skills over a repo-pinned package

**Decision**: Skills only point at playbooks in the project's `node_modules/@xerilium/catalyst/`; the plugin never bundles playbooks or the engine.

**Date**: 2026-09-24

**Why**: Specs, traceability, and playbooks are tied to a Catalyst version, and that version belongs to the repository (lockfile) so every teammate runs the same behavior. Plugins install per user. Keeping behavior in the package also leaves the existing `node_modules/...` playbook paths valid and keeps the plugin nearly static between releases.

**Rejected**:

- Bundle the CLI and playbooks in the plugin — per-user versions drift across a team; requires rewriting 116 hard-coded playbook paths; bundle-size and relative-path-resolution risks
- MCP server for the engine — tool schemas cost context every session; shell calls cost only their output

## Bootstrap via SessionStart hook plus skill fallback

**Decision**: One zero-dependency bootstrap module runs from a Claude Code `SessionStart` hook (conservative: Catalyst projects only, never fails the session) and from a one-line check at the top of each package-dependent skill (explicit: installs anywhere, reports failure).

**Date**: 2026-09-24

**Why**: Hooks run as software with no token cost and cover fresh clones and worktrees before the first prompt. Hooks aren't part of Agent Plugins 1.0, so portable skills need a fallback that works in any client with a shell. The hook stays scoped because the plugin is enabled across every repository a user opens.

**Rejected**:

- `/bootstrap` skill — only runs when invoked, so it can't guarantee setup happens first
- Instruct the user to install — the agent can do it deterministically

**Evidence**:

- [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference), [Codex SessionStart request](https://github.com/openai/codex/issues/13014) — SessionStart exists beyond Claude Code, but formats differ; portable hook configs deferred until verified

## Portable fallback uses a package binary

**Decision**: Portable skills run `npx -y -p @xerilium/catalyst catalyst-bootstrap`; Claude skills run the bundled script through `${CLAUDE_PLUGIN_ROOT}`.

**Date**: 2026-09-24

**Why**: The fallback runs exactly when the package is missing from the project, so it can't depend on `node_modules/@xerilium/catalyst`. A dedicated binary locates its own code via `__dirname` and works from the npx cache.

**Rejected**:

- `catalyst bootstrap` YAML CLI command — dynamic commands resolve `catalyst://` to the project's `node_modules`, which is absent in this case
- Agent-written install commands — package-manager detection in prose isn't deterministic

## Claude Code marketplace sources the npm package

**Decision**: `.claude-plugin/marketplace.json` in the public `xerilium/ai-plugins` repository lists plugin `catalyst` with an npm source (`@xerilium/catalyst`). The release workflow generates it from `package.json` and publishes it there; this repository stays private and holds no copy.

**Date**: 2026-09-24

**Why**: The npm package already contains the generated Claude plugin at its root, so one publish ships both the package and the plugin with matching versions. Nothing generated is committed to the repository.

**Rejected**:

- Relative-path or git-subdirectory source — requires committing generated plugin files and keeping them in sync

**Evidence**:

- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) — npm source type

## Self-host through a project skills-directory plugin

**Decision**: Local builds copy the Claude plugin to `.claude/skills/catalyst/` (the folder ignores itself with a `.gitignore` containing `*`, so the repository `.gitignore` stays untouched), which Claude Code loads as `catalyst@skills-dir`, and inject feedback there.

**Date**: 2026-09-24

**Why**: Dogfooding should exercise the same plugin consumers install, while keeping `/catalyst:*` names and the feedback injection loop. A project skills-directory plugin loads in place without a marketplace or install step.

**Rejected**:

- Keep generating `.claude/commands/catalyst/` for this repository — dogfoods a path consumers no longer use
- `--plugin-dir` / `CLAUDE_CODE_PLUGIN_DIRS` — per-launch flags; the environment variable needs a newer Claude Code than some installs have

**Evidence**:

- [Skills-directory plugins](https://code.claude.com/docs/en/plugins-reference#skills-directory-plugins)

## Bootstrap hook is Claude-only

**Decision**: The `SessionStart` hook ships only in the Claude Code plugin (source: `src/resources/ai-plugin/claude-hooks/hooks.json`). Every other client gets the same package check from the first line of each skill.

**Date**: 2026-10-16

**Why**: Agent Plugins 1.0.0 defines only skills and MCP servers; it leaves hooks out as too client-specific for a stable portable contract. Cursor, GitHub Copilot (CLI, coding agent, VS Code), Codex CLI, and Gemini CLI each have a session-start hook, but every one uses its own config file, schema, and enablement flags, and some are experimental or report gaps. Supporting them means per-client config that the plugin cannot install, for a result the skill-level check already delivers.

**Rejected**:

- Per-client hook files (`.cursor/hooks.json`, `.github/hooks/`, `.codex/`, `.gemini/settings.json`) — outside the plugin format, so they would need `catalyst init`-style writes into consumer repos, and some clients gate hooks behind experimental flags
- Putting hooks in the portable package — non-conformant with the spec's closed component list

**Evidence**:

- [Agent Plugins specification](https://agent-plugins.org/specification) — v1 components are skills and MCP servers only
- [Cursor hooks](https://cursor.com/docs/hooks), [GitHub Copilot hooks](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-hooks), [Gemini CLI hooks](https://geminicli.com/docs/hooks/) — each client defines its own format
