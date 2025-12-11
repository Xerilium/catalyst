---
id: playbook-yaml
title: Playbook YAML Format
author: "@flanakin"
description: "Defines the declarative YAML format for authoring playbooks and provides transformation to TypeScript interfaces"
dependencies:
  - playbook-definition
---

# Feature: Playbook YAML Format

## Problem

Playbook authors need a clean, human-friendly format for writing workflow definitions. While the playbook-definition feature provides TypeScript interfaces for the internal system, authors need a declarative syntax optimized for readability and ease of authoring.

## Goals

- Define a clean YAML format for playbook authoring
- Provide JSON Schema for IDE IntelliSense support
- Transform YAML format to TypeScript interfaces from playbook-definition
- Validate YAML structure before transformation

## Scenario

- As a **playbook author**, I need a clean YAML syntax to write playbooks
  - Outcome: YAML format with action-type-as-property-key pattern provides concise, readable syntax

- As a **playbook author**, I need IDE support when writing YAML playbooks
  - Outcome: JSON Schema provides IntelliSense in VS Code and other editors

- As a **playbook engine developer**, I need YAML playbooks transformed to TypeScript interfaces
  - Outcome: Parser transforms YAML to `Playbook` interface automatically

## Success Criteria

- 100% of YAML playbooks validate against JSON Schema before transformation
- Transformation completes in <50ms for playbooks with <100 steps
- IDE provides IntelliSense for all playbook properties
- Invalid YAML fails with clear error messages including line numbers

## Requirements

### Functional Requirements

**FR-1**: YAML Playbook Structure

- **FR-1.1**: Playbooks MUST be defined in YAML format (UTF-8 encoding)

- **FR-1.2**: Every playbook MUST include required top-level properties:

  ```yaml
  name: string          # Unique playbook identifier (kebab-case)
  description: string   # Human-readable purpose statement
  owner: string         # Responsible role (Engineer, Architect, Product Manager, etc.)
  steps: [YAMLStep]     # Execution steps (see FR-2)
  ```

- **FR-1.3**: Playbooks MAY include optional top-level properties:

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

- **FR-1.4**: Input parameter types MUST be specified as property keys
  - Supported types: `string`, `number`, `boolean`
  - Syntax: `string: parameter-name` instead of `name: parameter-name, type: string`

- **FR-1.5**: Input validation rules MUST be specified as validation objects in validation array
  - Each validation object specifies exactly one validation type as property key
  - Supported types: `regex`, `min`, `max`, `minLength`, `maxLength`, `script`
  - All validation objects MAY include optional `code` and `message` properties

- **FR-1.6**: Output property names MUST use kebab-case
  - Example: `pr-number: number` not `prNumber: number`

**FR-2**: YAML Step Format

- **FR-2.1**: Playbook steps in YAML MUST use action type as property key:

  ```yaml
  steps:
    - name: create-issue              # Optional step name
      github-issue-create: "Title"    # Action type as property key
      body: "Issue body"              # Additional configuration properties
      labels: ["bug"]
  ```

- **FR-2.2**: Action configuration patterns:
  - **Null** (`~`): No inputs - action takes no configuration or only uses additional properties
  - **Primary property**: Action has one main value (any type: string, number, boolean, array, or object) mapped to primary property from ACTION_REGISTRY
  - **Object-only**: Action has multiple properties with no primary - object used as-is

- **FR-2.3**: Step names MUST be unique within a playbook when specified

- **FR-2.4**: Each step MAY include optional `errorPolicy` property
  - Type: `ErrorPolicy | ErrorAction` from error-handling feature
  - Controls error handling behavior for the step

**FR-3**: JSON Schema

- **FR-3.1**: System MUST provide JSON Schema file defining valid YAML playbook structure
  - Schema MUST be accessible via HTTPS URL for IDE IntelliSense support
  - Schema MUST validate all structural requirements from FR-1 and FR-2

- **FR-3.2**: Schema MUST define playbook structure with:
  - Required properties: `name`, `description`, `owner`, `steps`
  - Optional properties with proper types and constraints
  - Pattern matching for kebab-case identifiers
  - Type-as-key pattern for inputs and validation rules

- **FR-3.3**: Schema MUST define step structure with:
  - Optional `name` and `errorPolicy` properties
  - Pattern properties for kebab-case action types
  - Flexible value types (string, object, null) for action configurations

- **FR-3.4**: Schema MUST be automatically generated during build:
  - Schema reflects all actions available in ACTION_REGISTRY
  - Each action's configuration properties appear in the schema with IntelliSense support
  - Schema includes extensibility for custom actions not in registry
  - Schema generation MUST complete in <5 seconds
  - Schema MUST be available to validator at runtime (both in development and production)

**FR-4**: YAML Parsing and Validation

- **FR-4.1**: System MUST parse YAML using `js-yaml` library

- **FR-4.2**: System MUST validate parsed YAML against JSON Schema using `ajv`
  - Validation MUST complete in <50ms for playbooks with <100 steps
  - Validation errors MUST include line numbers and property paths
  - Invalid YAML MUST fail fast with actionable error messages

- **FR-4.3**: Parser MUST handle YAML parsing errors:
  - Syntax errors with line and column numbers
  - Type errors with field paths
  - Schema violations with clear explanations

**FR-5**: YAML to TypeScript Transformation

- **FR-5.1**: System MUST transform validated YAML to `Playbook` interface (from playbook-definition)

- **FR-5.2**: Transformation MUST convert YAML step format to TypeScript `PlaybookStep` interface:
  - Extract action type from kebab-case property key (excluding `name`, `errorPolicy`)
  - Build `config` object from primary value and additional properties
  - Preserve `name` and `errorPolicy` metadata

- **FR-5.3**: Transformation MUST handle three configuration patterns using ACTION_REGISTRY for primary property mapping:

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

- **FR-5.4**: Transformation MUST use ACTION_REGISTRY to determine configuration pattern:
  - Registry imported from playbook-definition feature
  - Contains `primaryProperty` metadata for each action type
  - When action value is non-null AND `primaryProperty` exists in registry: Map value to primary property (Pattern 2)
  - When action value is non-null AND no `primaryProperty` in registry: Use object as-is (Pattern 3)
  - When action value is null/undefined: Empty config or only additional properties (Pattern 1)
  - Primary property value can be any type (not limited to primitives)

- **FR-5.5**: Transformation MUST convert all step arrays in playbook:
  - Main `steps` array
  - `catch[].steps` arrays
  - `finally` array

- **FR-5.6**: System MUST provide `PlaybookLoader` interface:

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

**FR-6**: Playbook Discovery

- **FR-6.1**: System MUST discover YAML playbooks in specific locations:
  - **Package playbooks**: `playbooks/` directory in deployed package root (e.g., node_modules folder)
  - **Custom playbooks**: `.xe/playbooks/` directory (user-defined playbooks)

- **FR-6.2**: Playbook files MUST use `.yaml` extension

- **FR-6.3**: Playbook filenames SHOULD match playbook `name` property
  - Example: `my-playbook.yaml` has `name: my-playbook`
  - Improves discoverability and prevents naming confusion

- **FR-6.4**: Playbook discovery MUST complete in <500ms for <500 playbooks
  - Scan only specified directories
  - Filter by `.yaml` extension
  - Lazy load and transform on demand

**FR-7**: YAML Playbook Provider

- **FR-7.1**: System MUST provide `YamlPlaybookLoader` class implementing PlaybookLoader interface from playbook-definition
  - Property: `readonly name = 'yaml'`
  - Method: `supports(identifier)` returns true if identifier ends with .yaml or .yml
  - Method: `load(identifier)` treats identifier as file path, reads YAML file, transforms to Playbook, returns undefined if file not found

- **FR-7.2**: Provider MUST check file existence before loading
  - Use fs.existsSync() to check if file path exists
  - Return undefined if file does not exist (not an error - allows provider chain to continue)
  - Read file content as UTF-8 string if exists

- **FR-7.3**: Provider MUST use existing YamlTransformer for playbook transformation
  - Call transformer.transform(yamlContent) to get Playbook object
  - Handle transformation errors gracefully (log error, return undefined)
  - Transformation failures allow other providers to attempt loading

- **FR-7.4**: System MUST provide `registerYamlLoader()` function for provider registration
  - Creates YamlPlaybookLoader instance (no configuration required)
  - Registers provider with PlaybookProvider.getInstance().register()
  - Exported from playbook-yaml module for build-time registration

- **FR-7.5**: Provider registration MUST occur via generated initialization module
  - Build script scans for provider modules and generates registration code
  - Generated module imported by CLI entry points before playbook loading
  - No hard-coded dependencies on playbook-yaml in CLI code

### Non-functional Requirements

**NFR-1**: Performance

- **NFR-1.1**: JSON Schema validation MUST complete in <50ms for playbooks with <100 steps
- **NFR-1.2**: YAML parsing and transformation MUST complete in <100ms total
- **NFR-1.3**: Playbook discovery MUST scan <500 playbooks in <500ms

**NFR-2**: Reliability

- **NFR-2.1**: Invalid YAML MUST fail fast with actionable error messages
- **NFR-2.2**: Transformation errors MUST include context (line numbers, property paths)
- **NFR-2.3**: All transformation edge cases MUST be tested

**NFR-3**: Maintainability

- **NFR-3.1**: JSON Schema MUST be versioned for future migrations
- **NFR-3.2**: Transformation logic MUST be isolated from playbook-definition
- **NFR-3.3**: Schema changes MUST not break existing valid playbooks

## Key Entities

**Entities owned by this feature:**

- **YAML Playbook Format**: Declarative YAML syntax for authoring playbooks
  - Uses action-type-as-property-key pattern for concise syntax
  - Supports type-as-key for inputs and validation rules
  - Optimized for human authoring, not programmatic generation

- **PlaybookYAMLSchema**: JSON Schema defining valid YAML structure
  - Location: Published at HTTPS URL for IDE access
  - Validates structure before transformation
  - Versioned for backward compatibility

- **PlaybookLoader**: Service that loads and transforms YAML playbooks
  - Parses YAML using js-yaml
  - Validates against JSON Schema using ajv
  - Transforms to Playbook interface
  - Throws clear errors with line numbers on failure

- **YamlPlaybookLoader**: Implementation of PlaybookLoader interface
  - Loads playbooks from .yaml/.yml files
  - Resolves paths relative to configured playbook directory
  - Returns undefined for missing files (not an error)
  - Registers with PlaybookProvider at application startup

- **initializeYamlProvider**: Initialization function for YAML provider registration
  - Creates YamlPlaybookLoader with playbook directory
  - Registers provider with PlaybookProvider singleton
  - Called from application entry points (CLI, tests)

**Entities from other features:**

- **Playbook** (playbook-definition): Target TypeScript interface for transformation
- **PlaybookStep** (playbook-definition): Target TypeScript interface for step transformation
- **ErrorPolicy** (error-handling): Error handling configuration
- **ErrorAction** (error-handling): Shortcut string for common policies

## Dependencies

**Internal:**
- **playbook-definition** (Tier 1.2): Provides target TypeScript interfaces

**External:**
- **js-yaml**: YAML parsing library
- **ajv**: JSON Schema validation library
- **Node.js >= 18**: File system operations, native TypeScript support

## Integration Points

- **playbook-engine**: Uses PlaybookLoader to load YAML playbooks before execution
- **playbook-definition**: Provides target TypeScript interfaces for transformation
- **VS Code**: JSON Schema URL provides IntelliSense for YAML editing
