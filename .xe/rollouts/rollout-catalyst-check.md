---
features: [cli-check, feature-context]
status: in-progress
created: 2026-10-22
last_updated: 2026-10-22
---

<!-- markdownlint-disable no-duplicate-heading -->

# Rollout: catalyst-check

## Active State

**Model**: `catalyst check` runs rules from a registry (pure functions over document content); first namespace is `spec`, ported from allytehq/finops-hubs PR 893 `spec-shape.mjs`. Severity comes from `check.rules` in `.xe/config/catalyst.json`; default `warning`. `catalyst traceability` is unchanged.

**Decisions**:

- Autonomous mode: new branch `xe/catalyst-check` from origin/main, PR at the end — user said "run autonomously, I'll review when done"
- New feature `cli-check`, separate from `cli-engine` (like `cli-init`) — rejected editing `cli-engine` (framework spec stays command-agnostic)
- No pinned backlog — per-rule severity covers adoption

**Open**: None

**Next**: Write failing tests, then code, per Features list

**Pins**:

- `.xe/features/design-decisions.md:97` — the `catalyst check` naming decision (from PR 126)
- `src/cli/index.ts` — command registration

**Assumptions**:

- Other repos' `spec.*` findings do not belong in a Catalyst-using repo; the rules ship in Catalyst
- Bad → good examples belong in the feature-spec playbook action, not the spec template (template is over its concision budget)

## Overview

Build the `catalyst check` command the 2026-09-27 design decision settled but never implemented: one command, a rule registry, `{namespace}.{rule}` IDs, per-rule severity in `.xe/config/catalyst.json`, `traceability.*` reserved. First rule set is the spec-shape rules from allytehq/finops-hubs PR 893, as `spec.*` rules. Also port that PR's bad → good authoring examples into the feature-spec guidance. Pinned per-spec backlog is out of scope.

## Run 1: catalyst-check

> **Execute**: `/catalyst:create cli-check — catalyst check command, rule registry, severity config, spec.* rules; feature-spec guidance examples`

### Features

#### cli-check

- [x] Spec written (`.xe/features/cli-check/spec.md`), `catalyst deps` clean
- [ ] Tests first: `tests/unit/check/spec-rules.test.ts` (7 rules, fences, deprecated, entity-type), `severity.test.ts`, `registry.test.ts`, `tests/cli/commands/check.test.ts`
- [ ] `src/check/`: `types.ts`, `rules/spec.ts`, `registry.ts`, `severity.ts`, `documents.ts`, `runner.ts`
- [ ] `src/cli/commands/check.ts`, `CheckOptions` in `src/cli/types.ts`, `InvalidInput` helper in `src/cli/utils/errors.ts`, register in `src/cli/index.ts`
- [ ] Run `catalyst check` on this repo; report counts (default `warning`, no gate)
- [ ] `npx catalyst traceability cli-check` meets bar

#### feature-context

- [x] Spec: `FR:spec.examples`
- [ ] Test: `tests/templates/validate-spec.test.ts` asserts `feature-spec.md` carries a bad → good example per rule
- [ ] Add bad → good examples to `src/resources/playbooks/actions/feature-spec.md`; drop "System validates X" from step 1 Q4+ wording
- [ ] Boy Scout: replace "System MUST" with a named owner in `src/resources/templates/specs/spec.md` example

### Post-implementation

- [ ] Present work for review
- [ ] Route external issues discovered during implementation

## Notes

- Downstream: feature-context adds one FR; 9 dependents, all (a) no impact.
- Plan mode skipped: autonomous mode, user asked for no review until done.
- Source rules: `infra/scripts/spec-shape.mjs` in allytehq/finops-hubs PR 893 (read via `gh pr diff`).

## Final Review

- [ ] Confirm all runs complete — no unchecked tasks, no unresolved blockers in Notes
- [ ] Clean up temporary files and this rollout plan
- [ ] Close out — commit, PR, or defer
