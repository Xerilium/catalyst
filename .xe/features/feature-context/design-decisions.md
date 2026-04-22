# Design Decisions: Feature Context Templates

## feature-index implementation: TypeScript CLI command

**Decision**: Implement `FR:index` (feature index generator at `.xe/features/README.md`) as a TypeScript CLI command at `src/cli/commands/index.ts`, exposed as `catalyst index`. Pattern matches the existing `traceability` and `deps` commands. No new playbook primitives required.

**Date**: 2026-04-22 (reversed from earlier same-day decision; see "Rejected — earlier YAML playbook direction" below)

**Why**: Ship Run 4 fast. The YAML playbook direction required 2-3 new primitives (`frontmatter-read`, `dir-list`, `var-append`) built speculatively for a single consumer — violating the "build primitives when 2-3 consumers need them" heuristic. The TS CLI is ~60 lines of straight-line code using Node stdlib + `js-yaml` (already a dependency), ships today with zero ecosystem changes, and is well-tested via standard Jest. The long-term graph work ([explore-feature-graph.md](../../rollouts/explore-feature-graph.md)) will eventually subsume this generator as a trivial projection of the graph's node list — making the TS implementation intentionally disposable rather than foundational. Speculative playbook plumbing would be thrown away either way; better to not build it.

**Rejected**:

- **YAML playbook gated on `frontmatter-read` (earlier same-day decision)**: would have collapsed the generator to ~12 declarative lines if 3 new primitives (`frontmatter-read`, `dir-list`, `var-append`) were built first. Reversed because the primitives serve one consumer today; waiting for 2-3 consumers makes the primitives' shape honest. The design work is preserved in [explore-feature-index-playbook.md](../../rollouts/explore-feature-index-playbook.md) for pickup when that second consumer appears.
- **Graphify** ([safishamsi/graphify](https://github.com/safishamsi/graphify)): knowledge-graph builder for AI coding assistants; wrong scope (multi-modal, LLM-mediated, Python runtime). Filed as `.xe/rollouts/explore-feature-graph.md` for a future dedicated initiative where its output pattern (json + markdown report + optional HTML) is the right inspiration.
- **Hybrid (ship TS now, migrate later)**: this decision is effectively the "ship TS now" half; the migration is NOT promised. The long-term replacement is the graph approach, not a YAML playbook version of the index.

**Evidence**:

- [explore-feature-index-impl.ts](../../rollouts/explore-feature-index-impl.ts) — pseudocode comparison with user annotations evaluating action gaps
- [explore-feature-index-playbook.md](../../rollouts/explore-feature-index-playbook.md) — preserved design sketch for the YAML playbook version should a second consumer of the primitives appear
- [explore-feature-graph.md](../../rollouts/explore-feature-graph.md) — long-term direction that would subsume this generator
- [feature-workflow/feedback.md § Rollouts](../feature-workflow/feedback.md) — "do not write non-trivial code during exploration/planning" entry applied as reason not to build speculative playbook primitives for a single consumer
