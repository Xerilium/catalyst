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

Run the `start-feature` playbook. This command is a thin launcher — all logic lives in the playbook.

## Process

1. Read the playbook at `node_modules/@xerilium/catalyst/playbooks/start-feature.md`
2. Map parameters to playbook inputs:
   - If numeric: `issue-id`
   - If matches an existing feature or plan ID: `feature-id`
   - Otherwise: `feature-description`
3. Execute the playbook

## Error handling

- **Playbook not found** — Catalyst may need reinstallation (`npm install`)
