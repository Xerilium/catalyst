# Implementation Plan: Playbook Actions - I/O Operations

## Overview

Implement I/O actions for playbook workflows including HTTP requests (GET, POST, PUT, PATCH) and file operations (read, write) following the playbook-definition action interface contract.

## Implementation Phases

### Phase 1: Project Setup and Infrastructure

**Tasks:**

1. **Create feature directory structure**
   - Create `src/playbooks/scripts/playbooks/actions/io/` directory
   - Create subdirectories: `http/`, `file/`, `utils/`

2. **Define TypeScript interfaces**
   - Create `src/playbooks/scripts/playbooks/actions/io/types.ts`
   - Define config interfaces: `HttpGetConfig`, `HttpPostConfig`, `HttpPutConfig`, `HttpPatchConfig`
   - Define config interfaces: `FileReadConfig`, `FileWriteConfig`
   - Export all types from `src/playbooks/scripts/playbooks/actions/io/index.ts`

3. **Set up test infrastructure**
   - Create `tests/playbooks/actions/io/` directory
   - Create test utilities for mocking HTTP and file operations

**Acceptance Criteria:**
- Directory structure matches feature organization
- All TypeScript interfaces compile without errors
- Test directory structure mirrors implementation

**Estimated Effort:** 1 hour

---

### Phase 2: HTTP Utilities

**Tasks:**

1. **Implement retry logic with exponential backoff**
   - Create `src/playbooks/scripts/playbooks/actions/io/utils/retry.ts`
   - Function: `executeWithRetry<T>(operation, retries, shouldRetry): Promise<T>`
   - Exponential backoff: attempt^2 * 1000ms, max 30s
   - Unit tests: Success, failure, retry exhaustion, backoff timing

2. **Implement timeout handling**
   - Create `src/playbooks/scripts/playbooks/actions/io/utils/timeout.ts`
   - Function: `withTimeout<T>(promise, timeoutMs): Promise<T>`
   - Throw CatalystError with code 'HttpTimeout' on timeout
   - Unit tests: Success within timeout, timeout exceeded

3. **Implement header masking**
   - Create `src/playbooks/scripts/playbooks/actions/io/utils/masking.ts`
   - Function: `maskSensitiveHeaders(headers): Record<string, string>`
   - Mask patterns: authorization, token, key, secret, password (case-insensitive)
   - Unit tests: Masking various header names, preserve non-sensitive headers

4. **Implement status validation**
   - Create `src/playbooks/scripts/playbooks/actions/io/utils/validation.ts`
   - Function: `defaultStatusValidator(status): boolean` (200-299)
   - Function: `validateResponseStatus(status, validator): void`
   - Throw CatalystError with code 'HttpInvalidStatus' on invalid status
   - Unit tests: Default validation, custom validation, error cases

**Acceptance Criteria:**
- All utility functions have 100% test coverage
- Functions throw CatalystError with appropriate codes
- Retry backoff timing verified with test spies

**Estimated Effort:** 3 hours

---

### Phase 3: HTTP Actions Implementation

**Tasks:**

1. **Implement HTTP base class**
   - Create `src/playbooks/scripts/playbooks/actions/io/http/base-http-action.ts`
   - Abstract class: `HttpActionBase<TConfig> implements PlaybookAction<TConfig>`
   - Implement all shared HTTP functionality:
     - Request execution using Node.js fetch API
     - Retry logic with exponential backoff
     - Timeout enforcement
     - Header masking (sensitive data)
     - Status validation
     - Response parsing (JSON detection)
     - Error handling and mapping
     - Body serialization for POST/PUT/PATCH
   - Subclasses define readonly properties: `method: string`, `actionName: string`
   - Unit tests: All base class functionality (retry, timeout, masking, error handling)

2. **Implement HTTP GET action**
   - Create `src/playbooks/scripts/playbooks/actions/io/http/get-action.ts`
   - Class: `HttpGetAction extends HttpActionBase<HttpGetConfig>`
   - Define readonly `method` property as 'GET'
   - Define readonly `actionName` property as 'http-get'
   - Lightweight implementation (~10-15 lines)
   - Unit tests: Verify method and action name
   - Integration tests: Real HTTP GET requests

3. **Implement HTTP POST action**
   - Create `src/playbooks/scripts/playbooks/actions/io/http/post-action.ts`
   - Class: `HttpPostAction extends HttpActionBase<HttpPostConfig>`
   - Define readonly `method` property as 'POST'
   - Define readonly `actionName` property as 'http-post'
   - Lightweight implementation (~10-15 lines)
   - Unit tests: Verify method and action name
   - Integration tests: Real HTTP POST requests with body

4. **Implement HTTP PUT action**
   - Create `src/playbooks/scripts/playbooks/actions/io/http/put-action.ts`
   - Class: `HttpPutAction extends HttpActionBase<HttpPutConfig>`
   - Define readonly `method` property as 'PUT'
   - Define readonly `actionName` property as 'http-put'
   - Lightweight implementation (~10-15 lines)
   - Unit tests: Verify method and action name
   - Integration tests: Real HTTP PUT requests

5. **Implement HTTP PATCH action**
   - Create `src/playbooks/scripts/playbooks/actions/io/http/patch-action.ts`
   - Class: `HttpPatchAction extends HttpActionBase<HttpPatchConfig>`
   - Define readonly `method` property as 'PATCH'
   - Define readonly `actionName` property as 'http-patch'
   - Lightweight implementation (~10-15 lines)
   - Unit tests: Verify method and action name
   - Integration tests: Real HTTP PATCH requests

**Acceptance Criteria:**
- Base class contains all shared HTTP logic (no duplication in subclasses)
- All HTTP actions are lightweight wrappers (~10-15 lines each)
- Retry logic works for 5xx errors but not 4xx errors
- Sensitive headers masked in all log output
- JSON response parsing works when Content-Type is application/json
- Body serialization works for POST/PUT/PATCH (handled by base class)
- All error codes documented and tested

**Estimated Effort:** 5 hours (reduced from 6 due to base class reducing duplication)

---

### Phase 4: File Utilities

**Tasks:**

1. **Implement path validation**
   - Create `src/playbooks/scripts/playbooks/actions/io/utils/path-validation.ts`
   - Function: `validatePath(path): string` (returns normalized path)
   - Reject paths with '..' segments
   - Normalize paths before validation
   - Resolve relative paths against CWD
   - Throw CatalystError with code 'FileInvalidPath' for invalid paths
   - Unit tests: Valid paths, traversal attempts, normalization, relative paths

2. **Implement atomic write**
   - Create `src/playbooks/scripts/playbooks/actions/io/utils/atomic-write.ts`
   - Function: `atomicWrite(path, content, encoding): Promise<void>`
   - Write to temp file, then rename (atomic)
   - Create parent directories if needed
   - Clean up temp file on error
   - Unit tests: Success, write error, rename error, cleanup
   - Integration tests: Real file system operations

3. **Implement front matter serialization**
   - Create `src/playbooks/scripts/playbooks/actions/io/utils/front-matter.ts`
   - Function: `addFrontMatter(content, frontMatter): string`
   - Serialize frontMatter to YAML
   - Prepend between '---' delimiters
   - Only process for .md files
   - Unit tests: Front matter addition, non-.md files

**Acceptance Criteria:**
- Path validation prevents all traversal attacks
- Atomic writes never leave partial files
- Temp files cleaned up on all error paths
- Front matter serialization produces valid YAML

**Estimated Effort:** 3 hours

---

### Phase 5: File Actions Implementation

**Tasks:**

1. **Implement File Read action**
   - Create `src/playbooks/scripts/playbooks/actions/io/file/read-action.ts`
   - Class: `FileReadAction implements PlaybookAction<FileReadConfig>`
   - Method: `async execute(config): Promise<PlaybookActionResult>`
   - Use fs/promises for file operations
   - Validate path before reading
   - Support multiple encodings
   - Handle all error cases (not found, permission, invalid encoding)
   - Unit tests: Success, file not found, permission denied, invalid path, encodings
   - Integration tests: Real file reads with different encodings

2. **Implement File Write action**
   - Create `src/playbooks/scripts/playbooks/actions/io/file/write-action.ts`
   - Class: `FileWriteAction implements PlaybookAction<FileWriteConfig>`
   - Use atomic write utility
   - Process content: template interpolation -> replace -> front matter
   - Note: Template interpolation happens before action execution
   - Apply replace dictionary if provided
   - Add front matter if .md file and frontMatter provided
   - Handle all error cases (permission, invalid path, disk full)
   - Unit tests: Success, replace, front matter, errors, atomic write
   - Integration tests: Real file writes with all features

**Acceptance Criteria:**
- File read handles all encoding types correctly
- File write produces atomic writes in all cases
- Replace dictionary applied correctly
- Front matter only added to .md files
- Processing order: replace -> front matter
- All error cases return CatalystError with appropriate codes

**Estimated Effort:** 4 hours

---

### Phase 6: Integration and Action Registration

**Tasks:**

1. **Create action registry exports**
   - Create `src/playbooks/scripts/playbooks/actions/io/index.ts`
   - Export all action classes
   - Export all config interfaces
   - Export action registration metadata

2. **Document action usage**
   - Add JSDoc to all action classes
   - Include TypeScript usage examples
   - Document error codes and handling

3. **Integration with playbook engine**
   - Verify actions work with playbook engine execution
   - Test template interpolation in config properties
   - Test error policy integration

**Acceptance Criteria:**
- All actions exported from feature index
- Actions integrate seamlessly with playbook engine
- Template interpolation works in all config properties
- Error policies applied correctly

**Estimated Effort:** 2 hours

---

### Phase 7: Testing and Quality Assurance

**Tasks:**

1. **Achieve test coverage targets**
   - 100% coverage for error handling paths
   - 90% coverage for success paths
   - Add missing test cases identified by coverage report

2. **Error handling verification**
   - Verify all error codes documented
   - Verify all errors include actionable guidance
   - Test error chaining and cause preservation

3. **Performance testing**
   - Verify HTTP overhead <100ms
   - Verify file read overhead <50ms
   - Verify file write overhead <100ms
   - Verify retry backoff timing

4. **Security review**
   - Verify path traversal prevention
   - Verify header masking in logs
   - Verify no credential leakage
   - Review atomic write cleanup

**Acceptance Criteria:**
- Test coverage meets targets (100% error, 90% success)
- All performance targets met
- Security review complete with no issues
- All error codes documented

**Estimated Effort:** 3 hours

---

### Phase 8: Documentation and Examples

**Tasks:**

1. **Create feature documentation**
   - Document all action types and their configs
   - Provide TypeScript examples for each action
   - Document error codes and recovery strategies
   - Document security considerations

2. **Create integration examples**
   - Example: API integration workflow
   - Example: File generation workflow
   - Example: Error handling patterns

3. **Update feature status**
   - Update spec.md with implementation notes
   - Mark feature as implemented
   - Document any deviations from spec

**Acceptance Criteria:**
- All actions documented with examples
- Error handling patterns documented
- Integration examples provided

**Estimated Effort:** 2 hours

---

## Total Estimated Effort

- Phase 1: 1 hour
- Phase 2: 3 hours
- Phase 3: 5 hours
- Phase 4: 3 hours
- Phase 5: 4 hours
- Phase 6: 2 hours
- Phase 7: 3 hours
- Phase 8: 2 hours

**Total: 23 hours (~3 days)**

## Implementation Order

1. Phase 1: Setup (blocking all other phases)
2. Phase 2 & 4: Utilities (can be parallel)
3. Phase 3 & 5: Actions (depends on utilities)
4. Phase 6: Integration (depends on actions)
5. Phase 7: Testing (continuous throughout)
6. Phase 8: Documentation (after implementation complete)

## Risk Mitigation

**Risk: Template interpolation integration unclear**
- Mitigation: Review playbook-template-engine implementation first
- Fallback: Implement basic interpolation in actions if needed

**Risk: Atomic write performance on slow file systems**
- Mitigation: Add performance tests early
- Fallback: Make atomic write optional if performance issues observed

**Risk: HTTP retry logic too aggressive**
- Mitigation: Make retry count and backoff configurable
- Fallback: Reduce default retry count if issues observed

## Success Criteria

- All functional requirements from spec.md implemented
- Test coverage: 100% error paths, 90% success paths
- Performance: HTTP <100ms, file read <50ms, file write <100ms overhead
- Security: Zero vulnerabilities in code review
- All actions integrate with playbook engine without issues

## Dependencies

**Blocking:**
- playbook-definition feature (implemented)
- error-handling feature (implemented)

**Non-blocking:**
- playbook-template-engine (for template interpolation)
- playbook-yaml (for YAML playbook parsing)

## Implementation Notes

- Follow single responsibility principle for all classes
- Extract shared utilities to reduce duplication
- Use TypeScript for type safety on all config interfaces
- Include JSDoc on all public APIs
- Write tests before implementation (TDD approach recommended)
- Ensure all errors include actionable guidance
