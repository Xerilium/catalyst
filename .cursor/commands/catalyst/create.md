---
name: "create"
description: Create new features or add new capabilities
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
argument-hint: [description]
Usage: /catalyst/create [description]
Examples: /catalyst/create user-authentication to sign users in using industry standards
  /catalyst/create user authentication layer
  /catalyst/create 41
---
<!-- [Catalyst Feedback] Track workflow quality throughout this session. -->
<!-- Observe: user friction, instruction adherence, phase effectiveness, token efficiency, AUQ quality, artifact completeness. -->
<!-- [AUQ] Before every AskUserQuestion: Is it necessary? Self-contained? Under 100 words? Actionable options? One recommended? -->


# Create new features or add new capabilities

Execute @node_modules/@xerilium/catalyst/playbooks/create-feature.md

Follow instructions in order – do NOT skip steps

---

## After completing all steps above

Execute @node_modules/@xerilium/catalyst/playbooks/invoke-retrospective.md
