---
id: ai-plugin
title: AI Plugin
description: Cross-platform AI agent plugin that exposes Catalyst workflows as skills and bootstraps the repo-pinned package.
dependencies:
  - context-storage
  - playbook-yaml
  - playbook-actions-scripts
  - playbook-actions-git
---

<!-- markdownlint-disable single-title -->

# Feature: AI Plugin

## Purpose

Package Catalyst as an AI agent plugin so every plugin-capable AI platform can invoke Catalyst workflows natively. The plugin distributes entry points and installs the project's `@xerilium/catalyst` package; workflow content stays in that repo-pinned package, never in the plugin.

## Scenarios

### FR:skills: Workflow Skills

Developer needs Catalyst workflows available as skills in their AI platform so that they can invoke them without per-platform setup.

- **FR:skills.@file** (P1): Interface: `src/resources/ai-plugin/skills/{name}.md` — one skill template per workflow entry point
  > - @req FR:context-storage/storage.framework
- **FR:skills.generate** (P1): Build MUST generate one Claude skill and one portable skill per template
  - **FR:skills.generate.claude** (P1): Build MUST write Claude skills to `skills/{name}/SKILL.md` at the package root
  - **FR:skills.generate.portable** (P1): Build MUST write portable skills to `agent-plugin/skills/catalyst-{name}/SKILL.md`
- **FR:skills.frontmatter** (P1): Build MUST set each skill's `name` to its directory name
  - **FR:skills.frontmatter.claude** (P2): Build MUST limit Claude skill frontmatter to `name`, `description`, `argument-hint`, and `allowed-tools`
  - **FR:skills.frontmatter.portable** (P1): Build MUST limit portable skill frontmatter to the Agent Skills fields `name` and `description`
- **FR:skills.transform** (P2): Build MUST rewrite `/catalyst:{name}` references to `/catalyst-{name}` in portable skills
  - **FR:skills.transform.platform-claude** (P2): Build MUST replace `$$AI_PLATFORM$$` with `Claude` in Claude skills
  - **FR:skills.transform.platform-portable** (P2): Build MUST replace `$$AI_PLATFORM$$` in portable skills with an instruction to use the running AI platform's name
- **FR:skills.ensure** (P1): Build MUST prepend a package check to every skill whose body references the `@xerilium/catalyst` package
  - **FR:skills.ensure.claude** (P2): Build MUST point Claude skill checks at the bundled bootstrap script via `${CLAUDE_PLUGIN_ROOT}`
  - **FR:skills.ensure.portable** (P2): Build MUST point portable skill checks at `npx -y -p @xerilium/catalyst catalyst-bootstrap`
  - **FR:skills.ensure.allowed-tools** (P3): Build MUST pre-approve the bootstrap command in Claude skills whose `allowed-tools` excludes unrestricted `Bash`

### FR:manifest: Plugin Manifests

AI Agent needs Catalyst packaged in each platform's plugin format so that the platform discovers and loads its skills.

- **FR:manifest.@claude** (P1): Interface: `.claude-plugin/plugin.json` at the package root
- **FR:manifest.@portable** (P1): Interface: `agent-plugin/plugin.json` (Agent Plugins 1.0.0)
- **FR:manifest.input** (P2): Package metadata — name, version, description, author, homepage, repository, license, keywords (from `package.json`)
- **FR:manifest.name** (P1): Build MUST name the plugin `catalyst` in both manifests
- **FR:manifest.version** (P1): Build MUST set both manifest versions to the package version
- **FR:manifest.metadata** (P3): Build MUST copy description, author, homepage, repository, license, and keywords from package metadata
- **FR:manifest.portable-schema** (P1): Build MUST produce a portable manifest that validates against the Agent Plugins 1.0.0 schema
- **FR:manifest.publish** (P1): Build MUST include `.claude-plugin/`, `skills/`, `hooks/`, and `agent-plugin/` in the published package

### FR:marketplace: Claude Code Marketplace

Developer needs to install Catalyst from a Claude Code marketplace so that one install covers every project.

- **FR:marketplace.@json** (P1): Interface: `.claude-plugin/marketplace.json` at the repository root
- **FR:marketplace.name** (P2): Marketplace MUST be named `xerilium`
- **FR:marketplace.source** (P1): Marketplace MUST list plugin `catalyst` sourced from npm package `@xerilium/catalyst`

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

### FR:install: Legacy Command Cleanup

Developer needs `catalyst init` to remove command files generated by earlier Catalyst versions so that plugin skills don't appear twice.

- **FR:install.@playbook** (P1): Interface: `src/resources/playbooks/install-ai-plugin.yaml`
  > - @req FR:playbook-yaml/structure
- **FR:install.input** (P2): Project root (string) — consumer project directory
- **FR:install.legacy** (P1): Workflow MUST delete generated command files `.claude/commands/catalyst/*.md`, `.cursor/commands/catalyst/*.md`, and `.github/prompts/catalyst.*.prompt.md`
  > - @req FR:playbook-actions-scripts/script.context-injection
  - **FR:install.legacy.gitignore** (P2): Workflow MUST remove the Catalyst `.gitignore` sections and files written by command generation
    > - @req FR:playbook-actions-git/gitignore-edit.remove
  - **FR:install.legacy.directories** (P3): Workflow MUST remove emptied `catalyst` command directories
- **FR:install.preserve** (P1): Workflow MUST NOT delete files outside the generated patterns
- **FR:install.idempotent** (P2): Workflow MUST make no changes when no legacy files exist

### FR:build: Self-Hosting

Developer needs local builds to load the freshly built plugin in this repository so that Catalyst is dogfooded through the same plugin consumers install.

- **FR:build.self-host** (P3): Local builds MUST install the Claude plugin at `.claude/skills/catalyst/` as a project skills-directory plugin
  - **FR:build.self-host.ignored** (P3): Repository MUST git-ignore `.claude/skills/catalyst/`

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
