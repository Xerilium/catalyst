# Design Decisions: Playbook Definition

## Build-time action registration
**Decision**: Generate `ActionRegistry.ts` via a build-time script that scans action files rather than using runtime reflection or manual registration.

**Date**: <!-- TODO: determine from git history -->

**Why**: No runtime performance penalty, type-safe, catches errors at build time, and eliminates maintenance burden of manual registration.

**Rejected**: Runtime reflection — performance penalty, TypeScript limitations; manual registration — error-prone and easy to forget.

## Generic `PlaybookAction` interface
**Decision**: Use TypeScript generics (`PlaybookAction<TConfig>`) for type-safe per-action config.

**Date**: <!-- TODO: determine from git history -->

**Why**: Enables compile-time type checking and IDE IntelliSense per action without modifying core types when new actions are added; generics compile away with zero runtime cost.

**Rejected**: Index signatures — no type safety; union types — not extensible without modifying core, creates circular dependencies.

## Config-only action interface
**Decision**: Actions receive only their `config` parameter, not the full `PlaybookContext`.

**Date**: <!-- TODO: determine from git history -->

**Why**: Enforces least privilege — actions only access inputs they explicitly declared; makes behavior predictable and unit testing straightforward.

**Rejected**: Config + Context — tight coupling; Full Step + Context — actions receive data they don't need, unclear contract.

## `PlaybookContext` extends `PlaybookState`
**Decision**: Separate serializable `PlaybookState` from runtime `PlaybookContext`, with Context extending State via inheritance.

**Date**: <!-- TODO: determine from git history -->

**Why**: Clear boundary between what is persisted and what is runtime-only; clean access patterns without nested property access.

**Rejected**: Single object — confusing which fields are persisted; composition — verbose access patterns.

## Unified variables map
**Decision**: A single `variables` map holds inputs, var assignments, and step outputs; last write wins.

**Date**: <!-- TODO: determine from git history -->

**Why**: Simplest mental model — one place to look up values; template engine's `get()` has a single fast lookup with no precedence conflicts.

**Rejected**: Separate maps per source — template engine must check multiple maps, potential naming conflicts.

## Conditionals via `if` action only
**Decision**: Remove `if` property from `PlaybookStep`; all conditionals use the `if` action.

**Date**: <!-- TODO: determine from git history -->

**Why**: One way to handle conditionals; supports then/else blocks; avoids confusion about when to use step-level vs action-level; reduces engine complexity.

**Rejected**: Step-level `if` property — limited (no else), two mechanisms for the same thing; supporting both — maximum confusion.

## Type-as-key pattern for inputs and validation rules
**Decision**: Use the property key to specify type (`string: param-name`, `regex: "pattern"`) rather than a nested object (`{ type: string, name: param-name }`).

**Date**: <!-- TODO: determine from git history -->

**Why**: More concise and visually scannable YAML; enforces single type per declaration; consistent across both input parameters and validation rules.

**Rejected**: Traditional key-value objects — more verbose; type-prefix naming — unconventional and harder to validate.

## Generated files are not committed
**Decision**: `action-registry.ts` and `schema.json` are regenerated on every build and are gitignored.

**Date**: <!-- TODO: determine from git history -->

**Why**: Single source of truth is the action implementations; committing generated files creates drift risk, merge conflicts, and diff noise.

**Rejected**: Committing generated files — duplicate state, merge conflicts, noisy diffs.

## `StepExecutor` callback for nested step execution
**Decision**: Control flow actions (if, for-each) receive a `StepExecutor` callback interface rather than direct `PlaybookContext` access.

**Date**: <!-- TODO: determine from git history -->

**Why**: Actions can request nested execution without accessing or mutating context directly; engine enforces all execution rules (error policies, state persistence, resume tracking) automatically.

**Rejected**: Pass PlaybookContext — violates encapsulation; actions call engine directly — circular dependency, tight coupling.

## Provider registry pattern for playbook loading
**Decision**: Use a provider registry with runtime registration for loading playbooks from multiple sources; providers are discovered and registered via build-time code generation.

**Date**: <!-- TODO: determine from git history -->

**Why**: Zero compile-time coupling between features; extensible to new formats (TypeScript, remote, custom) without modifying existing code.

**Rejected**: Direct dependency on playbook-yaml — violates tier architecture; engine registry — circular dependency.

## `PlaybookProvider` as static class with caching
**Decision**: Replace singleton instance pattern with a static class exposing `PlaybookProvider.load()` and an internal cache.

**Date**: <!-- TODO: determine from git history -->

**Why**: Cleaner API; caching avoids repeated file I/O for the same playbook; `clearCache()`/`clearAll()` enable clean test isolation.

**Rejected**: Singleton with cache — still verbose; module-level functions — harder to manage internal state.

## JSON schema generated from TypeScript interfaces
**Decision**: Use `typescript-json-schema` at build time to generate JSON schemas from `*Config` TypeScript interfaces.

**Date**: <!-- TODO: determine from git history -->

**Why**: TypeScript interfaces are already the source of truth; JSDoc comments become schema descriptions; schemas stay in sync automatically with zero runtime cost.

**Rejected**: Manually maintained schemas — violates DRY, drift risk; generate TypeScript from schema — JSON Schema is less ergonomic to author.

## TypeScript-only interface definitions in playbook-definition
**Decision**: `playbook-definition` provides only TypeScript interfaces with no format-specific parsing; a separate `playbook-yaml` feature handles YAML parsing.

**Date**: <!-- TODO: determine from git history -->

**Why**: Format-agnostic boundary; engine imports only from `playbook-definition` and is not coupled to any syntax; allows future formats (JSON, programmatic) without engine changes.

**Rejected**: Include YAML parsing in playbook-definition — couples interfaces to a specific format; YAML-only — engine tightly coupled to syntax.
