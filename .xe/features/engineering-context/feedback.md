# Feedback: engineering-context

- Circular dependency with feature-context: engineering-context depends on feature-context (development.md references `.xe/rollouts/` path defined by FR:rollout.location), and feature-context depends on engineering-context (spec template references priority levels and architecture patterns). Consider extracting the development process template into its own feature to break the cycle.
