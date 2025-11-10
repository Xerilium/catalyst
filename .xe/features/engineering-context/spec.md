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
- Development process template is included but lives in `.xe/process/` directory (engineering-owned context)

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
  - **FR-1.3**: Template MUST include Technology Stack section with the following aspects:
    - **FR-1.3.1**: Runtime Environment
    - **FR-1.3.2**: Runtime Dependencies
    - **FR-1.3.3**: Dev Dependencies
    - **FR-1.3.4**: Data Storage
    - **FR-1.3.5**: Automation
    - **FR-1.3.6**: AI Integration (Dev)
    - **FR-1.3.7**: AI Integration (Runtime)
    - **FR-1.3.8**: Testing Framework
    - **FR-1.3.9**: Deployment Method
    - **FR-1.3.10**: Security
    - **FR-1.3.11**: Monitoring/Logging
  - **FR-1.4**: Template MUST include Repository Structure section showing directory organization with purpose comments
  - **FR-1.5**: Template MUST include Technical Architecture Patterns section for documenting project-specific architectural decisions
  - **FR-1.6**: Template MUST be token-optimized with concise instructions

- **FR-2**: Engineering.md template MUST exist
  - **FR-2.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-2.2**: Template MUST include Core Principles section with actionable engineering guidelines:
    - **FR-2.2.1**: KISS (Keep It Simple, Stupid)
    - **FR-2.2.2**: YAGNI (You Aren't Gonna Need It)
    - **FR-2.2.3**: Separation of Concerns
    - **FR-2.2.4**: Single Responsibility
    - **FR-2.2.5**: Open/Closed
    - **FR-2.2.6**: Dependency Inversion
    - **FR-2.2.7**: Principle of Least Astonishment
    - **FR-2.2.8**: DRY (Don't Repeat Yourself)
    - **FR-2.2.9**: Fail Fast
    - **FR-2.2.10**: Design for Testability
    - **FR-2.2.11**: Deterministic Processing
  - **FR-2.3**: Template MUST include Technical Standards section with pointers to standards directory and development process
  - **FR-2.4**: Template MUST be token-optimized with concise instructions

- **FR-3**: Development.md template MUST exist
  - **FR-3.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-3.2**: Template MUST include sections for workflow phases, human checkpoints, and quality gates
  - **FR-3.3**: Template MUST be token-optimized with concise instructions

### Non-functional requirements

- **NFR-1**: Cost & usage efficiency
  - Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - Instruction blocks SHOULD be clear and actionable to enable efficient AI completion

- **NFR-2**: Reliability
  - Templates MUST use standard markdown syntax for maximum compatibility
  - Templates MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

## Key Entities

None

**Inputs:**

- Technology stack decisions
- Repository structure and organization patterns
- Engineering principles and quality standards

**Outputs:**

- `src/templates/specs/architecture.md` - technical architecture template (stack, structure, patterns)
- `src/templates/specs/engineering.md` - engineering principles template (core principles, standards)
- `.xe/process/development.md` - development process template (workflow phases, checkpoints)

## Dependencies

None
