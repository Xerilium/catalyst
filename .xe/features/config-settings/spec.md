---
id: config-settings
title: Config Settings
description: Catalog of every Catalyst setting, with type, default, and location, and one function to look up values.
dependencies:
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: Config Settings

## Purpose

Give Catalyst one list of the settings it supports and one way to read them. A setting's type, default, and location live in one place, so every feature reads it the same way.

## Scenarios

### FR:file: Repo config file

Project Maintainer needs one file in the repository for Catalyst settings so that the settings travel with the code and get reviewed like code.

- **FR:file.@json** (P2): Interface: `.xe/config/catalyst.json` at the project root
- **FR:file.input** (P2): JSON object (@req FR:$config)
  - A setting key is the dotted path to its value; `pull-requests.merge.never` is `{ "pull-requests": { "merge": { "never": [...] } } }`
- **FR:file.missing** (P2): Loader MUST treat a missing or blank file as a file with no settings
- **FR:file.invalid** (P1): Loader MUST fail with a `ConfigInvalid` error when the text is not a JSON object
  > - @req FR:error-handling/catalyst-error
- **FR:file.output** (P2): Parsed config (@req FR:$config)

### FR:env: Environment settings

Developer needs machine-level settings in environment variables so that secrets and local choices stay out of the repository.

- **FR:env.@env** (P2): Interface: process environment variables named `CATALYST_*`
- **FR:env.boolean** (P3): Lookup MUST read `1` or `true` as true for a boolean environment setting
  - **FR:env.boolean.other** (P3): Lookup MUST read any other value as false
- **FR:env.empty** (P3): Lookup MUST treat an empty environment variable as not set

### FR:lookup: Setting lookup

Developer needs to read any setting through one function so that every feature applies the same defaults and type rules.

- **FR:lookup.@function** (P2): Interface: `getSetting(key, config?, env?)`, `parseConfig(text)`, and `readConfig(projectRoot)` from `src/core/config`
- **FR:lookup.input** (P2):
  - Key (string) — a catalog key (@req FR:$setting)
  - Config (@req FR:$config) — optional; default no file settings
  - Environment (object) — optional; default the process environment
- **FR:lookup.unknown** (P2): Lookup MUST fail with an `InvalidInput` error when the key is not in the catalog
- **FR:lookup.value** (P1): Lookup MUST return the set value when its type matches the catalog type
  - **FR:lookup.value.strings** (P1): Lookup MUST drop items that are not strings from a `string[]` value
- **FR:lookup.default** (P1): Lookup MUST return the catalog default when the setting is not set
  - **FR:lookup.default.mismatch** (P2): Lookup MUST return the catalog default when the set value has a different type
  - **FR:lookup.default.copy** (P3): Lookup MUST return a new copy of an array or object default on each call
- **FR:lookup.output** (P2): Setting value, typed per its catalog entry

### FR:catalog: Settings catalog

Project Maintainer needs every supported setting listed with its type, default, and location so that they can configure Catalyst without reading code.

- **FR:catalog.complete** (P1): Catalog MUST list every setting that Catalyst reads from the config file or a `CATALYST_*` environment variable
- **FR:catalog.schema** (P2): Each entry (@req FR:$setting)
- **FR:catalog.file** (P2): Config file settings, read from the working tree unless marked base branch:
  - **FR:catalog.file.check-rules** (P3): `check.rules` (object) — rule ID or `{namespace}.*` to `error`, `warning`, or `disable`; default `{}`
  - **FR:catalog.file.labels-style** (P3): `labels.style` (string) — `key-value`, `simple`, or `custom`; default empty, which uses the standard names
  - **FR:catalog.file.labels-names** (P3): `labels.names` (object) — label ID to the repository's label name; default `{}`
  - **FR:catalog.file.long-lived-branches** (P2): `pull-requests.long-lived-branches` (string[]) — branches never deleted or retargeted; default `[]`; base branch
  - **FR:catalog.file.skip-checks** (P2): `pull-requests.reconcile.skip-checks` (string[]) — check names reconcile ignores; default `[]`; base branch
  - **FR:catalog.file.merge-never** (P1): `pull-requests.merge.never` (string[]) — `owner/repo` patterns, `*` wildcards, that Autopilot never merges; default `[]`; base branch
  - **FR:catalog.file.merge-waiver-days** (P2): `pull-requests.merge.approval-waiver-days` (object) — `owner/repo` pattern to days of inactivity that waive code-owner sign-off; default `{}`; base branch
  - **FR:catalog.file.merge-strict-check** (P2): `pull-requests.merge.strict-check` (boolean) — fail the Catalyst check gate on a warning; default `false`; base branch
  - **FR:catalog.file.traceability-default** (P3): `traceability.default` (object) — project `code` and `test` modes; default `{}`
  - **FR:catalog.file.traceability-features** (P3): `traceability.features` (object) — feature ID or `*` pattern to `code` and `test` modes; default `{}`
  - **FR:catalog.file.traceability-code** (P3): `traceability.paths.code` (string[]) — source paths to scan; default `["src/"]`
  - **FR:catalog.file.traceability-test** (P3): `traceability.paths.test` (string[]) — test paths to scan; default `["tests/", "__tests__/", "test/", "**/*.test.*", "**/*.spec.*"]`
  - **FR:catalog.file.traceability-exclude** (P3): `traceability.paths.exclude` (string[]) — paths to skip; default `["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/coverage/**"]`
  - **FR:catalog.file.traceability-gitignore** (P3): `traceability.gitignore` (boolean) — skip paths that `.gitignore` ignores; default `true`
  - **FR:catalog.file.traceability-thresholds** (P3): `traceability.thresholds` (object) — minimum `implementation` and `test` coverage, 0-100; default `{}`
  - **FR:catalog.file.traceability-feature-dirs** (P3): `traceability.featureDirs` (string[]) — folders that hold feature specs; default `[".xe/features/", ".xe/initiatives/"]`
- **FR:catalog.env** (P2): Environment settings:
  - **FR:catalog.env.acp-command** (P3): `CATALYST_ACP_COMMAND` (string) — command that starts an ACP agent; default empty
  - **FR:catalog.env.checks-token** (P1): `CATALYST_CHECKS_TOKEN` (string) — GitHub token for check runs; default empty
  - **FR:catalog.env.diagnostics** (P4): `CATALYST_DIAGNOSTICS` (boolean) — show framework logs; default `false`
- **FR:catalog.github** (P4): GitHub repository settings, read by the Catalyst PR workflows on GitHub, never by `getSetting`:
  - Secret `CATALYST_TOKEN` (string) — token Autopilot merges with; default the workflow token
  - Variable `CATALYST_RUNS_ON` (string) — JSON runner label or array; default `"ubuntu-latest"`

### Non-functional Requirements

None

## Data Model

- **FR:$config** (P2): **`CatalystConfig`** — Parsed `.xe/config/catalyst.json`; a JSON object with any nesting
- **FR:$setting** (P2): **`SettingDefinition`** — One catalog entry
  - `key` (string) — Dotted config path, or environment variable name
  - `source` (string)
    - Allowed: `file`, `env`
  - `type` (string)
    - Allowed: `string`, `boolean`, `number`, `string[]`, `object`
  - `default` (unknown) — Value when not set
    - Validation: MUST match `type`
  - `description` (string)

## Architecture Constraints

- The settings registry in `src/core/config` is the only code definition of setting keys, types, and defaults
- The repository config file is the only config file source; any future source outside the repository ranks below it
- Callers choose where config text comes from (working tree or base branch); the lookup never calls Git or GitHub
- A feature keeps its own rules for a setting's inner values (for example, allowed severities); the lookup checks only the top-level type

## External Dependencies

None
