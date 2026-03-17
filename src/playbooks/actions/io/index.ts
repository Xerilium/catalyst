/**
 * I/O Actions for Playbook Workflows
 *
 * This module exports HTTP, file, and console logging operations for playbook
 * workflows, enabling API integration, file management, and diagnostic output.
 */

// Type exports
export type {
  HttpBaseConfig,
  HttpBodyConfig,
  HttpGetConfig,
  HttpPostConfig,
  HttpPutConfig,
  HttpPatchConfig,
  FileReadConfig,
  FileWriteConfig,
  FileExistsConfig,
  LogConfig,
  HttpResponse,
  FileWriteResult,
  LogResult
} from './types';

// HTTP action exports
export { HttpActionBase } from './http/base-http-action';
export { HttpGetAction } from './http/get-action';
export { HttpPostAction } from './http/post-action';
export { HttpPutAction } from './http/put-action';
export { HttpPatchAction } from './http/patch-action';

// File action exports
export { FileReadAction } from './file/read-action';
export { FileWriteAction } from './file/write-action';
export { FileExistsAction } from './file/exists-action';

// Console logging action exports
export {
  LogActionBase,
  type LogLevel,
  LogErrorAction,
  LogWarningAction,
  LogInfoAction,
  LogVerboseAction,
  LogDebugAction,
  LogTraceAction
} from './console';

// Utility exports
export {
  executeWithRetry,
  isRetryableHttpError
} from './utils/retry';
export { withTimeout } from './utils/timeout';
export {
  isSensitiveHeader,
  maskSensitiveHeaders,
  maskSensitiveUrlParams
} from './utils/masking';
export {
  defaultStatusValidator,
  validateResponseStatus
} from './utils/validation';
export {
  validatePath,
  isSafePath
} from './utils/path-validation';
export { atomicWrite } from './utils/atomic-write';
export { addFrontMatter } from './utils/front-matter';
