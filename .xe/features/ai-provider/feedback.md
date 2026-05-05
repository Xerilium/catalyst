# Feedback: ai-provider

## Scenario design

- Refactor `FR:factory` and `FR:catalog` scenarios to follow the external-scenario rule (FR:feature-context/spec.scenarios.external). Both are named after implementation patterns (Factory/Catalog) rather than persona-driven external interactions.
  - **Proposed**: reframe as persona-driven scenarios — e.g., "Framework discovers available AI providers" (catalog) and "Framework instantiates an AI provider for a session" (factory), with the existing detail moving to behaviors under each external scenario.
  - **Why**: The new external-scenario rule (added 2026-05-04 in feature-context) treats internal phases and implementation patterns as anti-patterns; surveying the codebase flagged this feature.
  - **Blast radius**: 5 scenarios total, 2 internal-style. Refactor would touch @req references in tests and consumer ai-provider-* specs.
