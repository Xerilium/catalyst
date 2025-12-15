---
features: [ai-provider, ai-provider-claude, ai-provider-copilot, ai-provider-cursor, ai-provider-gemini, ai-provider-ollama, ai-provider-openai]
status: planning
created: 2025-12-14
---

# Rollout: ai-provider-integration

This rollout merges the ai-config.json settings into the AIProvider interface and moves command file generation from postinstall.ts to the ai-provider module. This consolidates provider configuration into a single source of truth per provider.

## Pre-implementation

- [ ] Verify all existing tests pass before changes
- [ ] Review current ai-config.json settings for Claude and Copilot

## Implementation

- [ ] Execute all tasks in [.xe/features/ai-provider/tasks.md](../features/ai-provider/tasks.md) (new integration tasks to be added)
- [ ] Update ai-provider-claude implementation with integration config
- [ ] Update ai-provider-copilot implementation with integration config
- [ ] Update ai-provider-cursor implementation with integration config (commands at .cursor/commands/)
- [ ] Verify ai-provider-gemini, ai-provider-ollama, ai-provider-openai need no changes (no IDE integration)

## Post-implementation

- [ ] Verify command generation produces identical output to current implementation
- [ ] Verify postinstall still works correctly
- [ ] Run full test suite

## Cleanup

- [ ] Remove src/resources/ai-config/ai-config.json (configuration now in provider files)
- [ ] Update architecture.md if needed to reflect new pattern
