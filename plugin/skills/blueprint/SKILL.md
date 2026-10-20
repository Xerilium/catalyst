---
name: blueprint
description: Create or update the product blueprint
argument-hint: "[issue]"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
---

> **Setup**: Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap.js"` before continuing. It installs `@xerilium/catalyst` if the project is missing it and stops with upgrade instructions if the installed version is older than this plugin requires. Stop if it reports an error.

# Create or update the product blueprint

Execute @node_modules/@xerilium/catalyst/playbooks/start-blueprint.md

Follow instructions in order – do NOT skip steps
