# Feedback: playbook-engine

## General

- **Key Entities placement**: The "Key Entities" section is under Architecture Constraints but entities should be defined as `$`-prefix entity FRs in the `## Data Model` H2 section per FR:feature-context/spec.data-model. Current placement mixes data model concerns with architectural constraints.
- **Variable append**: No way to append to array variables incrementally. Would need `append` property on var action or a `var-append` action. Kitchen-sink finale uses a static list as workaround.
- Evaluate current automation scripts in `scripts/` (build.ts, generate-action-registry.ts, generate-loader-catalog.ts, generate-playbook-schema.ts, generate-provider-registry.ts, validate-action-conventions.ts, run-traceability.ts, traceability-health.ts, validate-spec.ts, feature-coverage-matrix.ts, inject-feedback.ts, release.ts) to determine which could be feasibly implemented as YAML playbooks rather than TypeScript scripts.
  - **Why:** Dogfoods the playbook system. If our own automation can't run as playbooks, that signals gaps in the engine (missing actions, ergonomic friction, performance issues). Conversely, successful conversion validates the system is production-ready for consumer projects.
  - **How to apply:** Audit each script — what actions would it need? Are they covered? What's missing? Convert the simplest candidates first (e.g., generate-_ scripts that are mostly file I/O + template). Keep complex orchestrators (build.ts, release.ts) as TypeScript if they need first-class language features. Document gaps as feature requests for the relevant `playbook-actions-_` features.
  - **Outcome:** Either a set of converted playbooks proving the system works, or a list of concrete gaps blocking conversion (which become playbook feature work).

## Scenario design

- Refactor builtin-action scenarios to follow the external-scenario rule (FR:feature-context/spec.scenarios.external). Currently `FR:actions.builtin.var`, `FR:actions.builtin.function`, and `FR:actions.builtin.checkpoint` are named after implementation patterns rather than external interactions.
  - **Proposed**: reframe as persona-driven scenarios — e.g., "Playbook author assigns variables", "Playbook author pauses for review at a checkpoint", "Playbook author invokes a builtin function". Each becomes an external scenario with the existing detail moving to behaviors under it.
  - **Why**: The new external-scenario rule (added 2026-05-04 in feature-context) treats internal phases and implementation patterns as anti-patterns; surveying the codebase flagged this feature as the highest-impact remaining offender.
  - **Blast radius**: 12 scenarios total, 3 internal-style. Refactor would touch @req references in tests/playbooks/features/ and any other consumer specs.
