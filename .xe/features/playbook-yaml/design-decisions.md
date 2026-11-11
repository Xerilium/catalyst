# Design Decisions: Playbook YAML Format

## YAML as Separate Declarative Layer
**Decision**: YAML format is a separate feature layered on top of playbook-definition TypeScript interfaces, not bundled with them.

**Date**: <!-- TODO: determine from git history -->

**Why**: The engine only knows about TypeScript interfaces, never YAML. This allows independent evolution of syntax and engine, and enables alternative formats (JSON, TOML) without touching playbook-definition.

**Rejected**: Single unified feature (tight coupling, can't swap formats); YAML-only with direct execution (engine coupled to format).

## Action Type as Property Key
**Decision**: Action type is expressed as the YAML property key (`github-issue-create: "Title"`) rather than a separate `action` property.

**Date**: <!-- TODO: determine from git history -->

**Why**: More concise and visually scannable; the action type is immediately obvious. Enforces single action per step (can't accidentally specify multiple).

**Rejected**: Separate action property (verbose, redundant nesting); type prefix on property names (unconventional, ugly syntax).

## Primary Property Pattern
**Decision**: Three configuration patterns — null/empty (no inputs), primary property (single main value mapped to named property via ACTION_REGISTRY), and object (multiple explicit properties).

**Date**: <!-- TODO: determine from git history -->

**Why**: Optimizes for both simplicity (primary property shorthand for common case) and flexibility (explicit object syntax). Primary property name comes from ACTION_REGISTRY so mapping is explicit, not generic.

**Rejected**: Object-only (verbose for single-value actions); generic "value" property (unclear intent, requires actions to handle multiple property names).

## Type-as-Key for Inputs
**Decision**: Use property key to specify input type (`string: parameter-name`) rather than `{ name: param, type: string }`.

**Date**: <!-- TODO: determine from git history -->

**Why**: Concise and visually scannable; consistent with the action type-as-key pattern. Enforces single type per parameter.

**Rejected**: Traditional key-value (verbose); type prefix on property names (unconventional, harder to validate).

## Transformation Layer Location
**Decision**: Transformation logic lives in playbook-yaml, not playbook-definition or playbook-engine.

**Date**: <!-- TODO: determine from git history -->

**Why**: YAML concerns are isolated; playbook-definition stays pure (interfaces + ACTION_REGISTRY only); engine remains format-agnostic. Alternative formats can follow the same pattern.

**Rejected**: Transformation in playbook-definition (couples interfaces to YAML specifics); transformation in playbook-engine (engine becomes format-specific).

## JSON Schema for IDE Support
**Decision**: Provide a separate JSON Schema at a versioned HTTPS URL for IDE IntelliSense, generated from ACTION_REGISTRY at build time and not committed to git.

**Date**: <!-- TODO: determine from git history -->

**Why**: IDE IntelliSense dramatically improves authoring experience. Schema matches YAML syntax (not TypeScript interface structure) and auto-stays in sync with ACTION_REGISTRY.

**Rejected**: No schema (no IDE support, authors make mistakes); generate schema from TypeScript types (TypeScript types are internal and have different structure than YAML syntax).

## Step Extraction Strategy
**Decision**: Identify action type by finding the first non-reserved property key (`name`, `errorPolicy`) rather than cross-referencing ACTION_REGISTRY.

**Date**: <!-- TODO: determine from git history -->

**Why**: Simple, deterministic, works with any action type including unknown/custom actions.

**Rejected**: Using ACTION_REGISTRY keys to identify action type — would fail for unknown or custom actions.
