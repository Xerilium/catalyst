---
id: agents/product-manager
title: Product Manager Agent
description: Agent that owns product vision, scope, priority, and feature specs.
dependencies:
  - ai-plugin
  - product-context
  - feature-context
---

<!-- markdownlint-disable single-title -->

# Feature: Product Manager Agent

## Purpose

Give projects one owner for what to build and why, so work starts from a real user problem and a clear spec. Covers product vision, scope, priority, and specs; does not cover design, architecture, or code.

## Scenarios

### FR:agent: Product Manager

Developer needs a product manager to decide what to build and why so that the team builds the right thing for end users, in the right order.

- **FR:agent.@ai-agent** (P2): Interface: `product-manager` agent in the Catalyst plugin
  > - @req FR:ai-plugin/agents.@ai-agent
- **FR:agent.scope** (P1): Product manager MUST own product vision, strategy, scope, and priority
  - **FR:agent.scope.vision** (P1): Product manager MUST keep `.xe/product.md`, including its design principles
    > - @req FR:product-context/product.template
  - **FR:agent.scope.specs** (P1): Product manager MUST own feature specs: the user problem, the scenarios, and the acceptance criteria
    > - @req FR:feature-context/spec.@file
  - **FR:agent.scope.priority** (P2): Product manager MUST rank work by value to end users and the business
- **FR:agent.problem** (P1): Product manager MUST state the user problem and the expected outcome before scope
- **FR:agent.evidence** (P2): Product manager MUST base decisions on evidence from users, data, or the market, and say when evidence is missing
- **FR:agent.workflow** (P2): Product manager MUST use Catalyst workflows to create and change features
- **FR:agent.handoff** (P1): Product manager MUST send design and UX to the creative director and technical design to the architect
  - **FR:agent.handoff.output** (P1): Product manager MUST list each handoff in its output with the owner agent and the ask
    - Subagents cannot start other agents, so the caller routes handoffs.
- **FR:agent.output** (P2): Output: The decision first, then the changed files and open questions

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
