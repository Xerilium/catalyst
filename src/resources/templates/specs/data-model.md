---
feature: [feature-id]
---

# Data Model: {feature-name}

> [INSTRUCTIONS]
> Define entities this feature owns. Only create when the feature introduces entities worth documenting beyond inline I/O definitions.

## Entities

### {entity-name}

> [INSTRUCTIONS]
> Purpose, key fields with types, relationships, validation rules. Keep lightweight — shape and constraints in prose, not code:
>
> **Playbook** — A parsed playbook definition ready for execution.
>
> - **id** (string, required): Kebab-case identifier, unique across all playbooks
> - **steps** (Step[], required): Ordered list of actions to execute
> - **inputs** (Input[]): Parameters the playbook accepts; each has name, type, and optional default
> - Relationships: A Playbook belongs to a Feature. Steps reference Actions by ID.
> - Validation: id must match filename. At least one step required.

## Referenced Entities

> [INSTRUCTIONS]
> Entities from other features. Link to owning feature's data-model.md.
