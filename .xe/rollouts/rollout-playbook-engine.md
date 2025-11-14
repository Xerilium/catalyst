---
features: [playbook-engine]
status: planning
created: 2025-01-13
execution_id: null
current_step: null
last_updated: null
---

# Rollout: playbook-engine

This rollout implements the TypeScript-based playbook execution engine with AI platform agnostic design, enabling programmatic workflow execution, state management, and composition.

## Pre-implementation

Prerequisites that must be completed before implementation begins:

- [ ] Review and finalize playbook-engine spec/plan/tasks based on user feedback
- [ ] Create base-errors feature to extract CatalystError base class
- [ ] Update blueprint to add claude-adapter and copilot-adapter features
- [ ] Add model-selection feature to blueprint Phase 2
- [ ] Update plan.md template with diagram guidance
- [ ] Convert new-blueprint-issue.md playbook to TypeScript example in research.md

## Implementation

Execute all implementation tasks defined in the playbook-engine tasks.md file:

- [ ] Execute all tasks in [.xe/features/playbook-engine/tasks.md](.xe/features/playbook-engine/tasks.md)

## Post-implementation

Actions to complete after implementation finishes:

- [ ] Migrate existing markdown playbooks to use new TypeScript engine
  - [ ] start-rollout.md → playbooks/start-rollout.yaml (with markdown task executor)
  - [ ] create-blueprint.md → playbooks/create-blueprint.yaml
  - [ ] new-init-issue.md → playbooks/new-init-issue.yaml
  - [ ] new-blueprint-issue.md → playbooks/new-blueprint-issue.yaml (already converted in research.md)
- [ ] Update slash command integrations to route to playbook engine
- [ ] Create documentation for writing custom playbooks
- [ ] Test resume capability with real playbook execution

## Cleanup

Remove temporary files and complete rollout:

- [ ] Remove `.xe/playbooks/state/*.json` files (if any test state persisted)
- [ ] Update blueprint tasks.md to mark playbook-engine (T005) as complete
- [ ] Delete this rollout file
- [ ] Remove entry from .xe/rollouts/README.md (if exists)

---

**State Management:**

This rollout guide tracks execution state in YAML frontmatter:
- `status`: planning → pending → in-progress
- `execution_id`: UUID generated when execution starts
- `current_step`: Current step being executed (from tasks.md)
- `last_updated`: Timestamp of last progress update

For programmatic state access, see `.xe/rollouts/rollout-playbook-engine.json` (generated during execution).
