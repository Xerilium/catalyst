/**
 * GitHub Copilot AI provider implementation
 *
 * Provides integration with GitHub Copilot via the GitHub CLI with Copilot extension.
 * This provider is interactive-only and requires GitHub authentication.
 *
 * @req FR:copilot
 */

import { spawn } from 'child_process';
import { CatalystError } from '../../errors';
import type {
  AIProvider,
  AIProviderCapability,
  AIProviderRequest,
  AIProviderResponse
} from './types';

/**
 * GitHub Copilot provider implementation
 *
 * Uses GitHub CLI with Copilot extension for AI interactions.
 * Requires GitHub authentication and active Copilot subscription.
 *
 * @example
 * ```typescript
 * const provider = new CopilotProvider();
 *
 * // Check availability
 * if (await provider.isAvailable()) {
 *   // Execute prompt
 *   const response = await provider.execute({
 *     systemPrompt: 'You are a code assistant',
 *     prompt: 'Write a hello world function',
 *     inactivityTimeout: 60000
 *   });
 *   console.log(response.content);
 * }
 * ```
 *
 * @req FR:copilot.interface
 */
export class CopilotProvider implements AIProvider {
  /**
   * @req FR:copilot.interface
   */
  readonly name = 'copilot';

  /**
   * @req FR:copilot.interface
   */
  readonly capabilities: AIProviderCapability[] = [];

  /**
   * Check if GitHub CLI is available
   *
   * @returns Promise resolving to true if gh command exists
   * @req FR:copilot.auth.available
   */
  private async checkCliExists(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('gh', ['--version']);

      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      proc.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  /**
   * Check if user is authenticated with GitHub CLI
   *
   * @returns Promise resolving to true if authenticated
   * @req FR:copilot.auth.github
   * @req FR:copilot.auth.available
   */
  private async checkAuthenticated(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('gh', ['auth', 'status']);

      proc.on('error', () => {
        resolve(false);
      });

      proc.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  /**
   * Check if Copilot extension is installed
   *
   * @returns Promise resolving to true if extension is installed
   * @req FR:copilot.auth.github
   * @req FR:copilot.auth.available
   */
  private async checkExtensionInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('gh', ['extension', 'list']);
      let stdout = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('error', () => {
        resolve(false);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.includes('gh-copilot') || stdout.includes('copilot'));
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Check if user has Copilot access (subscription)
   *
   * @returns Promise resolving to true if user has Copilot access
   * @req FR:copilot.auth.github
   * @req FR:copilot.auth.available
   */
  private async checkCopilotAccess(): Promise<boolean> {
    return new Promise((resolve) => {
      // Try a minimal copilot command to verify access
      const proc = spawn('gh', ['copilot', '--version']);

      proc.on('error', () => {
        resolve(false);
      });

      proc.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  /**
   * Check if provider is available
   *
   * Verifies that:
   * - GitHub CLI is installed
   * - User is authenticated
   * - Copilot extension is installed
   * - User has Copilot subscription access
   *
   * @returns Promise resolving to true if all checks pass
   * @req FR:copilot.auth.available
   */
  async isAvailable(): Promise<boolean> {
    // Check CLI exists
    if (!(await this.checkCliExists())) {
      return false;
    }

    // Check authentication
    if (!(await this.checkAuthenticated())) {
      return false;
    }

    // Check extension
    if (!(await this.checkExtensionInstalled())) {
      return false;
    }

    // Check Copilot access
    if (!(await this.checkCopilotAccess())) {
      return false;
    }

    return true;
  }

  /**
   * Interactive sign-in flow
   *
   * Guides user through required setup:
   * - Installing GitHub CLI
   * - Authenticating with GitHub
   * - Installing Copilot extension
   * - Verifying Copilot subscription
   *
   * @throws CatalystError if any prerequisite is missing
   * @req FR:copilot.auth.signin
   */
  async signIn(): Promise<void> {
    // Check CLI exists
    if (!(await this.checkCliExists())) {
      throw new CatalystError(
        'GitHub CLI not found',
        'AIProviderUnavailable',
        'Install GitHub CLI from https://cli.github.com'
      );
    }

    // Check authentication
    if (!(await this.checkAuthenticated())) {
      throw new CatalystError(
        'Not authenticated with GitHub',
        'AIProviderUnavailable',
        'Run: gh auth login'
      );
    }

    // Check extension
    if (!(await this.checkExtensionInstalled())) {
      throw new CatalystError(
        'Copilot extension not installed',
        'AIProviderUnavailable',
        'Run: gh extension install github/gh-copilot'
      );
    }

    // Check Copilot access
    if (!(await this.checkCopilotAccess())) {
      throw new CatalystError(
        'No Copilot subscription detected',
        'AIProviderUnavailable',
        'GitHub Copilot requires an active subscription'
      );
    }

    // All checks passed
  }

  /**
   * Execute an AI prompt via GitHub Copilot CLI
   *
   * Spawns a `gh copilot` process and communicates via stdin/stdout.
   * Supports inactivity timeout and abort signal for cancellation.
   *
   * @param request - The AI request containing prompts and configuration
   * @returns Promise resolving to the AI response
   * @throws CatalystError on execution errors or timeout
   * @req FR:copilot.execute
   * @req FR:copilot.cli
   */
  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    return new Promise((resolve, reject) => {
      // Combine system prompt and user prompt
      const combinedPrompt = `${request.systemPrompt}\n\n${request.prompt}`;

      // Spawn gh copilot process
      const proc = spawn('gh', ['copilot', 'suggest'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout | null = null;
      let inactivityTimeoutId: NodeJS.Timeout | null = null;

      // Cleanup function
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (inactivityTimeoutId) clearTimeout(inactivityTimeoutId);
        if (request.abortSignal) {
          request.abortSignal.removeEventListener('abort', handleAbort);
        }
      };

      // Handle abort signal
      const handleAbort = () => {
        cleanup();
        proc.kill();
        reject(
          new CatalystError(
            'Copilot execution aborted',
            'AIProviderAborted',
            'Request was cancelled'
          )
        );
      };

      // Setup abort signal listener
      if (request.abortSignal) {
        if (request.abortSignal.aborted) {
          handleAbort();
          return;
        }
        request.abortSignal.addEventListener('abort', handleAbort);
      }

      // Setup inactivity timeout
      const resetInactivityTimeout = () => {
        if (inactivityTimeoutId) {
          clearTimeout(inactivityTimeoutId);
        }
        inactivityTimeoutId = setTimeout(() => {
          cleanup();
          proc.kill();
          reject(
            new CatalystError(
              'Copilot execution timed out due to inactivity',
              'AIProviderTimeout',
              'No response received within timeout period'
            )
          );
        }, request.inactivityTimeout);
      };

      resetInactivityTimeout();

      // Handle process errors
      proc.on('error', (err: NodeJS.ErrnoException) => {
        cleanup();
        if (err.code === 'ENOENT') {
          reject(
            new CatalystError(
              'GitHub CLI not found',
              'AIProviderUnavailable',
              'Install GitHub CLI from https://cli.github.com'
            )
          );
        } else {
          reject(
            new CatalystError(
              `Failed to execute Copilot CLI: ${err.message}`,
              'AIProviderError',
              'Check GitHub CLI installation and permissions'
            )
          );
        }
      });

      // Collect stdout
      proc.stdout.on('data', (data) => {
        resetInactivityTimeout();
        stdout += data.toString();
      });

      // Collect stderr
      proc.stderr.on('data', (data) => {
        resetInactivityTimeout();
        stderr += data.toString();
      });

      // Handle process completion
      proc.on('close', (code) => {
        cleanup();

        if (code !== 0) {
          reject(
            new CatalystError(
              `Copilot CLI exited with code ${code}`,
              'AIProviderError',
              stderr || 'Unknown error occurred'
            )
          );
          return;
        }

        // Return response
        resolve({
          content: stdout.trim(),
          model: 'copilot',
          usage: undefined // @req FR:copilot.usage.tokens - CLI doesn't expose token counts
        });
      });

      // Write prompt to stdin
      proc.stdin.write(combinedPrompt);
      proc.stdin.end();
    });
  }
}
