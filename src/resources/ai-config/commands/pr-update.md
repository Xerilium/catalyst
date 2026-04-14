---
name: "pr-update"
description: Update a pull request by analyzing feedback, implementing changes, and responding to comments
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
argument-hint: <pr-number>
Usage: /catalyst:pr-update <pr-number>
Examples: /catalyst:pr-update 123
---

# Update Pull Request

Execute @node_modules/@xerilium/catalyst/playbooks/update-pull-request.md

Map inputs:

- First argument → `pr-number`
- `ai-platform` → "$$AI_PLATFORM$$"
