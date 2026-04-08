---
name: "explore"
description: Investigate, research, or brainstorm ideas
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
argument-hint: [description]
Usage: /catalyst:explore [description]
Examples: /catalyst:explore how we could scale to support 1M concurrent sessions
  /catalyst:explore execution-engine optimization and performance tuning
  /catalyst:explore 41
---
<!-- [Catalyst Feedback] Track workflow quality throughout this session. -->
<!-- Observe: user friction, instruction adherence, phase effectiveness, token efficiency, AUQ quality, artifact completeness. -->
<!-- [AUQ] Before every AskUserQuestion: Is it necessary? Self-contained? Under 100 words? Actionable options? One recommended? -->


# Investigate, research, or brainstorm ideas

Execute @node_modules/@xerilium/catalyst/playbooks/explore-feature.md

Follow instructions in order – do NOT skip steps

---

## After completing all steps above

Execute @node_modules/@xerilium/catalyst/playbooks/invoke-retrospective.md
