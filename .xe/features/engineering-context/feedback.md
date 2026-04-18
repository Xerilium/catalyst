# Feedback: engineering-context

## General

- Circular dependency with feature-context
  - **The cycle**: engineering-context → feature-context (FR:dev.output references FR:feature-context/rollout.location) → engineering-context (spec template references FR:engineering-context/eng.quality.priority.defaults and arch.patterns)
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
