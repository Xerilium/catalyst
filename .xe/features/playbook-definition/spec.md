---
id: playbook-definition
title: Playbook Definition
dependencies:
  - context-storage
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Definition

## Purpose

Define standardized TypeScript interfaces for playbooks, actions, and execution state so that engines and actions interoperate reliably through clear interface contracts. Provide state persistence utilities for resume capability across interruptions.

## Scenarios

### FR:types.playbook: Playbook Structure Interfaces

**Playbook Engine** needs TypeScript interfaces for playbook structure so that playbook definitions can be parsed, validated, and executed consistently.

- **FR:types.playbook.interface** (P1): System MUST define `Playbook` interface with the following properties:
  - `name` (string, required): Unique playbook identifier in kebab-case
  - `description` (string, required): Human-readable purpose statement
  - `owner` (string, required): Responsible role (e.g., Engineer, Architect, Product Manager)
  - `reviewers` (object, optional): Review requirements with `required` (string[]) and `optional` (string[]) role arrays
  - `triggers` (array, optional): Event-based activation rules, each with `event` (string), `action` (string), and optional `args` (Record<string, unknown>)
  - `inputs` (InputParameter[], optional): Input parameters for playbook
  - `outputs` (Record<string, string>, optional): Expected output names and types
  - `steps` (PlaybookStep[], required): Array of execution steps
  - `catch` (CatchBlock[], optional): Error recovery rules
  - `finally` (PlaybookStep[], optional): Cleanup steps always executed

- **FR:types.playbook.catch-block** (P2): System MUST define `CatchBlock` interface with the following properties:
  - `code` (string, required): Error code to match against CatalystError.code
  - `steps` (PlaybookStep[], required): Recovery steps to execute when error code matches

- **FR:types.playbook.input-parameter** (P1): System MUST define `InputParameter` interface with the following properties:
  - `name` (string, required): Parameter name in kebab-case
  - `type` (string, required): Parameter type - one of 'string', 'number', 'boolean'
  - `description` (string, optional): Human-readable description
  - `required` (boolean, optional): Whether parameter is required (default: false)
  - `default` (unknown, optional): Default value if not provided
  - `allowed` (unknown[], optional): Enumeration of allowed values
  - `validation` (InputValidationRule[], optional): Array of validation rules to apply

### FR:validation: Input Validation

**Playbook Engine** needs extensible input validation so that playbook inputs are validated against configurable rules before execution begins.

- **FR:validation.base** (P2): System MUST define `ValidationRule` base interface with the following properties:
  - `type` (string, required): Rule type discriminator (PascalCased)
  - `code` (string, optional): Error code to return on validation failure
  - `message` (string, optional): Custom error message for validation failure
  - Purpose: Base interface all validation rules extend

- **FR:validation.regex** (P2): System MUST define `RegexValidationRule` interface extending ValidationRule:
  - `type` (string, required): Must be 'Regex'
  - `pattern` (string, required): Regular expression pattern to match

- **FR:validation.string-length** (P2): System MUST define `StringLengthValidationRule` interface extending ValidationRule:
  - `type` (string, required): Must be 'StringLength'
  - `minLength` (number, optional): Minimum string length (inclusive)
  - `maxLength` (number, optional): Maximum string length (inclusive)

- **FR:validation.number-range** (P2): System MUST define `NumberRangeValidationRule` interface extending ValidationRule:
  - `type` (string, required): Must be 'NumberRange'
  - `min` (number, optional): Minimum value (inclusive)
  - `max` (number, optional): Maximum value (inclusive)

- **FR:validation.custom** (P2): System MUST define `CustomValidationRule` interface extending ValidationRule:
  - `type` (string, required): Must be 'Custom'
  - `script` (string, required): JavaScript expression that returns boolean (true = valid)

- **FR:validation.union** (P2): System MUST define `InputValidationRule` as union type of all validation rule interfaces:
  - Type: `RegexValidationRule | StringLengthValidationRule | NumberRangeValidationRule | CustomValidationRule`
  - Enables extensibility - new validation rule types can be added without modifying existing code

- **FR:validation.validator** (P2): System MUST provide `Validator` interface for extensible validation:
  - Generic interface: `Validator<TRule extends ValidationRule>`
  - Method: `validate(value: unknown, rule: TRule): ValidationResult`
  - Returns: `ValidationResult` with `valid` (boolean) and optional `error` (ValidationError)

- **FR:validation.factory** (P2): System MUST provide `ValidatorFactory` class for validator registration:
  - Method: `register(type: string, validator: Validator): void` - Register validator for rule type
  - Method: `validate(value: unknown, rule: InputValidationRule): ValidationResult` - Execute validation
  - Built-in validators: Regex, StringLength, NumberRange, Custom (pre-registered)

- **FR:validation.result** (P2): System MUST define `ValidationResult` interface with the following properties:
  - `valid` (boolean, required): Whether validation passed
  - `error` (ValidationError, optional): Error details if validation failed

- **FR:validation.error** (P2): System MUST define `ValidationError` interface with the following properties:
  - `code` (string, required): Error code from rule or default validation error code
  - `message` (string, required): Error message from rule or generated message
  - `rule` (InputValidationRule, required): The rule that failed
  - `value` (unknown, required): The value that failed validation

### FR:types.step: Step Interface

**Playbook Engine** needs a step interface so that individual execution units within a playbook are consistently structured.

- **FR:types.step.interface** (P1): System MUST define `PlaybookStep` interface with the following properties:
  - `action` (string, required): Action type identifier in kebab-case (e.g., 'github-issue-create', 'ai-prompt', 'file-write', 'if', 'var')
  - `config` (unknown, required): Action-specific configuration object passed to action's `execute()` method
  - `name` (string, optional): Step identifier for referencing results in variables
  - `errorPolicy` (ErrorPolicy | ErrorAction, optional): Error handling configuration from error-handling feature
    > - @req FR:error-handling/policy

- **FR:types.step.unique-names** (P2): Step names MUST be unique within a playbook when specified

- **FR:types.step.config** (P1): Config property contains action-specific configuration object
  - Actions receive this config object directly in their `execute()` method
  - Structure and contents are defined by each action implementation

### FR:types.action: Action Interface Contract

**Developer** needs a clear action interface contract so that custom actions can be implemented reliably and interoperate with the playbook engine.

- **FR:types.action.interface** (P1): System MUST define `PlaybookAction<TConfig>` interface with the following:
  - Generic type parameter `TConfig` represents action's expected configuration structure
  - Method: `execute(config: TConfig): Promise<PlaybookActionResult>`
  - Registration: Actions are registered at build time by action feature

- **FR:types.action.result** (P1): System MUST define `PlaybookActionResult` interface with the following properties:
  - `code` (string, optional): Result or error code (e.g., 'FileNotFound', 'ValidationFailed', 'Success')
  - `message` (string, optional): Human-readable message for logging
  - `value` (unknown, optional): Action-specific output value (automatically added to variables for named steps)
  - `error` (CatalystError, optional): Error details if action failed (null indicates success)
    > - @req FR:error-handling/catalyst-error

- **FR:types.action.dependencies** (P3): System MUST support optional action dependency metadata via `dependencies` property on `PlaybookAction` interface
  - Property is optional (existing actions work without modification)
  - Declares external CLI tools and environment variables required by action
  - Used for pre-execution validation and documentation generation

### FR:types.step-executor: Nested Step Execution Support

**Playbook Engine** needs a step executor interface so that control flow actions can delegate sub-workflows to the engine without direct access to execution context.

- **FR:types.step-executor.interface** (P1): System MUST define `StepExecutor` interface for actions that need to execute nested steps
  - Method: `executeSteps(steps: PlaybookStep[], variableOverrides?: Record<string, unknown>): Promise<PlaybookActionResult[]>`
  - Parameter `steps`: Array of steps to execute sequentially
  - Parameter `variableOverrides`: Optional variables to inject into execution scope (e.g., loop variables)
  - Returns: Array of step results in execution order
  - Behavior: Executes each step following same rules as top-level steps (error policies, state persistence, etc.)
  - Method: `getVariable(name: string): unknown` — read-only access to playbook variables
  - Method: `setVariable(name: string, value: unknown): void` — write access to playbook variables
  - Security: Actions receive executor callback without access to PlaybookContext

- **FR:types.step-executor.base-class** (P1): System MUST define `PlaybookActionWithSteps<TConfig>` abstract base class
  - Implements `PlaybookAction<TConfig>` interface
  - Constructor: `constructor(protected readonly stepExecutor: StepExecutor)`
  - Abstract method: `execute(config: TConfig): Promise<PlaybookActionResult>`
  - Usage: Actions that need nested execution extend this class instead of implementing PlaybookAction directly
  - Example actions: if (conditional execution), for-each (iteration), parallel (concurrent execution)

- **FR:types.step-executor.variable-scoping** (P2): Variable overrides MUST be additive and scoped
  - Overrides add/shadow variables in execution scope without mutating parent context
  - Nested steps can read parent variables and overrides
  - Nested steps cannot modify parent variables (isolation)
  - Example: Loop variables (`item`, `index`) are visible only within loop iterations

- **FR:types.step-executor.execution-rules** (P1): StepExecutor implementation MUST enforce all execution rules
  - Apply error policies from step configuration
  - Update state persistence after each step
  - Track completed steps for resume capability
  - Propagate errors according to error handling configuration

### FR:types.dependencies: Action Dependency Metadata

**Developer** needs dependency metadata interfaces so that actions can declare their external requirements for pre-execution validation.

- **FR:types.dependencies.interface** (P3): System MUST define `PlaybookActionDependencies` interface with the following properties:
  - `cli` (CliDependency[], optional): CLI tool dependencies (bash, pwsh, gh, etc.)
  - `env` (EnvDependency[], optional): Environment variable dependencies (GITHUB_TOKEN, etc.)

- **FR:types.dependencies.cli** (P3): System MUST define `CliDependency` interface with the following properties:
  - `name` (string, required): Command name as it appears in PATH
  - `versionCommand` (string, optional): Command to check version/existence (e.g., 'bash --version')
  - `minVersion` (string, optional): Minimum required version in semver format
  - `platforms` (NodeJS.Platform[], optional): Platform filter (e.g., ['linux', 'darwin'])
  - `installDocs` (string, optional): Installation documentation URL

- **FR:types.dependencies.env** (P3): System MUST define `EnvDependency` interface with the following properties:
  - `name` (string, required): Environment variable name
  - `required` (boolean, required): Whether variable must be present
  - `description` (string, optional): What the variable is used for

- **FR:types.dependencies.check-result** (P3): System MUST define `CheckResult` interface for dependency validation results:
  - `available` (boolean, required): Whether dependency is present
  - `version` (string, optional): Detected version string (if applicable)
  - `meetsMinVersion` (boolean, optional): Whether version requirement met
  - `error` (string, optional): Error message if unavailable or invalid
  - `installDocs` (string, optional): Installation guidance URL from dependency metadata

- **FR:types.dependencies.checker** (P3): System MUST provide `DependencyChecker` service with the following methods:
  - `checkCli(dep: CliDependency): Promise<CheckResult>` - Validate CLI tool availability
  - `checkEnv(dep: EnvDependency): Promise<CheckResult>` - Validate environment variable presence

### FR:catalog: Action Metadata and Build-time Catalog Generation

**Playbook Engine** needs a build-time action catalog so that actions are discovered, registered, and instantiated automatically without manual wiring.

- **FR:catalog.generation** (P1): System MUST generate action catalog at build time by scanning action implementations
  - Catalog maps action types (kebab-case) to `ActionMetadata` objects and class constructors
  - Generated from static properties on action classes
  - Output file: `src/playbooks/registry/action-catalog.ts`
  - Catalog is internal to `PlaybookProvider` - external features use `PlaybookProvider.createAction()`

- **FR:catalog.metadata** (P1): System MUST define `ActionMetadata` interface with the following properties:
  - `actionType` (string, required): Explicit action type identifier in kebab-case (e.g., 'github-issue-create', 'bash', 'http-get')
  - `className` (string, required): TypeScript class name for runtime instantiation (e.g., 'BashAction', 'GitHubIssueCreateAction')
  - `dependencies` (PlaybookActionDependencies, optional): External CLI tools and environment variables required
  - `primaryProperty` (string, optional): Property name for YAML shorthand syntax mapping
  - `nestedStepProperties` (string[], optional): Property paths in config that contain nested `PlaybookStep[]` arrays. Supports dot-notation with `[]` for drilling into array elements (e.g., `"then"` for a direct `PlaybookStep[]` property, `"catch[].steps"` for an array of objects each containing a `steps: PlaybookStep[]` property)
  - `configSchema` (JSONSchemaObject, optional): JSON Schema for action configuration

- **FR:catalog.extract-dependencies** (P2): System MUST extract `dependencies` from action class static property
  - Property name: `static readonly dependencies: PlaybookActionDependencies`
  - Extracted via dynamic import during build

- **FR:catalog.extract-classname** (P2): System MUST extract `className` from action class export name
  - Extracted from class declaration name in action file
  - Used by PlaybookProvider to instantiate actions at runtime

- **FR:catalog.extract-actiontype** (P1): System MUST extract `actionType` from action class static readonly property
  - Each action class MUST declare `static readonly actionType: string`
  - Action type MUST be kebab-case identifier
  - Action type is explicit contract, not derived from filename or file location
  - Rationale: Explicit declaration prevents breaking changes from file reorganization

- **FR:catalog.extract-primaryproperty** (P2): System MUST extract `primaryProperty` from action class static property
  - Property name: `static readonly primaryProperty: string`
  - Enables YAML transformer to map action values to correct property names

- **FR:catalog.generate-schema** (P3): System MUST generate `configSchema` from TypeScript config interfaces using `typescript-json-schema`
  - Input: TypeScript config interfaces (e.g., `BashConfig`, `PowerShellConfig`)
  - Output: JSON Schema draft-07 compatible objects
  - Preserves JSDoc descriptions as schema descriptions

- **FR:catalog.internal** (P1): Generated catalog MUST be internal to PlaybookProvider
  - Accessed only via `PlaybookProvider.createAction()` and `PlaybookProvider.getActionInfo()`
  - External features MUST NOT import catalog directly - use PlaybookProvider methods

- **FR:catalog.build-integration** (P1): Catalog generation MUST run as part of build process before TypeScript compilation
  - Build order: generate-action-registry → tsc
  - Failures in catalog generation MUST fail the build

### FR:schema: Config Schema Generation

**Playbook Engine** needs JSON Schema generation from TypeScript config interfaces so that action configurations can be validated and documented automatically.

- **FR:schema.typescript-json-schema** (P3): System MUST use `typescript-json-schema` library to generate JSON schemas from config interfaces
  - Target interfaces: Any interface ending with `Config` suffix used as action TConfig parameter
  - Schema options: Include JSDoc descriptions, mark required properties, use draft-07

- **FR:schema.jsdoc-preservation** (P3): Generated schemas MUST preserve JSDoc comments as schema descriptions

- **FR:schema.required-properties** (P3): Generated schemas MUST correctly handle optional vs required properties
  - Optional properties (marked with `?`) excluded from `required` array
  - Required properties included in `required` array

- **FR:schema.complex-types** (P3): Generated schemas MUST support complex types:
  - Objects with nested properties
  - Arrays with `items` schema
  - Union types with `oneOf` or `anyOf`
  - Record types with `additionalProperties`

### FR:types.state: Playbook State and Context Structure

**Playbook Engine** needs state and context interfaces so that execution progress can be persisted, resumed, and inspected.

- **FR:types.state.interface** (P1): System MUST define `PlaybookState` interface with the following properties:
  - `playbookName` (string, required): Name of playbook being executed
  - `runId` (string, required): Unique run identifier (format: YYYYMMDD-HHMMSS-nnn)
  - `startTime` (string, required): Execution start timestamp in ISO 8601 format
  - `status` (string, required): Current run status - one of 'running', 'paused', 'completed', 'failed'
  - `inputs` (Record<string, unknown>, required): Validated input parameters with kebab-case keys
  - `variables` (Record<string, unknown>, required): All variables including inputs, var assignments, and step outputs
  - `completedSteps` (string[], required): Names of successfully completed steps (enables resume)
  - `currentStepName` (string, required): Name of step currently being executed
  - `executionOptions` (object, optional): Execution options active during this run (mode, debug, autonomous, etc.) — persisted for post-run analysis
  - Persistence: Saved to `.xe/runs/run-{runId}.json` in JSON format
  - Must be fully JSON-serializable for resume capability

- **FR:types.state.logs** (P2): PlaybookState MUST track log entries produced during execution
  - Log entries MUST be persisted in the run state for post-run analysis
  - Each entry MUST capture: the originating step, log level, source, action, message, optional structured data, and timestamp
  - Log entries MUST be stored separately from variables and step results

- **FR:types.state.context** (P1): System MUST define `PlaybookContext` interface extending PlaybookState:
  - Inherits all properties from PlaybookState
  - `playbook` (Playbook, required): Playbook definition being executed (runtime-only, not persisted)
  - Purpose: Runtime execution container with both persistent state and non-serializable playbook reference
  - Usage: Passed to engine, not to individual action `execute()` methods

- **FR:types.state.variables** (P1): Variables map MUST include inputs, var assignments, and step outputs
  - Step outputs automatically added to variables using step name as key
  - Unified lookup - template engine accesses all variables from single map

### FR:persistence: State Persistence Interface

**Playbook Engine** needs state persistence so that execution state can be saved, loaded, and archived reliably.

- **FR:persistence.active-runs** (P1): State snapshots MUST be saved to `.xe/runs/run-{runId}.json`
  - Active runs stay in `.xe/runs/` until completion
  - File format: pretty-printed JSON (human-readable)

- **FR:persistence.archive** (P2): Completed run snapshots MUST be archived to `.xe/runs/history/{YYYY}/{MM}/{DD}/run-{runId}.json`
  - Archive occurs when status becomes 'completed' or 'failed'

- **FR:persistence.atomic-writes** (P1): State files MUST use atomic writes to prevent corruption
  - Write to temp file, then rename (atomic operation on most filesystems)

- **FR:persistence.gitignore** (P2): System MUST create `.xe/runs/history/.gitignore` on first history archive
  - Content: `*` to ignore all archived run files
  - Active runs in `.xe/runs/` MUST be committed (enables resume across machines)
  - Only completed/failed runs in history directory are ignored
  - Does NOT modify project root `.gitignore`

### FR:persistence.class: State Persistence Utilities

**Playbook Engine** needs a persistence class so that state save/load/archive operations are encapsulated with error handling and atomic writes.

- **FR:persistence.class.methods** (P1): System MUST provide `StatePersistence` class with the following methods:
  - `save(state: PlaybookState): Promise<void>` - Save playbook state to disk
    - Throws StateError if save fails
  - `load(runId: string): Promise<PlaybookState>` - Load playbook state from disk
    - Parameter: runId - Run identifier to load
    - Returns: Playbook state
    - Throws StateError if load fails or state corrupted
  - `listActiveRuns(): Promise<string[]>` - List all active runs in .xe/runs/
    - Returns: Array of run IDs
  - `archive(runId: string): Promise<void>` - Archive completed run to history directory
    - Throws StateError if archive fails
  - `pruneArchive(retentionDays: number): Promise<number>` - Prune old archived runs
    - Parameter: retentionDays - Number of days to retain
    - Returns: Number of runs deleted

- **FR:persistence.class.performance** (P4): State save operations MUST complete within 100ms for states <1MB
- **FR:persistence.class.format** (P2): State files MUST be human-readable JSON (pretty-printed)
- **FR:persistence.class.error-handling** (P2): Corrupted state files MUST throw clear error with recovery instructions

### FR:provider: Unified Playbook Provider

**Playbook Engine** needs a unified provider so that playbook loading and action instantiation are centralized with consistent caching and dependency injection.

- **FR:provider.loader-interface** (P1): System MUST define `PlaybookLoader` interface with the following methods:
  - `name` (string, readonly): Loader identifier (e.g., 'yaml', 'typescript', 'remote')
  - `supports(identifier: string): boolean` - Check if loader can load specified playbook
  - `load(identifier: string): Promise<Playbook | undefined>` - Load playbook by identifier, return undefined if not found

- **FR:provider.class** (P1): System MUST provide `PlaybookProvider` class as unified provider for playbooks AND actions:
  - Singleton pattern: `getInstance()` returns singleton instance, `resetInstance()` for testing
  - Playbook loading: `loadPlaybook(identifier): Promise<Playbook>` - Load and cache playbook
  - Loader registration: `registerLoader(loader: PlaybookLoader): void` - Register loader, throw if duplicate name
  - Action management: `createAction<TConfig>(actionType, stepExecutor?): PlaybookAction<TConfig>` - Create action instance
  - Action metadata: `getActionInfo(actionType): ActionMetadata | undefined` - Get action metadata
  - Action types: `getActionTypes(): string[]` - List registered action types
  - Testing: `registerAction(actionType, ActionClass, metadata?): void` - Register test action
  - Cleanup: `clearAll(): void` - Clear loaders, actions, and cache (testing only)
  - Cleanup: `clearPlaybookCache(): void` - Clear playbook cache only

- **FR:provider.search-path** (P1): Provider MUST resolve playbook identifiers using search path strategy
  - Absolute paths or paths starting with ./ or ../ used as-is
  - Relative names resolved against search paths: ['.xe/playbooks', 'node_modules/@xerilium/catalyst/playbooks']
    > - @req FR:context-storage/storage.project
    > - @req FR:context-storage/storage.framework
  - Generate candidate paths with extensions: .yaml, .yml, original identifier
  - First-wins: return first loader that successfully loads any candidate

- **FR:provider.loader-order** (P2): Provider MUST check loaders in registration order during loadPlaybook()
  - Loop through candidate paths, then loaders for each path
  - Call supports(path) on each loader
  - First loader returning true and successfully loading wins
  - Throw CatalystError with code 'PlaybookNotFound' if no loader loads any candidate

- **FR:provider.duplicate-prevention** (P2): Provider MUST prevent duplicate loader names
  - Throw CatalystError with code 'DuplicateLoaderName' when registering duplicate
  - Error message MUST include conflicting loader name

- **FR:provider.action-initialization** (P1): Provider MUST initialize actions from generated catalog on first access
  - Actions auto-initialized from `action-catalog.ts` when first accessed
  - `registerAction()` allows adding test actions without triggering initialization

- **FR:provider.action-instantiation** (P1): Provider MUST instantiate actions with appropriate dependencies
  - Check if action class extends `PlaybookActionWithSteps`
  - If yes: instantiate with StepExecutor parameter
  - If no: instantiate with no parameters
  - Throw CatalystError with code 'ActionNotFound' if action type not registered

- **FR:provider.caching** (P2): Provider MUST cache loaded playbooks to avoid redundant loader lookups
  - Cache key: Original playbook identifier
  - Cache value: Loaded Playbook object
  - Cache hit: Return cached playbook without calling loaders
  - Cache miss: Load via loaders, cache result before returning
  - Cache undefined results: Do NOT cache undefined - allows retry if loader is registered later

- **FR:provider.dependency-injection** (P3): Provider MUST support dependency injection for testing
  - `registerAction()` enables mock action registration without catalog
  - `clearAll()` resets all state for test isolation
  - `resetInstance()` creates fresh singleton for test isolation

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.serialization** (P4): State serialization MUST complete in <100ms for states <1MB
- **NFR:performance.zero-overhead** (P4): Interface definitions MUST have zero runtime overhead (compile away)

**NFR:reliability**: Reliability

- **NFR:reliability.atomic-writes** (P1): State writes MUST be atomic to prevent corruption on crash
- **NFR:reliability.corruption-recovery** (P2): State files MUST be recoverable if corrupted

**NFR:testability**: Testability

- **NFR:testability.mockable** (P3): All interfaces MUST be mockable for unit testing
- **NFR:testability.abstraction** (P3): State persistence MUST be abstracted for test doubles
- **NFR:testability.coverage** (P1): 100% coverage for state persistence operations

**NFR:maintainability**: Maintainability

- **NFR:maintainability.versioning** (P3): Interface changes MUST be versioned
- **NFR:maintainability.breaking-changes** (P2): Breaking changes to interfaces MUST be clearly documented
- **NFR:maintainability.backward-compatibility** (P1): State format changes MUST support backward compatibility for resume

## External Dependencies

None
