---
id: creative-agents
title: Creative Agents
description: Creative director and content strategist agents that own design, UX, and product copy.
dependencies:
  - ai-plugin
---

<!-- markdownlint-disable single-title -->

# Feature: Creative Agents

## Purpose

Give projects one clear owner for how a product looks, works, and reads, so design, UX, and copy decisions are made on purpose instead of by whoever touches the code. Covers who decides and who writes; does not cover code, specs, or product strategy.

## Scenarios

### FR:director: Creative Direction

Developer needs one agent to set design, UX, and content direction and review work against it so that the product stays consistent and decisions favor end users.

- **FR:director.@ai-agent** (P2): Interface: `creative-director` agent in the Catalyst plugin
  > - @req FR:ai-plugin/agents.@ai-agent
- **FR:director.owns** (P1): Creative director MUST own design, UX, and content decisions
- **FR:director.end-users** (P1): Creative director MUST pick the option that is best for end users
- **FR:director.direction** (P1): Creative director MUST state direction as design principles, UX decisions, and voice and tone guidance
- **FR:director.review** (P1): Creative director MUST review design, UX, and copy changes against the direction
  - **FR:director.review.verdict** (P2): Creative director MUST end each review with approve or request changes
  - **FR:director.review.findings** (P2): Creative director MUST give each finding a location and a fix
- **FR:director.copy** (P1): Creative director MUST route website and app copy writing to the content strategist
- **FR:director.read-only** (P1): Creative director MUST NOT have file edit tools
  - Rationale: The director decides and reviews; other agents make the change.

### FR:strategist: Product Copy

Developer needs one agent to write and edit website and app copy so that product text is clear, consistent, and follows the project's writing rules.

- **FR:strategist.@ai-agent** (P2): Interface: `content-strategist` agent in the Catalyst plugin
  > - @req FR:ai-plugin/agents.@ai-agent
- **FR:strategist.owns** (P1): Content strategist MUST own website and app copy
- **FR:strategist.write** (P1): Content strategist MUST write and edit copy in the files that hold it
- **FR:strategist.copy-only** (P1): Content strategist MUST change only copy text
  - Layout, style, and behavior changes go to the agent that owns the code.
- **FR:strategist.rules** (P1): Content strategist MUST follow the project's writing rules
  - **FR:strategist.rules.ste** (P1): Content strategist MUST write in Simplified Technical English when the project's writing rules require it
- **FR:strategist.direction** (P1): Content strategist MUST follow the creative director's voice and tone direction
- **FR:strategist.escalate** (P1): Content strategist MUST send design and UX decisions to the creative director
- **FR:strategist.output** (P2): Output: Changed files, plus each open question for the creative director

## Data Model

None

## Architecture Constraints

None

## External Dependencies

- [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/) — writing standard the content strategist applies when project rules require it
