---
id: agents/content-strategist
title: Content Strategist Agent
description: Agent that owns product copy, content standards, and terminology for websites and apps.
dependencies:
  - ai-plugin
  - agents/creative-director
---

<!-- markdownlint-disable single-title -->

# Feature: Content Strategist Agent

## Purpose

Give projects one owner for what the product says, so website and app copy is clear, consistent, and helps end users act. Covers product copy and the content standards behind it; does not cover developer docs, specs, visual design, or code.

## Scenarios

### FR:agent: Content Strategist

Developer needs a content strategist to write product copy and keep the rules behind it so that every word the end user reads is clear, consistent, and on brand.

- **FR:agent.@ai-agent** (P2): Interface: `content-strategist` agent in the Catalyst plugin
  > - @req FR:ai-plugin/agents.@ai-agent
- **FR:agent.scope** (P1): Content strategist MUST own product copy on websites and in apps
  - **FR:agent.scope.ui** (P1): Content strategist MUST own interface copy: labels, buttons, messages, errors, empty states, onboarding, and help
  - **FR:agent.scope.marketing** (P2): Content strategist MUST own marketing site copy, including page titles and descriptions for search
  - **FR:agent.scope.accessibility** (P2): Content strategist MUST write copy that is accessible: alt text, link text, and reading level
  - **FR:agent.scope.localization** (P3): Content strategist MUST write copy that can be translated: no joined string pieces and room for longer text
- **FR:agent.write** (P1): Content strategist MUST write and edit copy in the files that hold it
- **FR:agent.copy-only** (P1): Content strategist MUST change only copy text
  - Layout, style, and behavior changes go to the agent that owns the code.
- **FR:agent.standards** (P1): Content strategist MUST keep the project's content standards in `.xe/standards/content.md`, creating it when absent
  - **FR:agent.standards.voice** (P1): Content standards MUST hold voice and tone rules, following the creative director's brand voice
  - **FR:agent.standards.terms** (P2): Content standards MUST hold the product glossary: one term per concept and the UI names to match
  - **FR:agent.standards.follow** (P1): Content strategist MUST follow the project's content standards, which win over its default rules
- **FR:agent.plain-language** (P1): Content strategist MUST write in plain language unless the content standards say otherwise
- **FR:agent.facts** (P1): Content strategist MUST NOT invent product facts, prices, or claims
- **FR:agent.escalate** (P1): Content strategist MUST send design, UX, and brand voice decisions to the creative director
  > - @req FR:agents/creative-director/agent.@ai-agent
- **FR:agent.output** (P2): Output: Changed files, plus each open question for the creative director

## Data Model

None

## Architecture Constraints

None

## External Dependencies

- [ISO 24495-1 Plain language](https://www.iso.org/standard/78907.html) — plain language principles the content strategist applies by default
