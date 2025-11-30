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

### 3. Primary Value Pattern

**Decision**: Support three value patterns for action property: string/primitive, object, null.

**Alternatives Considered**:

1. **Object only** - All configurations must be objects
   - Pro: Consistent structure
   - Con: Verbose for simple cases (`github-issue-create: { title: 'Title' }`)

2. **String only** - Only support string values
   - Pro: Very concise
   - Con: Not flexible enough for complex actions

3. **Multiple patterns** (chosen)
   - Pro: Concise for simple cases, flexible for complex cases
   - Con: More complex transformation logic

**Rationale**:

- String primary value for common case: `github-issue-create: "Issue Title"`
- Object primary value for complex config: `github-issue-create: { title: "Title", body: "Body" }`
- Null with additional properties: `file-write: ~` + `path: /foo` + `content: bar`
- Optimizes for both simplicity and flexibility
- Transformation layer normalizes to consistent TypeScript interface

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
   - Con: Requires clear interface boundary

**Rationale**:

- playbook-definition provides pure TypeScript interfaces
- playbook-yaml owns all YAML-specific logic (parsing, validation, transformation)
- playbook-engine imports Playbook from playbook-definition
- playbook-engine uses PlaybookLoader from playbook-yaml to load YAML files
- Clear separation: definition → yaml → engine
- Alternative formats can follow same pattern

## Technical Implementation Details

### Step Transformation Algorithm

**Extraction Strategy**: Use reserved property names (`name`, `errorPolicy`) to distinguish metadata from action type. Find first non-reserved key as action type.

**Pros**: Simple, deterministic, works with any action type
**Cons**: Limits reserved property names for future extensions (acceptable trade-off)

### Value Pattern Transformation Logic

Three transformation patterns based on action value type:
- **Null/undefined**: Use only additional properties
- **Object**: Merge with additional properties (last-wins)
- **Primitive**: Add as `value` property, merge additional properties

**Edge Case Handling**: When action value is object AND additional properties exist, additional properties override (last-wins merge).

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

**Challenge**: JSON Schema needs to enforce "exactly one action property per step" while remaining extensible.

**Solution**: Use `oneOf` with required properties for each built-in action type, plus `custom-action` key for extensibility.

**Approach**:
- Define `oneOf` array with object schemas for each built-in action
- Each schema requires specific action key (e.g., `github-issue-create`)
- Include `custom-action` variant for user-defined actions
- Common properties (`name`, `errorPolicy`) allowed in all variants

This approach:
- Enforces exactly one action per step at schema validation time
- Provides IntelliSense for built-in actions
- Allows extensibility via `custom-action` key

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
