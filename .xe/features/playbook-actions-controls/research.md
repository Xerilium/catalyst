---
id: playbook-actions-controls
title: Research: Playbook Actions - Controls
description: "Research notes, competitive analysis, and technical findings for control flow action implementation"
date: 2025-12-01
---

# Research: Playbook Actions - Controls

## Summary

Control flow actions are essential primitives for building sophisticated playbook workflows. Research covered existing workflow systems (GitHub Actions, Azure Pipelines, Ansible), evaluated control flow patterns, and analyzed integration requirements with the Catalyst playbook engine. Key findings: (1) conditional execution requires template engine integration for expression evaluation, (2) loop variable scoping must be carefully managed to prevent leakage, (3) workflow termination actions need special handling in the engine to trigger cleanup (finally blocks), (4) control flow actions that execute nested steps need engine access for delegation.

## Scope

Research focused on:
- Control flow patterns in existing workflow systems
- Template engine integration for condition evaluation and variable interpolation
- Variable scoping strategies for loops and conditionals
- Engine integration patterns for nested step execution
- Error handling and termination semantics
- Resume capability for control flow actions

Out of scope:
- Advanced loop constructs (while, until, break, continue)
- Switch/case statements
- Parallel execution within control flow
- Async/await patterns

## Methods

Research conducted via:
- Review of existing action implementations (playbook-actions-scripts)
- Analysis of playbook-definition spec
- Review of workflow systems: GitHub Actions, Azure Pipelines, Ansible, AWS Step Functions
- Prototype exploration of template interpolation
- Review of JavaScript VM context scoping patterns

## Sources

- [playbook-definition spec](.xe/features/playbook-definition/spec.md) - Core interfaces and contracts (2025-11-30)
- [playbook-actions-scripts spec](.xe/features/playbook-actions-scripts/spec.md) - Reference action implementations (2025-11-30)
- [GitHub Actions Expressions](https://docs.github.com/en/actions/learn-github-actions/expressions) - Conditional syntax patterns
- [Ansible Conditionals](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html) - Loop and conditional patterns
- [AWS Step Functions Choice State](https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-choice-state.html) - State machine branching

## Technical Context

### Existing Patterns

**GitHub Actions**:
- Uses `if:` property with expression syntax: `${{ expression }}`
- Supports complex boolean expressions with `&&`, `||`, `!`
- Variables accessed via `github.event.variable` or `env.VARIABLE`
- No built-in for-each (requires matrix strategy or shell scripts)

**Ansible**:
- `when:` clause for conditionals with Jinja2 expressions
- `loop:` and `with_items:` for iteration
- Loop variables: `item` (current item), `ansible_loop` (metadata)
- Variable registration via `register:` for step outputs

**Azure Pipelines**:
- `condition:` property with expression syntax
- `each:` for parameter expansion (compile-time)
- Limited runtime iteration support

**AWS Step Functions**:
- Choice state with comparison operators
- Map state for iteration
- States communicate via JSON input/output
- No shared variable scope

### Catalyst Playbook Architecture

**Key Components**:
1. **PlaybookEngine**: Orchestrates step execution, manages state persistence
2. **Template Engine**: Resolves `{{variable}}` and `${{expression}}` syntax
3. **PlaybookContext**: Runtime container with variables, state, playbook reference
4. **PlaybookAction**: Interface all actions implement
5. **ACTION_REGISTRY**: Build-time metadata registry for action discovery

**Integration Points**:
- Control actions need engine access to execute nested steps (if/then/else, for-each/steps)
- Template engine used for condition evaluation and variable interpolation
- PlaybookContext.variables stores all playbook variables (inputs, var assignments, step outputs)
- State persistence must track control flow progress for resume capability

### Variable Scoping Challenge

**Problem**: Loop variables (`item`, `index`) must be scoped to iteration without polluting parent scope.

**Options Evaluated**:
1. **Shallow Copy with Restore**: Copy parent variables, add loop vars, restore after iteration
   - Pro: Simple implementation
   - Con: Doesn't handle nested modifications correctly

2. **Scoped Context Stack**: Stack of variable scopes, lookup walks up stack
   - Pro: Correct nested scoping behavior
   - Con: More complex, requires engine changes

3. **Prefix/Namespace Approach**: Prefix loop variables (e.g., `loop-0-item`)
   - Pro: No scoping changes needed
   - Con: Awkward syntax, template references break

**Decision**: Use shallow copy with restore approach for MVP (option 1). Loop variables shadow parent variables during iteration and are removed after completion. This works correctly for the common case (read-only access to parent vars, modifications to loop vars only). Document limitation: modifications to parent variables within loop body will be lost after iteration.

### Action Classification: Privileged vs Extensible

**Problem**: Determine which control actions require privileged engine access vs extensible pattern.

**Analysis**:
- **Privileged Actions** (in executor): Require direct mutation of execution context
  - VarAction: Mutates `context.variables` directly
  - ReturnAction: Mutates `context.earlyReturn` flag
  - Cannot be implemented via extensible pattern without breaking encapsulation

- **Extensible Actions** (playbook-actions-controls): Use only public interfaces
  - IfAction: Uses StepExecutor for nested execution, no context mutation
  - ForEachAction: Uses StepExecutor with variableOverrides for scoped variables
  - PlaybookRunAction: Uses PlaybookProviderRegistry.load() + StepExecutor
  - ThrowAction: Stateless, only throws CatalystError

**Decision**: Only var/return remain privileged. If/for-each/playbook/throw migrate to extensible controls feature. This enables:
- Clear separation of concerns (privileged vs extensible)
- Third-party action authors can implement custom control flow
- Better testability for extensible actions (no context mocking)

**PlaybookProviderRegistry Pattern**:
- Enables zero-coupling playbook loading (no dependency on playbook-yaml)
- PlaybookRunAction calls `PlaybookProviderRegistry.getInstance().load(name)`
- Providers register themselves at runtime (inversion of control)
- Extensible: YamlPlaybookProvider, TypeScriptPlaybookProvider, RemotePlaybookProvider

**StepExecutor Capabilities Pattern**:
- Actions with 'step-execution' capability extend PlaybookActionWithSteps
- Engine provides StepExecutor via constructor injection
- StepExecutor interface: `executeSteps(steps, variableOverrides?)` for nested execution
- StepExecutor interface: `getCallStack()` for circular reference detection

### Engine Integration Patterns

**Problem**: Control actions (if, for-each) need to execute nested steps using engine's execution logic.

**Options Evaluated**:
1. **Engine Injection**: Pass engine instance to action constructor
   - Pro: Full engine capabilities available
   - Con: Tight coupling, breaks action isolation

2. **Step Executor Callback**: Pass step execution function to action
   - Pro: Loose coupling, testable
   - Con: Limited to step execution only

3. **Sub-Engine Pattern**: Actions create mini-engine instances
   - Pro: Complete isolation
   - Con: Duplication, state persistence complexity

**Decision**: Use step executor callback (option 2) passed via action constructor. Actions receive `executeStep(step: PlaybookStep, variables: Record<string, unknown>): Promise<PlaybookActionResult>` function. This enables:
- Nested steps follow same execution rules as top-level steps
- Actions remain testable with mock executors
- Engine retains control over state persistence and error handling

### Workflow Termination Semantics

**Problem**: `return` and `throw` actions need to terminate playbook execution immediately while allowing finally blocks to run.

**Options Evaluated**:
1. **Exception-Based**: Throw special exception (EarlyReturnException) caught by engine
   - Pro: Immediate termination semantics
   - Con: Unusual error handling pattern for success case

2. **Result Code Signal**: Return special result code ('EarlyReturn', 'Throw') recognized by engine
   - Pro: Standard action result pattern
   - Con: Requires engine to check result codes

3. **State Mutation**: Action directly mutates PlaybookContext.status to 'completed'/'failed'
   - Pro: Simple, engine sees state change
   - Con: Side effects in actions, breaks isolation

**Decision**: Use result code signal (option 2) with dedicated result codes. Engine checks for 'EarlyReturn' and 'Throw' codes after each step and handles termination flow. Return action returns code='EarlyReturn', throw action returns error with code='Throw'. Engine interprets these codes as termination signals and executes finally blocks before marking playbook complete/failed.

## Migration / Compatibility Considerations

No migration required - this is a new feature. Compatibility considerations:
- Control actions must work with existing template interpolation (playbook-template-engine)
- Must integrate cleanly via StepExecutor interface
- Error codes must not conflict with existing CatalystError codes
- State persistence format must support resume for partial control flow execution

## Open Questions

- Q001: Should for-each support parallel iteration? — Owner: @flanakin — ETA: 2025-12-15
  - Current spec: Sequential only
  - Consideration: Parallel execution adds complexity, state management challenges
  - Recommendation: Defer to future enhancement (playbook-actions-controls-parallel)

- Q002: Should we support break/continue in loops? — Owner: @flanakin — ETA: 2025-12-15
  - Current spec: No break/continue
  - Consideration: Requires loop control flow exception handling
  - Recommendation: Defer to future enhancement if demand emerges

- Q003: Should nested step execution be tracked in state for resume? — Owner: @flanakin — ETA: 2025-12-10
  - Current spec: Yes, implicitly via completed steps tracking
  - Consideration: Partial loop completion on crash needs resume support
  - Recommendation: Track iteration progress in step result (e.g., lastCompletedIndex)

## Decision Log

- **Decision**: Use TypeScript for control action config interfaces, not YAML
  - Rationale: Aligns with project architecture principle (TypeScript-first, YAML optional via playbook-yaml feature)
  - Alternatives considered: YAML-first design would create circular dependency
  - Date: 2025-12-01
  - Owner: @flanakin

- **Decision**: Condition evaluation delegated to template engine, not custom expression parser
  - Rationale: Reuses existing template engine, consistent syntax across all template expressions
  - Alternatives considered: Custom expression parser would duplicate logic and create inconsistent syntax
  - Date: 2025-12-01
  - Owner: @flanakin

- **Decision**: Loop variables use default names 'item' and 'index' with optional override
  - Rationale: Balances convention with flexibility, matches Ansible pattern
  - Alternatives considered: Required explicit names (verbose), positional access (unclear)
  - Date: 2025-12-01
  - Owner: @flanakin

- **Decision**: Return action validates outputs against playbook definition (permissive)
  - Rationale: Catch missing required outputs at runtime, allow extra outputs for flexibility
  - Alternatives considered: Strict validation (breaking), no validation (unsafe)
  - Date: 2025-12-01
  - Owner: @flanakin

- **Decision**: Control actions support primaryProperty for YAML shorthand syntax
  - Rationale: Enables compact YAML syntax when only one property matters
  - Alternatives considered: Always require full config object (verbose for common cases)
  - Date: 2025-12-01
  - Owner: @flanakin

## References

- [Catalyst Architecture](.xe/architecture.md) - System architecture patterns
- [Catalyst Engineering Principles](.xe/engineering.md) - SOLID principles and design patterns
- [TypeScript VM API](https://nodejs.org/api/vm.html) - Context isolation patterns
