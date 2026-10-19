# Feedback for blueprint-workflow

## Blueprint maintenance

- Blueprints get outdated as features evolve. There should be a mechanism to true-up the blueprint after rollouts complete — either naturally during rollout completion or as a periodic reconciliation.
  - **Why:** By the time significant implementation is done, the original blueprint's feature inventory, dependencies, and phasing may no longer reflect reality. Without true-up, the blueprint becomes misleading.
  - **How to apply:** Factor into whatever blueprint structure we land on. Some options make true-up natural (e.g., if the feature inventory is auto-derivable from specs); others require explicit reconciliation steps.
