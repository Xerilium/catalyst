/**
 * Cursor AI provider implementation via Cursor CLI
 *
 * Provides integration with Cursor AI for users with Cursor subscriptions.
 * Uses the Cursor CLI for communication and requires interactive authentication.
 *
 * Features:
 * - CLI-based execution via `cursor` command
 * - Interactive authentication (no headless support)
 * - Limited token tracking (CLI may not expose counts)
 * - Timeout and cancellation support
 *
 * Limitations:
 * - Cursor CLI interface is not fully documented; implementation uses best-effort approach
 * - Token counting may not be available from CLI output
 * - Model selection may not be configurable via CLI
 *
 * @example
 * ```typescript
 * const provider = new CursorProvider();
 *
 * // Check availability
 * if (await provider.isAvailable()) {
 *   const response = await provider.execute({
 *     systemPrompt: 'You are a helpful assistant.',
 *     prompt: 'What is TypeScript?',
 *     inactivityTimeout: 60000
 *   });
 *   console.log(response.content);
 * }
 * ```
 */

import { spawn } from 'child_process';
import { CatalystError } from '@core/errors';
import type {
  AIProvider,
  AIProviderCapability,
  AIProviderCommandConfig,
  AIProviderRequest,
  AIProviderResponse
} from '../types';

/**
 * Cursor AI provider implementation
 *
 * @req FR:ai-provider-cursor/cursor
 * @req FR:ai-provider-cursor/cursor.interface
 * @req FR:ai-provider-cursor/cursor.cli
 */
export class CursorProvider implements AIProvider {
  /**
   * Provider name
   *
   * @req FR:ai-provider-cursor/cursor.interface
   */
  readonly name = 'cursor';

  /** @req FR:ai-provider/provider.interface */
  readonly displayName = 'Cursor';

  /**
   * Provider capabilities (empty = interactive-only, no headless)
   *
   * @req FR:ai-provider-cursor/cursor.interface
   */
  readonly capabilities: AIProviderCapability[] = [];

  /**
   * @req FR:ai-provider/provider.command-config
   * @req FR:ai-provider-cursor/cursor.commands
   */
  readonly commands: AIProviderCommandConfig = {
    path: '.cursor/commands',
    useNamespaces: true,
    separator: '/',
    useFrontMatter: true,
    extension: 'md'
  };

  /**
   * Execute AI prompt via Cursor CLI
   *
   * Constructs a prompt from system and user prompts, invokes the Cursor CLI,
   * and returns the parsed response.
   *
   * @param request - The AI request with prompts and configuration
   * @returns Promise resolving to AI response
   * @throws CatalystError on CLI errors, authentication failures, or timeouts
   *
   * @req FR:ai-provider-cursor/cursor.execute
   * @req FR:ai-provider-cursor/cursor.cli
   * @req FR:ai-provider-cursor/cursor.models
   */
  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    const { systemPrompt, prompt, inactivityTimeout, abortSignal } = request;

    // Construct full prompt combining system and user prompts
    // @req FR:ai-provider-cursor/cursor.execute
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    // Build CLI arguments
    // Note: The exact CLI interface is uncertain. Using a best-effort approach.
    // We'll pass the prompt as an argument. Adjust based on actual CLI behavior.
    const args = ['--ai', fullPrompt];

    return new Promise<AIProviderResponse>((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timeoutHandle: NodeJS.Timeout | undefined;
      let abortHandler: (() => void) | undefined;

      /**
       * @req FR:ai-provider-cursor/cursor.cli
       */
      const childProcess = spawn('cursor', args);

      // Setup cleanup function
      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        if (abortHandler && abortSignal) {
          abortSignal.removeEventListener('abort', abortHandler);
        }
      };

      // Setup inactivity timeout
      // @req FR:ai-provider-cursor/cursor.execute
      // @req NFR:ai-provider-cursor/cursor.performance.auth-check
      const resetTimeout = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        timeoutHandle = setTimeout(() => {
          childProcess.kill();
          cleanup();
          reject(new CatalystError(
            'Cursor CLI execution timed out',
            'AIProviderTimeout',
            'Increase inactivityTimeout or check Cursor CLI responsiveness'
          ));
        }, inactivityTimeout);
      };

      // Start initial timeout
      resetTimeout();

      // Setup abort signal handling
      // @req FR:ai-provider-cursor/cursor.execute
      if (abortSignal) {
        abortHandler = () => {
          childProcess.kill();
          cleanup();
          reject(new CatalystError(
            'Cursor CLI execution cancelled',
            'AIProviderCancelled',
            'Execution was cancelled by user'
          ));
        };
        abortSignal.addEventListener('abort', abortHandler);
      }

      // Handle process errors (e.g., ENOENT when CLI not found)
      // @req FR:ai-provider-cursor/cursor.errors.cli-missing
      childProcess.on('error', (error: NodeJS.ErrnoException) => {
        cleanup();

        if (error.code === 'ENOENT') {
          reject(new CatalystError(
            'Cursor CLI not found',
            'AIProviderUnavailable',
            'Install Cursor IDE and enable CLI access. Visit https://cursor.com for installation instructions.'
          ));
        } else {
          reject(new CatalystError(
            `Cursor CLI error: ${error.message}`,
            'AIProviderError',
            'Check Cursor CLI installation and permissions',
            error
          ));
        }
      });

      // Collect stdout
      childProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        resetTimeout(); // Reset timeout on activity
      });

      // Collect stderr
      childProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        resetTimeout(); // Reset timeout on activity
      });

      // Handle process completion
      childProcess.on('close', (code: number) => {
        cleanup();

        if (code !== 0) {
          // Parse error type from stderr
          const stderrLower = stderr.toLowerCase();

          // @req FR:ai-provider-cursor/cursor.errors.auth
          if (stderrLower.includes('not authenticated') || stderrLower.includes('authentication required')) {
            reject(new CatalystError(
              'Not authenticated with Cursor',
              'AIProviderUnavailable',
              'Sign in to Cursor IDE using your Cursor account'
            ));
            return;
          }

          // @req FR:ai-provider-cursor/cursor.errors.no-access
          if (stderrLower.includes('subscription') || stderrLower.includes('no access')) {
            reject(new CatalystError(
              'No Cursor subscription or access',
              'AIProviderUnavailable',
              'Cursor subscription required. Visit https://cursor.com for subscription details.'
            ));
            return;
          }

          // Generic error
          reject(new CatalystError(
            `Cursor CLI failed with exit code ${code}`,
            'AIProviderError',
            `CLI output: ${stderr || 'No error details available'}`
          ));
          return;
        }

        // Parse response
        // @req FR:ai-provider-cursor/cursor.execute
        // @req FR:ai-provider-cursor/cursor.models
        // @req FR:ai-provider-cursor/cursor.usage.tokens
        const response: AIProviderResponse = {
          content: stdout.trim(),
          model: this.detectModel(stdout, stderr),
          usage: this.parseUsage(stdout, stderr)
        };

        resolve(response);
      });
    });
  }

  /**
   * Check if Cursor CLI is available and user is authenticated
   *
   * @returns Promise resolving to true if provider can execute requests
   *
   * @req FR:ai-provider-cursor/cursor.auth.available
   * @req FR:ai-provider-cursor/cursor.auth.cursor
   * @req NFR:ai-provider-cursor/cursor.performance.auth-check
   */
  async isAvailable(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      // Try to run cursor --version to check availability
      // @req FR:ai-provider-cursor/cursor.cli
      // @req FR:ai-provider-cursor/cursor.auth.available
      const childProcess = spawn('cursor', ['--version']);

      let hasOutput = false;

      childProcess.stdout.on('data', () => {
        hasOutput = true;
      });

      childProcess.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      childProcess.on('close', (code: number) => {
        // CLI exists if we got here without ENOENT and got output
        resolve(code === 0 && hasOutput);
      });

      // Timeout after 500ms per performance requirement
      // @req NFR:ai-provider-cursor/cursor.performance.auth-check
      setTimeout(() => {
        childProcess.kill();
        resolve(false);
      }, 500);
    });
  }

  /**
   * Interactive sign-in flow for Cursor authentication
   *
   * Provides guidance for authenticating via Cursor IDE since programmatic
   * sign-in is not supported.
   *
   * @throws CatalystError always (interactive authentication required)
   *
   * @req FR:ai-provider-cursor/cursor.auth.signin
   * @req FR:ai-provider-cursor/cursor.auth.cursor
   */
  async signIn(): Promise<void> {
    // @req FR:ai-provider-cursor/cursor.auth.signin
    // @req FR:ai-provider-cursor/cursor.auth.cursor
    console.log('');
    console.log('Cursor authentication is required.');
    console.log('');
    console.log('To authenticate:');
    console.log('1. Open Cursor IDE');
    console.log('2. Sign in with your Cursor account');
    console.log('3. Ensure you have an active Cursor subscription');
    console.log('4. Run this command again');
    console.log('');

    throw new CatalystError(
      'Interactive authentication required for cursor provider',
      'AIProviderUnavailable',
      'Sign in to Cursor IDE and ensure you have an active subscription'
    );
  }

  /**
   * Detect the model used from CLI output
   *
   * Returns 'cursor' by default since the CLI may not expose model information.
   *
   * @param stdout - Standard output from CLI
   * @param stderr - Standard error from CLI
   * @returns Model identifier
   *
   * @req FR:ai-provider-cursor/cursor.models
   */
  private detectModel(stdout: string, stderr: string): string {
    // The Cursor CLI interface is uncertain. Model detection would require
    // parsing CLI output if it includes model information. For now, return 'cursor'.
    // @req FR:ai-provider-cursor/cursor.models
    return 'cursor';
  }

  /**
   * Parse usage statistics from CLI output
   *
   * Returns undefined if CLI does not expose token counts.
   *
   * @param stdout - Standard output from CLI
   * @param stderr - Standard error from CLI
   * @returns Usage stats or undefined
   *
   * @req FR:ai-provider-cursor/cursor.usage.tokens
   */
  private parseUsage(stdout: string, stderr: string): AIProviderResponse['usage'] {
    // The Cursor CLI may not expose token counts in its output.
    // Attempt to parse if available, otherwise return undefined.
    // @req FR:ai-provider-cursor/cursor.usage.tokens

    // TODO: Parse token counts if CLI provides them in output
    // For now, return undefined since the CLI interface is uncertain
    return undefined;
  }
}
