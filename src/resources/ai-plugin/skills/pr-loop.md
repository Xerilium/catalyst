---
name: "pr-loop"
description: Run autonomous review and update rounds on a pull request until findings are resolved
allowed-tools: Read, Edit, Write, Glob, Grep, Task, TodoWrite, Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr checkout:*), Bash(gh pr comment:*), Bash(gh pr edit:*), Bash(gh pr diff:*), Bash(gh api user:*), Bash(gh api repos/*/pulls/*/reviews:*), Bash(gh api repos/*/pulls/*/comments/*/replies:*), Bash(gh api graphql:*), Bash(gh issue view:*), Bash(gh repo view:*), Bash(git branch:*), Bash(git status:*), Bash(git push:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(jq:*)
argument-hint: "[pr-number] [max-rounds]"
Usage: /catalyst:pr-loop [pr-number] [max-rounds]
Examples: /catalyst:pr-loop 123, /catalyst:pr-loop 123 5, /catalyst:pr-loop
---

# Loop Pull Request

Execute @node_modules/@xerilium/catalyst/playbooks/loop-pull-request.md

Map inputs:

- First argument → `pr-number`
- Second argument → `max-rounds`
- `ai-platform` → "$$AI_PLATFORM$$"
