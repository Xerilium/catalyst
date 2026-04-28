---
id: engineering-context
title: Engineering Context Templates
description: PM/architect-owned templates for documenting architecture, engineering principles, and development processes.
dependencies:
  - context-storage
  - feature-context
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Engineering Context Templates

## Purpose

Architects and engineers need a structured way to document technical architecture, engineering principles, and development processes for AI-powered development. Without token-efficient templates, engineering context documentation contains unnecessary verbosity, leading to excessive AI token consumption while reducing clarity. This feature provides token-efficient templates for essential architecture/engineering-owned context.

Explicit non-goals:

- Standards files (`.xe/standards/` — separate concern)
- Playbook templates (separate feature)
- Development process template is included but lives in `.xe/process/` directory (engineering-owned context)

## Scenarios

### FR:arch: Architecture.md Template

Architect needs a concise template for documenting technology stack and architecture patterns so that AI can make aligned technical decisions.

- **FR:arch.template** (P1): Template MUST exist and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:arch.overview** (P2): Template MUST include Overview section with pointers to related context files
- **FR:arch.stack** (P1): Template MUST include Technology Stack section with Runtime and Development subsections
  - **FR:arch.stack.runtime** (P1): Runtime Technologies subsection MUST list services, frameworks, and libraries that ship to production
  - **FR:arch.stack.runtime.categories** (P3): Runtime subsection MUST support categories: Runtime Env, App Platform, Integration & Orchestration, Data & Analytics, Media & Gaming, Mobile, AI/ML, Observability
  - **FR:arch.stack.dev** (P1): Development Technologies subsection MUST list tools, frameworks, and services used during development
  - **FR:arch.stack.dev.categories** (P3): Development subsection MUST support categories: Languages, Dev Env, AI Coding, Test Framework, DevOps Automation, Distribution, Observability
- **FR:arch.structure** (P1): Template MUST include Repository Structure section
  - **FR:arch.structure.tree** (P2): Structure MUST show directory tree with source code, config, scripts, docs
  - **FR:arch.structure.comments** (P2): Structure MUST include inline comments explaining each directory
  - **FR:arch.structure.exclude** (P2): Structure MUST exclude build artifacts, dependencies, and VCS folders
  - **FR:arch.structure.simple** (P3): Simple apps SHOULD use root source folder only
  - **FR:arch.structure.complex** (P3): Complex apps SHOULD include component/layer folders
- **FR:arch.patterns** (P2): Template MUST include Technical Architecture Patterns section for documenting project-specific architectural decisions
- **FR:arch.output** (P1): Template MUST be output to `src/resources/templates/specs/architecture.md`
  > - @req FR:context-storage/templates.framework

### FR:eng: Engineering.md Template

Engineer needs a template for engineering principles that AI can consume without excessive token overhead so that implementation follows consistent standards.

- **FR:eng.template** (P1): Template MUST exist and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:eng.principles** (P1): Template MUST include Core Principles section with actionable engineering guidelines
  - **FR:eng.principles.list** (P2): Principles MUST include: Distilled Excellence, Boy Scout Rule, Convention over Configuration, KISS, YAGNI, Separation of Concerns, Single Responsibility, Open/Closed, Dependency Inversion, Principle of Least Astonishment, DRY, Fail Fast, Design for Testability, Deterministic Processing
- **FR:eng.standards** (P2): Template MUST include Technical Standards section with pointers to standards directory and development process
- **FR:eng.quality** (P1): Template MUST include Quality section under Technical Standards
  - **FR:eng.quality.priority** (P1): Quality section MUST define priority classifications (P1-P5) with semantic descriptions for AI to apply when classifying requirements
  - **FR:eng.quality.priority.defaults** (P2): Priority classifications MUST default to: P1 (Critical) for security/data integrity/core functionality, P2 (Important) for error handling/key features/integration points, P3 (Standard) for regular functionality/validation/formatting, P4 (Minor) for performance/optimizations/tooling/automation, P5 (Informational) for documentation/process
  - **FR:eng.quality.threshold** (P2): Quality section MUST define priority threshold defaulting to P3 (meaning P1-P3 are required)
  - **FR:eng.quality.traceability** (P2): Quality section MUST define requirements traceability percentage target under priority threshold, defaulting to 100%
  - **FR:eng.quality.code-coverage** (P2): Quality section MUST define code coverage percentage target under priority threshold, defaulting to 90%
- **FR:eng.output** (P1): Template MUST be output to `src/resources/templates/specs/engineering.md`
  > - @req FR:context-storage/templates.framework

### FR:dev: Development.md Template

Engineer needs a development process template defining workflow phases and quality gates so that AI agents follow consistent development processes.

- **FR:dev.template** (P1): Template MUST exist and follow template standard defined in `src/resources/standards/catalyst-templates.md`
  > - @req FR:context-storage/standards.catalyst-templates
- **FR:dev.workflow** (P1): Template MUST include sections for workflow phases, human checkpoints, and quality gates
- **FR:dev.output** (P1): Template MUST be output to `.xe/process/development.md`
  > - @req FR:feature-context/rollout.location

### Non-functional Requirements

- **NFR:cost.token-efficiency** (P3): All templates MUST be token-optimized with concise instructions
- **NFR:reliability.syntax** (P3): Templates MUST use standard markdown syntax for maximum compatibility
- **NFR:reliability.structure** (P3): Templates MUST be structured consistently (instruction blocks, placeholders, clear hierarchy)

## Architecture Constraints

None

## External Dependencies

None
