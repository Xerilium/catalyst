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

**FR:arch**: Architecture.md Template

- **FR:arch.template**: Template MUST exist and follow template standard defined in `.xe/standards/catalyst.md`
- **FR:arch.overview**: Template MUST include Overview section with pointers to related context files
- **FR:arch.stack**: Template MUST include Technology Stack section with Runtime and Development subsections
  - **FR:arch.stack.runtime**: Runtime Technologies subsection MUST list services, frameworks, and libraries that ship to production
  - **FR:arch.stack.runtime.categories**: Runtime subsection MUST support categories: Runtime Env, App Platform, Integration & Orchestration, Data & Analytics, Media & Gaming, Mobile, AI/ML, Observability
  - **FR:arch.stack.dev**: Development Technologies subsection MUST list tools, frameworks, and services used during development
  - **FR:arch.stack.dev.categories**: Development subsection MUST support categories: Languages, Dev Env, AI Coding, Test Framework, DevOps Automation, Distribution, Observability
- **FR:arch.structure**: Template MUST include Repository Structure section
  - **FR:arch.structure.tree**: Structure MUST show directory tree with source code, config, scripts, docs
  - **FR:arch.structure.comments**: Structure MUST include inline comments explaining each directory
  - **FR:arch.structure.exclude**: Structure MUST exclude build artifacts, dependencies, and VCS folders
  - **FR:arch.structure.simple**: Simple apps SHOULD use root source folder only
  - **FR:arch.structure.complex**: Complex apps SHOULD include component/layer folders
- **FR:arch.patterns**: Template MUST include Technical Architecture Patterns section for documenting project-specific architectural decisions

**FR:eng**: Engineering.md Template

- **FR:eng.template**: Template MUST exist and follow template standard defined in `.xe/standards/catalyst.md`
- **FR:eng.principles**: Template MUST include Core Principles section with actionable engineering guidelines
  - **FR:eng.principles.list**: Principles MUST include: KISS, YAGNI, Separation of Concerns, Single Responsibility, Open/Closed, Dependency Inversion, Principle of Least Astonishment, DRY, Fail Fast, Design for Testability, Deterministic Processing
- **FR:eng.standards**: Template MUST include Technical Standards section with pointers to standards directory and development process

**FR:dev**: Development.md Template

- **FR:dev.template**: Template MUST exist and follow template standard defined in `.xe/standards/catalyst.md`
- **FR:dev.workflow**: Template MUST include sections for workflow phases, human checkpoints, and quality gates

### Non-functional requirements

**NFR:cost**: Cost & Usage Efficiency

- **NFR:cost.token-efficiency**: All templates MUST be token-optimized with concise instructions
  - Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - Structured data SHOULD use concise formats (YAML over verbose prose where appropriate)
  - Instruction blocks SHOULD be clear and actionable to enable efficient AI completion

**NFR:reliability**: Reliability

- **NFR:reliability.syntax**: Templates MUST use standard markdown syntax for maximum compatibility
- **NFR:reliability.structure**: Templates MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

## Key Entities

None

**Inputs:**

- Technology stack decisions
- Repository structure and organization patterns
- Engineering principles and quality standards

**Outputs:**

- `src/resources/templates/specs/architecture.md` - technical architecture template (stack, structure, patterns)
- `src/resources/templates/specs/engineering.md` - engineering principles template (core principles, standards)
- `.xe/process/development.md` - development process template (workflow phases, checkpoints)

## Dependencies

None
