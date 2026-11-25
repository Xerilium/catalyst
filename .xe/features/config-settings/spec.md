---
id: config-settings
title: Config Settings
description: One typed config object for every Catalyst setting, with its type and default.
dependencies:
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: Config Settings

## Purpose

Give Catalyst one typed config object. Every setting has its type and default in one place, so every feature reads it the same way: `Config.{path}`.

## Scenarios

### FR:config: Config object

Developer needs every Catalyst setting in one typed object so that features read settings with the same defaults and type rules and need no lookup function.

- **FR:config.@json** (P2): Interface: `.xe/config/catalyst.json` at the project root
  - A property path is the dotted path to its value; `pull-requests.merge.never` is `{ "pull-requests": { "merge": { "never": [...] } } }`
- **FR:config.@env** (P2): Interface: process environment variables named `CATALYST_*`
- **FR:config.@api** (P2): Interface: `Config`, `createConfig(text?, env?)`, and `loadConfig(projectRoot, env?)` from `src/core/config`
- **FR:config.input** (P2):
  - Config text (string?) — content of `.xe/config/catalyst.json`; the caller picks the working tree or the base branch
  - Environment (object?) — default the process environment
- **FR:config.startup** (P2): `Config` MUST load `.xe/config/catalyst.json` from the working directory once, on first use
  - **FR:config.startup.env** (P2): `Config.env` MUST read the environment without loading the config file
- **FR:config.missing** (P2): Config MUST treat a missing or blank file as a file with no settings
- **FR:config.invalid** (P1): Config MUST fail with a `ConfigInvalid` error when the text is not a JSON object
  > - @req FR:error-handling/catalyst-error
- **FR:config.value** (P1): Config MUST hold the set value when its type matches the property type
  - **FR:config.value.strings** (P1): Config MUST keep only the string items of a `string[]` value
  - **FR:config.value.inner** (P2): Config MUST check only a property's top-level type; the owning feature checks inner values
- **FR:config.default** (P1): Config MUST hold the property default when the property is not set
  - **FR:config.default.mismatch** (P2): Config MUST hold the property default when the set value has a different type
  - **FR:config.default.copy** (P3): Config MUST hold a new copy of an array or object default in each config object
- **FR:config.env** (P2): Config MUST read each `Config.env` property from its `CATALYST_*` variable at access time
  - **FR:config.env.boolean** (P3): Config MUST read `1` or `true` as true for a boolean environment property
    - **FR:config.env.boolean.other** (P3): Config MUST read any other value as false
  - **FR:config.env.empty** (P3): Config MUST treat an empty environment variable as not set
- **FR:config.output** (P2): Config object (@req FR:$config)

### FR:github: GitHub workflow settings

Project Maintainer needs the GitHub settings that the Catalyst PR workflows read listed so that they can set up Autopilot without reading workflow files.

- **FR:github.token** (P4): PR workflows MUST merge with secret `CATALYST_TOKEN` when set, else the workflow token
- **FR:github.runs-on** (P4): PR workflows MUST run on variable `CATALYST_RUNS_ON` (JSON runner label or array) when set, else `"ubuntu-latest"`

### Non-functional Requirements

None

## Data Model

- **FR:$config** (P2): **`CatalystConfig`** — every Catalyst setting; file properties read from the working tree unless marked base branch
  - **FR:$config.check** (P3): `check` (object)
    - **FR:$config.check.rules** (P3): `rules` (object) — rule ID or `{namespace}.*` to `error`, `warning`, or `disable`; default `{}`
  - **FR:$config.labels** (P3): `labels` (object)
    - **FR:$config.labels.style** (P3): `style` (string) — `key-value`, `simple`, or `custom`; default empty, which uses the standard names
    - **FR:$config.labels.names** (P3): `names` (object) — label ID to the repository's label name; default `{}`
  - **FR:$config.pull-requests** (P2): `pull-requests` (object) — all base branch
    - **FR:$config.pull-requests.long-lived-branches** (P2): `long-lived-branches` (string[]) — branches never deleted or retargeted; default `[]`
    - **FR:$config.pull-requests.reconcile.skip-checks** (P2): `reconcile.skip-checks` (string[]) — check names reconcile ignores; default `[]`
    - **FR:$config.pull-requests.merge** (P1): `merge` (object)
      - **FR:$config.pull-requests.merge.never** (P1): `never` (string[]) — `owner/repo` patterns, `*` wildcards, that Autopilot never merges; default `[]`
      - **FR:$config.pull-requests.merge.approval-waiver-days** (P2): `approval-waiver-days` (object) — `owner/repo` pattern to days of inactivity that waive code-owner sign-off; default `{}`
      - **FR:$config.pull-requests.merge.strict-check** (P2): `strict-check` (boolean) — fail the Catalyst check gate on a warning; default `false`
  - **FR:$config.traceability** (P3): `traceability` (object)
    - **FR:$config.traceability.default** (P3): `default` (object) — project `code` and `test` modes; default `{}`
    - **FR:$config.traceability.features** (P3): `features` (object) — feature ID or `*` pattern to `code` and `test` modes; default `{}`
    - **FR:$config.traceability.paths.code** (P3): `paths.code` (string[]) — source paths to scan; default `["src/"]`
    - **FR:$config.traceability.paths.test** (P3): `paths.test` (string[]) — test paths to scan; default `["tests/", "__tests__/", "test/", "**/*.test.*", "**/*.spec.*"]`
    - **FR:$config.traceability.paths.exclude** (P3): `paths.exclude` (string[]) — paths to skip; default `["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/coverage/**"]`
    - **FR:$config.traceability.gitignore** (P3): `gitignore` (boolean) — skip paths that `.gitignore` ignores; default `true`
    - **FR:$config.traceability.thresholds** (P3): `thresholds` (object) — minimum `implementation` and `test` coverage, 0-100; default `{}`
    - **FR:$config.traceability.feature-dirs** (P3): `featureDirs` (string[]) — folders that hold feature specs; default `[".xe/features/", ".xe/initiatives/"]`
  - **FR:$config.env** (P2): `env` (object) — environment variables, never from the file
    - **FR:$config.env.acp-command** (P3): `CATALYST_ACP_COMMAND` (string) — command that starts an ACP agent; default empty
    - **FR:$config.env.checks-token** (P1): `CATALYST_CHECKS_TOKEN` (string) — GitHub token for check runs; default empty
    - **FR:$config.env.diagnostics** (P4): `CATALYST_DIAGNOSTICS` (boolean) — show framework logs; default `false`

## Architecture Constraints

None

## External Dependencies

None
