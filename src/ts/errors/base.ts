/**
 * Base class for all Catalyst errors
 * Provides error code, user-facing message, actionable guidance, and cause chaining
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

    // Preserve stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CatalystError);
    }
  }

  /**
   * Serialize error to JSON for logging
   */
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
