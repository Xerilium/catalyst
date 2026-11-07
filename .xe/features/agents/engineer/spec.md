---
id: agents/engineer
title: Engineer Agent
description: Agent that builds, tests, and fixes code to the spec and the architecture.
dependencies:
  - ai-plugin
  - engineering-context
  - req-traceability
  - agents/architect
  - agents/content-strategist
  - agents/creative-director
  - agents/product-manager
  - context-storage
  - feature-context
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
    - Rationale: The engineer applies decisions already made; a product manager round trip adds cost and no value.
  - **FR:agent.spec-first.scope** (P1): Engineer MUST send new or changed scope to the product manager agent before it updates the spec
    > - @req FR:agents/product-manager/agent.@ai-agent
- **FR:agent.process** (P1): Engineer MUST follow the project's development process in `.xe/process/development.md`
  > - @req FR:engineering-context/dev.template
- **FR:agent.test-driven** (P1): Engineer MUST write a test that fails without the change before it writes the change
  - **FR:agent.test-driven.bug** (P1): Engineer MUST reproduce each bug with a failing test before it fixes the bug
- **FR:agent.conventions** (P2): Engineer MUST follow `.xe/architecture.md`, `.xe/engineering.md`, and the project's standards
  > - @req FR:engineering-context/arch.location
  > - @req FR:engineering-context/eng.template
  > - @req FR:context-storage/standards.project
- **FR:agent.traceability** (P2): Engineer MUST link code and tests to the requirements they implement with `@req` annotations
  > - @req FR:req-traceability/annotation.tag
  > - @req FR:req-traceability/annotation.tests
- **FR:agent.comments** (P2): Engineer MUST use `@req` links instead of comments that restate requirements
  - **FR:agent.comments.detail** (P2): Engineer MUST add a comment only to explain how or why code works when the requirement does not show it
  - **FR:agent.comments.ste** (P3): Engineer MUST write comments in Simplified Technical English
    > - @req FR:feature-context/spec.ste
- **FR:agent.decisions** (P1): Engineer MUST change a past implementation decision when researched evidence supports it and the caller approves
- **FR:agent.handoff** (P1): Engineer MUST send work outside code to the agent that owns it
  - **FR:agent.handoff.scope** (P2): Engineer MUST send scope and priority to the product manager agent
    > - @req FR:agents/product-manager/agent.@ai-agent
  - **FR:agent.handoff.design** (P2): Engineer MUST send design and UX to the creative director agent
    > - @req FR:agents/creative-director/agent.@ai-agent
  - **FR:agent.handoff.copy** (P2): Engineer MUST send product and marketing copy to the content strategist agent
    > - @req FR:agents/content-strategist/agent.@ai-agent
  - **FR:agent.handoff.architecture** (P2): Engineer MUST send architecture changes to the architect agent
    > - @req FR:agents/architect/agent.@ai-agent
  - **FR:agent.handoff.route** (P1): Engineer MUST list each handoff with the owner agent and the ask when it cannot start the owner agent
- **FR:agent.output** (P2): Output: Changed files, the test results, and open questions

## Data Model

None

## Architecture Constraints

None

## External Dependencies

- [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/) — writing rules for code comments
