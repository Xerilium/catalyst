// @req FR:playbook-actions-io/http.base-class.config-interface
// @req FR:playbook-actions-io/http.request-bodies.config-interface
// @req FR:playbook-actions-io/file.read-action.implementation
// @req FR:playbook-actions-io/file.write-action.implementation
// @req NFR:playbook-actions-io/maintainability.type-safety

/**
 * Type definitions for I/O actions
 *
 * This module defines configuration interfaces for HTTP and file operations
 * used in playbook workflows.
 */

/**
 * Base configuration for all HTTP actions
 */
export interface HttpBaseConfig {
  /** Target endpoint URL (supports template interpolation) */
  url: string;

  /** Request headers as key-value pairs (optional) */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Number of retry attempts on failure (default: 3) */
  retries?: number;

  /** Function to validate response status codes (default: status >= 200 && status < 300) */
  validateStatus?: (status: number) => boolean;
}

/**
 * Configuration for HTTP actions with request bodies (POST, PUT, PATCH)
 */
export interface HttpBodyConfig extends HttpBaseConfig {
  /** Request payload as string or object (optional) */
  body?: string | Record<string, unknown>;

  /** Content-Type header override (default: 'application/json' if body is object, 'text/plain' if string) */
  contentType?: string;
}

/**
 * Configuration for HTTP GET action
 */
export type HttpGetConfig = HttpBaseConfig;

/**
 * Configuration for HTTP POST action
 */
export type HttpPostConfig = HttpBodyConfig;

/**
 * Configuration for HTTP PUT action
 */
export type HttpPutConfig = HttpBodyConfig;

/**
 * Configuration for HTTP PATCH action
 */
export type HttpPatchConfig = HttpBodyConfig;

/**
 * Configuration for file-read action
 */
export interface FileReadConfig {
  /** File path to read (supports template interpolation) */
  path: string;

  /** File encoding (default: 'utf8') */
  encoding?: 'utf8' | 'utf-8' | 'ascii' | 'base64' | 'binary' | 'hex';
}

/**
 * Configuration for file-write action
 */
export interface FileWriteConfig {
  /** File path to write (supports template interpolation) */
  path: string;

  /** Content to write (supports template interpolation) */
  content: string;

  /** File encoding (default: 'utf8') */
  encoding?: string;

  /** YAML front matter to prepend (only for .md files, optional) */
  frontMatter?: Record<string, unknown>;

  /** Simple find/replace dictionary applied to content before writing (optional) */
  replace?: Record<string, string>;
}

/**
 * HTTP response structure included in action result value
 */
export interface HttpResponse {
  /** HTTP status code */
  status: number;

  /** Response headers */
  headers: Record<string, string>;

  /** Response body as string */
  body: string;

  /** Parsed JSON body (only if Content-Type is application/json) */
  bodyAsJson?: unknown;
}

/**
 * File write result structure included in action result value
 */
export interface FileWriteResult {
  /** Path where file was written */
  path: string;

  /** Number of bytes written */
  bytesWritten: number;
}
