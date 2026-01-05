/**
 * Error handling utilities for Catalyst
 * Provides standardized error classes, enums, and policy interfaces
 */

/**
 * Base class for all Catalyst errors
 * Provides error code, user-facing message, actionable guidance, and cause chaining
 *
 * @req FR:error-handling/catalyst-error
 * @req FR:error-handling/catalyst-error.extends-error
 * @req FR:error-handling/catalyst-error.constructor
 * @req FR:error-handling/catalyst-error.stack-traces
 * @req FR:error-handling/catalyst-error.serialization
 */
export class CatalystError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly guidance: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CatalystError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CatalystError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      guidance: this.guidance,
      cause: this.cause ? this.cause.message : null,
      stack: this.stack
    };
  }
}

/**
 * Error handling action enum
 * Specifies what action to take when an error occurs
 *
 * @req FR:error-handling/error-action
 * @req FR:error-handling/error-action.values
 */
export enum ErrorAction {
  Stop = "Stop",
  Suspend = "Suspend",
  Break = "Break",
  Inquire = "Inquire",
  Continue = "Continue",
  SilentlyContinue = "SilentlyContinue",
  Ignore = "Ignore"
}

/**
 * Error policy action configuration
 * Specifies the action to take and how many times to retry before taking that action
 *
 * @req FR:error-handling/error-policy-action
 * @req FR:error-handling/error-policy-action.interface
 */
export interface ErrorPolicyAction {
  action: ErrorAction;
  retryCount?: number;  // defaults to 0 (no retries)
}

/**
 * Error handling policy dictionary
 * Maps error codes to policy actions with required default fallback
 *
 * @req FR:error-handling/error-policy
 * @req FR:error-handling/error-policy.interface
 * @req FR:error-handling/error-policy.pascal-cased
 * @req FR:error-handling/error-policy.valid-codes
 */
export interface ErrorPolicy {
  default: ErrorPolicyAction;
  [errorCode: string]: ErrorPolicyAction;
}
