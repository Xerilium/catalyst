# Feedback: pull-request-workflow

## Scenario design

- Sharpen scenario actor naming. Scenarios are well-shaped (`FR:review`, `FR:update`) but the actor is implicit — clarifying "who does what with this feature, and through what surface" per FR:feature-context/spec.scenarios.external would make the scenarios self-documenting.
  - **Proposed**: name the persona explicitly — e.g., "AI Agent reviews a pull request" / "AI Agent updates a pull request based on feedback". No structural change; only the scenario name and actor clause.
  - **Why**: The new external-scenario rule (added 2026-05-04 in feature-context) prescribes that scenario names answer "who does what." This feature is a P4 straggler — small fix, easy win.
  - **Blast radius**: 2 scenarios. Likely no @req consumer churn since IDs would stay; only the human-readable names change.
