# Feedback for req-traceability

## Cross-Feature Dependency Tracking

- MCP server integration for intelligent feature dependency conversations
- Interactive/rich dependency visualization beyond Mermaid (D3, Markmap, etc.)
- Circular dependency detection and reporting
- CLI help text and user-facing docs for the `deps` command (end-user audience)
- `catalyst-specs.md` standard for spec authoring conventions (helps with spec quality)
- `--target-fr {fr-id}` filter flag for `catalyst deps {feature} --reverse` so consumers of a specific FR can be enumerated in one call
  - Driven by feature-workflow's new FR:scope.dependency-impact / FR:spec.downstream-review (added 2026-04-27): when an FR's contract changes, the workflow needs to find consumers of *that specific FR*, not all consumers of the feature
  - Today's text mode lists feature-level reverse deps only; FR-level requires `--format json` + AI-side filtering on `targetFR`. A `--target-fr` flag would collapse this to one CLI call returning a clean list
  - Confidence: high — exact pain point hit during this rollout's design review
- Reverse-mode text output should include FR-level detail under each `←` entry (mirroring forward `→` mode in FR:deps.output.text)
  - Currently `← feature-workflow` shows feature only; forward mode shows `FR:source → FR:target` indented under each arrow
  - Symmetric formatting would let AI use text mode for both feature-level overview and per-FR consumer review without reaching for JSON
  - Confidence: medium — broader UX improvement, less targeted than `--target-fr`

## Spec format drift

- `.xe/features/req-traceability/spec.md` has a non-standard `## Design Principles` H2 section between Purpose and Scenarios
- Current spec template (feature-context FR:spec) defines sections as Purpose → Scenarios → Architecture Constraints → External Dependencies; no Design Principles section
- Content likely belongs under Architecture Constraints (if guardrails) or design-decisions.md (if rationale)
- Discovered during rollout-architecture-constraints backfill (2026-04-21); content was left as-is to avoid scope creep
