---
name: "change"
description: Update or refactor existing features
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
argument-hint: [description]
Usage: /catalyst/change [description]
Examples: /catalyst/change user-authentication to simplify the authentication flow
  /catalyst/change user-authentication
  /catalyst/change 41
---
<!-- [Catalyst Feedback] Track workflow quality throughout this session. -->
<!-- Observe: user friction, instruction adherence, phase effectiveness, token efficiency, AUQ quality, artifact completeness. -->
<!-- [AUQ] Before every AskUserQuestion: Is it necessary? Self-contained? Under 100 words? Actionable options? One recommended? -->


# Update or refactor existing features

Execute @node_modules/@xerilium/catalyst/playbooks/update-feature.md

Follow instructions in order – do NOT skip steps

---

## After completing all steps above

Execute @node_modules/@xerilium/catalyst/playbooks/invoke-retrospective.md
