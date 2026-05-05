---
id: playbook-actions-io
title: Playbook Actions - I/O Operations
description: HTTP and file-system action primitives for integrating with external systems and local files.
dependencies:
  - playbook-definition
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Actions - I/O Operations

## Purpose

Playbooks need to interact with external systems through HTTP APIs and perform file operations. This feature enables playbook authors to integrate with external systems and services via HTTP requests and provides secure, reliable file system operations within playbook workflows.

## Scenarios

### FR:http.base-class: HTTP Action Base Class

Playbook author needs to call external APIs to fetch or send data so that workflows can integrate with external systems through HTTP requests with proper error handling and retry logic.

- **FR:http.base-class.abstract-implementation** (P1): System MUST provide abstract `HttpActionBase<TConfig>` class implementing shared HTTP functionality

  > - @req FR:playbook-definition/types.action.interface
  - Base class handles all common HTTP operations (request execution, retry, timeout, error handling)
  - Subclasses define readonly `method: string` property to specify HTTP method (GET, POST, PUT, PATCH)
  - Subclasses define static readonly `actionType: string` property to specify action type identifier

- **FR:http.base-class.config-interface** (P1): Base class MUST define base config interface `HttpBaseConfig`:
  - `url` (string, required): Target endpoint URL (supports template interpolation)
  - `headers` (Record<string, string>, optional): Request headers as key-value pairs
  - `timeout` (number, optional): Request timeout in milliseconds (default: 30000)
  - `retries` (number, optional): Number of retry attempts on failure (default: 3)
  - `validateStatus` ((status: number) => boolean, optional): Function to validate response status codes (default: status >= 200 && status < 300)

- **FR:http.base-class.request-execution** (P1): Base class MUST execute HTTP requests using Node.js fetch API or http/https modules
  - URL MUST support template interpolation before request execution
  - Headers MUST be sent as-is with no modifications except for default User-Agent
  - Request MUST include default User-Agent: 'Catalyst-Playbook/1.0'
  - Request MUST respect timeout configuration
  - HTTP method determined by subclass `method` property

- **FR:http.base-class.timeout-enforcement** (P2): Base class MUST enforce timeout limits
  - Request MUST abort if timeout is exceeded
  - Timeout errors MUST throw CatalystError with code 'HttpTimeout'
  - Default timeout MUST be 30000ms (30 seconds)

- **FR:http.base-class.retry-logic** (P2): Base class MUST implement retry logic with exponential backoff
  - Retries MUST only occur for network errors and 5xx status codes
  - Backoff delay MUST be: attempt^2 \* 1000ms (1s, 4s, 9s, 16s...)
  - Maximum retry count MUST be configurable via `retries` property
  - Default retry count MUST be 3

- **FR:http.base-class.result-format** (P1): Base class MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status including status code
  - `value`: Object with `status` (number), `headers` (Record<string, string>), `body` (string), `bodyAsJson` (unknown, only if Content-Type is application/json)
  - `error`: CatalystError if request failed, null otherwise

- **FR:http.base-class.error-handling** (P2): Base class MUST handle request errors

  > - @req FR:error-handling/catalyst-error
  - Network errors MUST result in error with code 'HttpNetworkError'
  - Timeout errors MUST result in error with code 'HttpTimeout'
  - Invalid status codes (per validateStatus) MUST result in error with code 'HttpInvalidStatus'
  - DNS resolution errors MUST result in error with code 'HttpDnsError'
  - All errors MUST include response body in error guidance for debugging (if available)

- **FR:http.base-class.header-masking** (P2): Base class MUST mask sensitive headers in logs
  - Headers with names containing 'authorization', 'token', 'key', 'secret', 'password' (case-insensitive) MUST be masked
  - Masked values MUST be replaced with '\*\*\*' in all log output
  - Original values MUST still be sent in actual requests

### FR:http.request-bodies: HTTP Actions with Request Bodies

Playbook author needs to send data to external APIs via POST, PUT, and PATCH requests so that workflows can create and update resources on external systems.

- **FR:http.request-bodies.config-interface** (P1): System MUST define `HttpBodyConfig` interface extending `HttpBaseConfig`:
  - All properties from `HttpBaseConfig`
  - `body` (string | Record<string, unknown>, optional): Request payload as string or object
  - `contentType` (string, optional): Content-Type header override (default: 'application/json' if body is object, 'text/plain' if body is string)

- **FR:http.request-bodies.serialization** (P1): Base class MUST handle request body serialization for POST/PUT/PATCH:
  - Body object MUST be automatically serialized to JSON if Content-Type is 'application/json'
  - Body string MUST be sent as-is with specified Content-Type
  - Content-Type header MUST default to 'application/json' for object bodies, 'text/plain' for string bodies

### FR:http.get-action: HTTP GET Action

Playbook author needs to make HTTP GET requests from playbooks so that workflows can fetch external data.

- **FR:http.get-action.implementation** (P1): System MUST provide `HttpGetAction` class extending `HttpActionBase<HttpGetConfig>`
  - Config type: `HttpGetConfig` interface (same as `HttpBaseConfig`)
  - Define readonly `method` property as 'GET'
  - Define readonly `actionName` property as 'http-get'

### FR:http.post-action: HTTP POST Action

Playbook author needs to make HTTP POST requests from playbooks so that workflows can create resources on external systems.

- **FR:http.post-action.implementation** (P1): System MUST provide `HttpPostAction` class extending `HttpActionBase<HttpPostConfig>`
  - Config type: `HttpPostConfig` interface (same as `HttpBodyConfig`)
  - Define readonly `method` property as 'POST'
  - Define readonly `actionName` property as 'http-post'

### FR:http.put-action: HTTP PUT Action

Playbook author needs to make HTTP PUT requests from playbooks so that workflows can replace resources on external systems.

- **FR:http.put-action.implementation** (P1): System MUST provide `HttpPutAction` class extending `HttpActionBase<HttpPutConfig>`
  - Config type: `HttpPutConfig` interface (same as `HttpBodyConfig`)
  - Define readonly `method` property as 'PUT'
  - Define readonly `actionName` property as 'http-put'

### FR:http.patch-action: HTTP PATCH Action

Playbook author needs to make HTTP PATCH requests from playbooks so that workflows can partially update resources on external systems.

- **FR:http.patch-action.implementation** (P1): System MUST provide `HttpPatchAction` class extending `HttpActionBase<HttpPatchConfig>`
  - Config type: `HttpPatchConfig` interface (same as `HttpBodyConfig`)
  - Define readonly `method` property as 'PATCH'
  - Define readonly `actionName` property as 'http-patch'

### FR:file.read-action: File Read Action

Playbook author needs to read configuration files and templates from the file system so that workflows can access local resources with path validation and encoding support.

- **FR:file.read-action.implementation** (P1): System MUST provide `file-read` action implementing `PlaybookAction<FileReadConfig>`
  - Config type: `FileReadConfig` interface with the following properties:
    - `path` (string, required): File path to read (supports template interpolation)
    - `encoding` (string, optional): File encoding - 'utf8', 'utf-8', 'ascii', 'base64', 'binary', 'hex' (default: 'utf8')

- **FR:file.read-action.file-reading** (P1): `file-read` action MUST read file contents using Node.js fs module
  - Path MUST support template interpolation before file access
  - Path MUST be validated to prevent directory traversal attacks (no '..' segments allowed)
  - Relative paths MUST be resolved against current working directory
  - File MUST exist or error with code 'FileNotFound'

- **FR:file.read-action.result-format** (P1): `file-read` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status
  - `value`: File contents as string (using specified encoding)
  - `error`: CatalystError if read failed, null otherwise

- **FR:file.read-action.error-handling** (P2): `file-read` action MUST handle file access errors
  - Missing files MUST result in error with code 'FileNotFound'
  - Permission errors MUST result in error with code 'FilePermissionDenied'
  - Invalid path (directory traversal) MUST result in error with code 'FileInvalidPath'
  - Invalid encoding MUST result in error with code 'FileInvalidEncoding'
  - All errors MUST include file path in error guidance

### FR:file.write-action: File Write Action

Playbook author needs to persist generated artifacts and results to disk so that workflows can atomically create outputs with template support and automatic directory creation.

- **FR:file.write-action.implementation** (P1): System MUST provide `file-write` action implementing `PlaybookAction<FileWriteConfig>`
  - Config type: `FileWriteConfig` interface with the following properties:
    - `path` (string, required): File path to write (supports template interpolation)
    - `content` (string, required): Content to write (supports template interpolation)
    - `encoding` (string, optional): File encoding (default: 'utf8')
    - `frontMatter` (Record<string, unknown>, optional): YAML front matter to prepend (only for .md files)
    - `replace` (Record<string, string>, optional): Simple find/replace dictionary applied to content before writing

- **FR:file.write-action.atomic-write** (P1): `file-write` action MUST write file contents using atomic write pattern
  - Write MUST first create temporary file with '.tmp' extension in same directory
  - Temporary file MUST then be renamed to target path (atomic operation)
  - Parent directories MUST be created automatically if they don't exist
  - Path MUST support template interpolation before file access
  - Path MUST be validated to prevent directory traversal attacks (no '..' segments allowed)
  - Relative paths MUST be resolved against current working directory

- **FR:file.write-action.content-processing** (P1): `file-write` action MUST process content before writing
  - Template interpolation MUST occur first (if content contains template expressions)
  - Replace dictionary MUST be applied after template interpolation (if provided)
  - Front matter MUST be added after replace (if provided and file extension is .md)
  - Front matter format: YAML between '---' delimiters at file start

- **FR:file.write-action.result-format** (P1): `file-write` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status including bytes written
  - `value`: Object with `path` (string), `bytesWritten` (number)
  - `error`: CatalystError if write failed, null otherwise

- **FR:file.write-action.error-handling** (P2): `file-write` action MUST handle file write errors
  - Permission errors MUST result in error with code 'FilePermissionDenied'
  - Invalid path (directory traversal) MUST result in error with code 'FileInvalidPath'
  - Disk full errors MUST result in error with code 'FileDiskFull'
  - Invalid encoding MUST result in error with code 'FileInvalidEncoding'
  - All errors MUST include file path in error guidance
  - Failed atomic writes MUST clean up temporary files

### FR:file.exists-action: File Exists Action

Playbook author needs to check whether a file exists so that workflows can branch conditionally based on file presence.

- **FR:file.exists-action.implementation** (P1): System MUST provide `file-exists` action implementing `PlaybookAction<FileExistsConfig>`
  - Config type: `FileExistsConfig` interface with the following properties:
    - `path` (string, required): File path to check (supports template interpolation)

- **FR:file.exists-action.check** (P1): `file-exists` action MUST check file existence using Node.js fs module
  - Path MUST support template interpolation before file access
  - Path MUST be validated to prevent directory traversal attacks (no '..' segments allowed)
  - Relative paths MUST be resolved against current working directory
  - Action MUST NOT throw errors for non-existent files (that's the expected use case)

- **FR:file.exists-action.result-format** (P1): `file-exists` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' always (checking existence is always successful)
  - `message`: Human-readable status indicating whether file exists
  - `value`: boolean - `true` if file exists, `false` if not
  - `error`: undefined (never errors for non-existent files)

- **FR:file.exists-action.error-handling** (P2): `file-exists` action MUST handle path validation errors
  - Invalid path (directory traversal) MUST result in error with code 'FileInvalidPath'
  - Permission errors when checking existence MUST result in error with code 'FilePermissionDenied'

### FR:file.delete-action: File Delete Action

Playbook author needs to delete files so that workflows can clean up temporary artifacts and manage file lifecycle.

- **FR:file.delete-action.implementation** (P1): System MUST provide `file-delete` action implementing `PlaybookAction<FileDeleteConfig>`
  - Config type: `FileDeleteConfig` interface with the following properties:
    - `path` (string, required): File path to delete (supports template interpolation)

- **FR:file.delete-action.deletion** (P1): `file-delete` action MUST delete file using Node.js fs module
  - Path MUST support template interpolation before file access
  - Path MUST be validated to prevent directory traversal attacks (no '..' segments allowed)
  - Relative paths MUST be resolved against current working directory
  - File MUST exist or error with code 'FileNotFound'

- **FR:file.delete-action.result-format** (P1): `file-delete` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable status indicating file was deleted
  - `value`: boolean - `true` if file was deleted
  - `error`: CatalystError if delete failed, undefined otherwise

- **FR:file.delete-action.error-handling** (P2): `file-delete` action MUST handle file deletion errors
  - Missing files MUST result in error with code 'FileNotFound'
  - Permission errors MUST result in error with code 'FilePermissionDenied'
  - Invalid path (directory traversal) MUST result in error with code 'FileInvalidPath'
  - All errors MUST include file path in error guidance

### FR:log: Logging Actions

Playbook author needs structured logging at multiple severity levels so that workflows can produce diagnostic output without halting execution.

- **FR:log.base-config** (P1): All log actions MUST use `LogConfig` interface:
  - `message` (string, required): Message to log (supports template interpolation)
  - `source` (string, optional): Component doing the logging (defaults to playbook name via `getVariable('playbook.name')`, falls back to "Playbook")
  - `action` (string, optional): Operation being performed (defaults to "Playbook" when omitted)
  - `data` (Record<string, unknown>, optional): Structured data to include with log entry

- **FR:log.error-action** (P1): System MUST provide `log-error` action
  - Writes message to stderr using `console.error()`
  - Does NOT terminate playbook execution (use `throw` action for that)
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.warning-action** (P1): System MUST provide `log-warning` action
  - Writes message to stderr using `console.warn()`
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.info-action** (P1): System MUST provide `log-info` action
  - Writes message to stdout using `console.info()`
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.verbose-action** (P2): System MUST provide `log-verbose` action
  - Writes message to stdout using `console.log()`
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.debug-action** (P2): System MUST provide `log-debug` action
  - Writes message to stdout using `console.debug()`
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.trace-action** (P3): System MUST provide `log-trace` action
  - Writes message to stdout using `console.log()`
  - Intended for telemetry and detailed execution tracing
  - Returns `code: 'Success'` with `value: { level, source, action, message, data? }`

- **FR:log.primary-property** (P1): All log actions MUST support shorthand syntax via `message` as primary property
  - Enables: `log-info: "Processing {{item-name}}"` instead of full config object

### FR:display: Display Action

Playbook author needs to write plain text to the console without diagnostic prefixes so that workflows can produce user-facing output like banners, separators, and formatted results that are distinct from structured log messages.

- **FR:display.implementation** (P1): System MUST provide `display` action implementing `PlaybookAction<DisplayConfig>`

  > - @req FR:playbook-definition/types.action.interface
  - Config type: `DisplayConfig` interface with the following properties:
    - `message` (string, required): Text to display (supports template interpolation)
    - `log` (boolean, optional): When true, also record the message in the engine's `context.logs[]` array for non-terminal UI consumers (default: false)

- **FR:display.console-output** (P1): `display` action MUST write the message to stdout using `console.log()` with NO prefix
  - Output MUST be the interpolated message string only — no level label, no source, no action, no ANSI color codes
  - This is the key distinction from `log-*` actions which always prefix output with `{LEVEL} : {source}.{action}:`

- **FR:display.log-capture** (P2): When `log` is `true`, `display` action MUST also record the message in `context.logs[]`
  - Log entry MUST use level `'display'` to distinguish from diagnostic log levels
  - Log entry source MUST default to playbook name (same as log actions)
  - Log entry action MUST default to `'Playbook'` (same as log actions)
  - This enables non-terminal UIs (web interfaces, etc.) to access display output programmatically

- **FR:display.result-format** (P1): `display` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status
  - `value`: Object with `message` (string, the interpolated text that was displayed)
  - `error`: CatalystError if display failed, undefined otherwise

- **FR:display.primary-property** (P1): `display` action MUST support shorthand syntax via `message` as primary property
  - Enables: `display: "Hello world"` instead of `display: { config: { message: "Hello world" } }`

- **FR:display.error-handling** (P2): `display` action MUST handle configuration errors
  - Missing `message` property MUST throw CatalystError with code 'DisplayConfigInvalid'
  - Non-string `message` MUST throw CatalystError with code 'DisplayConfigInvalid'

### FR:security: Security and Safety

Playbook author needs secure I/O operations so that workflows prevent path traversal attacks, mask sensitive data, and validate configuration before execution.

- **FR:security.config-validation** (P2): All actions MUST validate configuration before execution
  - Missing required properties MUST throw CatalystError with code 'HttpConfigInvalid' or 'FileConfigInvalid'
  - Invalid timeout values (<0) MUST throw CatalystError with code 'HttpConfigInvalid'
  - Invalid URL format MUST throw CatalystError with code 'HttpConfigInvalid'

- **FR:security.http-data-masking** (P2): HTTP actions MUST mask sensitive data in logs (handled by base class)
  - Authorization headers MUST be masked as '\*\*\*'
  - Headers containing 'token', 'key', 'secret', 'password' (case-insensitive) MUST be masked
  - Query parameters containing 'token', 'key', 'secret', 'password' MUST be masked in URLs

- **FR:security.path-traversal-prevention** (P2): File actions MUST prevent path traversal attacks
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

## Architecture Constraints

None

## External Dependencies

- **Node.js >= 18**: fetch API (or http/https modules), fs module for file operations
- **Network Access**: HTTP actions require network connectivity to external services
