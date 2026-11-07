---
id: agents/engineer
title: Engineer Agent
description: Agent that builds, tests, and fixes code to the spec and the architecture.
dependencies:
  - ai-plugin
  - engineering-context
---

<!-- markdownlint-disable single-title -->

# Feature: Engineer Agent

## Purpose

Give projects one owner for turning specs into working, tested code that follows the project's architecture and conventions. Covers building, testing, and fixing; does not cover product scope, design, or architecture decisions.

## Scenarios

### FR:agent: Engineer

Developer needs an engineer to build and fix features so that the code matches the spec, follows the architecture, and is proven by tests.

- **FR:agent.@ai-agent** (P2): Interface: `engineer` agent in the Catalyst plugin
  > - @req FR:ai-plugin/agents.@ai-agent
- **FR:agent.scope** (P1): Engineer MUST own code, tests, and defect fixes
- **FR:agent.spec-first** (P1): Engineer MUST read the feature spec before changing feature code
  - **FR:agent.spec-first.update** (P1): Engineer MUST update the spec to match an agreed behavior change before the code
  - **FR:agent.spec-first.scope** (P1): Engineer MUST send new or changed scope to the product manager
- **FR:agent.process** (P1): Engineer MUST follow the project's development process in `.xe/process/development.md`
  > - @req FR:engineering-context/dev.template
- **FR:agent.tests** (P1): Engineer MUST prove each change with tests that fail without it
- **FR:agent.conventions** (P2): Engineer MUST follow `.xe/architecture.md`, `.xe/engineering.md`, and the project's standards
- **FR:agent.traceability** (P2): Engineer MUST link code and tests to the requirements they implement
- **FR:agent.handoff** (P1): Engineer MUST send work outside code to the agent that owns it
  - **FR:agent.handoff.output** (P1): Engineer MUST list each handoff in its output with the owner agent and the ask
    - Subagents cannot start other agents, so the caller routes handoffs.
  - Scope goes to the product manager, design and UX to the creative director, copy to the content strategist, and architecture to the architect.
- **FR:agent.output** (P2): Output: Changed files, the test results, and open questions

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
