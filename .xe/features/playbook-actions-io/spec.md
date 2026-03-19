---
id: playbook-actions-io
title: Playbook Actions - I/O Operations
author: "@flanakin"
description: "Input/output actions for playbook workflows including HTTP requests and file operations"
dependencies:
  - playbook-definition
  - error-handling
---

# Feature: Playbook Actions - I/O Operations

## Problem

Playbooks need to interact with external systems through HTTP APIs and perform file operations. Without proper I/O capabilities, playbooks cannot integrate with web services or manage local file resources effectively.

## Goals

- Enable playbook authors to integrate with external systems and services via HTTP requests
- Provide secure and reliable file system operations within playbook workflows
- Support complex data exchange patterns between playbooks and external APIs with proper error handling

## Scenario

- As a **playbook author**, I need to call external APIs to fetch or send data
  - Outcome: HTTP actions provide comprehensive API integration with proper error handling and retry logic

- As a **playbook author**, I need to read configuration files and templates from the file system
  - Outcome: `file-read` action safely accesses local resources with path validation and encoding support

- As a **playbook author**, I need to persist generated artifacts and results to disk
  - Outcome: `file-write` action atomically creates outputs with template support and automatic directory creation

## Success Criteria

- 98% of HTTP requests complete successfully with proper error handling and automatic retry
- File operations maintain data integrity in 100% of concurrent access scenarios via atomic writes
- Sensitive data (Authorization headers, API keys) is masked in logs for 100% of requests
- Average file operation latency remains under 100ms for files <1MB

## Requirements

### Functional Requirements

**FR:http.base-class**: HTTP Action Base Class

- **FR:http.base-class.abstract-implementation**: System MUST provide abstract `HttpActionBase<TConfig>` class implementing shared HTTP functionality
  - Base class handles all common HTTP operations (request execution, retry, timeout, error handling)
  - Subclasses define readonly `method: string` property to specify HTTP method (GET, POST, PUT, PATCH)
  - Subclasses define static readonly `actionType: string` property to specify action type identifier

- **FR:http.base-class.config-interface**: Base class MUST define base config interface `HttpBaseConfig`:
  - `url` (string, required): Target endpoint URL (supports template interpolation)
  - `headers` (Record<string, string>, optional): Request headers as key-value pairs
  - `timeout` (number, optional): Request timeout in milliseconds (default: 30000)
  - `retries` (number, optional): Number of retry attempts on failure (default: 3)
  - `validateStatus` ((status: number) => boolean, optional): Function to validate response status codes (default: status >= 200 && status < 300)

- **FR:http.base-class.request-execution**: Base class MUST execute HTTP requests using Node.js fetch API or http/https modules
  - URL MUST support template interpolation before request execution
  - Headers MUST be sent as-is with no modifications except for default User-Agent
  - Request MUST include default User-Agent: 'Catalyst-Playbook/1.0'
  - Request MUST respect timeout configuration
  - HTTP method determined by subclass `method` property

- **FR:http.base-class.timeout-enforcement**: Base class MUST enforce timeout limits
  - Request MUST abort if timeout is exceeded
  - Timeout errors MUST throw CatalystError with code 'HttpTimeout'
  - Default timeout MUST be 30000ms (30 seconds)

- **FR:http.base-class.retry-logic**: Base class MUST implement retry logic with exponential backoff
  - Retries MUST only occur for network errors and 5xx status codes
  - Backoff delay MUST be: attempt^2 * 1000ms (1s, 4s, 9s, 16s...)
  - Maximum retry count MUST be configurable via `retries` property
  - Default retry count MUST be 3

- **FR:http.base-class.result-format**: Base class MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status including status code
  - `value`: Object with `status` (number), `headers` (Record<string, string>), `body` (string), `bodyAsJson` (unknown, only if Content-Type is application/json)
  - `error`: CatalystError if request failed, null otherwise

- **FR:http.base-class.error-handling**: Base class MUST handle request errors
  - Network errors MUST result in error with code 'HttpNetworkError'
  - Timeout errors MUST result in error with code 'HttpTimeout'
  - Invalid status codes (per validateStatus) MUST result in error with code 'HttpInvalidStatus'
  - DNS resolution errors MUST result in error with code 'HttpDnsError'
  - All errors MUST include response body in error guidance for debugging (if available)

- **FR:http.base-class.header-masking**: Base class MUST mask sensitive headers in logs
  - Headers with names containing 'authorization', 'token', 'key', 'secret', 'password' (case-insensitive) MUST be masked
  - Masked values MUST be replaced with '***' in all log output
  - Original values MUST still be sent in actual requests

**FR:http.request-bodies**: HTTP Actions with Request Bodies

- **FR:http.request-bodies.config-interface**: System MUST define `HttpBodyConfig` interface extending `HttpBaseConfig`:
  - All properties from `HttpBaseConfig`
  - `body` (string | Record<string, unknown>, optional): Request payload as string or object
  - `contentType` (string, optional): Content-Type header override (default: 'application/json' if body is object, 'text/plain' if body is string)

- **FR:http.request-bodies.serialization**: Base class MUST handle request body serialization for POST/PUT/PATCH:
  - Body object MUST be automatically serialized to JSON if Content-Type is 'application/json'
  - Body string MUST be sent as-is with specified Content-Type
  - Content-Type header MUST default to 'application/json' for object bodies, 'text/plain' for string bodies

**FR:http.get-action**: HTTP GET Action

- **FR:http.get-action.implementation**: System MUST provide `HttpGetAction` class extending `HttpActionBase<HttpGetConfig>`
  - Config type: `HttpGetConfig` interface (same as `HttpBaseConfig`)
  - Define readonly `method` property as 'GET'
  - Define readonly `actionName` property as 'http-get'

**FR:http.post-action**: HTTP POST Action

- **FR:http.post-action.implementation**: System MUST provide `HttpPostAction` class extending `HttpActionBase<HttpPostConfig>`
  - Config type: `HttpPostConfig` interface (same as `HttpBodyConfig`)
  - Define readonly `method` property as 'POST'
  - Define readonly `actionName` property as 'http-post'

**FR:http.put-action**: HTTP PUT Action

- **FR:http.put-action.implementation**: System MUST provide `HttpPutAction` class extending `HttpActionBase<HttpPutConfig>`
  - Config type: `HttpPutConfig` interface (same as `HttpBodyConfig`)
  - Define readonly `method` property as 'PUT'
  - Define readonly `actionName` property as 'http-put'

**FR:http.patch-action**: HTTP PATCH Action

- **FR:http.patch-action.implementation**: System MUST provide `HttpPatchAction` class extending `HttpActionBase<HttpPatchConfig>`
  - Config type: `HttpPatchConfig` interface (same as `HttpBodyConfig`)
  - Define readonly `method` property as 'PATCH'
  - Define readonly `actionName` property as 'http-patch'

**FR:file.read-action**: File Read Action

- **FR:file.read-action.implementation**: System MUST provide `file-read` action implementing `PlaybookAction<FileReadConfig>`
  - Config type: `FileReadConfig` interface with the following properties:
    - `path` (string, required): File path to read (supports template interpolation)
    - `encoding` (string, optional): File encoding - 'utf8', 'utf-8', 'ascii', 'base64', 'binary', 'hex' (default: 'utf8')

- **FR:file.read-action.file-reading**: `file-read` action MUST read file contents using Node.js fs module
  - Path MUST support template interpolation before file access
  - Path MUST be validated to prevent directory traversal attacks (no '..' segments allowed)
  - Relative paths MUST be resolved against current working directory
  - File MUST exist or error with code 'FileNotFound'

- **FR:file.read-action.result-format**: `file-read` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status
  - `value`: File contents as string (using specified encoding)
  - `error`: CatalystError if read failed, null otherwise

- **FR:file.read-action.error-handling**: `file-read` action MUST handle file access errors
  - Missing files MUST result in error with code 'FileNotFound'
  - Permission errors MUST result in error with code 'FilePermissionDenied'
  - Invalid path (directory traversal) MUST result in error with code 'FileInvalidPath'
  - Invalid encoding MUST result in error with code 'FileInvalidEncoding'
  - All errors MUST include file path in error guidance

**FR:file.write-action**: File Write Action

- **FR:file.write-action.implementation**: System MUST provide `file-write` action implementing `PlaybookAction<FileWriteConfig>`
  - Config type: `FileWriteConfig` interface with the following properties:
    - `path` (string, required): File path to write (supports template interpolation)
    - `content` (string, required): Content to write (supports template interpolation)
    - `encoding` (string, optional): File encoding (default: 'utf8')
    - `frontMatter` (Record<string, unknown>, optional): YAML front matter to prepend (only for .md files)
    - `replace` (Record<string, string>, optional): Simple find/replace dictionary applied to content before writing

- **FR:file.write-action.atomic-write**: `file-write` action MUST write file contents using atomic write pattern
  - Write MUST first create temporary file with '.tmp' extension in same directory
  - Temporary file MUST then be renamed to target path (atomic operation)
  - Parent directories MUST be created automatically if they don't exist
  - Path MUST support template interpolation before file access
  - Path MUST be validated to prevent directory traversal attacks (no '..' segments allowed)
  - Relative paths MUST be resolved against current working directory

- **FR:file.write-action.content-processing**: `file-write` action MUST process content before writing
  - Template interpolation MUST occur first (if content contains template expressions)
  - Replace dictionary MUST be applied after template interpolation (if provided)
  - Front matter MUST be added after replace (if provided and file extension is .md)
  - Front matter format: YAML between '---' delimiters at file start

- **FR:file.write-action.result-format**: `file-write` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status including bytes written
  - `value`: Object with `path` (string), `bytesWritten` (number)
  - `error`: CatalystError if write failed, null otherwise

- **FR:file.write-action.error-handling**: `file-write` action MUST handle file write errors
  - Permission errors MUST result in error with code 'FilePermissionDenied'
  - Invalid path (directory traversal) MUST result in error with code 'FileInvalidPath'
  - Disk full errors MUST result in error with code 'FileDiskFull'
  - Invalid encoding MUST result in error with code 'FileInvalidEncoding'
  - All errors MUST include file path in error guidance
  - Failed atomic writes MUST clean up temporary files

**FR:file.exists-action**: File Exists Action

- **FR:file.exists-action.implementation**: System MUST provide `file-exists` action implementing `PlaybookAction<FileExistsConfig>`
  - Config type: `FileExistsConfig` interface with the following properties:
    - `path` (string, required): File path to check (supports template interpolation)

- **FR:file.exists-action.check**: `file-exists` action MUST check file existence using Node.js fs module
  - Path MUST support template interpolation before file access
  - Path MUST be validated to prevent directory traversal attacks (no '..' segments allowed)
  - Relative paths MUST be resolved against current working directory
  - Action MUST NOT throw errors for non-existent files (that's the expected use case)

- **FR:file.exists-action.result-format**: `file-exists` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' always (checking existence is always successful)
  - `message`: Human-readable status indicating whether file exists
  - `value`: boolean - `true` if file exists, `false` if not
  - `error`: undefined (never errors for non-existent files)

- **FR:file.exists-action.error-handling**: `file-exists` action MUST handle path validation errors
  - Invalid path (directory traversal) MUST result in error with code 'FileInvalidPath'
  - Permission errors when checking existence MUST result in error with code 'FilePermissionDenied'

**FR:file.delete-action**: File Delete Action

- **FR:file.delete-action.implementation**: System MUST provide `file-delete` action implementing `PlaybookAction<FileDeleteConfig>`
  - Config type: `FileDeleteConfig` interface with the following properties:
    - `path` (string, required): File path to delete (supports template interpolation)

- **FR:file.delete-action.deletion**: `file-delete` action MUST delete file using Node.js fs module
  - Path MUST support template interpolation before file access
  - Path MUST be validated to prevent directory traversal attacks (no '..' segments allowed)
  - Relative paths MUST be resolved against current working directory
  - File MUST exist or error with code 'FileNotFound'

- **FR:file.delete-action.result-format**: `file-delete` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable status indicating file was deleted
  - `value`: boolean - `true` if file was deleted
  - `error`: CatalystError if delete failed, undefined otherwise

- **FR:file.delete-action.error-handling**: `file-delete` action MUST handle file deletion errors
  - Missing files MUST result in error with code 'FileNotFound'
  - Permission errors MUST result in error with code 'FilePermissionDenied'
  - Invalid path (directory traversal) MUST result in error with code 'FileInvalidPath'
  - All errors MUST include file path in error guidance

**FR:log**: Logging Actions

- **FR:log.base-config**: All log actions MUST use `LogConfig` interface:
  - `message` (string, required): Message to log (supports template interpolation)
  - `source` (string, optional): Component doing the logging (defaults to playbook name via `getVariable('playbook.name')`, falls back to "Playbook")
  - `action` (string, optional): Operation being performed (defaults to "Playbook" when omitted)
  - `data` (Record<string, unknown>, optional): Structured data to include with log entry

- **FR:log.error-action**: System MUST provide `log-error` action
  - Writes message to stderr using `console.error()`
  - Does NOT terminate playbook execution (use `throw` action for that)
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.warning-action**: System MUST provide `log-warning` action
  - Writes message to stderr using `console.warn()`
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.info-action**: System MUST provide `log-info` action
  - Writes message to stdout using `console.info()`
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.verbose-action**: System MUST provide `log-verbose` action
  - Writes message to stdout using `console.log()`
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.debug-action**: System MUST provide `log-debug` action
  - Writes message to stdout using `console.debug()`
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.trace-action**: System MUST provide `log-trace` action
  - Writes message to stdout using `console.log()`
  - Intended for telemetry and detailed execution tracing
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.primary-property**: All log actions MUST support shorthand syntax via `message` as primary property
  - Enables: `log-info: "Processing {{item-name}}"` instead of full config object

**FR:security**: Security and Safety

- **FR:security.config-validation**: All actions MUST validate configuration before execution
  - Missing required properties MUST throw CatalystError with code 'HttpConfigInvalid' or 'FileConfigInvalid'
  - Invalid timeout values (<0) MUST throw CatalystError with code 'HttpConfigInvalid'
  - Invalid URL format MUST throw CatalystError with code 'HttpConfigInvalid'

- **FR:security.http-data-masking**: HTTP actions MUST mask sensitive data in logs (handled by base class)
  - Authorization headers MUST be masked as '***'
  - Headers containing 'token', 'key', 'secret', 'password' (case-insensitive) MUST be masked
  - Query parameters containing 'token', 'key', 'secret', 'password' MUST be masked in URLs

- **FR:security.path-traversal-prevention**: File actions MUST prevent path traversal attacks
  - Paths containing '..' segments MUST be rejected
  - Paths MUST be normalized before validation
  - Absolute paths MUST be allowed but validated against safe base directory (if configured)

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.http-overhead**: HTTP request overhead (excluding network time) MUST be <100ms
- **NFR:performance.file-read-overhead**: File read overhead (excluding disk I/O) MUST be <50ms
- **NFR:performance.file-write-overhead**: File write overhead (excluding disk I/O) MUST be <100ms (includes atomic write)
- **NFR:performance.retry-backoff-limit**: Retry backoff MUST not exceed 30 seconds between attempts

**NFR:reliability**: Reliability

- **NFR:reliability.atomic-writes**: File writes MUST be atomic to prevent corruption on crash
- **NFR:reliability.exponential-backoff**: HTTP retries MUST use exponential backoff to avoid overwhelming servers
- **NFR:reliability.temp-file-cleanup**: Failed atomic writes MUST clean up temporary files
- **NFR:reliability.error-guidance**: Error messages MUST include actionable guidance for all error scenarios

**NFR:testability**: Testability

- **NFR:testability.isolation**: All actions MUST be testable in isolation with mock HTTP clients and file systems
- **NFR:testability.retry-verification**: Retry behavior MUST be verifiable with test doubles
- **NFR:testability.error-coverage**: 100% code coverage for error handling paths
- **NFR:testability.success-coverage**: 90% code coverage for success paths

**NFR:maintainability**: Maintainability

- **NFR:maintainability.single-responsibility**: Action implementations MUST follow single responsibility principle
- **NFR:maintainability.error-codes**: Error codes MUST be well-documented and consistent
- **NFR:maintainability.type-safety**: Configuration interfaces MUST use TypeScript for type safety
- **NFR:maintainability.shared-logic**: Shared logic (retry, timeout, masking) MUST be extracted to utility functions

## Key Entities

**Entities owned by this feature:**

- **HttpBaseConfig**: Base configuration interface for all HTTP actions
  - Properties: url, headers, timeout, retries, validateStatus
  - Used by HttpGetConfig and extended by HttpBodyConfig

- **HttpBodyConfig**: Configuration interface for HTTP actions with request bodies
  - Extends HttpBaseConfig with: body, contentType
  - Used by HttpPostConfig, HttpPutConfig, HttpPatchConfig

- **HttpGetConfig**: Configuration interface for `http-get` action
  - Type alias for HttpBaseConfig
  - Used to configure HTTP GET requests within playbooks

- **HttpPostConfig**: Configuration interface for `http-post` action
  - Type alias for HttpBodyConfig
  - Used to configure HTTP POST requests within playbooks

- **HttpPutConfig**: Configuration interface for `http-put` action
  - Type alias for HttpBodyConfig
  - Used to configure HTTP PUT requests within playbooks

- **HttpPatchConfig**: Configuration interface for `http-patch` action
  - Type alias for HttpBodyConfig
  - Used to configure HTTP PATCH requests within playbooks

- **FileReadConfig**: Configuration interface for `file-read` action
  - Properties: path, encoding
  - Used to configure file read operations within playbooks

- **FileWriteConfig**: Configuration interface for `file-write` action
  - Properties: path, content, encoding, frontMatter, replace
  - Used to configure file write operations within playbooks

- **HttpActionBase**: Abstract base class for all HTTP actions
  - Implements all shared HTTP functionality (request execution, retry, timeout, error handling, header masking)
  - Subclasses define readonly `method` and `actionName` properties
  - Handles body serialization for POST/PUT/PATCH methods
  - Reduces code duplication across HTTP action implementations

- **HttpGetAction**: Implementation of `PlaybookAction<HttpGetConfig>`
  - Extends HttpActionBase with method='GET' and actionName='http-get'
  - Lightweight wrapper (only defines method and actionName properties)

- **HttpPostAction**: Implementation of `PlaybookAction<HttpPostConfig>`
  - Extends HttpActionBase with method='POST' and actionName='http-post'
  - Lightweight wrapper (only defines method and actionName properties)

- **HttpPutAction**: Implementation of `PlaybookAction<HttpPutConfig>`
  - Extends HttpActionBase with method='PUT' and actionName='http-put'
  - Lightweight wrapper (only defines method and actionName properties)

- **HttpPatchAction**: Implementation of `PlaybookAction<HttpPatchConfig>`
  - Extends HttpActionBase with method='PATCH' and actionName='http-patch'
  - Lightweight wrapper (only defines method and actionName properties)

- **FileReadAction**: Implementation of `PlaybookAction<FileReadConfig>`
  - Reads file contents with encoding support
  - Returns file contents as string

- **FileWriteAction**: Implementation of `PlaybookAction<FileWriteConfig>`
  - Writes file contents with atomic write pattern
  - Supports front matter and replace transformations

- **FileExistsConfig**: Configuration interface for `file-exists` action
  - Properties: path
  - Used to check file existence within playbooks

- **FileExistsAction**: Implementation of `PlaybookAction<FileExistsConfig>`
  - Checks if file exists at given path
  - Returns boolean value (true if exists, false otherwise)

- **FileDeleteConfig**: Configuration interface for `file-delete` action
  - Properties: path
  - Used to delete files within playbooks

- **FileDeleteAction**: Implementation of `PlaybookAction<FileDeleteConfig>`
  - Deletes file at given path
  - Returns boolean value (true if deleted)

- **LogConfig**: Configuration interface for all log actions
  - Properties: message, source (optional), action (optional), data (optional)
  - Used to configure console logging within playbooks

- **LogActionBase**: Abstract base class for all log actions
  - Implements shared logging functionality
  - Subclasses define readonly `level` and `consoleMethod` properties

- **LogErrorAction**: Implementation of `PlaybookAction<LogConfig>`
  - Logs error message to stderr, does not halt execution

- **LogWarningAction**: Implementation of `PlaybookAction<LogConfig>`
  - Logs warning message to stderr

- **LogInfoAction**: Implementation of `PlaybookAction<LogConfig>`
  - Logs informational message to stdout

- **LogVerboseAction**: Implementation of `PlaybookAction<LogConfig>`
  - Logs verbose message to stdout with [VERBOSE] prefix

- **LogDebugAction**: Implementation of `PlaybookAction<LogConfig>`
  - Logs debug message to stdout with [DEBUG] prefix

- **LogTraceAction**: Implementation of `PlaybookAction<LogConfig>`
  - Logs trace message to stdout with [TRACE] prefix

**Entities from other features:**

- **PlaybookAction** (playbook-definition): Base interface all actions implement
- **PlaybookActionResult** (playbook-definition): Standard result structure
- **CatalystError** (error-handling): Standard error class with code and guidance
- **ErrorPolicy** (error-handling): Error handling configuration

## TypeScript Examples

### HTTP GET Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Simple GET request
const fetchDataStep: PlaybookStep = {
  name: 'fetch-user-data',
  action: 'http-get',
  config: {
    url: 'https://api.example.com/users/{{user-id}}',
    headers: {
      'Authorization': 'Bearer {{api-token}}',
      'Accept': 'application/json'
    },
    timeout: 30000,
    retries: 3
  }
};

// Custom status validation
const checkHealthStep: PlaybookStep = {
  name: 'check-health',
  action: 'http-get',
  config: {
    url: 'https://api.example.com/health',
    timeout: 5000,
    retries: 1,
    validateStatus: (status: number) => status === 200 || status === 503
  }
};
```

### HTTP POST Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// POST with JSON body
const createUserStep: PlaybookStep = {
  name: 'create-user',
  action: 'http-post',
  config: {
    url: 'https://api.example.com/users',
    headers: {
      'Authorization': 'Bearer {{api-token}}',
      'Content-Type': 'application/json'
    },
    body: {
      email: '{{user-email}}',
      name: '{{user-name}}',
      role: 'member'
    },
    timeout: 30000,
    retries: 3
  }
};

// POST with string body
const sendWebhookStep: PlaybookStep = {
  name: 'send-webhook',
  action: 'http-post',
  config: {
    url: '{{webhook-url}}',
    contentType: 'text/plain',
    body: 'Event: user.created\nUser: {{user-email}}',
    timeout: 10000,
    retries: 2
  }
};
```

### File Read Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Read UTF-8 text file
const readConfigStep: PlaybookStep = {
  name: 'read-config',
  action: 'file-read',
  config: {
    path: '.xe/product.md',
    encoding: 'utf8'
  }
};

// Read binary file as base64
const readImageStep: PlaybookStep = {
  name: 'read-logo',
  action: 'file-read',
  config: {
    path: 'assets/logo.png',
    encoding: 'base64'
  }
};

// Read with template interpolation
const readDynamicStep: PlaybookStep = {
  name: 'read-feature-spec',
  action: 'file-read',
  config: {
    path: '.xe/features/{{feature-id}}/spec.md'
  }
};
```

### File Write Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Write simple text file
const writeOutputStep: PlaybookStep = {
  name: 'write-output',
  action: 'file-write',
  config: {
    path: 'output/result.txt',
    content: 'Execution completed at {{timestamp}}'
  }
};

// Write markdown with front matter
const writeMarkdownStep: PlaybookStep = {
  name: 'write-spec',
  action: 'file-write',
  config: {
    path: '.xe/features/{{feature-id}}/spec.md',
    content: `# Feature: {{feature-name}}

## Problem

{{problem-statement}}

## Goals

{{goals}}
`,
    frontMatter: {
      id: '{{feature-id}}',
      title: '{{feature-name}}',
      author: '{{current-user}}',
      status: 'draft'
    }
  }
};

// Write with simple replacements
const writeTemplateStep: PlaybookStep = {
  name: 'write-readme',
  action: 'file-write',
  config: {
    path: 'README.md',
    content: `# {project-name}

Version: {project-version}

Created by: {author-name}
`,
    replace: {
      '{project-name}': '{{project-name}}',
      '{project-version}': '{{version}}',
      '{author-name}': '{{author}}'
    }
  }
};
```

### File Exists Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Check if file exists before reading
const checkConfigStep: PlaybookStep = {
  name: 'check-config-exists',
  action: 'file-exists',
  config: {
    path: '.xe/config.json'
  }
};

// Shorthand syntax (primary property)
const checkSpecStep: PlaybookStep = {
  name: 'check-spec',
  'file-exists': '.xe/features/{{feature-id}}/spec.md'
};

// Use with conditional logic
// if: "{{check-config-exists}}"
```

### File Delete Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Delete a temporary file
const deleteTempStep: PlaybookStep = {
  name: 'cleanup-temp',
  action: 'file-delete',
  config: {
    path: '.xe/temp/output.txt'
  }
};

// Shorthand syntax (primary property)
const deleteStep: PlaybookStep = {
  name: 'delete-artifact',
  'file-delete': '.xe/temp/{{artifact-name}}'
};
```

### Console Logging Actions Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Log error (does NOT halt execution - use 'throw' for that)
const logErrorStep: PlaybookStep = {
  name: 'log-validation-error',
  action: 'log-error',
  config: {
    message: 'Validation failed for {{item-name}}: {{error-details}}'
  }
};

// Shorthand syntax for all log actions
const logInfoStep: PlaybookStep = {
  name: 'log-progress',
  'log-info': 'Processing item {{index}} of {{total}}'
};

const logWarningStep: PlaybookStep = {
  name: 'log-deprecation',
  'log-warning': 'Feature {{feature-name}} is deprecated'
};

// Logging with structured data (matches Logger format)
const logWithDataStep: PlaybookStep = {
  name: 'log-api-response',
  action: 'log-debug',
  config: {
    message: 'API response received',
    source: 'HttpClient',
    action: 'Fetch',
    data: {
      status: '{{response-status}}',
      duration: '{{response-duration}}',
      endpoint: '{{api-endpoint}}'
    }
  }
};
// Output: DEBUG: HttpClient.Fetch: API response received {"status":200,"duration":150,"endpoint":"/api/users"}

// Verbose logging for detailed progress
const logVerboseStep: PlaybookStep = {
  name: 'log-details',
  'log-verbose': 'Request headers: {{headers}}'
};

// Debug logging for troubleshooting
const logDebugStep: PlaybookStep = {
  name: 'log-state',
  'log-debug': 'Current state: {{state}}'
};

// Trace logging for telemetry
const logTraceStep: PlaybookStep = {
  name: 'log-trace',
  'log-trace': 'Step execution: action={{action}}, duration={{duration}}ms'
};
```

## Dependencies

**Internal Dependencies:**

- **playbook-definition** (Tier 1.2): Provides `PlaybookAction`, `PlaybookActionResult` interfaces
- **error-handling** (Tier 1.1): Provides `CatalystError` and `ErrorPolicy` framework
- **logging** (Tier 1.0, catalyst-cli): Provides `Logger` interface for consistent output formatting
  - Log actions currently use console methods mimicking Logger format
  - Will integrate with Logger singleton when catalyst-cli logging is merged

**External Dependencies:**

- **Node.js >= 18**: fetch API (or http/https modules), fs module for file operations
- **Network Access**: HTTP actions require network connectivity to external services

## Integration Points

- **Playbook Engine**: Actions register with engine via `playbook-definition` interface contract
- **Template Engine**: Config properties support template interpolation before action execution
- **Error Handling**: Actions throw CatalystError instances for consistent error handling across playbooks
