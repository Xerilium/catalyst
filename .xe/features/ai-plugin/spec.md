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
- **FR:plugin.publish** (P1): Build MUST include every plugin artifact in the published package
- **FR:plugin.marketplace** (P1): Repository MUST list the plugin in a Claude Code marketplace sourced from the npm package
  - **FR:plugin.marketplace.name** (P2): Marketplace MUST be named `xerilium`

### FR:skills: Workflow Skills

Developer needs Catalyst workflows available as skills in their AI platform so that they can invoke them without per-platform setup.

- **FR:skills.@ai-skill** (P1): Interface: `src/resources/ai-plugin/skills/{name}.md` — one skill template per workflow entry point
  > - @req FR:context-storage/storage.framework
- **FR:skills.generate** (P1): Build MUST generate one skill per template for each supported plugin format
- **FR:skills.frontmatter** (P1): Build MUST limit each skill's frontmatter to the fields its plugin format supports, with `name` set to the skill's directory name
- **FR:skills.transform** (P2): Build MUST rewrite `/catalyst:{name}` references to the invocation syntax of each plugin format
  - **FR:skills.transform.platform-claude** (P2): Build MUST replace `$$AI_PLATFORM$$` with `Claude` in Claude skills
  - **FR:skills.transform.platform-portable** (P2): Build MUST replace `$$AI_PLATFORM$$` in portable skills with an instruction to use the running AI platform's name
- **FR:skills.ensure** (P1): Build MUST prepend a package check to every skill whose body references the `@xerilium/catalyst` package
  - **FR:skills.ensure.allowed-tools** (P3): Build MUST let the package check run without a permission prompt in skills that restrict tools

### FR:bootstrap: Package Bootstrap

AI Agent needs the project's Catalyst package installed before running a workflow so that skills work in fresh clones and new projects without manual setup.

- **FR:bootstrap.@hook** (P1): Interface: Claude Code `SessionStart` hook in `hooks/hooks.json`, running the bootstrap script in hook mode
- **FR:bootstrap.@cli** (P1): Interface: `catalyst-bootstrap` package binary, running in explicit mode
- **FR:bootstrap.input** (P2):
  - Start directory (string) — `CLAUDE_PROJECT_DIR` when set, else the working directory
  - Mode (string) — `hook` or `explicit`
- **FR:bootstrap.root** (P1): Bootstrap MUST resolve the project root to the outermost workspace root (`pnpm-workspace.yaml` or `package.json` `workspaces`) within the git root
  - **FR:bootstrap.root.fallback** (P2): Bootstrap MUST otherwise resolve the nearest `package.json` directory, then the git root, then the start directory
- **FR:bootstrap.installed** (P1): Bootstrap MUST take no action when `node_modules/@xerilium/catalyst/package.json` exists at the project root
- **FR:bootstrap.scope** (P1): Bootstrap MUST act in hook mode only when the project has `.xe/` or its `package.json` declares `@xerilium/catalyst`
  > - @req FR:context-storage/storage.project
- **FR:bootstrap.package-manager** (P1): Bootstrap MUST honor the `package.json` `packageManager` field
  - **FR:bootstrap.package-manager.lockfile** (P1): Bootstrap MUST otherwise infer the package manager from lockfiles: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock`/`bun.lockb` → bun, `package-lock.json`/`npm-shrinkwrap.json` → npm
  - **FR:bootstrap.package-manager.default** (P2): Bootstrap MUST default to npm
- **FR:bootstrap.restore** (P1): Bootstrap MUST run the package manager's install command when `package.json` declares `@xerilium/catalyst`
- **FR:bootstrap.add** (P1): Bootstrap MUST add `@xerilium/catalyst` as a dev dependency when `package.json` doesn't declare it
  - **FR:bootstrap.add.workspace-root** (P2): Bootstrap MUST pass the workspace-root flag when adding at a workspace root (pnpm `-w`, Yarn classic `-W`)
- **FR:bootstrap.corepack** (P3): Bootstrap SHOULD run pnpm or yarn through Corepack when the binary isn't on PATH
- **FR:bootstrap.pnp** (P2): Bootstrap MUST skip installation in Yarn Plug'n'Play projects
- **FR:bootstrap.hook-safe** (P1): Bootstrap MUST exit 0 on every hook-mode outcome
- **FR:bootstrap.explicit-failure** (P2): Bootstrap MUST exit non-zero when an explicit-mode installation fails or is skipped
- **FR:bootstrap.output** (P2): One status line when bootstrap installed, skipped, or failed (with the remedy); no output when no action was needed

### FR:build: Self-Hosting

Developer needs local builds to load the freshly built plugin in this repository so that Catalyst is dogfooded through the same plugin consumers install.

- **FR:build.self-host** (P3): Local builds MUST install the Claude plugin at `.claude/skills/catalyst/` as a project skills-directory plugin
  - **FR:build.self-host.ignored** (P3): Local builds MUST keep the self-hosted plugin out of version control without changing the project's `.gitignore`

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.noop** (P4): Bootstrap MUST finish in <100ms when the package is already installed

**NFR:portability**: Portability

- **NFR:portability.zero-deps** (P2): Bootstrap script MUST import only Node.js built-in modules

## Data Model

None

## Architecture Constraints

- **AC:single-source** (P2): Skill templates MUST be the only hand-maintained skill content; every plugin artifact is generated at build time
- **AC:thin-skills** (P2): Skills MUST reach playbooks, templates, and the engine only through the project's `node_modules/@xerilium/catalyst/`, never through the plugin's own files (the bootstrap script excepted)
- **AC:no-standing-cost** (P2): Plugin MUST NOT declare MCP servers or always-on context; components load only when invoked or at session start

## External Dependencies

- [Agent Plugins 1.0.0](https://agent-plugins.org/specification) — portable plugin package format (`plugin.json`, `skills/`)
- [Agent Skills](https://agentskills.io/specification) — `SKILL.md` format
- [Claude Code plugins](https://code.claude.com/docs/en/plugins-reference) — `.claude-plugin/plugin.json`, marketplaces, hooks
