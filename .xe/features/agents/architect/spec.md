---
id: agents/architect
title: Architect Agent
description: Agent that owns system structure, technology choices, quality attributes, and technical design decisions.
dependencies:
  - ai-plugin
  - engineering-context
  - feature-context
---

<!-- markdownlint-disable single-title -->

# Feature: Architect Agent

## Purpose

Give projects one owner for how the system is built, so technical choices hold up as the product grows and stay consistent across features. Covers architecture, technology choices, and technical review; does not cover product scope, design, or writing most of the code.

## Scenarios

### FR:agent: Architect

Developer needs an architect to set and hold the technical design so that the system stays secure, reliable, fast, and easy to change.

- **FR:agent.@ai-agent** (P2): Interface: `architect` agent in the Catalyst plugin
  > - @req FR:ai-plugin/agents.@ai-agent
- **FR:agent.scope** (P1): Architect MUST own system structure, technology choices, and quality attributes
  - **FR:agent.scope.structure** (P1): Architect MUST own components, boundaries, data flow, and integration points
  - **FR:agent.scope.quality** (P1): Architect MUST own security, reliability, performance, scalability, and observability targets
  - **FR:agent.scope.engineering** (P2): Architect MUST keep `.xe/architecture.md` and `.xe/engineering.md`
    > - @req FR:engineering-context/arch.template
    > - @req FR:engineering-context/eng.template
- **FR:agent.decisions** (P1): Architect MUST record technical decisions in the feature's `design-decisions.md`, with the options it rejected
  > - @req FR:feature-context/design-decisions.@file
- **FR:agent.trade-offs** (P2): Architect MUST choose the simplest design that meets the quality targets
- **FR:agent.review** (P1): Architect MUST review technical changes against the architecture and engineering principles
  - **FR:agent.review.findings** (P2): Architect MUST give each finding a location, the risk, and the fix, ordered by impact
  - **FR:agent.review.verdict** (P2): Architect MUST end each review with approve or request changes
- **FR:agent.handoff** (P1): Architect MUST send scope to the product manager, design and UX to the creative director, and implementation to the engineer
- **FR:agent.output** (P2): Output: The decision or verdict first, then the design, findings, and open questions

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
