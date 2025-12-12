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

**FR-1**: HTTP Action Base Class

- **FR-1.1**: System MUST provide abstract `HttpActionBase<TConfig>` class implementing shared HTTP functionality
  - Base class handles all common HTTP operations (request execution, retry, timeout, error handling)
  - Subclasses define readonly `method: string` property to specify HTTP method (GET, POST, PUT, PATCH)
  - Subclasses define static readonly `actionType: string` property to specify action type identifier

- **FR-1.2**: Base class MUST define base config interface `HttpBaseConfig`:
  - `url` (string, required): Target endpoint URL (supports template interpolation)
  - `headers` (Record<string, string>, optional): Request headers as key-value pairs
  - `timeout` (number, optional): Request timeout in milliseconds (default: 30000)
  - `retries` (number, optional): Number of retry attempts on failure (default: 3)
  - `validateStatus` ((status: number) => boolean, optional): Function to validate response status codes (default: status >= 200 && status < 300)

- **FR-1.3**: Base class MUST execute HTTP requests using Node.js fetch API or http/https modules
  - URL MUST support template interpolation before request execution
  - Headers MUST be sent as-is with no modifications except for default User-Agent
  - Request MUST include default User-Agent: 'Catalyst-Playbook/1.0'
  - Request MUST respect timeout configuration
  - HTTP method determined by subclass `method` property

- **FR-1.4**: Base class MUST enforce timeout limits
  - Request MUST abort if timeout is exceeded
  - Timeout errors MUST throw CatalystError with code 'HttpTimeout'
  - Default timeout MUST be 30000ms (30 seconds)

- **FR-1.5**: Base class MUST implement retry logic with exponential backoff
  - Retries MUST only occur for network errors and 5xx status codes
  - Backoff delay MUST be: attempt^2 * 1000ms (1s, 4s, 9s, 16s...)
  - Maximum retry count MUST be configurable via `retries` property
  - Default retry count MUST be 3

- **FR-1.6**: Base class MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status including status code
  - `value`: Object with `status` (number), `headers` (Record<string, string>), `body` (string), `bodyAsJson` (unknown, only if Content-Type is application/json)
  - `error`: CatalystError if request failed, null otherwise

- **FR-1.7**: Base class MUST handle request errors
  - Network errors MUST result in error with code 'HttpNetworkError'
  - Timeout errors MUST result in error with code 'HttpTimeout'
  - Invalid status codes (per validateStatus) MUST result in error with code 'HttpInvalidStatus'
  - DNS resolution errors MUST result in error with code 'HttpDnsError'
  - All errors MUST include response body in error guidance for debugging (if available)

- **FR-1.8**: Base class MUST mask sensitive headers in logs
  - Headers with names containing 'authorization', 'token', 'key', 'secret', 'password' (case-insensitive) MUST be masked
  - Masked values MUST be replaced with '***' in all log output
  - Original values MUST still be sent in actual requests

**FR-2**: HTTP Actions with Request Bodies

- **FR-2.1**: System MUST define `HttpBodyConfig` interface extending `HttpBaseConfig`:
  - All properties from `HttpBaseConfig`
  - `body` (string | Record<string, unknown>, optional): Request payload as string or object
  - `contentType` (string, optional): Content-Type header override (default: 'application/json' if body is object, 'text/plain' if body is string)

- **FR-2.2**: Base class MUST handle request body serialization for POST/PUT/PATCH:
  - Body object MUST be automatically serialized to JSON if Content-Type is 'application/json'
  - Body string MUST be sent as-is with specified Content-Type
  - Content-Type header MUST default to 'application/json' for object bodies, 'text/plain' for string bodies

**FR-3**: HTTP GET Action

- **FR-3.1**: System MUST provide `HttpGetAction` class extending `HttpActionBase<HttpGetConfig>`
  - Config type: `HttpGetConfig` interface (same as `HttpBaseConfig`)
  - Define readonly `method` property as 'GET'
  - Define readonly `actionName` property as 'http-get'

**FR-4**: HTTP POST Action

- **FR-4.1**: System MUST provide `HttpPostAction` class extending `HttpActionBase<HttpPostConfig>`
  - Config type: `HttpPostConfig` interface (same as `HttpBodyConfig`)
  - Define readonly `method` property as 'POST'
  - Define readonly `actionName` property as 'http-post'

**FR-5**: HTTP PUT Action

- **FR-5.1**: System MUST provide `HttpPutAction` class extending `HttpActionBase<HttpPutConfig>`
  - Config type: `HttpPutConfig` interface (same as `HttpBodyConfig`)
  - Define readonly `method` property as 'PUT'
  - Define readonly `actionName` property as 'http-put'

**FR-6**: HTTP PATCH Action

- **FR-6.1**: System MUST provide `HttpPatchAction` class extending `HttpActionBase<HttpPatchConfig>`
  - Config type: `HttpPatchConfig` interface (same as `HttpBodyConfig`)
  - Define readonly `method` property as 'PATCH'
  - Define readonly `actionName` property as 'http-patch'

**FR-7**: File Read Action

- **FR-7.1**: System MUST provide `file-read` action implementing `PlaybookAction<FileReadConfig>`
  - Config type: `FileReadConfig` interface with the following properties:
    - `path` (string, required): File path to read (supports template interpolation)
    - `encoding` (string, optional): File encoding - 'utf8', 'utf-8', 'ascii', 'base64', 'binary', 'hex' (default: 'utf8')

- **FR-7.2**: `file-read` action MUST read file contents using Node.js fs module
  - Path MUST support template interpolation before file access
  - Path MUST be validated to prevent directory traversal attacks (no '..' segments allowed)
  - Relative paths MUST be resolved against current working directory
  - File MUST exist or error with code 'FileNotFound'

- **FR-7.3**: `file-read` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status
  - `value`: File contents as string (using specified encoding)
  - `error`: CatalystError if read failed, null otherwise

- **FR-7.4**: `file-read` action MUST handle file access errors
  - Missing files MUST result in error with code 'FileNotFound'
  - Permission errors MUST result in error with code 'FilePermissionDenied'
  - Invalid path (directory traversal) MUST result in error with code 'FileInvalidPath'
  - Invalid encoding MUST result in error with code 'FileInvalidEncoding'
  - All errors MUST include file path in error guidance

**FR-8**: File Write Action

- **FR-8.1**: System MUST provide `file-write` action implementing `PlaybookAction<FileWriteConfig>`
  - Config type: `FileWriteConfig` interface with the following properties:
    - `path` (string, required): File path to write (supports template interpolation)
    - `content` (string, required): Content to write (supports template interpolation)
    - `encoding` (string, optional): File encoding (default: 'utf8')
    - `frontMatter` (Record<string, unknown>, optional): YAML front matter to prepend (only for .md files)
    - `replace` (Record<string, string>, optional): Simple find/replace dictionary applied to content before writing

- **FR-8.2**: `file-write` action MUST write file contents using atomic write pattern
  - Write MUST first create temporary file with '.tmp' extension in same directory
  - Temporary file MUST then be renamed to target path (atomic operation)
  - Parent directories MUST be created automatically if they don't exist
  - Path MUST support template interpolation before file access
  - Path MUST be validated to prevent directory traversal attacks (no '..' segments allowed)
  - Relative paths MUST be resolved against current working directory

- **FR-8.3**: `file-write` action MUST process content before writing
  - Template interpolation MUST occur first (if content contains template expressions)
  - Replace dictionary MUST be applied after template interpolation (if provided)
  - Front matter MUST be added after replace (if provided and file extension is .md)
  - Front matter format: YAML between '---' delimiters at file start

- **FR-8.4**: `file-write` action MUST return PlaybookActionResult with the following:
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status including bytes written
  - `value`: Object with `path` (string), `bytesWritten` (number)
  - `error`: CatalystError if write failed, null otherwise

- **FR-8.5**: `file-write` action MUST handle file write errors
  - Permission errors MUST result in error with code 'FilePermissionDenied'
  - Invalid path (directory traversal) MUST result in error with code 'FileInvalidPath'
  - Disk full errors MUST result in error with code 'FileDiskFull'
  - Invalid encoding MUST result in error with code 'FileInvalidEncoding'
  - All errors MUST include file path in error guidance
  - Failed atomic writes MUST clean up temporary files

**FR-9**: Security and Safety

- **FR-9.1**: All actions MUST validate configuration before execution
  - Missing required properties MUST throw CatalystError with code 'HttpConfigInvalid' or 'FileConfigInvalid'
  - Invalid timeout values (<0) MUST throw CatalystError with code 'HttpConfigInvalid'
  - Invalid URL format MUST throw CatalystError with code 'HttpConfigInvalid'

- **FR-9.2**: HTTP actions MUST mask sensitive data in logs (handled by base class)
  - Authorization headers MUST be masked as '***'
  - Headers containing 'token', 'key', 'secret', 'password' (case-insensitive) MUST be masked
  - Query parameters containing 'token', 'key', 'secret', 'password' MUST be masked in URLs

- **FR-9.3**: File actions MUST prevent path traversal attacks
  - Paths containing '..' segments MUST be rejected
  - Paths MUST be normalized before validation
  - Absolute paths MUST be allowed but validated against safe base directory (if configured)

### Non-functional Requirements

**NFR-1**: Performance

- **NFR-1.1**: HTTP request overhead (excluding network time) MUST be <100ms
- **NFR-1.2**: File read overhead (excluding disk I/O) MUST be <50ms
- **NFR-1.3**: File write overhead (excluding disk I/O) MUST be <100ms (includes atomic write)
- **NFR-1.4**: Retry backoff MUST not exceed 30 seconds between attempts

**NFR-2**: Reliability

- **NFR-2.1**: File writes MUST be atomic to prevent corruption on crash
- **NFR-2.2**: HTTP retries MUST use exponential backoff to avoid overwhelming servers
- **NFR-2.3**: Failed atomic writes MUST clean up temporary files
- **NFR-2.4**: Error messages MUST include actionable guidance for all error scenarios

**NFR-3**: Testability

- **NFR-3.1**: All actions MUST be testable in isolation with mock HTTP clients and file systems
- **NFR-3.2**: Retry behavior MUST be verifiable with test doubles
- **NFR-3.3**: 100% code coverage for error handling paths
- **NFR-3.4**: 90% code coverage for success paths

**NFR-4**: Maintainability

- **NFR-4.1**: Action implementations MUST follow single responsibility principle
- **NFR-4.2**: Error codes MUST be well-documented and consistent
- **NFR-4.3**: Configuration interfaces MUST use TypeScript for type safety
- **NFR-4.4**: Shared logic (retry, timeout, masking) MUST be extracted to utility functions

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

## Dependencies

**Internal Dependencies:**

- **playbook-definition** (Tier 1.2): Provides `PlaybookAction`, `PlaybookActionResult` interfaces
- **error-handling** (Tier 1.1): Provides `CatalystError` and `ErrorPolicy` framework

**External Dependencies:**

- **Node.js >= 18**: fetch API (or http/https modules), fs module for file operations
- **Network Access**: HTTP actions require network connectivity to external services

## Integration Points

- **Playbook Engine**: Actions register with engine via `playbook-definition` interface contract
- **Template Engine**: Config properties support template interpolation before action execution
- **Error Handling**: Actions throw CatalystError instances for consistent error handling across playbooks
