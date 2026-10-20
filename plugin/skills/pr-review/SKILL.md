---
name: pr-review
description: Review a pull request for quality, correctness, and project alignment
argument-hint: "[pr-number]"
allowed-tools: Read, Glob, Grep, Task, TodoWrite, Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr checkout:*), Bash(gh api user:*), Bash(gh api repos/*/pulls/*/reviews:*), Bash(gh api graphql:*), Bash(gh issue view:*), Bash(gh repo view:*), Bash(git branch:*), Bash(git status:*), Bash(jq:*), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap.js")
---

> **Setup**: Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap.js"` before continuing. It installs `@xerilium/catalyst` if the project is missing it and stops with upgrade instructions if the installed version is older than this plugin requires. Stop if it reports an error.

# Review Pull Request

Execute @node_modules/@xerilium/catalyst/playbooks/review-pull-request.md

Map inputs:

- First argument → `pr-number`
- `ai-platform` → "Claude"
