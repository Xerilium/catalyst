---
id: devops-build
title: DevOps Build
description: One command builds the publishable Catalyst package, and CI proves every change still builds, type-checks, and passes tests.
dependencies:
  - ai-plugin
  - e2e-gate
---

<!-- markdownlint-disable single-title -->

# Feature: DevOps Build

## Purpose

Let a maintainer build the exact package users install with one command, and let CI prove every change to main still builds and passes, so the release pipeline always starts from a good build.

## Scenarios

### FR:build: Build

Maintainer needs one command to produce the publishable package so that local runs, CI, and releases all use the same build.

- **FR:build.@script**: Interface: `scripts/build.ts`, run as `npm run build`
- **FR:build.clean** (P1): Build MUST remove the previous output before building
- **FR:build.generate** (P1): Build MUST regenerate the registries, loader catalog, and playbook schema from source, and validate action conventions, before packing
- **FR:build.compile** (P1): Build MUST compile TypeScript and resolve path aliases into `dist/`
- **FR:build.layout** (P1): Build MUST place resources, launchers, and package metadata at the root of `dist/`
- **FR:build.plugin** (P1): Build MUST add the Claude plugin and portable payloads to `dist/`
  > - @req FR:ai-plugin/skills.generate
- **FR:build.pack** (P1): Build MUST pack `dist/` into `dist/catalyst-latest.tgz`
- **FR:build.local-install** (P2): Build MUST, unless told to skip, install the fresh package locally, run `catalyst init`, self-host the plugin, and inject feedback
  > - @req FR:ai-plugin/local.self-host
- **FR:build.skip-install** (P1): Build MUST leave `node_modules` and project settings untouched when run with `--skip-install`
- **FR:build.no-committed-output** (P1): Build MUST keep generated output out of version control

### FR:ci: Continuous Integration

Maintainer needs CI on every change so that a break is caught before it reaches main.

- **FR:ci.@workflow**: Interface: `.github/workflows/ci.yml`
- **FR:ci.trigger** (P1): CI MUST run on pull requests to main and on pushes to main
- **FR:ci.verify** (P1): CI MUST build the package and type-check it
- **FR:ci.test** (P1): CI MUST install the fresh build, run the full test suite, and fail on any failure not in the recorded baseline
- **FR:ci.lint** (P3): CI MUST report lint results without ever blocking a merge
- **FR:ci.concurrency** (P3): CI MUST cancel a run superseded by a newer one on the same pull request or branch
- **FR:ci.pack-gate** (P2): CI MUST run the pack gate on pull requests that touch what ships
  > - @req FR:e2e-gate/gate.local-build

### Non-functional Requirements

None

## Data Model

None

## Architecture Constraints

- **AC:one-build** (P2): Local runs, CI, and releases MUST use the same build script, never a separate path

## External Dependencies

- [GitHub Actions](https://docs.github.com/en/actions) — CI runner
