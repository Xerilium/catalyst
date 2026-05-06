# Feedback for blueprint-context

## Define "feature" in the blueprint template

- The biggest gap surfaced in `allytehq/finops-hubs#6` (line 1) and confirmed by the agent's reply (`r3198051330`): without an explicit definition of what counts as a feature, "feature" defaulted to "the smallest independently-implementable unit of work" — closer to a task than a product capability. That single ambiguity caused four downstream issues (work-breakdown framing, setup-as-features, naming friction, over-decomposition).
  - **Source**: PR feedback at `allytehq/finops-hubs#6` line 1 + agent reply.
  - **Why**: We applied "lead with the product" framing to the workflow (start-blueprint.md Phase 1), but the TEMPLATE itself never defines feature. Anyone reading the template alone (reviewer, consumer of the artifact, AI agent following the template without the workflow) infers feature mechanically from the Roadmap section's checklist (id, complexity, purpose, scope, dependencies) — which reads as task attributes.
  - **How to apply**: Add a single sentence to the blueprint.md template H1 instruction block: "A blueprint feature is a long-lived product capability that evolves over time — not a task, implementation step, or one-time setup. One-time work belongs in Phase 0. Future capability expansions belong in the existing feature's `Planned expansions` (see Roadmap convention)."

## One-time setup belongs in the rollout, not the blueprint

- The blueprint currently has no convention for one-time setup tasks (monorepo, CI/CD bootstrap, deployment infra, app registrations). The agent forced these into Phase 1 as features (`monorepo-setup`, `cicd-foundation`), which polluted the feature inventory and triggered the naming-convention friction.
  - **Source**: PR feedback at `allytehq/finops-hubs#6` line 176.
  - **Why**: The rollout template already has a `Pre-implementation` section per run for one-time setup. The blueprint stays purely product-architecture (long-lived features only); one-time work lives in the rollout that executes the relevant phase. No new section in the blueprint, no feature-vs-task ambiguity.
  - **How to apply**: Add a single line to the blueprint.md template H1 instruction block: "One-time setup work (monorepo bootstrap, CI/CD initialization, infra provisioning) belongs in the rollout's Pre-implementation section, NOT the blueprint." Reinforces the feature definition (long-lived capabilities only) and points to the right home for setup work.

## Multi-phase feature evolution — Change: prefix in the wave where it lands

- A feature may exist in Phase 1 with foundational scope and expand in Phase 2+ with additional capabilities. Both the original "list once + nest expansions" and "Planned expansions sub-bullet" approaches fail because **implemented features collapse to a spec link** — meaning any expansion-context nested under the original entry gets deleted along with everything else when the feature ships. The forward-looking story disappears.
  - **Source**: PR feedback at `allytehq/finops-hubs#6` line 256 + user clarification.
  - **Why**: Future expansions need to live in the wave/phase where they actually happen. Nesting them under the original feature couples the future story to the past artifact's lifecycle, and the past artifact gets minimized once built. Putting the expansion in its own future-wave entry preserves the story exactly where readers look for it ("what's planned for Phase 2?").
  - **How to apply**: Use a `Change:` prefix for expansion entries in future waves, mapping directly to `/catalyst:change`. New features get no prefix; expansions get `Change:`. Example:

    ```markdown
    ### Phase 1: {phase-name}

    #### Wave 1.2

    - **shell** (Medium) — _The app frame: navigation, layout, global error handling._
      - Scope: route-level navigation, auth-expired/permission-denied/network-failure handling, page-level layout primitives.
      - Dependencies: monorepo

    ### Phase 2: {phase-name}

    #### Wave 2.1

    - **Change: shell** (Large) — _Add notifications, user preferences, multi-workspace switching._
      - Scope: notification center, preferences pane, workspace selector.
      - Dependencies: shell, auth (Phase 2 expansion)
    ```

  - **Why this works**: When wave 1.2 ships and `shell` collapses to its spec link, the Phase 2 `Change: shell` entry remains intact in its wave — the expansion story survives. The `Change:` prefix is also a direct visual signal that this maps to `/catalyst:change shell`, making the command invocation obvious. New-feature entries (no prefix) map to `/catalyst:create`.

## Encourage consolidation, discourage over-decomposition

- The agent split related concerns into separate features (`hub-connection`, `hub-schema-detection`, `query-layer`) when they're really one feature with sub-concerns (`hub-service`). The Roadmap checklist (id, complexity, purpose, scope, dependencies per feature) implicitly encouraged splitting by treating each distinct concern as a feature.
  - **Source**: Agent reply suggestion 4.
  - **Why**: Over-decomposition produces a misleading dependency graph (the splits show up as inter-feature dependencies when they're really intra-feature flow), inflates the feature count, and creates maintenance overhead (each "feature" needs its own spec when one would do).
  - **How to apply**: Add a consolidation check to the blueprint.md template Roadmap instruction: "Before listing N related features, ask whether they're really one feature with sub-concerns. If they share a service, a data model, or a primary persona's workflow, consolidate. Example: `hub-connection` + `hub-schema-detection` + `query-execution` → `hub-service`."

## Feature naming convention — long-lived nouns

- Feature names should describe long-lived capabilities (nouns), not actions, states, or one-time work. `cicd-foundation` reads as a one-time task; the long-lived capability would be `ci-cd` or `deployment`. `monorepo-setup` is the same shape.
  - **Source**: PR feedback at `allytehq/finops-hubs#6` line 182.
  - **Why**: Feature IDs survive the entire product lifecycle. A name with `-foundation`, `-setup`, `-bootstrap`, `-init` implies the work completes once the foundation is laid; a name like `auth` or `query-layer` correctly signals the capability persists. This issue largely disappears once the setup-vs-features cut (Phase 0) and feature definition land — but it's worth documenting as an explicit anti-pattern test for naming validation.
  - **How to apply**: Add naming guidance to the blueprint.md template Roadmap instruction: "Feature IDs MUST be capability nouns, not action/state phrases. Test: 'Could this name still apply 2 years after the feature is built?' If no, rename. Avoid: `*-setup`, `*-foundation`, `*-bootstrap`, `*-init`, `setup-*`, `init-*`, `*-creation` — these belong in Phase 0 if they're one-time work, or are misnamed if they're long-lived capabilities."

## design-decisions stale-reference detection

- Design-decisions entries can carry wave/phase/feature references (e.g., "Wave 1.4") that go stale when the blueprint is restructured. Currently no convention catches these.
  - **Source**: PR feedback surfaced a `Wave 1.4` reference that no longer existed after wave restructure.
  - **Why**: design-decisions is appended over the project lifetime; entries written against an earlier draft drift as the blueprint evolves. Without detection, design-decisions becomes lossy/misleading.
  - **How to apply**: blueprint-workflow's `FR:workflow.plan.decision-prune` partially addresses this by re-validating references during Plan-phase sweeps. Still, consider adding to blueprint-context: explicit guidance in the design-decisions template that wave/phase/feature references SHOULD be relative-to-the-decision-time (e.g., "Wave 1.4 (at decision time; renamed to Wave 1.3 in {date})") OR a convention that decisions tie to feature IDs (long-lived) rather than wave/phase numbers (which can renumber). The latter is cleaner.

## Pre-release feedback review run

- Before the next release of blueprint-context, conduct a feedback review run that:
  1. Reads all items in this file
  2. Decides which to address in the release vs defer
  3. Files specific work items (rollout runs, FR additions) for the addressed items
  4. Marks deferred items with the rationale
  5. **Specifically validates against the `allytehq/finops-hubs#6` PR** to confirm the addressed items would have prevented the issues the agent encountered (the agent's reply at `r3198051330` is the validation oracle)

This pattern (collect feedback during use → review batch before next release → address) is more efficient than addressing every feedback item as it comes in, especially when many items interrelate (setup-vs-features, naming convention, and over-decomposition share roots in the missing feature definition).
