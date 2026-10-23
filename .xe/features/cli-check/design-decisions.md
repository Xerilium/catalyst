# Design Decisions: CLI Check

## Rules start at warning, not error

**Decision**: A rule with no configured severity reports as `warning`; a repo opts a rule into `error` in `.xe/config/catalyst.json`.

**Date**: 2026-10-22

**Why**: Existing specs predate every rule, so an `error` default would fail the first run in any repo. Per-rule severity lets a repo tighten one rule at a time, as `catalyst traceability` already does.

**Rejected**:

- **Pinned per-file finding counts that only shrink** (allytehq/finops-hubs PR 893): adoption works without it, and it adds a generated list every repo must keep in sync.
- **`error` by default**: breaks adoption on day one.

**Evidence**:

- https://github.com/allytehq/finops-hubs/pull/893 — the spec-shape lint these rules come from
