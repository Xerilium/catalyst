# Feedback: catalyst-cli

## Spec cleanup

- Reframe `FR:index` scenario to follow the external-scenario rule (FR:feature-context/spec.scenarios.external). Currently named after the internal command/bookkeeping action rather than the external interaction.
  - **Proposed**: reframe as a persona-driven scenario — e.g., "AI agent regenerates the feature index" — with the cli interface, frontmatter input, generation behaviors, and README output. (This already mirrors what feature-context's `FR:index` scenario looks like post-restructure; consider whether catalyst-cli needs its own scenario for `catalyst index` or whether it should @req feature-context's.)
  - **Why**: The new external-scenario rule (added 2026-05-04 in feature-context) treats internal-bookkeeping scenarios as anti-patterns when mixed with external CLI command scenarios.
  - **Blast radius**: 9 scenarios total, 1 internal-style. Lowest fix cost of the 4 flagged features.

## Parameters

- **Input params**: Support dynamic playbook inputs as explicit parameters without using `--input`. Static (`catalyst run`) playbooks woudl also be nice, but are not required.
