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

## Entity format: inline in spec.md as $-prefix FRs, referenced from I/O via @req

**Decision**: Entities are documented in the owning feature's `spec.md` as FRs using the `$`-prefix convention. ALL entity FRs live in a dedicated `## Data Model` H2 section with scenario-relative IDs (`FR:$entity-name`); no nested entity FRs in scenarios. Cross-feature consumers reference via `@req FR:{feature-id}/$entity-name` (the feature-id prefix is only used on cross-feature references). Trivial primitives (a string ID, number, boolean) stay inline in I/O FRs and do NOT require an entity FR. No separate `data-model.md` file. The `$` prefix follows JSON Schema's long-established convention for schema/type references. Detail level scales with drift-protection need, not field count.

**Date**: 2026-04-25

**Why**: Research surveyed seven specification frameworks ([OpenAPI 3.1 components/schemas](https://spec.openapis.org/oas/v3.1.0#components-object), [JSON Schema `$defs`](https://json-schema.org/draft/2020-12/json-schema-core#name-schema-re-use-with-defs), Pydantic, [DDD Aggregates/Entities/Value Objects](https://martinfowler.com/bliki/DDD_Aggregate.html), [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html), [GraphQL SDL](https://spec.graphql.org/October2021/#sec-Type-System), Protobuf). All seven separate entities from operations and reference them by name; inline entity definitions are forbidden or discouraged. Tiered detail driven by reuse + validation needs is also universal. Adopting this pattern means specs read like familiar contracts and AI consumers find entity definitions in one canonical place. The `$`-prefix follows JSON Schema's long-established convention for schema/type references (`$ref`, `$defs`), giving readers from any major API spec ecosystem an immediate visual cue that `$order` means "the Order type/schema."

**Rejected**:

- **Inline entity definitions in input/output FRs**: creates duplication when an entity is used by 2+ FRs; contradicts every framework surveyed.
- **Separate `data-model.md` file**: introduced an artifact split with a 200-line threshold; splitting into a separate feature is the right move when entities outgrow a single spec, not splitting one feature into two files.
- **`@`-prefix for entity FRs**: visually competes with the existing `@req` reference syntax and with `@`-prefixed file paths in playbook directives; risked parser ambiguity in Run 2.
- **Container scenario (`FR:model` or `FR:entities`)**: required hierarchy noise (`FR:feature/model.$order` instead of `FR:feature/$order`) and forced authors to choose a "model section" name. The H2 Data Model section is simpler and treats entities as a peer artifact alongside scenarios, NFRs, and constraints.
- **Mixed nested + H2 placement (single-scenario nests, shared in H2)**: required AI to evaluate "is this entity used by 1 scenario or 2+?" and migrate from nested → H2 on reuse. Two judgment calls per entity (where to put it, when to promote) that AI gets wrong inconsistently. Single rule (everything with structure → H2; primitives → inline) eliminates the judgment.
- **Markdown anchor links to entity headings (`[Order](spec.md#order)`)**: bulleted entity names don't auto-anchor; would require manual HTML `<a>` anchor tags or H4 promotion. Rejected in favor of `@req` (Catalyst-native, traceable).

**Evidence**:

- [feature-context/spec.md § FR:data-model](spec.md) — codifies the decision
- [feature-context/spec.md § FR:spec.scenarios.structure](spec.md) — input/output reference entities via `@req`
