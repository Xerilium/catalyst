# Feedback: engineering-context

## General

- Circular dependency with feature-context
  - **The cycle**: engineering-context → feature-context (FR:dev.output references FR:feature-context/rollout.@file) → engineering-context (spec template references FR:engineering-context/eng.quality.priority.defaults and arch.patterns)
  - **Attempted fix**: Extracting FR:dev into a separate `dev-process` feature. This doesn't solve the problem — it just widens the cycle (engineering.md template points to development.md, creating engineering-context → dev-process → feature-context → engineering-context)
  - **Root question**: Does development.md need to exist? Every section duplicates what the playbooks already enforce:
    - Living Specification Principle → enforced by feature-spec.md action
    - Spec-First Development → enforced by playbook phase ordering (spec → plan → implement)
    - TDD cycle → enforced by feature-test.md + feature-code.md actions
    - Branching conventions → enforced by feature-scope.md step 3
    - Feature Documentation → enforced by feature-scope.md, feature-spec.md
    - Quality Standards → enforced by feature-complete.md + engineering.md
    - Testing Strategy → enforced by feature-test.md
  - **Usage**: No feature playbook reads development.md during execution. Only the blueprint playbook reads it "for workflow phases," but those phases are defined by the playbooks themselves
  - **Direction**: Resolution depends on deciding where AI process guidance belongs — AGENTS.md, playbooks, or context files. May result in removing development.md entirely
  - **Do NOT** attempt to fix by restructuring dependencies alone

## Template size metric

- engineering.md and architecture.md don't have file-level size checks today — only per-instruction-block size. Consider adding character-count checks for consistency with validate-spec / validate-rollout / validate-development. Line count is a misleading metric for AI token cost; prefer characters.

## architecture.md updates are derivative, not authoring

- When AI is asked to "update architecture.md based on the blueprint," it tends to author new patterns, new sections, and new framings rather than mechanically deriving updates from blueprint decisions. Result: architecture.md accumulates content that wasn't in the blueprint, which then has to be removed in subsequent rounds.
  - **Source**: Agent invented "Dependency Abstraction," "App Configuration & Feature Flags," and "Anonymous-Only Telemetry" patterns; none derived from blueprint decisions; all subsequently removed.
  - **Why**: Without an explicit derivative-only rule, "update X based on Y" reads as "write whatever seems consistent with Y," which leads to extrapolation. The blueprint is the authoritative source; architecture.md should mechanically reflect blueprint decisions, not extend them.
  - **How to apply**: Add to engineering-context's architecture.md template instruction block (and possibly a workflow-level rule for any "update X based on Y" workflow): "Architecture-doc updates MUST derive from explicit blueprint decisions and feature breakdown. Do NOT author new patterns, sections, or framings that weren't in the source. If a pattern feels missing, raise it as a blueprint change first; only after blueprint approval does it land in architecture.md."
