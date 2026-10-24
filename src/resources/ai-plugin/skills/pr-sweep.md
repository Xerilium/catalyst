---
name: "pr-sweep"
description: Sweep every open PR involving you by role, update the ones you author, review the ones waiting on you, and report only the decisions that need you
allowed-tools: Read, Edit, Write, Glob, Grep, Task, TodoWrite, Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr checkout:*), Bash(gh pr comment:*), Bash(gh pr edit:*), Bash(gh pr diff:*), Bash(gh search prs:*), Bash(gh api repos/*/pulls/*/reviews:*), Bash(gh api repos/*/pulls/*/comments/*/replies:*), Bash(gh api graphql:*), Bash(gh issue view:*), Bash(gh repo view:*), Bash(git branch:*), Bash(git status:*), Bash(git fetch:*), Bash(git worktree:*), Bash(git push:*), Bash(git rebase:*), Bash(git stash:*), Bash(git log:*), Bash(gh run list:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(jq:*)
argument-hint: [pr-numbers...] [update|review] [interactive]
Usage: /catalyst:pr-sweep [pr-numbers...] [update|review] [interactive]
Examples: /catalyst:pr-sweep, /catalyst:pr-sweep update, /catalyst:pr-sweep 12 15 interactive
---

# Sweep Pull Requests

Execute @node_modules/@xerilium/catalyst/playbooks/sweep-pull-requests.md

Map inputs:

- Arguments → `pr-numbers`, `scope`, and `execution-mode`
- `ai-platform` → "$$AI_PLATFORM$$"
