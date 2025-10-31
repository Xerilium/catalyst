---
name: Catalyst blueprint creation
description: Create a product blueprint breaking down features and dependencies.
title: "[Catalyst][Blueprint] {project-name} Blueprint"
type: Task
labels: []
assignees: []
---

## Phased Implementation

Define what capabilities are needed in each phase.

**Phase 1 (MVP):**

- List the core capabilities needed for first release
- What can users accomplish with just these?

**Phase 2 (if applicable):**

- What capabilities come in the next phase?
- Any dependencies on Phase 1?

**Phase 3+ (if applicable):**

- Additional phases and their capabilities
- Remove if not needed

If no phases, just list all capabilities under Phase 1.

## Primary User Workflow

Describe the high-level steps a user takes to accomplish the main goal with **Phase 1**.

Example: "User signs up → completes onboarding → creates first project → invites team members → views dashboard"

Keep this at the macro level - the overall experience, not detailed task steps.

## Additional Context

Any other details that inform feature breakdown?

- Known technical constraints or integrations?
- Prioritization guidance?
- Questions or areas needing clarification?

## AI Instructions

When this issue is assigned to an AI agent (e.g., GitHub Copilot or Catalyst AI), the agent should:

1. Parse the filled sections above for product details.
2. Run the `start-blueprint` playbook to break down the product into discrete features with dependencies. Use the current issue number as input.
3. Request review from the product manager and architect.
