---
id: cli-check
title: CLI Check
description: CLI command that runs registered document-quality rules and reports findings by configured severity.
dependencies:
  - cli-engine
  - feature-context
---

<!-- markdownlint-disable single-title -->

# Feature: CLI Check

## Purpose

Catch mechanical document mistakes from the command line, so review time goes to what a document says, not how it is laid out. Rules are registry data under one command; judgment calls stay with reviewers.

## Scenarios

### FR:check: Check Command

Developer or AI Agent needs to run document-quality checks from the CLI so that rule violations surface before review.

- **FR:check.@cli** (P2): Interface: `catalyst check [feature] [--rules <patterns>]`
- **FR:check.input** (P2):
  - Feature filter (string) — optional feature ID, nested feature ID, spec path, or wildcard pattern; default all features
  - Rule patterns (string) — optional comma-separated rule IDs or `{namespace}.*` wildcards; default all rules
- **FR:check.execute** (P2): Command MUST run every selected, non-disabled rule against the documents in scope
  > - @req FR:cli-engine/traceability.execute
- **FR:check.rules** (P3): Command MUST run only the rules matching `--rules` when it is given
- **FR:check.exit** (P1): Command MUST exit non-zero when at least one finding has severity `error`
  > - @req FR:cli-engine/exit.codes
- **FR:check.quiet** (P3): Command MUST honor the global `-q, --quiet` flag by printing only `error` findings
  > - @req FR:cli-engine/cli.global
- **FR:check.json** (P3): Command MUST print findings as JSON when the global `--json` flag is set
  > - @req FR:cli-engine/cli.global
- **FR:check.output** (P2): One line per finding — file, line, severity, rule ID, offending text — then a summary line with finding counts per severity

### FR:registry: Rule Registry

Developer needs rules defined as registry data so that a new check costs one entry, not a new command.

- **FR:registry.id** (P2): Rule ID MUST have the shape `{namespace}.{rule}` in lowercase kebab-case
- **FR:registry.reserved** (P2): Registry MUST NOT register rules under the `traceability` namespace
- **FR:registry.pure** (P2): Rule MUST derive findings from the document content alone
- **FR:registry.output** (P2): Finding (@req FR:$finding) — one per violation

### FR:severity: Rule Severity

Developer needs per-rule severity in project config so that a repo adopts checks at its own pace.

- **FR:severity.@json** (P2): Interface: `.xe/config/catalyst.json`, key `check.rules`
- **FR:severity.input** (P2): Map from rule ID or `{namespace}.*` pattern to `error`, `warning`, or `disable`
- **FR:severity.default** (P2): Command MUST treat a rule with no matching entry as `warning`
- **FR:severity.precedence** (P2): Command MUST apply an exact rule ID entry over any wildcard entry
  - **FR:severity.precedence.wildcard** (P3): Command MUST apply the wildcard with the longest prefix when several match and no exact entry exists
- **FR:severity.disable** (P3): Command MUST skip a rule whose severity is `disable`
- **FR:severity.invalid** (P2): Command MUST fail with an `InvalidInput` error naming the entry when a severity is not `error`, `warning`, or `disable`
  > - @req FR:cli-engine/errors.InvalidInput

### FR:spec: Spec Shape Rules

Developer or AI Agent needs spec template mistakes caught mechanically so that review time goes to what a spec says, not how it is laid out.

- **FR:spec.input** (P2): Every `.xe/features/**/spec.md`, as repo-relative path and content
- **FR:spec.fences** (P3): Spec rules MUST ignore lines inside fenced code blocks
- **FR:spec.deprecated** (P3): Spec rules MUST skip deprecated (struck-through) requirements
- **FR:spec.one-req** (P2): Rule `spec.one-req` MUST flag a requirement carrying more than one `MUST`, `SHOULD`, or `MAY`
  > - @req FR:feature-context/spec.scenarios.structure.behaviors.normative.single
- **FR:spec.actor** (P2): Rule `spec.actor` MUST flag a requirement whose actor is the generic "System"
  > - @req FR:feature-context/spec.scenarios.structure.behaviors.normative.actor
- **FR:spec.opener** (P2): Rule `spec.opener` MUST flag a scenario whose first line is not a story of the form "{actor} needs to {action} so that {value}"
  > - @req FR:feature-context/spec.scenarios.format
- **FR:spec.refs** (P2): Rule `spec.refs` MUST flag a requirement ID or `@req` in requirement or scenario prose, outside code spans
  > - @req FR:feature-context/spec.scenarios.deps.format.blockquote
  - **FR:spec.refs.entity-type** (P3): Rule `spec.refs` MUST allow the entity type note `(@req FR:$entity)` in slot content
- **FR:spec.slots** (P2): Rule `spec.slots` MUST flag `MUST`, `SHOULD`, or `MAY` on an interface, input, output, or schema requirement
  > - @req FR:feature-context/spec.scenarios.structure.data-model
- **FR:spec.description** (P2): Rule `spec.description` MUST flag a spec whose frontmatter description is missing or longer than 120 characters
  > - @req FR:feature-context/spec.frontmatter
- **FR:spec.sections** (P2): Rule `spec.sections` MUST flag a spec missing the Purpose, Scenarios, Data Model, Architecture Constraints, or External Dependencies section
  > - @req FR:feature-context/spec.purpose
  > - @req FR:feature-context/spec.scenarios
  > - @req FR:feature-context/spec.data-model
  > - @req FR:feature-context/spec.constraints
  > - @req FR:feature-context/spec.dependencies

## Data Model

- **FR:$finding** (P2): **`Finding`** — One rule violation in one document.
  - `file` (string) — Repo-relative POSIX path
  - `line` (number) — 1-based line number
  - `rule` (string) — Rule ID, `{namespace}.{rule}`
  - `severity` (string) — Resolved severity
    - Allowed: error, warning
  - `text` (string) — Offending text, trimmed to 100 characters

## Architecture Constraints

None.

## External Dependencies

None.
