# Design Decisions: ai-plugin

## Plugin and CLI are separately distributed artifacts

**Decision**: Ship the Claude Code plugin from a committed `plugin/` directory in this repository, listed in the marketplace with a `git-subdir` source pinned to the `plugin-release` branch. Ship the CLI only as the `@xerilium/catalyst` npm package. Neither bundles the other's distribution channel.

**Date**: 2026-10-19

**Why**: The CLI must run without Claude Code — in CI, in scripts, and by hand — and it must be version-pinned per project through the lockfile, so it cannot live inside a per-user plugin install. The plugin, in turn, must have no top-level `bin/`, which claude.ai, Cowork, and organization sync reject outright; the npm package needs `bin` for `npx catalyst`. One artifact cannot satisfy both, so the build emits two payloads from one source tree. The accepted cost is possible skew between skills and CLI, which the declared minimum version turns into a loud, actionable failure instead of silent misbehavior.

**Rejected**:

- `npm` plugin source (the shipped design) — ties every plugin install to an npm publish, so a publish outage left plugin users on a pre-plugin tarball for weeks; forces `bin/` and the plugin layout into one artifact, which organization sync rejects
- `github` source on the repository root — the root has `bin/`, so organization sync rejects it, and users would download `src/`, `tests/`, and `docs/` to get 12 markdown files
- `archive` source on a release-asset zip — needs a `sha256` recomputed and committed to the separate marketplace repository on every release, and requires Claude Code v2.1.224 or later, newer than installs in use here
- Pinning the entry to a per-release tag — correct, but needs a cross-repository PR per release, which is the step most likely to be forgotten and silently strands users on an old version

**Evidence**:

- [Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference#git-subdir-plugin-source) — `git-subdir` takes `url`, `path`, `ref`, `sha` and fetches only the subdirectory via sparse checkout
- [Host a marketplace](https://code.claude.com/docs/en/plugins/host-marketplace#distribute-through-organization-settings) — `Plugin contains a top-level bin/ directory`; keep executables in another directory such as `scripts/`
- [Plugin loading](https://code.claude.com/docs/en/plugins/loading#how-claude-code-computes-the-version) — `plugin.json` version wins over the marketplace entry; a moving ref without a version change leaves users on the cached copy

## Minimum CLI version lives in the plugin manifest

**Decision**: The build writes `metadata.minCatalystVersion` into `plugin/.claude-plugin/plugin.json`, set to the plugin's own `major.minor.0`. The bootstrap reads it from the manifest beside itself and fails with the project's package manager's upgrade command when the installed package is older.

**Date**: 2026-10-19

**Why**: The version and its minimum are emitted by one generator from one `package.json` field, into one file, so they cannot drift from the release. Zeroing the patch keeps CLI patch releases compatible while guaranteeing a skill never runs against a CLI that predates it. Comparing only `major.minor.patch` lets a local `0.3.0-dev` build satisfy a `0.3.0` minimum, which keeps this repository's own dogfooding working.

**Rejected**:

- A separate file in the payload (`min-version.json`) — one more generated file to keep in step for no gain; the manifest already travels with the version
- Declaring it in the marketplace entry — lives in another repository, so it drifts the moment a release skips the cross-repository update
- A semver range on the package dependency — the project's lockfile, not the plugin, decides the installed version; the plugin can only check and complain

**Evidence**:

- [Manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference#metadata) — `metadata` is a free-form object Claude Code does not read; validators before v2.1.222 warn about it

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

## Bootstrap runs from the skill, not a session hook

**Decision**: One zero-dependency bootstrap module runs from the first line of each package-dependent skill. The plugin ships no hooks.

**Date**: 2026-10-19 (supersedes the 2026-09-24 SessionStart decision)

**Why**: The hook installed an npm package into whatever repository the user opened, before they asked for anything, and could hold session startup for up to its 300-second timeout. Every skill already carries the same check, so the hook bought nothing a skill invocation does not already do, at the cost of an unprompted install and a startup stall. Running the check from the skill also makes it the one place the minimum-version contract is enforced, which is why the Claude form runs unconditionally rather than only when the package is missing.

**Rejected**:

- Keep the hook with a shorter timeout — the objection is the unprompted install and the startup cost existing at all, not its duration
- A `/bootstrap` skill the user runs first — the per-skill check already does this without the user having to know

**Evidence**:

- [Hooks reference](https://code.claude.com/docs/en/hooks#hook-events) — `SessionStart` runs before the first prompt, so its cost is unconditional

## Portable fallback uses a package binary

**Decision**: Portable skills run `npx -y -p @xerilium/catalyst catalyst-bootstrap`; Claude skills run the bundled script through `${CLAUDE_PLUGIN_ROOT}`.

**Date**: 2026-09-24

**Why**: The fallback runs exactly when the package is missing from the project, so it can't depend on `node_modules/@xerilium/catalyst`. A dedicated binary locates its own code via `__dirname` and works from the npx cache.

**Rejected**:

- `catalyst bootstrap` YAML CLI command — dynamic commands resolve `catalyst://` to the project's `node_modules`, which is absent in this case
- Agent-written install commands — package-manager detection in prose isn't deterministic

## Marketplace listing lives in the public repository, generated from package.json

**Decision**: `.claude-plugin/marketplace.json` in the public `xerilium/ai-plugins` repository lists plugin `catalyst`. The release workflow generates it from `package.json` and publishes it there; this repository stays private and holds no copy. The entry's source is `git-subdir` (see the first decision on this page), and the entry declares no `version`.

**Date**: 2026-10-19 (source type changed; location unchanged from 2026-09-24)

**Why**: Generating the listing keeps its metadata in step with `package.json` without hand editing. Leaving `version` off the entry makes `plugin.json` the only place a version is declared: setting both makes Claude Code silently prefer the manifest while `claude plugin validate` reports the mismatch.

**Rejected**:

- npm source — see the first decision on this page
- Declaring `version` on the entry as well — guaranteed drift and a validator warning, for no benefit

**Evidence**:

- [Host a marketplace](https://code.claude.com/docs/en/plugins/host-marketplace#release-a-new-version) — "Don't set `version` in both `plugin.json` and the marketplace entry"

## Self-host through a project skills-directory plugin

**Decision**: Local builds copy the committed `plugin/` payload to `.claude/skills/catalyst/` (the folder ignores itself with a `.gitignore` containing `*`, so the repository `.gitignore` stays untouched), which Claude Code loads as `catalyst@skills-dir`, and inject feedback there.

**Date**: 2026-09-24 (source changed to `plugin/` on 2026-10-19)

**Why**: Dogfooding should exercise the same plugin consumers install, while keeping `/catalyst:*` names and the feedback injection loop. A project skills-directory plugin loads in place without a marketplace or install step.

**Rejected**:

- Keep generating `.claude/commands/catalyst/` for this repository — dogfoods a path consumers no longer use
- `--plugin-dir` / `CLAUDE_CODE_PLUGIN_DIRS` — per-launch flags; the environment variable needs a newer Claude Code than some installs have

**Evidence**:

- [Skills-directory plugins](https://code.claude.com/docs/en/plugins-reference#skills-directory-plugins)

## Package check differs between Claude and portable skills

**Decision**: Claude skills run `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap.js"` unconditionally. Portable skills keep the conditional form, running `npx -y -p @xerilium/catalyst catalyst-bootstrap` only when the package is missing.

**Date**: 2026-10-19 (replaces "Bootstrap hook is Claude-only", 2026-10-16)

**Why**: The Claude plugin is distributed separately from the package, so its skills can be newer than the installed CLI, and only an unconditional run catches that. It costs one Node start. Portable skills ship inside the package itself, so plugin and CLI versions cannot skew, and their bootstrap goes through `npx`, which costs seconds — worth paying only when the package is genuinely absent.

**Rejected**:

- Unconditional `npx` in portable skills — seconds of latency on every invocation to detect a skew that cannot happen
- Conditional check in Claude skills — a package that is present but older than the plugin requires would slip through silently
