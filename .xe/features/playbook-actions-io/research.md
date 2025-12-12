# Research: Playbook Actions - I/O Operations

## Overview

This feature provides input/output actions for playbook workflows, enabling HTTP API integration and file system operations. The feature implements the `PlaybookAction` interface contract from playbook-definition to ensure consistent execution within the playbook engine.

## Technical Research

### HTTP Client Implementation

**Options Evaluated:**

1. **Node.js native fetch API** (Node 18+)
   - Pros: Modern, promise-based, no dependencies, built-in timeout support
   - Cons: Limited retry logic, requires manual implementation
   - Decision: Use as primary HTTP client

2. **axios library**
   - Pros: Built-in retry, interceptors, automatic JSON transformation
   - Cons: External dependency, larger bundle size
   - Decision: Avoid to minimize dependencies per YAGNI principle

3. **Node.js http/https modules**
   - Pros: No dependencies, maximum control
   - Cons: Low-level API, verbose implementation
   - Decision: Use as fallback if fetch unavailable

**Recommendation:** Use Node.js fetch API with custom retry logic and timeout handling.

### Retry Strategy

**Exponential Backoff Algorithm:**
- Delay = attempt^2 * 1000ms
- Attempts: 0ms, 1s, 4s, 9s, 16s
- Maximum backoff: 30s (configurable)
- Retry conditions: Network errors, 5xx status codes
- No retry: 4xx client errors, successful responses

**Implementation Pattern:**
```typescript
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retries: number,
  shouldRetry: (error: Error) => boolean
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retries || !shouldRetry(error)) {
        throw error;
      }
      const delay = Math.min(attempt ** 2 * 1000, 30000);
      await sleep(delay);
    }
  }
}
```

### Sensitive Data Masking

**Masking Strategy:**
- Pattern: Case-insensitive match on header names
- Keywords: 'authorization', 'token', 'key', 'secret', 'password', 'api-key'
- Replacement: '***'
- Scope: Logs only (original values sent in requests)

**Implementation:**
```typescript
function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const sensitivePattern = /(authorization|token|key|secret|password|api-key)/i;
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      sensitivePattern.test(key) ? '***' : value
    ])
  );
}
```

### File Operations

**Atomic Write Pattern:**
1. Generate temp file path: `{targetPath}.tmp`
2. Write content to temp file
3. Rename temp file to target path (atomic operation)
4. On error: Delete temp file if exists

**Path Validation:**
- Normalize path using `path.normalize()`
- Reject paths containing '..' segments
- Resolve relative paths against CWD
- Validate absolute paths against safe base (if configured)

**Implementation:**
```typescript
import { writeFile, rename, unlink, mkdir } from 'fs/promises';
import { dirname, normalize, join } from 'path';

async function atomicWrite(targetPath: string, content: string): Promise<void> {
  // Validate path
  const normalizedPath = normalize(targetPath);
  if (normalizedPath.includes('..')) {
    throw new CatalystError(
      'Path traversal detected',
      'FileInvalidPath',
      'Remove ".." segments from path'
    );
  }

  const tempPath = `${targetPath}.tmp`;
  try {
    // Ensure parent directory exists
    await mkdir(dirname(targetPath), { recursive: true });

    // Write to temp file
    await writeFile(tempPath, content, 'utf8');

    // Atomic rename
    await rename(tempPath, targetPath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await unlink(tempPath);
    } catch {}
    throw error;
  }
}
```

### Front Matter Processing

**YAML Front Matter Format:**
```markdown
---
key1: value1
key2: value2
---

# Document content
```

**Implementation:**
- Use `js-yaml` library for serialization (already in dependencies)
- Only add front matter to .md files
- Front matter processing occurs after template interpolation and replace operations
- Prepend serialized YAML between '---' delimiters

### Template Interpolation Integration

**Processing Order:**
1. Template engine interpolates `${{expression}}` in config before action execution
2. Action receives fully interpolated config
3. For file-write: Apply replace dictionary to content
4. For file-write: Add front matter (if .md file)

**Note:** Template interpolation is handled by playbook-template-engine feature before action execution. Actions receive pre-processed configuration.

## Error Code Taxonomy

### HTTP Actions
- `HttpConfigInvalid`: Invalid configuration (missing URL, invalid timeout)
- `HttpNetworkError`: Network connectivity issues
- `HttpTimeout`: Request exceeded timeout limit
- `HttpInvalidStatus`: Response status failed validation
- `HttpDnsError`: DNS resolution failed
- `HttpSuccess`: Successful request

### File Actions
- `FileConfigInvalid`: Invalid configuration (missing path)
- `FileNotFound`: File does not exist (read operation)
- `FilePermissionDenied`: Insufficient permissions
- `FileInvalidPath`: Path traversal or invalid path format
- `FileInvalidEncoding`: Unsupported encoding specified
- `FileDiskFull`: Insufficient disk space (write operation)
- `FileReadSuccess`: Successful file read
- `FileWriteSuccess`: Successful file write

## Security Considerations

### HTTP Security
1. **No automatic cookie handling** - Prevents unintended session sharing
2. **No automatic redirects** - Prevents open redirect vulnerabilities
3. **Configurable status validation** - Allows custom security policies
4. **Sensitive header masking** - Prevents credential leakage in logs

### File Security
1. **Path traversal prevention** - Blocks '..' segments
2. **No symlink following** - Prevents directory escape
3. **Atomic writes** - Prevents partial file corruption
4. **Explicit encoding** - Prevents encoding-based attacks

### Template Security
- Template interpolation handled by separate feature (playbook-template-engine)
- Actions receive sanitized values after interpolation
- No action-level template processing to reduce attack surface

## Performance Considerations

### HTTP Performance
- Connection pooling: Inherit from Node.js default agent
- Timeout defaults: 30s (reasonable for API calls)
- Retry backoff: Exponential to avoid thundering herd
- Response streaming: Not required for MVP (handle in future)

### File Performance
- Atomic writes: ~2x overhead vs direct write (acceptable for correctness)
- Directory creation: Cached by OS (minimal overhead)
- Front matter: YAML serialization <10ms for typical objects

## Testing Strategy

### HTTP Actions
1. **Unit Tests:**
   - Config validation (missing URL, invalid timeout)
   - Retry logic with mock failures
   - Timeout enforcement
   - Status code validation
   - Header masking

2. **Integration Tests:**
   - Real HTTP requests to test server
   - Network error handling
   - JSON response parsing
   - Different HTTP methods (GET, POST, PUT, PATCH)

### File Actions
1. **Unit Tests:**
   - Path validation (traversal, normalization)
   - Atomic write pattern
   - Encoding support
   - Front matter generation
   - Replace dictionary processing

2. **Integration Tests:**
   - Real file system operations
   - Permission errors
   - Disk full scenarios (mocked)
   - Concurrent access handling

## Dependencies Analysis

### Required Dependencies
- **Node.js >= 18**: fetch API, fs/promises, path
- **js-yaml**: YAML serialization for front matter (already in project)

### Optional Dependencies
- None required for MVP

### Internal Dependencies
- **playbook-definition**: PlaybookAction, PlaybookActionResult interfaces
- **error-handling**: CatalystError, ErrorPolicy
- **playbook-template-engine**: Template interpolation (runs before actions)

## Implementation Approach

### Phase 1: Core HTTP Actions
1. Implement shared HTTP utilities:
   - Retry logic with exponential backoff
   - Timeout handling
   - Header masking
   - Status validation

2. Implement HTTP actions:
   - HttpGetAction
   - HttpPostAction (extends GET logic)
   - HttpPutAction (reuses POST logic)
   - HttpPatchAction (reuses POST logic)

### Phase 2: File Actions
1. Implement file utilities:
   - Path validation and normalization
   - Atomic write helper
   - Front matter serialization

2. Implement file actions:
   - FileReadAction
   - FileWriteAction (with atomic write, replace, front matter)

### Phase 3: Testing
1. Unit tests for all actions and utilities
2. Integration tests for HTTP and file operations
3. Error handling coverage verification

## Open Questions

**Q: Should we support HTTP DELETE method?**
A: Not in MVP. Can be added if needed based on user feedback. Following YAGNI principle.

**Q: Should file-write support binary content?**
A: Not in MVP. Content parameter is string-only. Binary files can use base64 encoding with proper encoding parameter. Add native binary support if user demand emerges.

**Q: Should we support streaming for large files?**
A: Not in MVP. Load entire file into memory. Add streaming support if performance issues observed with large files (>100MB).

**Q: Should we support custom HTTP client configuration (proxy, certificates)?**
A: Not in MVP. Use Node.js defaults. Add configuration options if enterprise requirements emerge.

**Q: Should file-read support glob patterns?**
A: Not in MVP. Single file operations only. Add glob support in separate action if needed.

## Implementation Priority

1. **P0 (Must Have):**
   - http-get, http-post actions
   - file-read, file-write actions
   - Error handling and retries
   - Security (path validation, header masking)

2. **P1 (Should Have):**
   - http-put, http-patch actions
   - Front matter support
   - Replace dictionary

3. **P2 (Nice to Have):**
   - Custom status validation
   - Multiple encoding support
   - Binary file support

## Success Metrics

- 100% test coverage for error paths
- 90% test coverage for success paths
- HTTP operations <100ms overhead
- File operations <100ms overhead
- Zero security vulnerabilities in code review
