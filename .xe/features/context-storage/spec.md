---
id: context-storage
title: Context Storage
description: Infrastructure for storing and deploying extensible, layered context to facilitate tuned AI execution.
dependencies: []
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Context Storage

## Purpose

Provide infrastructure for storing and deploying extensible, layered context to facilitate highly-tuned AI execution.

## Scenarios

### FR:storage: Context Storage Infrastructure

AI Agent needs storage infrastructure for context used to inform AI execution so that both framework defaults and project-specific context can coexist.

- **FR:storage.framework** (P1): Catalyst MUST provide `src/resources/` as storage for framework-provided resources
  - **FR:storage.framework.runtime** (P1): Framework resources MUST be accessible at `node_modules/@xerilium/catalyst/{resource-type}/` after npm install
- **FR:storage.project** (P1): Catalyst MUST provide `.xe/` as storage for user/project resources

### FR:templates: Templates Storage

AI Agent needs templates storage in framework-location and project-location so that template-based context generation works with framework defaults and user overrides.

- **FR:templates.framework** (P1): Catalyst MUST provide `src/resources/templates` storage for runtime template usage
- **FR:templates.project** (P3): Catalyst MUST provide `.xe/templates` storage for internal project use only
  - Does not need to be created as an empty folder on setup

### FR:standards: Standards Storage

AI Agent needs standards storage in framework-location and project-location so that framework conventions and project-specific standards are available.

- **FR:standards.framework** (P2): Catalyst MUST provide `src/resources/standards` storage for runtime standards usage
- **FR:standards.project** (P3): Catalyst MUST provide `.xe/standards` storage for internal project use only
  - Does not need to be created as an empty folder on setup
- **FR:standards.catalyst-templates** (P3): Catalyst MUST provide template conventions standard at `src/resources/standards/catalyst-templates.md`
  - Defines placeholder format, instruction block syntax, and heading hierarchy for markdown templates
- **FR:standards.auq** (P3): Catalyst MUST provide a standard how to use the AskUserQuestion tool for interactive Q&A to improve usability of AI workflows
  - **FR:standards.auq.function** (P3): Catalyst MUST provide a callable AUQ action file at `src/resources/playbooks/actions/auq.md`
    - Call sites invoke it with `Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to {imperative intent}`
    - **FR:standards.auq.function.content** (P3): Action file MUST contain a decision tree for when to skip AUQ
      - **FR:standards.auq.function.self-contained** (P3): Action file MUST contain a self-containment rule
      - **FR:standards.auq.function.limits** (P3): Action file MUST contain format limits (word counts, no markdown)
      - **FR:standards.auq.function.recommend** (P3): Action file MUST contain recommendation marker guidance
    - **FR:standards.auq.function.style** (P3): Action file MUST use imperative directives, not declarative rules

### FR:playbooks: Playbooks Storage

AI Agent needs playbooks storage in framework-location and project-location so that workflow definitions work with framework defaults and user-defined playbooks.

- **FR:playbooks.framework** (P1): Catalyst MUST provide `src/resources/playbooks` storage for runtime playbook usage
- **FR:playbooks.project** (P3): Catalyst MUST provide `.xe/playbooks` storage for internal project use only
  - Does not need to be created as an empty folder on setup

## Data Model

None

## Architecture Constraints

- **Build deployment**: Build system MUST copy all src/resources/ contents to dist/ root during compilation (not nested under resources/). This ensures resources are accessible at node_modules/@xerilium/catalyst/{resource-type}/ after npm install.

## External Dependencies

None
