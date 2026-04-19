# Design Decisions: Catalyst Product Blueprint

> Record design rationale — what was decided, why, and what was rejected. Created when significant decisions are made during any phase (spec, planning, implementation). Each H2 is one decision.

## 5-Tier Dependency Structure for Feature Organization

**Decision**: Organize features into phase-relative numbered tiers (1.1, 1.2, …) rather than a flat priority list or a raw DAG.

**Date**: <!-- TODO: determine from git history -->

**Why**: Explicit dependency tiers prevent implementation order errors by making sequencing unambiguous. Tiers also enable parallel work: all features within a tier can proceed simultaneously, and the tier label communicates both dependency level and phase membership in a single token. A flat priority list loses structural dependency information; a raw DAG is more accurate but harder to communicate to team members and AI agents.

**Rejected**:
- **Flat priority list**: Simpler to read but loses dependency structure, making it easy to start a feature before its dependencies are complete.
- **Raw DAG representation**: More mathematically accurate but harder to communicate; tooling required to visualize; doesn't naturally express parallelization opportunities.

**Evidence**:

- [GitHub Issue #41](https://github.com/xerilium/catalyst/issues/41) — original phased implementation plan that motivated the tier structure

---

## Separate AI Platform Integrations Into Distinct Features

**Decision**: Implement each AI platform integration (`playbook-actions-claude`, `playbook-actions-copilot`) as a separate feature rather than bundling them into a single "AI Integration" feature.

**Date**: <!-- TODO: determine from git history -->

**Why**: The Single Responsibility Principle applies at the feature level: each platform adapter has its own SDK, auth model, and failure modes. Separate features allow platform-specific development, testing, and release without coupling unrelated integrations. If one platform's SDK changes, only its feature needs updating. Combined, a change to one platform risks destabilizing the other.

**Rejected**:
- **Combined "AI Integration" feature**: Simpler initial structure but violates SRP; makes it harder to test platforms independently; creates unnecessary coupling between platform-specific code paths.

**Evidence**:

- `.xe/architecture.md` — multi-agent support requirement; extensibility for future AI agents listed as a core technical requirement

---

## Include Platform and Enterprise Phases in the Initial Blueprint

**Decision**: Define Phase 4 (Platform: extensibility) and Phase 5 (Enterprise: scale) features in the initial blueprint even though implementation is deferred.

**Date**: <!-- TODO: determine from git history -->

**Why**: The blueprint's purpose is to establish early, mass context on the complete product roadmap. Deferring later phases to a future blueprint revision loses strategic context and risks Phase 1–3 decisions that inadvertently close off Phase 4–5 extensibility. Placeholder definitions keep extensibility requirements visible during architecture decisions even when the implementation timeline is uncertain.

**Rejected**:
- **Defer later phases to a future blueprint**: Simpler initial document but loses strategic context; may lead to Phase 1 architectural decisions that block future extensibility.

**Evidence**:

- `.xe/product.md § Product Strategy` — explicitly lists Platform and Enterprise as phases 4 and 5 in the strategic roadmap

---

## Decompose Playbook System Into Focused Sub-Features

**Decision**: Split the playbook system into `playbook-definition`, `playbook-template-engine`, `playbook-yaml`, and `playbook-engine` rather than a single monolithic `playbook-engine` feature.

**Date**: <!-- TODO: determine from git history -->

**Why**: Each sub-feature has distinct responsibilities and different change rates. `playbook-definition` (data structures, interfaces) changes when the contract changes; `playbook-template-engine` (expression evaluation, security) changes when template syntax evolves; `playbook-engine` (flow control, checkpoints) changes when execution semantics change. Separate features allow parallel development, focused security auditing of the template engine, and smaller AI context windows during implementation. State belongs with Definition (not Engine) because state snapshots are data structures; Actions depend on Definition (not Engine) to prevent circular dependencies.

**Rejected**:
- **Single monolithic playbook-engine feature**: Simpler dependency graph but produces a ~500-line spec that is harder for AI agents to consume, harder to review, and forces serialized development.

**Evidence**:

- `.xe/architecture.md` — engineering principles on modularity and single responsibility
- `.xe/engineering.md` — design principles requiring testability and clear ownership boundaries

---

## Template Syntax: `${{}}` With Explicit `get()` Function

**Decision**: Use `${{ get('variable-name') }}` as the template expression syntax.

**Date**: <!-- TODO: determine from git history -->

**Why**: The `${{ }}` delimiter aligns with GitHub Actions, reducing the learning curve for developers already familiar with that syntax. The explicit `get()` function eliminates ambiguity that arises with kebab-case variable names: `my-variable` in a plain interpolation context parses as `my minus variable`. `get()` makes variable access unambiguous without requiring auto-normalization magic. The resulting expressions are valid JavaScript, so developers can reason about them with standard tooling.

**Rejected**:
- **Implicit variable interpolation (e.g., `${my-variable}`)**: Ambiguous with kebab-case names; requires special parsing rules.
- **Mustache-style `{{variable}}`**: No JavaScript semantics; harder to support expressions; conflicts with some Markdown renderers.
- **Auto-normalization (kebab → camelCase)**: Hidden magic that makes templates harder to debug and audit.

**Evidence**:

- [GitHub Actions expression syntax](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/evaluate-expressions-in-workflows-and-actions) — established precedent for `${{ }}` in developer tooling

---

## JavaScript Module Auto-Loading via Pairing Convention

**Decision**: If a `playbook.js` file exists alongside `playbook.yaml`, automatically load all its exports into the playbook execution context.

**Date**: <!-- TODO: determine from git history -->

**Why**: Zero-ceremony extension: simple playbooks don't need a `.js` file at all, and complex playbooks get full IDE support (IntelliSense, debugging, unit testing) in the `.js` file without any import/registration boilerplate. Convention-based discovery (file co-location) is consistent with how the engine discovers actions (`src/playbooks/actions/` directory scan) and keeps contracts explicit without coupling.

**Rejected**:
- **Explicit import/registration statements**: Adds boilerplate to every playbook that needs custom logic; increases coupling between playbook YAML and module loading mechanism.
- **Separate configuration file listing modules**: More ceremony with no additional expressiveness; another file to maintain.

**Evidence**:

- `.xe/engineering.md` — convention over configuration; discoverable patterns preferred over explicit registration
