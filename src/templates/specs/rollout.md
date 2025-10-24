---
features: [] # Array of feature IDs affected by this rollout (e.g., [task-scoring, stack-summary])
status: planning # planning|pending|in-progress
created: YYYY-MM-DD
---

# Rollout: {rollout-id}

> [INSTRUCTIONS]
> This rollout plan acts as the central orchestrator for implementing changes. It coordinates pre-implementation setup, links to feature implementation tasks, manages post-implementation actions, and tracks cleanup.
>
> **Scope Flexibility:**
>
> - Can cover multiple features, single feature, or subset of a feature
> - Simple changes may have empty pre/post/cleanup sections
> - Still acts as single entry point even if minimal
>
> **Lifecycle:**
>
> - Created as placeholder during specification phase
> - Completed with full details during planning phase
> - Used as master orchestrator during implementation
> - Deleted after successful completion
> - Git history preserves record if needed
>
> **Task Management:**
>
> - Use markdown checkbox lists (`- [ ]` / `- [x]`)
> - Check off tasks as completed to track progress
> - Update status in frontmatter (planning → pending → in-progress)

## Pre-implementation

> [INSTRUCTIONS]
> One-time actions that must be completed BEFORE implementation begins. Examples: backups, environment setup, prerequisites, data exports, tech debt preparation (backup files before structure migrations, document current patterns before consolidation, validate existing implementations before extraction). Leave empty (with "None" or "N/A") if not needed.

- [ ] Task 1
- [ ] Task 2

## Implementation

> [INSTRUCTIONS]
> Reference the tasks.md file(s) for each feature being implemented. These contain the repeatable implementation steps. Check off each feature's tasks.md as it's completed. Include debt cleanup tasks directly in implementation alongside feature development, not as separate section.

- [ ] Complete [.xe/specs/{feature-id}/tasks.md](.xe/specs/{feature-id}/tasks.md)
- [ ] Complete [.xe/specs/{feature-id-2}/tasks.md](.xe/specs/{feature-id-2}/tasks.md)

## Post-implementation

> [INSTRUCTIONS]
> One-time actions that must be completed AFTER implementation. Examples: data migrations, configuration updates, verification steps, tech debt validation (verify no breaking changes from cleanup, update dependent specs to reference new centralized components, validate all references point to correct locations). Leave empty (with "None" or "N/A") if not needed.

- [ ] Task 1
- [ ] Task 2

## Cleanup

> [INSTRUCTIONS]
> Immediate cleanup actions to complete the rollout. Examples: remove temporary files, update documentation, delete deprecated code, remove obsolete files from debt cleanup (delete old feature.md/architecture.md files after successful migration, remove duplicate code after consolidation, clean up temporary backup files). Leave empty (with "None" or "N/A") if not needed.

- [ ] Task 1
- [ ] Task 2

---

> [INSTRUCTIONS]
> When rollout is complete:
>
> 1. Mark all tasks as checked
> 2. Delete this rollout file
> 3. Remove entry from .xe/rollouts/README.md
