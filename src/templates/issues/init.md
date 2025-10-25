---
name: Catalyst project initialization
description: Initialize the project for Catalyst AI.
title: "[Catalyst][Init] {project-name}"
type: Task
labels: []
assignees: []
---

## Project Overview

Provide a brief description of the project.

- What is the project trying to accomplish?
- What problem or opportunity does it address?
- Why is this project important?

## Goals

Outline the high-level goals and objectives.

- What are the primary goals?
- What success metrics or outcomes are expected?
- Any specific milestones or timelines?

## Technology Preferences

Describe preferred technologies, frameworks, or constraints.

- What tech stack or tools are preferred?
- Any must-have or must-avoid technologies?
- Platform or deployment preferences?

## Team Roles

List key team members and their roles.

- Product Manager: [name/handle]
- Architect: [name/handle]
- Engineer: [name/handle]
- Other roles: [list]

## Additional Context

Any other details or constraints?

- Known dependencies or assumptions?
- Questions or uncertainties?

## AI Instructions

When this issue is assigned to an AI agent (e.g., GitHub Copilot or Catalyst AI), the agent should:

1. Parse the filled sections above for project details.
2. Run the `@xerilium/catalyst/src/playbooks/start-initialization.md` playbook to document product and engineering context. Use the current issue number as input.
3. Request review from the product manager and architect.
