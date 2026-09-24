---
name: "pr-review"
description: Review a pull request for quality, correctness, and project alignment
allowed-tools: Read, Glob, Grep, Task, TodoWrite, Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr checkout:*), Bash(gh api user:*), Bash(gh api repos/*/pulls/*/reviews:*), Bash(gh api graphql:*), Bash(gh issue view:*), Bash(gh repo view:*), Bash(git branch:*), Bash(git status:*), Bash(jq:*)
argument-hint: [pr-number]
Usage: /catalyst:pr-review [pr-number]
Examples: /catalyst:pr-review 123, /catalyst:pr-review
---

# Review Pull Request

Execute @node_modules/@xerilium/catalyst/playbooks/review-pull-request.md

Map inputs:

- First argument → `pr-number`
- `ai-platform` → "$$AI_PLATFORM$$"
