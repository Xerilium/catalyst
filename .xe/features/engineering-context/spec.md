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

Architects and engineers need a structured way to document technical architecture and engineering principles for AI-powered development. Without optimized templates, engineering context documentation is bloated with token-heavy instructions, verbose placeholders, and duplicate content, leading to unnecessary AI token consumption while reducing clarity.

## Goals

- Provide token-efficient templates for essential architecture/engineering-owned context (architecture, engineering principles)
- Enable AI agents to make technical implementation decisions aligned with architecture patterns and engineering standards
- Minimize token usage through aggressive optimization (target: 30-40% reduction)
- Follow product-context feature precedent for token ROI analysis and optimization

Explicit non-goals:

- This feature does NOT include standards files (`.xe/standards/` - separate concern)
- This feature does NOT include process templates (development.md - separate feature)
- This feature does NOT include playbook templates (separate feature)

## Scenario

- As an **Architect**, I need a concise template for documenting technology stack and architecture patterns so that AI can make aligned technical decisions
  - Outcome: Token-efficient architecture documentation guiding all technical implementation

- As an **Engineer**, I need a template for engineering principles that AI can consume without excessive token overhead so that implementation follows consistent standards
  - Outcome: Clear engineering principles without verbose instructions or duplicate content

- As an **AI Agent**, I need to read architecture and engineering context during feature implementation so that I can align with technical decisions and quality standards
  - Outcome: AI-generated code aligns with architecture patterns and engineering principles

## Success Criteria

- Architecture.md template exists with essential sections (Overview, Technology Stack, Repository Structure, Technical Architecture Patterns)
- Engineering.md template exists with essential sections (Core Principles, Technical Standards, Development Process pointer)
- Templates follow [template standard](.xe/standards/catalyst.md)
- Templates achieve 30-40% token reduction compared to current versions
- Templates enable AI agents to make technical decisions without reading unnecessary context

## Design principles

See [.xe/product.md](.xe/product.md) for product-wide design principles.

No feature-specific design principles are needed for this template feature.

## Requirements

### Functional Requirements

- **FR-1**: Architecture.md template MUST exist
  - **FR-1.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-1.2**: Template MUST include sections for: Overview, Technology Stack, Repository Structure, Technical Architecture Patterns
  - **FR-1.3**: Template MUST be token-optimized (concise instructions, no unnecessary sections)

- **FR-2**: Engineering.md template MUST exist
  - **FR-2.1**: Template MUST follow template standard defined in `.xe/standards/catalyst.md`
  - **FR-2.2**: Template MUST include sections for: Core Principles, Technical Standards
  - **FR-2.3**: Template MUST be token-optimized (concise instructions, minimal placeholders)

### Non-functional requirements

- **NFR-1**: Cost & usage efficiency
  - Templates SHOULD be concise yet comprehensive to minimize token usage when read by AI agents
  - Instruction blocks SHOULD be clear and actionable to enable efficient AI completion
  - Templates SHOULD achieve 30-40% line reduction compared to current versions

- **NFR-2**: Reliability
  - Templates MUST use standard markdown syntax for maximum compatibility
  - Templates MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

## Key Entities

This is a template feature with no runtime data entities. Templates produce markdown files consumed by AI agents.

**Inputs:**

- Technology stack decisions (from architect or initialization issue)
- Repository structure and organization patterns (from codebase)
- Engineering principles and quality standards (from team/organization)

**Outputs:**

- Templates located in `src/templates/specs/` directory:
  - `architecture.md` - token-optimized technical architecture (stack, structure, patterns)
  - `engineering.md` - token-optimized engineering principles (core principles, standards)

## Dependencies

None
