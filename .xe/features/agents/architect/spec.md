---
id: agents/architect
title: Architect Agent
description: Agent that owns system structure, technology choices, quality attributes, and technical design decisions.
dependencies:
  - agents/creative-director
  - agents/engineer
  - agents/product-manager
  - ai-plugin
  - engineering-context
  - feature-context
---

<!-- markdownlint-disable single-title -->

# Feature: Architect Agent

## Purpose

Give projects one owner for how the system is built, so technical choices hold up as the product grows, stay consistent across features, and return the most value for what they cost. Covers architecture, technology choices, and technical review; does not cover product scope, design, or writing most of the code.

## Scenarios

### FR:agent: Architect

Developer needs an architect to set and hold the technical design so that the system is secure, reliable, fast, and easy to change, and gives the most value for its cost.

- **FR:agent.@ai-agent** (P2): Interface: `architect` agent in the Catalyst plugin
  > - @req FR:ai-plugin/agents.@ai-agent
- **FR:agent.scope** (P1): Architect MUST own system structure, technology choices, and quality attributes
  - **FR:agent.scope.structure** (P1): Architect MUST own components, boundaries, data flow, and integration points
  - **FR:agent.scope.quality** (P1): Architect MUST own security, reliability, performance, scalability, observability, and cost targets
  - **FR:agent.scope.engineering** (P2): Architect MUST own and update `.xe/architecture.md` and `.xe/engineering.md`
    > - @req FR:engineering-context/arch.template
    > - @req FR:engineering-context/eng.template
- **FR:agent.decisions** (P1): Architect MUST record technical decisions in the feature's `design-decisions.md`, with the options it rejected
  > - @req FR:feature-context/design-decisions.@file
  - **FR:agent.decisions.revisit** (P1): Architect MUST change a past decision when researched evidence supports it and the caller approves
    - **FR:agent.decisions.revisit.evidence** (P2): Architect MUST state the evidence, the old decision, and the new decision
- **FR:agent.value** (P1): Architect MUST choose the design that gives the most value to end users and the business for its total cost
  - **FR:agent.value.cost** (P2): Architect MUST count the cost to build, run, and change the design
  - **FR:agent.value.balance** (P2): Architect MUST balance the quality targets against cost
  - **FR:agent.value.need** (P2): Architect MUST size each quality attribute to the level the product targets
  - **FR:agent.value.simple** (P2): Architect MUST choose the simplest design when two designs give equal value
- **FR:agent.review** (P1): Architect MUST review technical changes against the architecture and engineering principles
  - **FR:agent.review.findings** (P2): Architect MUST give each finding a location, the risk, and the fix, ordered by impact
  - **FR:agent.review.verdict** (P2): Architect MUST end each review with approve or request changes
- **FR:agent.handoff** (P1): Architect MUST send work it does not own to the agent that owns it
  - **FR:agent.handoff.scope** (P2): Architect MUST send scope and priority to the product manager agent
    > - @req FR:agents/product-manager/agent.@ai-agent
  - **FR:agent.handoff.design** (P2): Architect MUST send design and UX to the creative director agent
    > - @req FR:agents/creative-director/agent.@ai-agent
  - **FR:agent.handoff.build** (P2): Architect MUST send implementation to the engineer agent
    > - @req FR:agents/engineer/agent.@ai-agent
  - **FR:agent.handoff.route** (P1): Architect MUST list each handoff with the owner agent and the ask when it cannot start the owner agent
- **FR:agent.output** (P2): Output: The decision or verdict first, then the design, findings, and open questions

## Data Model

None

## Architecture Constraints

None

## External Dependencies

- [FinOps Framework](https://www.finops.org/framework/) — value-for-cost principles the architect applies to design trade-offs
