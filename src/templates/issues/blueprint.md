---
name: Catalyst blueprint creation
description: Create a product blueprint breaking down features and dependencies.
title: "[Catalyst][Blueprint] {project-name} Blueprint"
type: Task
labels: []
assignees: []
---

## Phased Implementation

> **How to use this section**: List the specific capabilities your product needs in each phase. Replace the example bullets with YOUR project's capabilities. For instance, instead of "Core authentication system", write "GitHub OAuth integration" or "Email/password signup".
>
> **Phase definitions**:
> - **POC (Early Adopters)**: Prove core value proposition with acceptable rough edges
> - **Mainstream (Product-Market Fit)**: Polish, usability, control for broader adoption
> - **Innovation Leap (The Magic)**: Game-changing breakthrough capability
> - **Platform**: API-first, ecosystem, extensibility - enable others to build on you
> - **Enterprise Grade**: Security, compliance, accessibility, performance at scale
> - **Scale (Broader Appeal)**: Multi-user, power users, revenue model, business sustainability
>
> Reorder phases based on your product strategy (captured in init issue). Remove phases that don't apply.

**Phase 1 - POC (Early Adopters):**

- [Core capability that proves value proposition]
- [Minimum viable workflow/user journey]
- [Essential infrastructure/foundation]

**Phase 2 - Mainstream (if applicable):**

- [Polish/UX improvement]
- [Control/customization capability]
- [Onboarding/discoverability feature]

**Phase 3 - Innovation Leap (if applicable):**

- [Breakthrough capability]
- [Game-changing feature]

**Phase 4 - Platform (if applicable):**

- [API/extensibility capability]
- [Integration/ecosystem feature]
- [Developer tooling]

**Phase 5 - Enterprise Grade (if applicable):**

- [Compliance/governance capability]
- [Scale/performance feature]
- [Accessibility/globalization feature]

**Phase 6 - Scale (if applicable):**

- [Multi-user/team capability]
- [Power user feature]
- [Revenue/business capability]

Remove phases that don't apply. Reorder based on your product strategy.

## Primary User Workflow

Describe the high-level steps a user takes to accomplish the main goal with **Phase 1**. Use a numbered list for clarity.

Example:

1. User creates account
2. System sends confirmation email
3. User confirms email address
4. User creates first project
5. System suggests adding people
6. User invites team members
7. User views dashboard with project overview

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
