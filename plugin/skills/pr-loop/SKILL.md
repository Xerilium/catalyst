---
name: pr-loop
description: Run autonomous review and update rounds on a pull request until findings are resolved
argument-hint: "[pr-number] [max-rounds]"
allowed-tools: Read, Edit, Write, Glob, Grep, Task, TodoWrite, Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr checkout:*), Bash(gh pr comment:*), Bash(gh pr edit:*), Bash(gh pr diff:*), Bash(gh api user:*), Bash(gh api repos/*/pulls/*/reviews:*), Bash(gh api repos/*/pulls/*/comments/*/replies:*), Bash(gh api graphql:*), Bash(gh issue view:*), Bash(gh repo view:*), Bash(git branch:*), Bash(git status:*), Bash(git push:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(jq:*), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap.js")
---

> **Setup**: Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap.js"` before continuing. It installs `@xerilium/catalyst` if the project is missing it and stops with upgrade instructions if the installed version is older than this plugin requires. Stop if it reports an error.

# Loop Pull Request

Execute @node_modules/@xerilium/catalyst/playbooks/loop-pull-request.md

Map inputs:

- First argument → `pr-number`
- Second argument → `max-rounds`
- `ai-platform` → "Claude"
