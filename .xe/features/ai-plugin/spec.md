---
id: ai-plugin
title: AI Plugin
description: Cross-platform AI agent plugin that exposes Catalyst workflows as skills and bootstraps the repo-pinned package.
dependencies:
  - context-storage
---

<!-- markdownlint-disable single-title -->

# Feature: AI Plugin

## Purpose

Package Catalyst as an AI agent plugin so any plugin-capable AI platform can invoke Catalyst workflows natively. The plugin ships entry points and installs the project's `@xerilium/catalyst` package; workflow content stays in that repo-pinned package, never in the plugin.

## Scenarios

### FR:plugin: Plugin Delivery

Developer needs Catalyst delivered as an AI agent plugin so that any plugin-capable AI platform can invoke Catalyst workflows without per-platform setup.

- **FR:plugin.@ai-plugin** (P1): Interface: Catalyst AI plugin, one per supported plugin format
- **FR:plugin.name** (P1): Build MUST name the plugin `catalyst`
- **FR:plugin.version** (P1): Build MUST set the plugin version to the package version
- **FR:plugin.metadata** (P3): Build MUST copy the package's descriptive metadata into the plugin
- **FR:plugin.valid** (P1): Build MUST produce plugin manifests that validate against their published schema
- **FR:plugin.publish** (P1): Build MUST include the Claude Code plugin and the portable plugin payload in the one npm package, `@xerilium/catalyst`
- ~~**FR:plugin.package**~~: [deprecated: FR:plugin.publish]
  - ~~**FR:plugin.package.no-bin**~~: [deprecated: FR:plugin.no-bin]
  - ~~**FR:plugin.package.self-contained**~~: [deprecated: FR:plugin.publish]
- **FR:plugin.no-bin** (P1): Build MUST give the package no top-level `bin/` directory, which claude.ai, Cowork, and organization sync reject; the CLI launchers live in `launchers/`
- **FR:plugin.npm** (P1): Release MUST publish the package to npm with no manual step
  - **FR:plugin.npm.verified** (P1): Release MUST fail when the package is absent from npm at the released version after publishing
- **FR:plugin.min-version** (P1): Build MUST declare in the plugin manifest the minimum `@xerilium/catalyst` version the plugin's skills require, derived from the package version
- **FR:plugin.marketplace** (P1): Release MUST publish a Claude Code marketplace listing for the plugin to the public `xerilium/ai-plugins` repository
  - **FR:plugin.marketplace.name** (P2): Marketplace MUST be named `xerilium`
  - **FR:plugin.marketplace.source** (P1): Release MUST source the listing from the `@xerilium/catalyst` package
  - **FR:plugin.marketplace.version** (P1): Release MUST NOT declare a plugin version in the listing, leaving the plugin manifest as the only source

### FR:skills: Workflow Skills

Developer needs Catalyst workflows available as skills in their AI platform so that they can invoke them without per-platform setup.

- **FR:skills.@ai-skill** (P1): Interface: `src/resources/ai-plugin/skills/{name}.md` — one skill template per workflow entry point
  > - @req FR:context-storage/storage.framework
- **FR:skills.run-structure** (P2): Run skill template MUST tell the agent to follow the playbook's own phase and step sections
  - Rationale: Agents otherwise cite sections that no playbook has. Template is `src/resources/ai-plugin/skills/run.md`.
  - **FR:skills.run-structure.inputs** (P2): Run skill template MUST tell the agent to map only inputs the playbook declares
- **FR:skills.generate** (P1): Build MUST generate one skill per template for each supported plugin format
- **FR:skills.frontmatter** (P1): Build MUST limit each skill's frontmatter to the fields its plugin format supports, with `name` set to the skill's directory name
- **FR:skills.transform** (P2): Build MUST rewrite `/catalyst:{name}` references to the invocation syntax of each plugin format
  - **FR:skills.transform.platform-claude** (P2): Build MUST replace `$$AI_PLATFORM$$` with `Claude` in Claude skills
  - **FR:skills.transform.platform-portable** (P2): Build MUST replace `$$AI_PLATFORM$$` in portable skills with an instruction to use the running AI platform's name
- **FR:skills.ensure** (P1): Build MUST prepend a package check to every skill whose body references the `@xerilium/catalyst` package
  - **FR:skills.ensure.allowed-tools** (P3): Build MUST let the package check run without a permission prompt in skills that restrict tools
  - **FR:skills.ensure.min-version** (P1): Build MUST make Claude skills run the bootstrap unconditionally, so a package that is installed but older than the declared minimum is caught

### FR:bootstrap: Package Bootstrap

AI Agent needs the project's Catalyst package installed before running a workflow so that skills work in fresh clones and new projects without manual setup.

- **FR:bootstrap.@cli** (P1): Interface: `catalyst-bootstrap` package binary, and `scripts/bootstrap.js` in the plugin payload
- **FR:bootstrap.input** (P2):
  - Start directory (string) — `CLAUDE_PROJECT_DIR` when set, else the working directory
  - Minimum version (string, optional) — the plugin manifest's declared minimum, or `--min-version`
- **FR:bootstrap.root** (P1): Bootstrap MUST resolve the project root to the outermost workspace root (`pnpm-workspace.yaml` or `package.json` `workspaces`) within the git root
  - **FR:bootstrap.root.fallback** (P2): Bootstrap MUST otherwise resolve the nearest `package.json` directory, then the git root, then the start directory
- **FR:bootstrap.installed** (P1): Bootstrap MUST NOT install when `node_modules/@xerilium/catalyst/package.json` exists at the project root
- **FR:bootstrap.min-version** (P1): Bootstrap MUST fail with the package manager's upgrade command when the installed version is older than the declared minimum
  - **FR:bootstrap.min-version.prerelease** (P2): Bootstrap MUST compare `major.minor.patch` only, so a local prerelease build of the minimum version passes
- **FR:bootstrap.package-manager** (P1): Bootstrap MUST honor the `package.json` `packageManager` field
  - **FR:bootstrap.package-manager.lockfile** (P1): Bootstrap MUST otherwise infer the package manager from lockfiles: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock`/`bun.lockb` → bun, `package-lock.json`/`npm-shrinkwrap.json` → npm
  - **FR:bootstrap.package-manager.default** (P2): Bootstrap MUST default to npm
- **FR:bootstrap.restore** (P1): Bootstrap MUST run the package manager's install command when `package.json` declares `@xerilium/catalyst`
- **FR:bootstrap.add** (P1): Bootstrap MUST add `@xerilium/catalyst` as a dev dependency when `package.json` doesn't declare it
  - **FR:bootstrap.add.workspace-root** (P2): Bootstrap MUST pass the workspace-root flag when adding at a workspace root (pnpm `-w`, Yarn classic `-W`)
- **FR:bootstrap.corepack** (P3): Bootstrap SHOULD run pnpm or yarn through Corepack when the binary isn't on PATH
- **FR:bootstrap.pnp** (P2): Bootstrap MUST skip installation in Yarn Plug'n'Play projects
- **FR:bootstrap.failure** (P1): Bootstrap MUST exit non-zero when installation fails, is skipped, or the version check fails
- **FR:bootstrap.output** (P2): One status line when bootstrap installed, skipped, or failed (with the remedy); no output when no action was needed
- **FR:bootstrap.pin** (P1): Bootstrap MUST fail when the loaded plugin is older than the `@xerilium/catalyst` version the repo pins
  - **FR:bootstrap.pin.source** (P1): Bootstrap MUST read the pin from the project root: the resolved version in the lockfile of the project's package manager when present, otherwise the exact version in `package.json`
    - Supported lockfiles: `package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml`, `yarn.lock`
  - **FR:bootstrap.pin.repo-wins** (P1): Bootstrap MUST compare only against the repo's pin, ignoring latest releases, parent configs, and user-level configs
  - **FR:bootstrap.pin.none** (P1): Bootstrap MUST skip the pin check when the repo declares no `@xerilium/catalyst` dependency or the pin is not a version
  - **FR:bootstrap.pin.loaded** (P1): Bootstrap MUST take the loaded plugin version from the plugin manifest beside the running script, else from `CLAUDE_PLUGIN_ROOT`, else from the newest applicable `catalyst@xerilium` install in `~/.claude/plugins/installed_plugins.json` (`CLAUDE_CONFIG_DIR` overrides `~/.claude`)
    - Applicable installs are user-scope installs, plus project- and local-scope installs whose project path contains the project root
    - **FR:bootstrap.pin.loaded.record** (P2): Bootstrap MUST warn without failing when only an install record shows the plugin is older than the pin, unless user settings also point the `xerilium` marketplace at a local directory
  - **FR:bootstrap.pin.newer** (P2): Bootstrap MUST pass a plugin newer than the pin
  - **FR:bootstrap.pin.message** (P1): The failure message MUST give the exact fix for a stale plugin copy, which it names as the cause
    - Set `extraKnownMarketplaces.xerilium.source` in `~/.claude/settings.json` to `{"source":"github","repo":"xerilium/ai-plugins"}`
    - Run `claude plugin marketplace remove xerilium && claude plugin marketplace add xerilium/ai-plugins && claude plugin install catalyst@xerilium`
    - Restart the session
    - Note that plugin development uses `--plugin-dir`, never a local marketplace
  - **FR:bootstrap.pin.local-marketplace** (P2): Bootstrap MUST warn with the same fix, without failing, when user settings point the `xerilium` marketplace at a local directory and the repo pins a version
    - Settings are read from `~/.claude/settings.json` (`CLAUDE_CONFIG_DIR` overrides `~/.claude`)
    - The warning stays visible when the package step also reports
  - **FR:bootstrap.pin.unreadable** (P2): Bootstrap MUST skip the check when the pin, plugin version, or settings are missing, unreadable, or unparsable

### FR:agents: Role Agents

Developer needs Catalyst role agents available in their AI platform so that they can hand a task to a specialist without per-project agent setup.

- **FR:agents.@ai-agent** (P2): Interface: `src/resources/ai-plugin/agents/{name}.md` — one agent template per role
  > - @req FR:context-storage/storage.framework
- **FR:agents.generate** (P2): Build MUST generate one agent per template for each supported plugin format
- **FR:agents.frontmatter** (P2): Build MUST keep each agent frontmatter field the plugin format supports and drop the rest
- **FR:agents.portable** (P2): Build MUST write portable agents as GitHub Copilot custom agents in the payload's `com.github.copilot/` folder
  - Rationale: Agent Plugins 1.0.0 does not define agents and puts host-specific components in a host folder.

### FR:local: Self-Hosting

Developer needs local builds to load the freshly built plugin in this repository so that Catalyst is dogfooded through the same plugin consumers install.

- **FR:local.self-host** (P3): Local builds MUST install the built plugin at `.claude/skills/catalyst/` as a project skills-directory plugin
  - **FR:local.self-host.ignored** (P3): Local builds MUST keep the self-hosted plugin out of version control without changing the project's `.gitignore`

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.noop** (P4): Bootstrap MUST finish in <100ms when the package is already installed

**NFR:portability**: Portability

- **NFR:portability.zero-deps** (P2): Bootstrap script MUST import only Node.js built-in modules

**NFR:cost**: Context Cost

The AI platform lists every agent's frontmatter `description` in each session, so descriptions are a standing cost. Agent bodies load only when the agent runs.

- **NFR:cost.agent-description** (P2): Agent frontmatter `description` MUST NOT exceed 200 characters

## Data Model

None

## Architecture Constraints

- **AC:thin-skills** (P2): Skills MUST reach playbooks, templates, and the engine only through the project's `node_modules/@xerilium/catalyst/`, never through the plugin's own files (the bootstrap script excepted)

## External Dependencies

- [Agent Plugins 1.0.0](https://agent-plugins.org/specification) — portable plugin package format (`plugin.json`, `skills/`)
- [Agent Skills](https://agentskills.io/specification) — `SKILL.md` format
- [Claude Code plugins](https://code.claude.com/docs/en/plugins-reference) — `.claude-plugin/plugin.json`, marketplaces, hooks
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) — agent frontmatter fields
- [GitHub Copilot custom agents](https://docs.github.com/en/copilot/reference/custom-agents-configuration) — `.agent.md` frontmatter and tool aliases
