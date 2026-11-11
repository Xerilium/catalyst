---
id: playbook-yaml
title: Playbook YAML Format
description: Declarative YAML syntax for authoring playbooks with JSON Schema IDE support and validation.
dependencies:
  - playbook-definition
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook YAML Format

## Purpose

Playbook authors need a clean, human-friendly format for writing workflow definitions. This feature defines a declarative YAML syntax optimized for readability and ease of authoring, provides JSON Schema for IDE IntelliSense support, and transforms YAML format to TypeScript interfaces from playbook-definition with validation before transformation.

## Scenarios

### FR:structure: YAML Playbook Structure

Playbook author needs a clean YAML syntax to write playbooks so that workflow definitions are concise and readable with IDE support.

- **FR:structure.encoding** (P1): Playbooks MUST be defined in YAML format (UTF-8 encoding)

- **FR:structure.required** (P1): Every playbook MUST include required top-level properties:

  ```yaml
  name: string          # Unique playbook identifier (kebab-case)
  description: string   # Human-readable purpose statement
  owner: string         # Responsible role (Engineer, Architect, Product Manager, etc.)
  steps: [YAMLStep]     # Execution steps (see FR-2)
  ```

- **FR:structure.optional** (P2): Playbooks MAY include optional top-level properties:

  ```yaml
  reviewers:                    # Review requirements (optional)
    required: [string]          # Roles that must approve
    optional: [string]          # Roles that may review

  triggers:                     # Event-based activation (optional)
    - event: string             # GitHub event type (e.g., 'issues', 'pull_request')
      action: string            # GitHub event action (e.g., 'opened', 'labeled')
      args:                     # Event-specific filters
        [property]: value

  inputs:                       # Input parameters (optional)
    - string: str-param-name    # String parameter example
      description: string       # Parameter description (optional)
      required: boolean         # Whether required (optional, default: false)
      default: any              # Default value (optional)
      allowed: [value]          # Enum values (optional)
      validation:               # Custom validation (optional)
        - regex: "^pattern$"    # Regex pattern
          code: string          # Error code (optional)
          message: string       # Error message (optional)
    - number: num-param-name    # Number parameter example
      default: 30
    - boolean: bool-param-name  # Boolean parameter example
      default: false

  outputs:                      # Expected outputs (optional)
    kebab-name: type            # Output name (kebab-case) and type

  catch:                        # Error recovery (optional)
    - code: error-code          # Error code to catch
      steps: [YAMLStep]         # Recovery steps

  finally:                      # Cleanup (optional)
    - [YAMLStep]                # Always execute these steps
  ```

- **FR:structure.input-types** (P1): Input parameter types MUST be specified as property keys
  - Supported types: `string`, `number`, `boolean`
  - Syntax: `string: parameter-name` instead of `name: parameter-name, type: string`

- **FR:structure.validation** (P2): Input validation rules MUST be specified as validation objects in validation array
  - Each validation object specifies exactly one validation type as property key
  - Supported types: `regex`, `min`, `max`, `minLength`, `maxLength`, `script`
  - All validation objects MAY include optional `code` and `message` properties

- **FR:structure.output-naming** (P1): Output property names MUST use kebab-case
  - Example: `pr-number: number` not `prNumber: number`

### FR:steps: YAML Step Format

Playbook engine developer needs YAML steps transformed to TypeScript PlaybookStep interfaces so that the engine can execute steps defined in YAML format.

- **FR:steps.action-key** (P1): Playbook steps in YAML MUST use action type as property key:

  ```yaml
  steps:
    - name: create-issue              # Optional step name
      github-issue-create: "Title"    # Action type as property key
      body: "Issue body"              # Additional configuration properties
      labels: ["bug"]
  ```

- **FR:steps.patterns** (P1): Action configuration patterns:
  - **Null** (`~`): No inputs - action takes no configuration or only uses additional properties
  - **Primary property**: Action has one main value (any type: string, number, boolean, array, or object) mapped to primary property from ACTION_REGISTRY
  - **Object-only**: Action has multiple properties with no primary - object used as-is

- **FR:steps.unique-names** (P2): Step names MUST be unique within a playbook when specified

- **FR:steps.error-policy** (P2): Each step MAY include optional `errorPolicy` property
  - Type: `ErrorPolicy | ErrorAction` from error-handling feature
  - Controls error handling behavior for the step

### FR:schema: JSON Schema

Playbook author needs JSON Schema for IDE IntelliSense so that editors provide autocompletion and validation when writing YAML playbooks.

- **FR:schema.file** (P1): System MUST provide JSON Schema file defining valid YAML playbook structure
  - Schema MUST be accessible via HTTPS URL for IDE IntelliSense support
  - Schema MUST validate all structural requirements from FR:structure and FR:steps

- **FR:schema.playbook** (P1): Schema MUST define playbook structure with:
  - Required properties: `name`, `description`, `owner`, `steps`
  - Optional properties with proper types and constraints
  - Pattern matching for kebab-case identifiers
  - Type-as-key pattern for inputs and validation rules

- **FR:schema.step** (P1): Schema MUST define step structure with:
  - Optional `name` and `errorPolicy` properties
  - Pattern properties for kebab-case action types
  - Flexible value types (string, object, null) for action configurations

- **FR:schema.generation** (P2): Schema MUST be automatically generated during build:
  - Schema reflects all actions available in ACTION_REGISTRY
  - Each action's configuration properties appear in the schema with IntelliSense support
  - Schema includes extensibility for custom actions not in registry
  - Schema generation MUST complete in <5 seconds
  - Schema MUST be available to validator at runtime (both in development and production)

### FR:parsing: YAML Parsing and Validation

Playbook engine developer needs YAML parsing with schema validation so that invalid playbooks fail fast with clear error messages including line numbers.

- **FR:parsing.library** (P1): System MUST parse YAML using `js-yaml` library

- **FR:parsing.validation** (P1): System MUST validate parsed YAML against JSON Schema using `ajv`
  - Validation MUST complete in <50ms for playbooks with <100 steps
  - Validation errors MUST include line numbers and property paths
  - Invalid YAML MUST fail fast with actionable error messages

- **FR:parsing.errors** (P2): Parser MUST handle YAML parsing errors:
  - Syntax errors with line and column numbers
  - Type errors with field paths
  - Schema violations with clear explanations

### FR:transformation: YAML to TypeScript Transformation

Playbook engine developer needs YAML playbooks transformed to TypeScript Playbook interfaces so that the engine can execute YAML-authored workflows.

- **FR:transformation.interface** (P1): System MUST transform validated YAML to `Playbook` interface (from playbook-definition)
  > - @req FR:playbook-definition/types.action.interface

- **FR:transformation.steps** (P1): Transformation MUST convert YAML step format to TypeScript `PlaybookStep` interface:
  - Extract action type from kebab-case property key (excluding `name`, `errorPolicy`)
  - Build `config` object from primary value and additional properties
  - Preserve `name` and `errorPolicy` metadata

- **FR:transformation.patterns** (P1): Transformation MUST handle three configuration patterns using ACTION_REGISTRY for primary property mapping:

  ```yaml
  # Pattern 1: No inputs (null/empty)
  - github-repo-info: ~
  # Transforms to: { action: 'github-repo-info', config: {} }

  # Pattern 2: Primary property (value can be any type)
  - github-issue-create: "Issue Title"
    body: "Body text"
  # Transforms to: { action: 'github-issue-create', config: { title: 'Issue Title', body: 'Body text' } }
  # Primary property 'title' determined from ACTION_REGISTRY['github-issue-create'].primaryProperty

  # Pattern 3: Object-only (no primary property in registry)
  - file-write:
      path: "/foo"
      content: "bar"
  # Transforms to: { action: 'file-write', config: { path: '/foo', content: 'bar' } }
  ```

  **Note**: Primary property value can be any type (string, number, boolean, array, or object), not just primitives.

- **FR:transformation.registry** (P1): Transformation MUST use ACTION_REGISTRY to determine configuration pattern:
  - Registry imported from playbook-definition feature
  - Contains `primaryProperty` metadata for each action type
  - When action value is non-null AND `primaryProperty` exists in registry: Map value to primary property (Pattern 2)
  - When action value is non-null AND no `primaryProperty` in registry: Use object as-is (Pattern 3)
  - When action value is null/undefined: Empty config or only additional properties (Pattern 1)
  - Primary property value can be any type (not limited to primitives)

- **FR:transformation.all-steps** (P1): Transformation MUST convert all step arrays in playbook:
  - Main `steps` array
  - `catch[].steps` arrays
  - `finally` array

- **FR:transformation.loader** (P1): System MUST provide `PlaybookLoader` interface:

  ```typescript
  interface PlaybookLoader {
    /**
     * Load and transform YAML playbook to TypeScript interface
     * @param yamlPath - Path to YAML playbook file
     * @returns Transformed Playbook
     * @throws {ValidationError} If YAML invalid or transformation fails
     */
    load(yamlPath: string): Promise<Playbook>;

    /**
     * Load and transform YAML content to TypeScript interface
     * @param yamlContent - YAML playbook content string
     * @returns Transformed Playbook
     * @throws {ValidationError} If YAML invalid or transformation fails
     */
    loadFromString(yamlContent: string): Promise<Playbook>;
  }
  ```

### FR:discovery: Playbook Discovery

Playbook engine developer needs to discover YAML playbooks from configured directories so that all available playbooks are loaded automatically.

- **FR:discovery.locations** (P1): System MUST discover YAML playbooks in specific locations:
  - **Package playbooks**: `playbooks/` directory in deployed package root (e.g., node_modules folder)
  - **Custom playbooks**: `.xe/playbooks/` directory (user-defined playbooks)

- **FR:discovery.extension** (P1): Playbook files MUST use `.yaml` extension

- **FR:discovery.naming** (P3): Playbook filenames SHOULD match playbook `name` property
  - Example: `my-playbook.yaml` has `name: my-playbook`
  - Improves discoverability and prevents naming confusion

- **FR:discovery.performance** (P4): Playbook discovery MUST complete in <500ms for <500 playbooks
  - Scan only specified directories
  - Filter by `.yaml` extension
  - Lazy load and transform on demand

### FR:provider: YAML Playbook Provider

Playbook engine developer needs a YAML playbook provider that integrates with the playbook loading system so that YAML playbooks are loaded alongside other provider types.

- **FR:provider.interface** (P1): System MUST provide `YamlPlaybookLoader` class implementing PlaybookLoader interface from playbook-definition
  - Property: `readonly name = 'yaml'`
  - Method: `supports(identifier)` returns true if identifier ends with .yaml or .yml
  - Method: `load(identifier)` treats identifier as file path, reads YAML file, transforms to Playbook, returns undefined if file not found

- **FR:provider.existence** (P2): Provider MUST check file existence before loading
  - Use fs.existsSync() to check if file path exists
  - Return undefined if file does not exist (not an error - allows provider chain to continue)
  - Read file content as UTF-8 string if exists

- **FR:provider.transformation** (P1): Provider MUST use existing YamlTransformer for playbook transformation
  - Call transformer.transform(yamlContent) to get Playbook object
  - Handle transformation errors gracefully (log error, return undefined)
  - Transformation failures allow other providers to attempt loading

- **FR:provider.registration** (P1): System MUST provide `registerYamlLoader()` function for provider registration
  - Creates YamlPlaybookLoader instance (no configuration required)
  - Registers provider with PlaybookProvider.getInstance().register()
  - Exported from playbook-yaml module for build-time registration

- **FR:provider.initialization** (P2): Provider registration MUST occur via generated initialization module
  - Build script scans for provider modules and generates registration code
  - Generated module imported by CLI entry points before playbook loading
  - No hard-coded dependencies on playbook-yaml in CLI code

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.validation**: JSON Schema validation MUST complete in <50ms for playbooks with <100 steps
- **NFR:performance.transformation**: YAML parsing and transformation MUST complete in <100ms total
- **NFR:performance.discovery**: Playbook discovery MUST scan <500 playbooks in <500ms

**NFR:reliability**: Reliability

- **NFR:reliability.errors**: Invalid YAML MUST fail fast with actionable error messages
- **NFR:reliability.context**: Transformation errors MUST include context (line numbers, property paths)
- **NFR:reliability.coverage**: All transformation edge cases MUST be tested

**NFR:maintainability**: Maintainability

- **NFR:maintainability.versioning**: JSON Schema MUST be versioned for future migrations
- **NFR:maintainability.isolation**: Transformation logic MUST be isolated from playbook-definition
- **NFR:maintainability.compatibility**: Schema changes MUST not break existing valid playbooks

## Architecture Constraints

None

## External Dependencies

- **js-yaml**: YAML parsing library
- **ajv**: JSON Schema validation library
- **Node.js >= 18**: File system operations, native TypeScript support
