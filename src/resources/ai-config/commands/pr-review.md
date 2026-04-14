---
name: "pr-review"
description: Review a pull request for quality, correctness, and project alignment
allowed-tools: Read, Glob, Grep, Bash, Task, TodoWrite
argument-hint: <pr-number>
Usage: /catalyst:pr-review <pr-number>
Examples: /catalyst:pr-review 123
---

# Review Pull Request

Execute @node_modules/@xerilium/catalyst/playbooks/review-pull-request.md

Map inputs:

- First argument → `pr-number`
- `ai-platform` → "$$AI_PLATFORM$$"
