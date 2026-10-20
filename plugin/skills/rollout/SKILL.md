---
name: rollout
description: Orient and dispatch any rollout — start, continue, or resume
argument-hint: "[rollout-id or description]"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
---

> **Setup**: Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap.js"` before continuing. It installs `@xerilium/catalyst` if the project is missing it and stops with upgrade instructions if the installed version is older than this plugin requires. Stop if it reports an error.

# Orient and dispatch any rollout

Execute @node_modules/@xerilium/catalyst/playbooks/start-rollout.md

Follow instructions in order – do NOT skip steps
