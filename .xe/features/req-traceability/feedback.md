# Feedback for req-traceability

## Cross-Feature Dependency Tracking

- MCP server integration for intelligent feature dependency conversations
- Interactive/rich dependency visualization beyond Mermaid (D3, Markmap, etc.)
- Circular dependency detection and reporting
- CLI help text and user-facing docs for the `deps` command (end-user audience)
- `catalyst-specs.md` standard for spec authoring conventions (helps with spec quality)

## Spec format drift

- `.xe/features/req-traceability/spec.md` has a non-standard `## Design Principles` H2 section between Purpose and Scenarios
- Current spec template (feature-context FR:spec) defines sections as Purpose → Scenarios → Architecture Constraints → External Dependencies; no Design Principles section
- Content likely belongs under Architecture Constraints (if guardrails) or design-decisions.md (if rationale)
- Discovered during rollout-architecture-constraints backfill (2026-04-21); content was left as-is to avoid scope creep
