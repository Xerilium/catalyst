---
id: engineering-context
title: Engineering Context Templates
author: "@flanakin"
description: "This document defines the engineering context template feature that provides reusable templates for architecture/engineering-owned context files (architecture.md, engineering.md) defining technical stack, repository structure, architecture patterns, and engineering principles for AI-powered software development."
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Engineering Context Templates

## Problem

Architects and engineers need a structured way to document technical architecture, engineering principles, and development processes for AI-powered development. Without token-efficient templates, engineering context documentation contains unnecessary verbosity, leading to excessive AI token consumption while reducing clarity.

## Goals

- Provide token-efficient templates for essential architecture/engineering-owned context (architecture, engineering principles, development process)
- Enable AI agents to make technical implementation decisions aligned with architecture patterns and engineering standards
- Minimize token usage while maintaining clarity and decision-making utility

Explicit non-goals:

- This feature does NOT include standards files (`.xe/standards/` - separate concern)
- This feature does NOT include playbook templates (separate feature)

## Scenario

- As an **Architect**, I need a concise template for documenting technology stack and architecture patterns so that AI can make aligned technical decisions
  - Outcome: Token-efficient architecture documentation guiding all technical implementation

- As an **Engineer**, I need a template for engineering principles that AI can consume without excessive token overhead so that implementation follows consistent standards
  - Outcome: Clear engineering principles without verbose instructions or duplicate content

- As an **AI Agent**, I need to read architecture and engineering context during feature implementation so that I can align with technical decisions and quality standards
  - Outcome: AI-generated code aligns with architecture patterns and engineering principles

## Success Criteria

- Architecture.md template provides comprehensive technical architecture guidance while maintaining token efficiency
- Engineering.md template provides actionable engineering principles and technical standards
- Templates follow [template standard](.xe/standards/catalyst.md)
- Templates enable AI agents to make technical decisions without reading unnecessary context

## Design principles

See [.xe/product.md](.xe/product.md) for product-wide design principles.

No feature-specific design principles are needed for this template feature.

## Requirements

### Functional Requirements

- **FR-1**: Architecture.md template MUST exist
  - **FR-1.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-1.2**: Template MUST include Overview section with pointers to related context files
  - **FR-1.3**: Template MUST include Technology Stack section defining runtime environment, data storage, automation tools, AI integration, testing framework, deployment method, security measures, and monitoring/logging
  - **FR-1.4**: Template MUST include Repository Structure section showing directory organization with purpose comments
  - **FR-1.5**: Template MUST include Technical Architecture Patterns section for documenting project-specific architectural decisions
  - **FR-1.6**: Template MUST be token-optimized with concise instructions

- **FR-2**: Engineering.md template MUST exist
  - **FR-2.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-2.2**: Template MUST include Core Principles section with actionable engineering guidelines (KISS, YAGNI, Separation of Concerns, Single Responsibility, Open/Closed, Dependency Inversion, Principle of Least Astonishment, DRY, Fail Fast, Design for Testability, Deterministic Processing)
  - **FR-2.3**: Template MUST include Technical Standards section with pointers to standards directory and development process
  - **FR-2.4**: Template MUST be token-optimized with concise instructions

### Non-functional requirements

- **NFR-1**: Cost & usage efficiency
  - Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - Instruction blocks SHOULD be clear and actionable to enable efficient AI completion

- **NFR-2**: Reliability
  - Templates MUST use standard markdown syntax for maximum compatibility
  - Templates MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

## Key Entities

This is a template feature with no runtime data entities. Templates produce markdown files consumed by AI agents.

**Inputs:**

- Technology stack decisions
- Repository structure and organization patterns
- Engineering principles and quality standards

**Outputs:**

- Templates located in `src/templates/specs/` directory:
  - `architecture.md` - technical architecture template (stack, structure, patterns)
  - `engineering.md` - engineering principles template (core principles, standards)
  - `development.md` - development process template (workflow phases, checkpoints)

## Dependencies

None
