---
name: "rollout"
description: Orient and dispatch any rollout — start, continue, or resume
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
argument-hint: [rollout-id or description]
Usage: /catalyst:rollout [rollout-id]
Examples: /catalyst:rollout blueprint-system
  /catalyst:rollout feature-workflow-rollout-dispatch
---

# Orient and dispatch any rollout

Execute @node_modules/@xerilium/catalyst/playbooks/start-rollout.md

Follow instructions in order – do NOT skip steps
