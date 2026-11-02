---
id: e2e-gate
title: E2E Gate
description: Scripted, repeatable end-to-end validation of every Catalyst skill against a throwaway GitHub repo.
dependencies:
  - ai-plugin
---

<!-- markdownlint-disable single-title -->

# Feature: E2E Gate

## Purpose

Give maintainers a one-command release gate that proves every Catalyst skill works end to end with the local build before publishing.

## Scenarios

### FR:gate: Validation Run

Maintainer needs to run all skills headlessly against a toy app so that a release is validated without manual testing.

- **FR:gate.@scripts**: Interface: `scripts/e2e/run.ts`
- **FR:gate.repo** (P1): When a GitHub token is set, run MUST use a private throwaway GitHub repo and delete it afterward
- **FR:gate.local-build** (P1): Run MUST install the local build and fail if the installed version differs from the package version
- **FR:gate.skills** (P1): Run MUST drive init, blueprint, explore, create, change, fix, rollout, run, sitrep, pr-review, pr-update, and pr-loop headlessly
  > - @req FR:ai-plugin/skills.generate
- **FR:gate.flaws** (P1): PR skills MUST run against a PR with deliberate flaws
- **FR:gate.matrix** (P1): Run MUST output a pass/fail matrix of skill, result, evidence, and defect
- **FR:gate.exit** (P2): Run MUST exit non-zero unless every skill that ran passes
- **FR:gate.needs-based** (P2): Run MUST decide per skill whether it can run from the auth available, not all-or-nothing
- **FR:gate.no-claude-auth** (P2): Run MUST skip every skill with a warning when neither `ANTHROPIC_API_KEY` nor `CLAUDE_CODE_OAUTH_TOKEN` is set
- **FR:gate.local-mode** (P2): Run MUST run init, blueprint, explore, create, change, fix, rollout, run, and sitrep in a local-only mode (temp dir and local git, no `gh` repo create, push, or delete) when Claude auth is set but `GH_TOKEN` is not
- **FR:gate.skip-github** (P2): Run MUST skip pr-review, pr-update, and pr-loop with a warning naming the missing GitHub token when `GH_TOKEN` is not set
- **FR:gate.summary** (P2): Run MUST write a job summary table of skill, ran or skipped, and why
