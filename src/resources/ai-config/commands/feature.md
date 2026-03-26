---
name: "feature"
description: Start or continue feature development
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
argument-hint: [description-or-id] [issue-id]
Usage: /catalyst:feature [description-or-id] [issue-id]
Examples: /catalyst:feature
  /catalyst:feature "Add user authentication"
  /catalyst:feature user-authentication
  /catalyst:feature 41
---

# Start or continue feature development

Execute the instructions in `node_modules/@xerilium/catalyst/playbooks/start-feature.md`. Follow it phase by phase. Do NOT skip phases.
