---
name: "pr-update"
description: Update a pull request by analyzing feedback, implementing changes, and responding to comments
allowed-tools: Read, Edit, Write, Glob, Grep, Task, TodoWrite, Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr checkout:*), Bash(gh pr comment:*), Bash(gh pr edit:*), Bash(gh api user:*), Bash(gh api repos/*/pulls/*/comments/*/replies:*), Bash(gh api graphql:*), Bash(gh repo view:*), Bash(git branch:*), Bash(git status:*), Bash(git push:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(jq:*)
argument-hint: [pr-number]
Usage: /catalyst:pr-update [pr-number]
Examples: /catalyst:pr-update 123, /catalyst:pr-update
---

# Update Pull Request

Execute @node_modules/@xerilium/catalyst/playbooks/update-pull-request.md

Map inputs:

- First argument → `pr-number`
- `ai-platform` → "$$AI_PLATFORM$$"
