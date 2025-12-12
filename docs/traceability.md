# Requirement Traceability

Requirement Traceability provides bidirectional linking between requirements defined in spec files and their implementations in code and tests. This enables teams to track coverage, identify gaps, and ensure all requirements are properly implemented and tested.

## Overview

The traceability system:

- **Parses spec files** to extract requirement definitions from `.xe/features/*/spec.md` and `.xe/initiatives/*/spec.md`
- **Scans source code** for `@req` annotations that link implementations to requirements
- **Scans test files** for `@req` annotations that link tests to requirements
- **Analyzes coverage** to identify implemented, tested, and missing requirements
- **Generates reports** in JSON and terminal formats

## Requirement ID Format

Requirements use a hierarchical ID format:

```
{TYPE}:[{scope}/]{path}
```

### Components

- **TYPE**: Requirement type
  - `FR`: Functional Requirement
  - `NFR`: Non-Functional Requirement
  - `REQ`: General Requirement

- **scope**: Feature or initiative ID (kebab-case)
  - Used in code annotations to identify which feature the requirement belongs to
  - Derived from directory name (e.g., `.xe/features/auth/` → scope: `auth`)

- **path**: Hierarchical requirement path
  - Dot-separated segments (e.g., `auth.session.expiry`)
  - Maximum 5 levels deep

### Examples

```
FR:auth.session.expiry       # Short-form (in spec files)
FR:auth/session.expiry       # Qualified form (in code annotations)
NFR:performance/response.time
REQ:setup/config.validation
```

## Spec File Format

Define requirements in your `spec.md` files using this format:

```markdown
## Requirements

### Functional Requirements

- **FR:auth.login**: Users MUST be able to log in with email and password
- **FR:auth.session**: Session management requirements
  - **FR:auth.session.expiry**: Sessions MUST expire after 90 minutes
  - **FR:auth.session.refresh**: [deferred] Sessions MAY be refreshed

### Non-functional Requirements

- **NFR:perf.response**: API responses SHOULD complete in under 200ms
```

### Requirement States

- **active** (default): Requirement is in scope for implementation
- **deferred**: Intentionally not implementing this phase
  - Format: `- **FR:path**: [deferred] Description`
- **deprecated**: Superseded by another requirement
  - Format: `- ~~**FR:old**~~: [deprecated: FR:new] Description`

## Code Annotations

Add `@req` annotations in comments to link code to requirements:

### TypeScript/JavaScript

```typescript
// @req FR:auth/session.expiry
export function checkSessionExpiry(session: Session): boolean {
  const maxAge = 90 * 60 * 1000; // 90 minutes
  return Date.now() - session.createdAt > maxAge;
}

/**
 * Validates user credentials.
 * @req FR:auth/login
 */
async function validateCredentials(email: string, password: string) {
  // Implementation
}
```

### Multiple Requirements

```typescript
// @req FR:auth/session.expiry
// @req FR:auth/session.validation
function validateSession(token: string): boolean {
  // Implementation handles both requirements
}

// Alternative: comma-separated (less readable)
// @req FR:auth/session.expiry, FR:auth/session.validation
```

### Partial Implementation

For code that contributes to but doesn't fully implement a requirement:

```typescript
// @req:partial FR:auth/oauth
function validateOAuthToken(token: string): boolean {
  // Only handles token validation, not the full OAuth flow
}
```

### Python

```python
# @req FR:auth/session.expiry
def check_session_expiry(session: dict) -> bool:
    max_age = 90 * 60  # 90 minutes
    return time.time() - session["created_at"] > max_age
```

### Test Files

```typescript
describe('Session validation', () => {
  // @req FR:auth/session.expiry
  it('should reject expired sessions', () => {
    // Test implementation
  });
});
```

## Task References

Link tasks to requirements in `tasks.md`:

```markdown
- [ ] T001: Implement session expiry
  - @req FR:session.expiry
  - @req FR:session.validation
  - Add timeout logic
  - Write unit tests
```

- Use **short-form IDs** for same-feature requirements
- Use **qualified IDs** for cross-feature references

## Usage

### Programmatic API

```typescript
import {
  SpecParser,
  AnnotationScanner,
  TaskParser,
  CoverageAnalyzer,
  generateJsonReport,
  generateTerminalReport,
} from './src/traceability';

// Parse requirements from specs
const specParser = new SpecParser();
const requirements = await specParser.parseDirectory('.xe/features/');

// Scan source code for annotations
const scanner = new AnnotationScanner();
const annotations = await scanner.scanDirectory('src/', {
  exclude: ['**/node_modules/**', '**/dist/**'],
  testDirs: ['tests/', '__tests__/'],
  respectGitignore: true,
});

// Parse task references (optional)
const taskParser = new TaskParser();
const tasks = await taskParser.parseDirectory('.xe/features/');

// Analyze coverage
const analyzer = new CoverageAnalyzer();
const report = analyzer.analyze(requirements, annotations, tasks);

// Generate reports
console.log(generateTerminalReport(report));
await fs.writeFile('traceability.json', generateJsonReport(report));
```

## Configuration

Configure traceability in `.xe/config/catalyst.json`:

```json
{
  "traceability": {
    "scan": {
      "exclude": ["**/node_modules/**", "**/dist/**"],
      "testDirs": ["tests/", "__tests__/"],
      "respectGitignore": true
    },
    "thresholds": {
      "implementation": 80,
      "test": 70
    },
    "featureDirs": [".xe/features/", ".xe/initiatives/"],
    "srcDirs": ["src/"]
  }
}
```

## Coverage Statuses

Each requirement is assigned a coverage status:

| Status | Description |
|--------|-------------|
| `tested` | Has test annotation(s) |
| `implemented` | Has code annotation(s), no tests |
| `implemented-partial` | Has only partial implementation annotations |
| `missing` | Active requirement with no annotations |
| `deferred` | Spec state is deferred |
| `deprecated` | Spec state is deprecated |

## Report Output

### Terminal Report

```
Requirement Traceability Report
================================
Total requirements: 45 (43 active, 2 deferred)

Coverage (of active requirements):
  Implemented: 38 (88%)
  Tested: 35 (81%)
  Planned: 31 (72%)
  Missing: 5

Orphaned annotations: 1
Tasks without requirements: 3

Missing requirements (gaps):
  - FR:auth/oauth (.xe/features/auth/spec.md:92)
  ...
```

### JSON Report

See [spec.md](../.xe/features/req-traceability/spec.md) for the complete JSON schema.

## Best Practices

1. **Use meaningful requirement paths** - `FR:auth.session.expiry` is better than `FR:001`
2. **Place @req near the implementing code** - At function/class level, not file level
3. **One @req per line** - Easier to review in diffs
4. **Keep IDs stable** - Avoid renaming once assigned
5. **Use qualified IDs in code** - Always include the feature scope
6. **Mark deferred requirements** - Don't leave gaps unexplained
7. **Test your requirements** - Aim for high test coverage
