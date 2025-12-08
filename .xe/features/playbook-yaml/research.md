---
id: playbook-yaml
title: Playbook YAML Format Research
author: "@flanakin"
description: "Research and design decisions for the declarative YAML playbook format"
---

# Research: Playbook YAML Format

## Overview

This document captures the research, analysis, and design decisions made during the development of the Playbook YAML Format feature. It provides the rationale for separating YAML as a declarative wrapper over TypeScript interfaces.

## Design Decisions

### 1. YAML as Separate Declarative Layer

**Decision**: YAML format exists as separate feature layered on top of playbook-definition TypeScript interfaces.

**Alternatives Considered**:

1. **Single unified feature** - YAML and TypeScript interfaces in same feature
   - Pro: Simpler organization, fewer features
   - Con: Tight coupling, can't swap formats, harder to test independently

2. **YAML-only with direct execution** - Engine works directly with YAML
   - Pro: No transformation layer needed
   - Con: Engine tightly coupled to YAML, can't use other formats, harder to evolve

3. **Separate YAML feature** (chosen)
   - Pro: Clean separation, TypeScript interfaces can be used directly, YAML is just one possible format, easier to test
   - Con: Requires transformation layer, slightly more complex

**Rationale**:

- playbook-definition defines pure TypeScript interfaces (Playbook, PlaybookStep, etc.)
- playbook-yaml provides declarative YAML wrapper that transforms to those interfaces
- playbook-engine only knows about TypeScript interfaces, never YAML
- Someone could theoretically create playbook-json or any other format
- Transformation happens once at load time, minimal performance impact
- Clear separation allows independent evolution of syntax and engine

### 2. Action Type as Property Key

**Decision**: Use action type as YAML property key instead of separate `action` property.

**Alternatives Considered**:

1. **Separate action property** - `{ action: 'github-issue-create', title: 'Title' }`
   - Pro: Explicit, familiar pattern
   - Con: More verbose, redundant nesting

2. **Type prefix** - `{ github-issue-create_title: 'Title' }`
   - Pro: Compact
   - Con: Unconventional, ugly syntax

3. **Action as property key** (chosen)
   - Pro: Concise, visually scannable, single property identifies action type
   - Con: Unconventional pattern, requires transformation

**Rationale**:

- More concise YAML syntax: `github-issue-create: "Title"` vs `action: github-issue-create, title: Title`
- Visually scannable - action type is immediately obvious
- Natural mapping to kebab-case action identifiers
- Enforces single action per step (can't accidentally specify multiple)
- Transformation layer handles conversion to standard TypeScript interface

### 3. Primary Property Pattern

**Decision**: Support three configuration patterns: null/empty (no inputs), primary property (single main value), and object (multiple properties). Use ACTION_REGISTRY to determine primary property name when present.

**Three Patterns**:

1. **No inputs**: Action takes no configuration

   ```yaml
   github-repo: ~
   → { }
   ```

2. **Primary property**: Action has one main value (can be any type: string, number, boolean, array, object)

   ```yaml
   github-issue-create: "Issue Title"
   body: "Additional property"
   → { title: "Issue Title", body: "Additional property" }
   # 'title' is the primary property from ACTION_REGISTRY
   ```

3. **Object-only**: Action has multiple properties but no primary

   ```yaml
   file-write:
     path: "/foo"
     content: "bar"
   → { path: "/foo", content: "bar" }
   ```

**Alternatives Considered**:

1. **Object only** - All configurations must be explicit objects
   - Pro: Consistent structure
   - Con: Verbose for actions with single main value

2. **Generic "value" property** - Map action value to `{ value: actionValue }`
   - Pro: Simple transformation, no registry needed
   - Con: Actions must handle both `value` and actual property names, unclear intent

3. **Primary property via registry** (chosen)
   - Pro: Clean mapping to actual property names, explicit declaration, concise syntax for common case
   - Con: Requires build-time registry generation

**Rationale**:

- Primary property value can be ANY type (not just primitives): string, number, boolean, array, or object
- Primary property name determined from ACTION_REGISTRY (static readonly primaryProperty on action class)
- When action value is set AND primaryProperty exists in registry → map to that property name
- When action value is object AND no primaryProperty → use object as-is
- When action value is null/undefined → empty config or only additional properties
- Optimizes for both simplicity (primary property shorthand) and flexibility (explicit object syntax)
- Transformation layer uses registry to normalize to correct property names

### 4. Type-as-Key for Inputs

**Decision**: Use property key to specify input type: `string: parameter-name` instead of `name: parameter-name, type: string`.

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
- Consistent with action type-as-key pattern

### 5. Separate from playbook-definition

**Decision**: YAML format is separate feature, not part of playbook-definition.

**Alternatives Considered**:

1. **Include YAML in playbook-definition** - Single feature with both TypeScript and YAML
   - Pro: Everything in one place
   - Con: Couples interfaces to syntax, can't evolve independently

2. **YAML as only format** - No TypeScript interfaces, only YAML
   - Pro: Simpler
   - Con: Engine coupled to YAML, harder to test, can't use programmatically

3. **Separate YAML feature** (chosen)
   - Pro: Clean separation, interfaces independent of syntax, can add other formats
   - Con: More features to manage

**Rationale**:

- playbook-definition owns TypeScript interfaces (Playbook, PlaybookStep, etc.)
- playbook-yaml owns YAML syntax and transformation
- playbook-engine only imports from playbook-definition, never playbook-yaml
- Actions only import from playbook-definition, never playbook-yaml
- Someone could create playbook-json or playbook-toml without touching playbook-definition
- Transformation is one-time build artifact or load-time operation
- Clear architectural boundary between interface contracts and declarative syntax

### 6. JSON Schema for IDE Support

**Decision**: Provide JSON Schema at HTTPS URL for IDE IntelliSense.

**Alternatives Considered**:

1. **No schema** - Just documentation
   - Pro: Simple
   - Con: No IDE support, authors make mistakes

2. **TypeScript schema generator** - Generate schema from TypeScript types
   - Pro: Single source of truth
   - Con: TypeScript types are internal, YAML has different syntax

3. **Separate JSON Schema** (chosen)
   - Pro: IDE IntelliSense, validation, matches YAML syntax exactly
   - Con: Requires maintaining separate schema file

**Rationale**:

- IDE IntelliSense dramatically improves authoring experience
- JSON Schema matches YAML syntax, not TypeScript interface structure
- Validation catches errors before transformation
- Published at HTTPS URL for wide IDE compatibility
- Can evolve independently of TypeScript interfaces

### 7. Transformation Layer Location

**Decision**: Transformation lives in playbook-yaml feature, not playbook-definition.

**Alternatives Considered**:

1. **Transformation in playbook-definition** - Interfaces + transformation together
   - Pro: Everything in one place
   - Con: playbook-definition now depends on YAML specifics

2. **Transformation in playbook-engine** - Engine handles YAML parsing
   - Pro: Engine controls format
   - Con: Engine coupled to YAML syntax

3. **Transformation in playbook-yaml** (chosen)
   - Pro: YAML concerns isolated, playbook-definition stays pure, engine format-agnostic
   - Con: Requires clear interface boundary, depends on ACTION_REGISTRY from playbook-definition

**Rationale**:

- playbook-definition provides pure TypeScript interfaces and ACTION_REGISTRY
- playbook-yaml owns all YAML-specific logic (parsing, validation, transformation)
- playbook-yaml imports ACTION_REGISTRY to resolve primary properties
- playbook-engine imports Playbook from playbook-definition
- playbook-engine uses PlaybookLoader from playbook-yaml to load YAML files
- Clear separation: definition (interfaces + metadata) → yaml (syntax) → engine (execution)
- Alternative formats can follow same pattern

**Registry Dependency**:
- playbook-yaml depends on playbook-definition for ACTION_REGISTRY
- This is acceptable because ACTION_REGISTRY is metadata about the action contract, which lives in playbook-definition
- The registry enables YAML transformation without coupling playbook-definition to YAML syntax

## Technical Implementation Details

### Step Transformation Algorithm

**Extraction Strategy**: Use reserved property names (`name`, `errorPolicy`) to distinguish metadata from action type. Find first non-reserved key as action type.

**Pros**: Simple, deterministic, works with any action type
**Cons**: Relies on property order (YAML parsers preserve order, but not guaranteed by spec)

**Alternative considered**: Use ACTION_REGISTRY keys to identify action type
**Rejected because**: Would fail for unknown/custom actions, less flexible

### Value Pattern Transformation Logic

Three transformation patterns based on action value and ACTION_REGISTRY:

1. **Null/undefined**: Use only additional properties (Pattern 1: No inputs)

   ```yaml
   file-write: ~
   path: "/foo"
   → { path: "/foo" }
   ```

2. **Value with primaryProperty in registry**: Map to primary property, merge additional properties (Pattern 2: Primary property)

   ```yaml
   github-issue-create: "Title"
   body: "Body"
   → { title: "Title", body: "Body" }  # 'title' from ACTION_REGISTRY['github-issue-create'].primaryProperty
   ```

   Note: Value can be any type (string, number, boolean, array, or object)

3. **Object without primaryProperty in registry**: Use object as-is, merge additional properties (Pattern 3: Object-only)

   ```yaml
   file-write:
     path: "/foo"
     content: "bar"
   → { path: "/foo", content: "bar" }
   ```

**Edge Case Handling**:

- When action value is non-null AND ACTION_REGISTRY has no primaryProperty: Use object as-is (Pattern 3)
- When action value is non-null AND ACTION_REGISTRY has primaryProperty: Map value to that property (Pattern 2)
- When action value is object AND additional properties exist: Additional properties override (last-wins merge)

### Input Parameter Parsing

Parse type-as-key pattern (`string: param-name`) to extract parameter name and type. Map remaining properties (`description`, `required`, `default`, `allowed`, `validation`) to InputParameter interface.

### Validation Rule Parsing

Parse validation type from property keys (`regex`, `minLength`, `maxLength`, `min`, `max`, `script`) and transform to ValidationRule interface with appropriate type discriminator (`Regex`, `StringLength`, `NumberRange`, `Custom`).

## Technical Constraints

### Performance Targets

Based on spec requirements:

1. **Schema validation**: <50ms for playbooks with <100 steps
   - Strategy: Pre-compile Ajv schema at startup, cache compiled validator
   - Expected: 5-20ms for typical playbook

2. **YAML parsing + transformation**: <100ms total
   - Strategy: Single-pass transformation during YAML parse
   - Expected: 1-5ms parse + 1-3ms transform = <10ms typical

3. **Playbook discovery**: <500ms for <500 playbooks
   - Strategy: Lazy load and transform on demand, cache by path + mtime
   - Expected: <200ms for glob + filter (no parsing)

### Error Handling

**Error Types**:
- `PlaybookValidationError` - YAML syntax or schema validation failures
- `PlaybookTransformationError` - Transformation logic failures

**Error Message Requirements**:
- Include file path
- Include line/column numbers (from js-yaml)
- Include property paths (from ajv)
- Provide actionable guidance

**Example Error Messages**:
```
PlaybookValidationError: Invalid YAML syntax at line 23, column 5
  in: playbooks/my-playbook.yaml
  → Unexpected indentation

PlaybookValidationError: Schema validation failed
  in: playbooks/my-playbook.yaml
  → Property 'name' is required
  → Property 'steps[2].github-issue-create' should be string, got number

PlaybookTransformationError: Step missing action type
  in: playbooks/my-playbook.yaml
  at: steps[5]
  → Each step must have exactly one action property (excluding 'name', 'errorPolicy')
```

### JSON Schema Design

**Challenge**: JSON Schema needs to enforce "exactly one action property per step" while remaining extensible and automatically staying in sync with available actions.

**Solution**: Generate schema from ACTION_REGISTRY during build, using `oneOf` with required properties for each action that has configSchema metadata.

**Approach**:
- Generate `oneOf` array by iterating ACTION_REGISTRY entries
- For each action with `configSchema` metadata: Create variant requiring that action key
- Incorporate action's configSchema properties into the step variant
- Include `custom-action` variant for extensibility (user-defined actions)
- Common properties (`name`, `errorPolicy`) allowed in all variants
- Schema generated directly to `dist/playbooks/schema.json` during build (simpler path, next to playbooks)
- NOT committed to git (build artifact in dist/ only)
- Validator loads from `require.resolve('@xerilium/catalyst/playbooks/schema.json')` (always from node_modules)
- Build copies dist → node_modules, making schema available at consistent path for both dev and prod

**Benefits**:
- Enforces exactly one action per step at schema validation time
- Provides IDE IntelliSense for all built-in actions with their actual config properties
- Automatically stays in sync with ACTION_REGISTRY (no manual maintenance)
- Allows extensibility via `custom-action` key
- Config property descriptions from ACTION_REGISTRY appear in IDE tooltips

**Example generated step variant**:
```json
{
  "description": "Bash action step",
  "required": ["bash"],
  "properties": {
    "name": { "type": "string" },
    "errorPolicy": { "oneOf": [{ "type": "string" }, { "type": "object" }] },
    "bash": {
      "oneOf": [
        { "type": "string" },
        { "type": "object", "properties": { ... from configSchema ... } }
      ]
    }
  }
}
```

### IDE Integration

**Preferred Approach**: YAML front matter (most portable)

```yaml
# yaml-language-server: $schema=https://catalyst.xerilium.com/schemas/playbook.schema.json
---
name: my-playbook
```

**Alternative**: VS Code workspace settings (optional enhancement)

```json
{
  "yaml.schemas": {
    "https://catalyst.xerilium.com/schemas/playbook.schema.json": [
      "playbooks/*.yaml",
      ".xe/playbooks/*.yaml"
    ]
  }
}
```

### Dependencies

**Internal**:
- `playbook-definition` (Tier 1.2) - Provides target TypeScript interfaces for transformation

**External**:
- `js-yaml` (v4.x) - YAML parsing (8M+ weekly downloads, excellent error reporting)
- `ajv` (v8.x) - JSON Schema validation (10M+ weekly downloads, fastest validator)
- Node.js >= 18 - Required for native fetch, crypto, and module resolution

## Testing Strategy

### Unit Tests
- YAML parsing with valid/invalid syntax
- Schema validation with valid/invalid structures
- Step transformation for all three value patterns (primitive, object, null)
- Input parameter transformation with all types
- Validation rule transformation for all types
- Error message formatting with line numbers

### Integration Tests
- Load real playbook YAML files
- End-to-end transformation to Playbook interface
- Discovery across multiple directories
- IDE schema validation (manual test)

### Test Fixtures

Create fixtures in `tests/fixtures/playbooks/`:
- `valid-minimal.yaml` - Minimal valid playbook
- `valid-complete.yaml` - All optional properties
- `invalid-syntax.yaml` - YAML syntax errors
- `invalid-schema.yaml` - Schema validation failures
- `edge-cases.yaml` - Transformation edge cases (null values, object merges)

## Implementation Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JSON Schema too restrictive | Medium | High | Keep schema flexible, validate edge cases in transformer |
| IDE IntelliSense doesn't work | Low | Medium | Test with VS Code YAML extension, provide docs fallback |
| Transformation logic becomes complex | Medium | Medium | Comprehensive unit tests, clear error messages |
| Performance degrades with large playbooks | Low | Low | Benchmark with 100+ step playbooks |

## YAML Playbook Provider

**Purpose**: Register YAML file loading capability with PlaybookProvider for playbook composition

**File Resolution Strategy**:
- Absolute paths: Used as-is
- Relative paths: Resolved against playbook directory (default: .xe/playbooks)
- Missing files: Return undefined (not error - allows provider chain to continue)

**Provider Registration**:
- Timing: Application startup (CLI entry, test setup)
- Function: `initializeYamlProvider(playbookDirectory?)`
- Default directory: `.xe/playbooks`
- Registry: PlaybookProvider from playbook-definition feature

**Integration with PlaybookRunAction**:
- PlaybookRunAction calls `PlaybookProvider.getInstance().load(name)`
- Registry loops through providers (YAML registered first)
- YamlProvider.supports() checks .yaml/.yml extension
- YamlProvider.load() reads file, transforms via YamlTransformer
- No direct dependency between playbook-actions-controls and playbook-yaml

## Open Questions

1. ✅ **Resolved**: How to handle action value + additional properties merge?
   - **Decision**: Additional properties override action value properties (last-wins)

2. ✅ **Resolved**: Should we support YAML anchors and aliases?
   - **Decision**: Yes, js-yaml supports this by default

3. ✅ **Resolved**: How to version JSON Schema for future changes?
   - **Decision**: Use versioned URL path (v1, v2, etc.) and add `$id` field

4. ⚠️ **Pending**: Should playbook name match filename?
   - **Current**: SHOULD match (recommendation in spec, not requirement)
   - **Action**: Document as best practice, don't enforce

## References

- JSON Schema specification: https://json-schema.org/draft-07/schema
- Ajv documentation: https://ajv.js.org/
- js-yaml documentation: https://github.com/nodeca/js-yaml
