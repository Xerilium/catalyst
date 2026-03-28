---
name: "fix"
description: Investigate and fix bugs
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
argument-hint: [description]
Usage: /catalyst/fix [description]
Examples: /catalyst/fix profile-form crashes when first name is empty
  /catalyst/fix user profile crashes when there's no name
  /catalyst/fix 41
---

# Investigate and fix bugs

Execute @node_modules/@xerilium/catalyst/playbooks/repair-feature.md

Follow instructions in order – do NOT skip steps
