---
name: "pr-sweep"
description: Sweep every open PR involving you by role, update the ones you author, review the ones waiting on you, and report only the decisions that need you
allowed-tools: Read, Edit, Write, Glob, Grep, Task, TodoWrite, Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr checkout:*), Bash(gh pr comment:*), Bash(gh pr edit:*), Bash(gh pr diff:*), Bash(gh search prs:*), Bash(gh api user:*), Bash(gh api repos/*/pulls/*/reviews:*), Bash(gh api repos/*/pulls/*/comments/*/replies:*), Bash(gh api graphql:*), Bash(gh issue view:*), Bash(gh repo view:*), Bash(git branch:*), Bash(git status:*), Bash(git fetch:*), Bash(git worktree:*), Bash(git push:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(jq:*)
argument-hint: [pr-numbers...] [author|reviews] [hold] [autonomous|ask|read-only]
Usage: /catalyst:pr-sweep [pr-numbers...] [author|reviews] [hold]
Examples: /catalyst:pr-sweep, /catalyst:pr-sweep author, /catalyst:pr-sweep 12 15 hold, /catalyst:pr-sweep read-only
---

# Sweep Pull Requests

Execute @node_modules/@xerilium/catalyst/playbooks/sweep-pull-requests.md

Map inputs:

- Numeric arguments → `pr-numbers`
- `author` or `reviews` → `scope`
- `autonomous`, `ask`, or `read-only` → `write-policy`
- `hold` → `review-post` = "hold"
- `ai-platform` → "$$AI_PLATFORM$$"
