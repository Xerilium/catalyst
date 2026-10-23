# Catalyst

Your AI-powered product team. Autonomous engineering. Zero burnout.

## Install

1. **Add the Catalyst plugin to your AI tool**
   - **Claude Code**:

     ```text
     /plugin marketplace add xerilium/ai-plugins
     /plugin install catalyst@xerilium
     ```

   - **Agent Plugins clients** (VS Code / GitHub Copilot, Cursor, Codex, Kiro, Antigravity): run `npm i -D @xerilium/catalyst`, then load the [Agent Plugins](https://agent-plugins.org) package at `node_modules/@xerilium/catalyst/agent-plugin` (in VS Code, add it to the `chat.pluginLocations` setting)

2. **Run `/catalyst:init`** (`/catalyst-init` outside Claude Code) to set up your product context

The plugin installs `@xerilium/catalyst` into your project with your package manager (npm, pnpm, Yarn, or Bun) the first time it's needed, so every teammate runs the version pinned in your lockfile. To add it yourself: `npm i -D @xerilium/catalyst`.

> Yarn Plug'n'Play isn't supported yet; set `nodeLinker: node-modules` in `.yarnrc.yml`.

### Not sure which steps you need?

`npx catalyst init` detects which AI platforms your project already uses, lets you pick one or more, and sets up the plugin for you: it installs it in Claude Code for this project and adds it to `.vscode/settings.json` for GitHub Copilot. For Cursor and other clients, or if you'd rather do it yourself, it prints the steps.

```bash
npx catalyst init                                  # asks, with detected platforms pre-selected
npx catalyst init --platform claude,copilot        # scripts and CI: no platform prompt
npx catalyst init --platform claude --setup manual # only show the steps
```

### Upgrading from command files

Earlier versions generated commands into `.claude/commands/`, `.github/prompts/`, and `.cursor/commands/`. After adding the plugin, run `npx catalyst init` to remove them.
