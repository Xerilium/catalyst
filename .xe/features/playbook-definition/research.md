---
id: playbook-definition
title: Playbook Definition Research
author: "@flanakin"
description: "Research and design decisions for the Playbook Definition feature"
---

# Research: Playbook Definition

## Overview

This document captures the research, analysis, and design decisions made during the development of the Playbook Definition feature. It provides the rationale for architectural choices and documents alternatives considered.

## Design Decisions

### 1. Build-Time Action Registration

**Decision**: Actions are registered via build-time code generation rather than runtime reflection.

**Alternatives Considered**:

1. **Runtime reflection** - Scan action files at startup, use decorators for metadata
   - Pro: Flexible, no build step required
   - Con: Runtime performance penalty, TypeScript reflection limitations, harder to debug

2. **Manual registration** - Developers manually register each action
   - Pro: Explicit, full control
   - Con: Error-prone, easy to forget, maintenance burden

3. **Build-time generation** (chosen)
   - Pro: No runtime penalty, type-safe, catches errors at build time, zero maintenance
   - Con: Requires build step

**Rationale**:

- No runtime performance penalty for scanning/reflecting
- Type-safe registration without decorators or reflection magic
- Convention-based (scan action files) without runtime coupling
- Validation happens at build time, not startup
- Build failures prevent deployment of invalid actions

**Implementation Approach**:

- Shell script scans `src/playbooks/actions/` during build
- Generates `ActionRegistry.ts` with registration calls for each action
- Build fails if action files don't implement `PlaybookAction` interface
- No manual registration code to maintain

### 2. Generic PlaybookStep Interface

**Decision**: Use TypeScript generics for type-safe action properties in PlaybookAction interface.

**Alternatives Considered**:

1. **Plain object with index signature** - `PlaybookStep = { [key: string]: unknown }`
   - Pro: Simple, flexible
   - Con: No type safety, no IntelliSense, easy to make mistakes

2. **Union types for all actions** - `PlaybookStep = GitHubIssueStep | FileWriteStep | ...`
   - Pro: Type-safe
   - Con: Not extensible, requires modifying core types for new actions, circular dependencies

3. **Generic interface** (chosen)
   - Pro: Type-safe, extensible, enables IntelliSense, clean interface
   - Con: Slightly more complex, generic types compile away at runtime

**Rationale**:

- Enables compile-time type checking for action-specific properties
- Allows IDE IntelliSense when implementing actions
- Maintains clean interface without complex indexer types
- Extensible - new actions don't require modifying core types
- Generics compile away, so no runtime overhead

**Validation**:

Tested with multiple action patterns (see test-generics.ts) - confirmed TypeScript generics work correctly with js-yaml runtime parsing.

### 3. Action Interface: Config-Only vs Context Parameter

**Decision**: Actions receive only `config` parameter, not full `PlaybookContext`.

**Alternatives Considered**:

1. **Config + Context** - `execute(config: TConfig, context: PlaybookContext)`
   - Pro: Actions can access variables, playbook definition, run metadata
   - Con: Tight coupling, actions can access data they shouldn't, harder to test

2. **Full Step + Context** - `execute(step: PlaybookStep, context: PlaybookContext)`
   - Pro: Maximum flexibility
   - Con: Actions receive data they don't need, unclear what they should use

3. **Config only** (chosen)
   - Pro: Loose coupling, clear contract, easier to test, actions only get what they request
   - Con: Need separate mechanism for actions that need context (can be injected via DI)

**Rationale**:

- Actions should only receive the inputs they explicitly requested
- Prevents actions from accessing/modifying data they shouldn't
- Makes action behavior more predictable and testable
- Aligns with principle of least privilege
- Context can be provided via dependency injection for actions that need it

### 4. State vs Context Separation

**Decision**: Separate `PlaybookState` (serializable) from `PlaybookContext` (runtime), with Context extending State.

**Alternatives Considered**:

1. **Single State object** - All data in one object, mark non-serializable fields
   - Pro: Simpler
   - Con: Confusing which fields are persisted, easy to accidentally serialize non-serializable data

2. **Composition** - `PlaybookContext = { state: PlaybookState, playbook: PlaybookDefinition }`
   - Pro: Clear separation
   - Con: More verbose access patterns (`context.state.variables` vs `context.variables`)

3. **Inheritance** (chosen) - `PlaybookContext extends PlaybookState`
   - Pro: Clean access patterns, clear serialization boundary, type safety
   - Con: Requires discipline to not add non-serializable fields to State

**Rationale**:

- Clear separation between what's persisted (State) and what's runtime-only (Context)
- TypeScript ensures State is JSON-serializable
- Clean access patterns - no need for nested property access
- Context "is-a" State with additional runtime data

### 5. Unified Variables Model

**Decision**: Single `variables` map contains inputs, var assignments, and step outputs.

**Alternatives Considered**:

1. **Separate maps** - `inputs`, `variables`, `stepResults` as distinct maps
   - Pro: Clear separation of concerns
   - Con: Template engine needs to check multiple maps, potential naming conflicts, confusion about precedence

2. **Hierarchical lookup** - Check stepResults → variables → inputs
   - Pro: Clear precedence
   - Con: Performance overhead, complex resolution logic

3. **Unified map** (chosen)
   - Pro: Simple lookup, no conflicts, clear precedence (last write wins)
   - Con: Can't distinguish source of variable (but rarely needed)

**Rationale**:

- Simpler mental model - one place to look up variables
- Template engine's `get()` function has single, fast lookup
- No precedence conflicts - values are simply added/updated in order
- Step outputs automatically available as variables via step name
- Inputs are copied into variables at start, so they're accessible the same way

### 6. Step-Level Conditionals via `if` Action Only

**Decision**: Remove `if` property from PlaybookStep - conditionals only via `if` action.

**Alternatives Considered**:

1. **Step-level `if` property** - `{ name: 'foo', if: '{{condition}}', action: {...} }`
   - Pro: Concise for simple guards
   - Con: Two ways to do conditionals, limited (no else), confusing when to use which

2. **Both step-level and action-level** - Support both patterns
   - Pro: Maximum flexibility
   - Con: Confusion about when to use which, more complex engine logic

3. **`if` action only** (chosen)
   - Pro: One way to do conditionals, more powerful (then/else), consistent, cleaner engine
   - Con: Slightly more verbose for simple guards

**Rationale**:

- Simpler mental model - one way to do conditionals
- More powerful - supports both `then` and `else` blocks
- Avoids confusion about when to use step-level vs action-level conditionals
- Step-level guards can be achieved with `if` action containing single step in `then` block
- Reduces engine complexity - only one conditional mechanism to implement

### 7. Type-as-Key Pattern for Input Parameters

**Decision**: Use property key to specify type: `string: parameter-name` instead of `name: parameter-name, type: string`.

**Alternatives Considered**:

1. **Traditional key-value** - `{ name: 'param', type: 'string' }`
   - Pro: Familiar pattern
   - Con: More verbose, harder to parse visually

2. **Type prefix** - `{ string_param: 'param' }`
   - Pro: Compact
   - Con: Unconventional, harder to validate

3. **Type-as-key** (chosen)
   - Pro: Concise, visually scannable, enforces single type per parameter
   - Con: Unconventional pattern, requires custom JSON Schema

**Rationale**:

- More concise YAML syntax
- Visually scannable - type is immediately visible
- Enforces single type per parameter (can't accidentally specify multiple)
- Works well with JSON Schema's property pattern matching

### 8. Validation Rule Type-as-Key Pattern

**Decision**: Use property key to specify validation type: `regex: "pattern"` instead of `type: regex, pattern: "..."`.

**Alternatives Considered**:

1. **Traditional object** - `{ type: 'regex', pattern: '...' }`
   - Pro: Familiar
   - Con: More verbose, nested structure

2. **Type-as-key** (chosen)
   - Pro: Concise, consistent with input parameter pattern, enforces single validation type
   - Con: Requires careful JSON Schema design

**Rationale**:

- Consistent with input parameter type-as-key pattern
- More concise YAML
- Enforces single validation type per rule object
- Supported validation types: regex, min, max, minLength, maxLength, script

### 9. JSON Schema Accessibility

**Decision**: Schema published at HTTPS URL for IDE IntelliSense, exact URL deferred to implementation.

**Alternatives Considered**:

1. **GitHub raw URL** - `https://raw.githubusercontent.com/xerilium/catalyst/main/schemas/playbook.schema.json`
   - Pro: Simple, no hosting required
   - Con: Not versioned, no CDN, slower

2. **GitHub Pages** - `https://catalyst.dev/schemas/playbook.schema.json`
   - Pro: Custom domain, can add versioning
   - Con: Requires GitHub Pages setup

3. **npm package** - Schema bundled in package
   - Pro: Always available with package
   - Con: No HTTPS URL for IDEs, requires local file path

**Decision**: Defer to implementation plan - specify requirement for HTTPS URL without prescribing specific approach.

**Rationale**:

- IDEs need stable HTTPS URL for schema
- Multiple valid implementation approaches
- Can evolve approach over time (start with raw, move to CDN)
- Not a core architectural decision

### 10. Atomic Write Strategy

**Decision**: Use temp file + rename for atomic writes.

**Alternatives Considered**:

1. **Direct write** - Write directly to target file
   - Pro: Simple
   - Con: Corruption risk on crash/interruption

2. **Write-ahead log** - Log changes, then apply
   - Pro: Most robust
   - Con: Complex, overkill for this use case

3. **Temp + rename** (chosen)
   - Pro: Atomic on most filesystems, simple, prevents corruption
   - Con: Requires cleanup on error

**Rationale**:

- Atomic rename operation on most filesystems (POSIX guarantee)
- Prevents state file corruption on crash or interruption
- Simple implementation - no complex logging/recovery
- Standard pattern for atomic writes

### 11. TypeScript-Only Interface Definitions

**Decision**: playbook-definition provides only TypeScript interfaces (Playbook, PlaybookStep, etc.), no format-specific logic.

**Alternatives Considered**:

1. **Include YAML parsing** - Single feature with TypeScript interfaces and YAML parser
   - Pro: Everything in one place
   - Con: Couples interfaces to specific format, can't swap formats

2. **YAML-only** - No TypeScript interfaces, work directly with YAML
   - Pro: Simple, no abstraction
   - Con: Engine and actions tightly coupled to YAML syntax

3. **Interface-only feature** (chosen)
   - Pro: Format-agnostic, clean separation, can use any format (YAML, JSON, TypeScript)
   - Con: Requires separate feature for each format

**Rationale**:

- playbook-definition owns pure TypeScript interfaces (Playbook, PlaybookStep, PlaybookAction, etc.)
- playbook-yaml (separate feature) handles YAML parsing and transformation
- playbook-engine only imports from playbook-definition, never playbook-yaml
- Someone could create playbook-json or programmatically construct Playbook interface
- Clear architectural boundary: interfaces are independent of syntax
- Transformation/parsing is one-time operation at load time

## Technical Constraints

### Performance Targets

Based on spec requirements:

1. **State serialization**: <100ms for states <1MB
   - Strategy: Use streaming JSON for large states, async I/O

2. **Interface definitions**: Zero runtime overhead
   - Strategy: TypeScript interfaces compile away completely

### Dependencies

**Internal**:
- `error-handling` feature for CatalystError and ErrorPolicy types
- Must be implemented first (Tier 1.1)

**External**:
- Node.js >= 18 - Required for file system operations (state persistence)

### 9. Action Dependency Management

**Decision**: Hybrid declarative metadata + build-time registry + runtime validation

**Problem**: Actions that rely on external CLI tools (bash, pwsh, gh) or environment variables (GITHUB_TOKEN) fail at runtime with cryptic errors when dependencies are missing. Users discover missing dependencies through trial-and-error.

**Alternatives Considered**:

1. **Declarative metadata only** - Actions declare dependencies in interface
   - Pro: Discoverable, documentable
   - Con: Can drift from reality, no validation

2. **Runtime detection only** - Actions check at execution time
   - Pro: Always accurate
   - Con: Trial-and-error UX, repeated validation overhead

3. **Hybrid approach** (chosen)
   - Pro: Best of both - pre-validation + defensive runtime checks
   - Con: More implementation work

**Rationale**:

- Declarative metadata enables pre-execution validation and documentation
- Build-time registry generation provides zero-cost dependency lookup
- Runtime validation ensures accuracy (defensive programming)
- Single source of truth: action code, not separate config files

**Design Details**:

**Data Model**:
```typescript
interface PlaybookActionDependencies {
  cli?: CliDependency[];  // CLI tools (bash, pwsh, gh)
  env?: EnvDependency[];  // Environment variables
}

interface CliDependency {
  name: string;                    // e.g., 'bash', 'gh'
  versionCommand?: string;         // e.g., 'bash --version'
  minVersion?: string;             // e.g., '5.0.0' (semver)
  platforms?: NodeJS.Platform[];   // e.g., ['linux', 'darwin']
  installDocs?: string;            // Installation guide URL
}

interface EnvDependency {
  name: string;           // e.g., 'GITHUB_TOKEN'
  required: boolean;      // true = fail if missing
  description?: string;   // What it's used for
}
```

**Platform-Agnostic Checking Strategy**:

Two-tier validation in centralized `DependencyChecker` service:
1. **Strategy 1**: Try version command first (most reliable)
   - `bash --version` works cross-platform if command exists
2. **Strategy 2**: Fall back to which/where
   - Unix/Linux/macOS: `which bash`
   - Windows: `where bash`

**Build-Time Registry Generation**:

- Scans all `*-action.ts` files for static `dependencies` property
- Generates `registry/dependency-registry.ts` with type-safe registry
- Integrated into build process (runs before TypeScript compilation)
- Zero runtime overhead (O(1) object property lookup)

**Extension Points**:

- New dependency types: Add property to `PlaybookActionDependencies` (e.g., `docker?: DockerDependency[]`)
- New checking strategies: Add methods to `DependencyChecker` (e.g., `checkDocker()`)
- New actions: Auto-registered by build script using reflection

**Why Not Track NPM Dependencies?**

NPM dependencies are handled by package.json - Catalyst installs them automatically. Focus on external CLI tools and environment variables that require user action.

### 12. Config Schema Generation from TypeScript Interfaces

**Decision**: Generate JSON schemas from TypeScript config interfaces using `typescript-json-schema` library at build time

**Problem**: playbook-yaml feature needs JSON schemas for action configurations to generate YAML JSON Schema for IDE IntelliSense. Manually maintaining both TypeScript interfaces AND JSON schemas violates DRY principle and creates maintenance burden.

**Alternatives Considered**:

1. **Manually maintain JSON schemas** - Write schemas by hand alongside TypeScript interfaces
   - Pro: Full control over schema
   - Con: Violates DRY, error-prone, maintenance burden, schemas can drift from reality

2. **Generate TypeScript from JSON Schema** - Author schemas first, generate TypeScript
   - Pro: Single source of truth
   - Con: JSON Schema is less ergonomic than TypeScript for authoring, loses TypeScript's type safety benefits during development

3. **Generate JSON Schema from TypeScript** (chosen)
   - Pro: TypeScript is source of truth, DRY principle, leverages TypeScript's type safety, JSDoc comments become schema descriptions
   - Con: Requires build-time generation, dependency on schema generator library

**Rationale**:

- TypeScript interfaces are already the source of truth for action configurations
- JSDoc comments on interfaces/properties provide human-readable descriptions
- typescript-json-schema library handles complex types (unions, intersections, generics, Record types)
- Zero maintenance - schemas automatically stay in sync with TypeScript types
- Build-time generation has zero runtime cost
- Schemas can be consumed by playbook-yaml for IDE IntelliSense generation

**Design Details**:

**ActionMetadata Structure**:
```typescript
interface ActionMetadata {
  dependencies?: PlaybookActionDependencies;  // External tool dependencies
  primaryProperty?: string;                   // Property for YAML shorthand (e.g., 'code')
  configSchema?: JSONSchemaObject;            // Generated from TypeScript interface
}
```

**Schema Generation Approach**:

1. **Target interfaces**: Any interface ending with `Config` suffix (e.g., `BashConfig`, `PowerShellConfig`)
2. **Match to actions**: `{ActionClass}Config` → action type (e.g., `BashAction` → `BashConfig` → `bash`)
3. **Extract metadata**: Use typescript-json-schema to generate JSON Schema draft-07
4. **Preserve JSDoc**: JSDoc comments on properties become schema `description` fields
5. **Handle optionality**: Properties marked with `?` excluded from `required` array

**typescript-json-schema Configuration**:

```typescript
const settings = {
  required: true,           // Mark non-optional properties as required
  noExtraProps: true,       // Disallow additional properties
  ref: false,               // Inline references (no $ref)
  titles: true,             // Include title from interface name
  defaultProps: false,      // Don't add default properties
  include: ['src/playbooks/scripts/playbooks/actions/**/*.ts']
};

const program = TJS.getProgramFromFiles([configFile], compilerOptions);
const schema = TJS.generateSchema(program, 'BashConfig', settings);
```

**Example**: BashConfig → JSON Schema

**Input (TypeScript)**:
```typescript
/**
 * Configuration for the bash action (Bash script execution)
 */
export interface BashConfig {
  /**
   * Bash script to execute
   */
  code: string;

  /**
   * Working directory for script execution
   *
   * @default Repository root
   */
  cwd?: string;

  /**
   * Environment variables for script execution
   *
   * These are merged with process.env, with config values taking precedence.
   */
  env?: Record<string, string>;

  /**
   * Maximum execution time in milliseconds
   *
   * @default 60000 (60 seconds)
   */
  timeout?: number;
}
```

**Output (JSON Schema)**:
```json
{
  "type": "object",
  "properties": {
    "code": {
      "type": "string",
      "description": "Bash script to execute"
    },
    "cwd": {
      "type": "string",
      "description": "Working directory for script execution"
    },
    "env": {
      "type": "object",
      "additionalProperties": { "type": "string" },
      "description": "Environment variables for script execution"
    },
    "timeout": {
      "type": "number",
      "description": "Maximum execution time in milliseconds"
    }
  },
  "required": ["code"]
}
```

**Integration with ACTION_REGISTRY**:

```typescript
export const ACTION_REGISTRY: Record<string, ActionMetadata> = {
  "bash": {
    dependencies: { /* ... */ },
    primaryProperty: "code",
    configSchema: { /* generated schema */ }
  }
};
```

**Consumers**:

- **playbook-yaml**: Uses configSchema to generate YAML JSON Schema for IDE IntelliSense
- **playbook-engine**: Could use configSchema for runtime validation (future enhancement)
- **playbook-docs**: Could use configSchema to generate documentation (future enhancement)

**Why typescript-json-schema?**

- Mature library (8+ years, 3k+ stars)
- Handles complex TypeScript types (unions, intersections, generics, conditional types)
- Preserves JSDoc comments as descriptions
- Configurable output (strict mode, additionalProperties, etc.)
- Active maintenance

**Alternative Libraries Considered**:

- `ts-json-schema-generator`: More recent, but less mature
- `json-schema-from-typescript`: Too simple, doesn't handle complex types
- Manual generation: Violates DRY principle

### 13. Build Artifacts Strategy

**Decision**: Generated files (action-registry.ts, schema.json) are NOT committed - they are regenerated on every build.

**Problem**: This question has been revisited 4+ times. Without documentation, teams repeatedly debate whether to commit generated files, wasting time and risking inconsistent decisions.

**Alternatives Considered**:

1. **Commit generated files** - Track action-registry.ts and schema.json in git
   - Pro: No build step required to run tests
   - Con: Creates duplicate state that can drift out of sync, generates diff noise on every action change, merge conflicts on generated files

2. **Generate to src/ and commit** - Generated files in src/ but tracked in git
   - Pro: Easy imports, no build step
   - Con: Same issues as #1, plus confusing which files are "real" source

3. **Do not commit (build artifacts)** (chosen)
   - Pro: Clean git history, no merge conflicts, forces validation on every build, single source of truth
   - Con: Requires build step before tests, CI must explicitly generate artifacts

**Rationale**:

- **Single source of truth**: Action implementations are the source. Generated files are derived state.
- **Avoid drift**: Committing generated files creates two sources of truth that can become inconsistent
- **Reduce noise**: Every action change would modify registry/schema, creating diff noise
- **Force validation**: Regenerating on build ensures actions follow conventions
- **Standard practice**: Don't commit compiled code (this is conceptually similar)

**Implementation Details**:

**action-registry.ts**:
- Generated to: `src/playbooks/scripts/playbooks/registry/action-registry.ts`
- Why in src/: TypeScript compilation needs compile-time imports
- Gitignored: Yes (in src/)
- Loading: Static TypeScript imports

**schema.json**:
- Generated to: `dist/playbooks/schema.json`
- Why in dist/playbooks/: Runtime artifact, lives near playbooks (not buried in implementation code)
- Gitignored: No (dist/ is already ignored)
- Loading: `require.resolve('@xerilium/catalyst/playbooks/schema.json')` - always from node_modules
- Build process copies dist → node_modules, making it available at consistent path

**Trade-offs**:
- ✅ Clean git history
- ✅ No merge conflicts on generated files
- ✅ Forces validation on every build
- ❌ Requires build step before tests
- ❌ CI must explicitly generate artifacts

**Decision Date**: December 2024

### 14. Nested Step Execution Support

**Decision**: Actions that need to execute nested steps (control flow, iteration) receive a `StepExecutor` callback interface, not direct access to PlaybookContext.

**Problem**: Control flow actions (if, for-each) and future actions (parallel, retry, timeout) need to execute nested steps while following all execution rules (error policies, state persistence, resume tracking). Direct PlaybookContext access would violate encapsulation and create security/maintainability issues.

**Alternatives Considered**:

1. **Pass PlaybookContext to actions** - Actions receive full context with engine reference
   - Pro: Actions have full access to execution state
   - Con: Violates encapsulation, actions can modify state arbitrarily, security risk, tight coupling

2. **Actions call engine directly** - Actions import and call engine methods
   - Pro: Direct control over nested execution
   - Con: Circular dependency, actions tightly coupled to engine, hard to test, violates dependency inversion

3. **StepExecutor callback interface** (chosen)
   - Pro: Clean separation, actions only get execution capability, engine controls all rules, testable, secure
   - Con: Requires base class for actions with nested execution

**Rationale**:

- **Separation of concerns**: Actions request execution, engine enforces rules
- **Security**: Actions cannot access or modify execution context directly
- **Testability**: StepExecutor is easily mockable for unit tests
- **Maintainability**: Engine logic stays in engine, not duplicated across actions
- **Extensibility**: New execution rules apply automatically to all nested execution

**Design Details**:

**StepExecutor Interface**:
```typescript
interface StepExecutor {
  executeSteps(
    steps: PlaybookStep[],
    variableOverrides?: Record<string, unknown>
  ): Promise<PlaybookActionResult[]>;
}
```

**PlaybookActionWithSteps Base Class**:
```typescript
abstract class PlaybookActionWithSteps<TConfig> implements PlaybookAction<TConfig> {
  constructor(protected readonly stepExecutor: StepExecutor) {}
  abstract execute(config: TConfig): Promise<PlaybookActionResult>;
}
```

**Usage Pattern** (if action example):
```typescript
export class IfAction extends PlaybookActionWithSteps<IfConfig> {
  async execute(config: IfConfig): Promise<PlaybookActionResult> {
    const condition = evaluateCondition(config.condition);

    if (condition) {
      // Engine enforces all rules automatically
      return await this.stepExecutor.executeSteps(config.then);
    } else if (config.else) {
      return await this.stepExecutor.executeSteps(config.else);
    }

    return { code: 'Success' };
  }
}
```

**Variable Overrides** (for-each example):
- Loop variables injected without mutating parent context
- Scoped: visible only within loop iterations
- Additive: can read parent variables + overrides
- Isolated: cannot modify parent variables

```typescript
export class ForEachAction extends PlaybookActionWithSteps<ForEachConfig> {
  async execute(config: ForEachConfig): Promise<PlaybookActionResult> {
    const items = getItems(config.items);

    for (let i = 0; i < items.length; i++) {
      // Inject loop variables into execution scope
      await this.stepExecutor.executeSteps(config.steps, {
        item: items[i],
        index: i
      });
    }

    return { code: 'Success' };
  }
}
```

**Engine Responsibilities**:
- Apply error policies from step configuration
- Update state persistence after each step
- Track completed steps for resume
- Propagate errors according to error handling
- Enforce all execution rules consistently

**Trade-offs**:
- ✅ Clean separation of concerns
- ✅ Actions cannot violate execution rules
- ✅ Easily testable (mock StepExecutor)
- ✅ Extensible (new rules apply automatically)
- ❌ Requires base class (slight complexity)
- ❌ Actions cannot customize execution behavior (by design)

**Decision Date**: December 2024

### 15. Playbook Provider Registry

**Decision**: Use provider registry pattern with runtime registration for loading playbooks from multiple sources without coupling

**Problem**: PlaybookRunAction needs to load child playbooks, but creating direct dependency playbook-actions-controls → playbook-yaml violates architecture tiers. Need extensible solution supporting multiple sources (YAML, TypeScript, remote, custom).

**Alternatives Considered**:

1. **Direct dependency on playbook-yaml** - PlaybookRunAction imports YAML loader directly
   - Pro: Simple, direct
   - Con: Violates tier architecture, tight coupling, prevents extensibility

2. **Engine registry** - Engine maintains playbook registry, actions access via engine reference
   - Pro: Centralized management
   - Con: Circular dependency (actions → engine → actions), tight coupling to engine

3. **Provider registry pattern** (chosen)
   - Pro: Zero coupling between features, extensible, testable, clean separation
   - Con: Requires initialization step, slight indirection

**Rationale**:
- **Inversion of control**: Features register providers at runtime, no compile-time dependencies
- **Extensibility**: New providers (TypeScript, remote, custom) added without modifying existing code
- **Testability**: Mock providers easily registered for testing
- **Zero coupling**: playbook-actions-controls has NO dependency on playbook-yaml

**Architecture**:
- PlaybookProvider interface: name, supports(), load() methods
- PlaybookProviderRegistry singleton with path resolution: register(), load(identifier)
- Path resolution strategy: Absolute paths used as-is, relative names resolved against ['.xe/playbooks', 'node_modules/@xerilium/catalyst/playbooks']
- Build-time code generation: Scans for provider modules, generates initialization code
- YamlPlaybookProvider: Implements interface, exports registerYamlProvider() function
- Generated registration module: Imports all providers, no hard-coded dependencies in CLI
- PlaybookRunAction: Loads via registry.load(name) without knowing about YAML

**Provider Registration via Code Generation**:
- Build script scans for provider modules by convention (e.g., `*/yaml/provider.ts`)
- Generates `src/playbooks/scripts/playbooks/registry/initialize-providers.ts` with static imports
- Example generated code:
  ```typescript
  import { registerYamlProvider } from '../yaml/provider';
  export function initializeProviders() {
    registerYamlProvider();
    // Future: Load custom providers from config
  }
  ```
- CLI imports generated module, calls initializeProviders() early in startup
- Zero hard-coded dependencies, extensible via config file later

**Trade-offs**:
- ✅ Zero coupling between features
- ✅ Extensible without code modification
- ✅ Testable with mock providers
- ✅ No runtime file naming conventions
- ✅ Build-time validation
- ❌ Requires build step to generate registration
- ❌ Provider modules must follow convention for discovery

**Decision Date**: December 2024

## Open Questions

None - all design decisions finalized during spec review.

## References

- TypeScript generics validation: [test-generics.ts](../../../test-generics.ts) (test file created during research)
- TypeScript handbook: https://www.typescriptlang.org/docs/handbook/
- Node.js file system API: https://nodejs.org/api/fs.html
