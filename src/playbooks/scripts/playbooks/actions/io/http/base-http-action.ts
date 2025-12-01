import type { PlaybookAction, PlaybookActionResult } from '../../../types';
import { CatalystError } from '../../../../errors';
import type { HttpBaseConfig, HttpBodyConfig, HttpResponse } from '../types';
import { executeWithRetry, isRetryableHttpError } from '../utils/retry';
import { withTimeout } from '../utils/timeout';
import { maskSensitiveHeaders, maskSensitiveUrlParams } from '../utils/masking';
import { validateResponseStatus, defaultStatusValidator } from '../utils/validation';

/**
 * Abstract base class for all HTTP actions
 *
 * Provides shared HTTP functionality including request execution, retry logic,
 * timeout enforcement, header masking, status validation, and error handling.
 *
 * Subclasses must define readonly `method` and `actionName` properties.
 */
export abstract class HttpActionBase<TConfig extends HttpBaseConfig>
  implements PlaybookAction<TConfig>
{
  /**
   * HTTP method for this action (GET, POST, PUT, PATCH)
   * Must be defined by subclass
   */
  abstract readonly method: string;

  /**
   * Action name for error codes (http-get, http-post, etc.)
   * Must be defined by subclass
   */
  abstract readonly actionName: string;

  /**
   * Execute HTTP request with retry, timeout, and error handling
   *
   * @param config - Action configuration
   * @returns Promise resolving to action result
   */
  async execute(config: TConfig): Promise<PlaybookActionResult> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Extract configuration with defaults
      const {
        url,
        headers = {},
        timeout = 30000,
        retries = 3,
        validateStatus = defaultStatusValidator
      } = config;

      // Mask URL and headers for logging
      const maskedUrl = maskSensitiveUrlParams(url);
      const maskedHeaders = maskSensitiveHeaders(headers);

      console.log(`[${this.actionName}] Executing request to ${maskedUrl}`);
      console.log(`[${this.actionName}] Headers: ${JSON.stringify(maskedHeaders)}`);

      // Execute request with retry and timeout
      const response = await executeWithRetry(
        async () => {
          return await withTimeout(
            this.performRequest(config),
            timeout,
            'HttpTimeout'
          );
        },
        retries,
        (error) => {
          // Determine if error is retryable
          if (error instanceof CatalystError && error.code === 'HttpInvalidStatus') {
            // Extract status code from error context if available
            const statusMatch = error.message.match(/status (\d+)/);
            const status = statusMatch ? parseInt(statusMatch[1], 10) : undefined;
            return isRetryableHttpError(error, status);
          }
          // Other errors (network, timeout) are retryable
          return true;
        }
      );

      // Validate status
      validateResponseStatus(response.status, validateStatus);

      // Success
      return {
        code: 'Success',
        message: `HTTP ${this.method} request to ${maskedUrl} completed with status ${response.status}`,
        value: response,
        error: undefined
      };
    } catch (error) {
      return this.handleError(error as Error, config);
    }
  }

  /**
   * Perform the actual HTTP request
   *
   * @param config - Action configuration
   * @returns Promise resolving to HTTP response
   */
  private async performRequest(config: TConfig): Promise<HttpResponse> {
    const { url, headers = {} } = config;

    try {
      // Prepare request options
      const requestOptions: RequestInit = {
        method: this.method,
        headers: {
          'User-Agent': 'Catalyst-Playbook/1.0',
          ...headers
        }
      };

      // Add body for POST/PUT/PATCH requests
      if (this.hasBody(config)) {
        const bodyConfig = config as unknown as HttpBodyConfig;
        if (bodyConfig.body !== undefined) {
          // Determine content type
          const contentType = bodyConfig.contentType ||
            (typeof bodyConfig.body === 'object' ? 'application/json' : 'text/plain');

          // Add Content-Type header if not already set
          if (!requestOptions.headers) {
            requestOptions.headers = {};
          }
          (requestOptions.headers as Record<string, string>)['Content-Type'] = contentType;

          // Serialize body
          if (typeof bodyConfig.body === 'object') {
            requestOptions.body = JSON.stringify(bodyConfig.body);
          } else {
            requestOptions.body = bodyConfig.body;
          }
        }
      }

      // Execute fetch
      const response = await fetch(url, requestOptions);

      // Read response body
      const body = await response.text();

      // Parse JSON if applicable
      let bodyAsJson: unknown | undefined;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          bodyAsJson = JSON.parse(body);
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      // Convert headers to record
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        headers: responseHeaders,
        body,
        bodyAsJson
      };
    } catch (error) {
      // Map fetch errors to CatalystError
      if ((error as NodeJS.ErrnoException).code === 'ENOTFOUND') {
        throw new CatalystError(
          `DNS resolution failed for ${url}`,
          'HttpDnsError',
          `Unable to resolve the hostname in ${url}. Check that the URL is correct and that you have network connectivity.`,
          error as Error
        );
      }

      throw new CatalystError(
        `Network error during HTTP ${this.method} request`,
        'HttpNetworkError',
        `Failed to connect to ${url}. This could be due to network connectivity issues, firewall rules, or the server being unreachable.`,
        error as Error
      );
    }
  }

  /**
   * Check if this action supports request bodies
   *
   * @param config - Action configuration
   * @returns true if action supports bodies (POST/PUT/PATCH)
   */
  private hasBody(config: TConfig): boolean {
    return this.method === 'POST' || this.method === 'PUT' || this.method === 'PATCH';
  }

  /**
   * Validate configuration before execution
   *
   * @param config - Action configuration to validate
   * @throws CatalystError if configuration is invalid
   */
  private validateConfig(config: TConfig): void {
    if (!config.url) {
      throw new CatalystError(
        'Missing required configuration property: url',
        'HttpConfigInvalid',
        `The ${this.actionName} action requires a 'url' property in the config. Provide a valid HTTP/HTTPS URL.`
      );
    }

    if (config.timeout !== undefined && config.timeout < 0) {
      throw new CatalystError(
        'Invalid timeout value: must be >= 0',
        'HttpConfigInvalid',
        `The timeout value must be a positive number (in milliseconds). Provided: ${config.timeout}`
      );
    }

    try {
      new URL(config.url);
    } catch (error) {
      throw new CatalystError(
        `Invalid URL format: ${config.url}`,
        'HttpConfigInvalid',
        `The URL '${config.url}' is not a valid HTTP/HTTPS URL. URLs must start with http:// or https:// and include a hostname.`,
        error as Error
      );
    }
  }

  /**
   * Handle errors and convert to PlaybookActionResult
   *
   * @param error - Error that occurred
   * @param config - Action configuration
   * @returns PlaybookActionResult with error details
   */
  private handleError(error: Error, config: TConfig): PlaybookActionResult {
    const maskedUrl = maskSensitiveUrlParams(config.url);

    // If already a CatalystError, return it
    if (error instanceof CatalystError) {
      return {
        code: error.code,
        message: `HTTP ${this.method} request to ${maskedUrl} failed: ${error.message}`,
        error
      };
    }

    // Otherwise, wrap in generic error
    const catalystError = new CatalystError(
      `HTTP ${this.method} request failed: ${error.message}`,
      'HttpRequestFailed',
      `An unexpected error occurred during the HTTP ${this.method} request to ${maskedUrl}. See error details for more information.`,
      error
    );

    return {
      code: catalystError.code,
      message: catalystError.message,
      error: catalystError
    };
  }
}
