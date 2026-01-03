/**
 * Shell Action Base - Abstract base class for shell script execution
 *
 * Provides common functionality for bash and powershell actions:
 * - Configuration validation
 * - Working directory resolution
 * - Environment variable merging
 * - Shell command execution via child_process
 * - Timeout enforcement
 * - Error mapping to CatalystError codes
 *
 * Subclasses override getShellExecutable() and getErrorHelpers() to provide
 * shell-specific behavior.
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { PlaybookAction, PlaybookActionResult } from '../../types/action';
import type { ShellResult } from './types';
import type { CatalystError } from '@core/errors';

/**
 * Configuration interface for shell actions
 */
interface ShellConfig {
  code: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Error helper functions interface
 */
interface ErrorHelpers {
  configInvalid: (reason: string) => CatalystError;
  invalidCwd: (cwd: string) => CatalystError;
  commandNotFound: (stdout: string, stderr: string) => CatalystError;
  permissionDenied: (stdout: string, stderr: string) => CatalystError;
  commandFailed: (exitCode: number, stdout: string, stderr: string) => CatalystError;
  timeout: (timeoutMs: number) => CatalystError;
}

/**
 * Default timeout for shell execution (60 seconds)
 */
const DEFAULT_TIMEOUT = 60000;

/**
 * Abstract base class for shell script execution actions
 *
 * Provides all common functionality for bash and powershell actions.
 * Subclasses only need to override getShellExecutable() and getErrorHelpers().
 *
 * @req FR:playbook-actions-scripts/shell.base-class
 * @req FR:playbook-actions-scripts/shell.execution
 * @req FR:playbook-actions-scripts/shell.output-capture
 * @req FR:playbook-actions-scripts/shell.error-mapping
 * @req FR:playbook-actions-scripts/common.validation
 * @req FR:playbook-actions-scripts/common.working-directory
 * @req FR:playbook-actions-scripts/common.timeout
 * @req FR:playbook-actions-scripts/common.result-structure
 * @req NFR:playbook-actions-scripts/maintainability.single-responsibility
 * @req NFR:playbook-actions-scripts/maintainability.shared-base
 * @req NFR:playbook-actions-scripts/performance.shell-overhead
 * @req NFR:playbook-actions-scripts/performance.timeout-activation
 * @req NFR:playbook-actions-scripts/reliability.process-cleanup
 * @req NFR:playbook-actions-scripts/testability.timeout-testing
 */
export abstract class ShellActionBase<TConfig extends ShellConfig>
  implements PlaybookAction<TConfig>
{
  /**
   * Create a new shell action
   *
   * @param repositoryRoot - Absolute path to repository root
   */
  constructor(protected readonly repositoryRoot: string) {}

  /**
   * Get the shell executable name
   *
   * @returns Shell executable (e.g., 'bash', 'pwsh')
   */
  protected abstract getShellExecutable(): string;

  /**
   * Get error helper functions for this shell
   *
   * @returns Error helpers for creating CatalystErrors
   */
  protected abstract getErrorHelpers(): ErrorHelpers;

  /**
   * Execute shell script
   *
   * @param config - Shell script configuration
   * @returns Promise resolving to action result
   */
  async execute(config: TConfig): Promise<PlaybookActionResult> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Resolve working directory
      const cwd = this.resolveCwd(config.cwd);

      // Get timeout (with default)
      const timeout = config.timeout ?? DEFAULT_TIMEOUT;

      // Merge environment variables
      const env = {
        ...process.env,
        ...config.env
      };

      // Execute shell command
      const result = await this.executeShell(config.code, cwd, env, timeout);

      // Return success result
      return {
        code: 'Success',
        message: `${this.getShellExecutable()} script executed successfully`,
        value: result,
        error: undefined
      };
    } catch (err) {
      // If it's already a CatalystError, return it
      if (err && typeof err === 'object' && 'code' in err && 'guidance' in err) {
        const catalystErr = err as any;
        return {
          code: catalystErr.code,
          message: catalystErr.message,
          error: catalystErr
        };
      }

      // Otherwise, wrap in runtime error
      const helpers = this.getErrorHelpers();
      const runtimeError = helpers.commandFailed(1, '', (err as Error).message);
      return {
        code: runtimeError.code,
        message: runtimeError.message,
        error: runtimeError
      };
    }
  }

  /**
   * Validate shell configuration
   *
   * @param config - Shell configuration to validate
   * @throws CatalystError if configuration is invalid
   */
  private validateConfig(config: TConfig): void {
    const helpers = this.getErrorHelpers();

    if (!config.code) {
      throw helpers.configInvalid('code property is required');
    }

    if (typeof config.code !== 'string') {
      throw helpers.configInvalid('code must be a string');
    }

    if (config.timeout !== undefined && config.timeout < 0) {
      throw helpers.configInvalid('timeout must be >= 0');
    }
  }

  /**
   * Resolve working directory to absolute path
   *
   * @param cwd - Working directory from config (optional)
   * @returns Absolute path to working directory
   * @throws CatalystError if directory does not exist
   */
  private resolveCwd(cwd?: string): string {
    const helpers = this.getErrorHelpers();

    // Default to repository root
    const resolvedCwd = cwd
      ? path.isAbsolute(cwd)
        ? cwd
        : path.join(this.repositoryRoot, cwd)
      : this.repositoryRoot;

    // Validate directory exists
    if (!fs.existsSync(resolvedCwd)) {
      throw helpers.invalidCwd(resolvedCwd);
    }

    if (!fs.statSync(resolvedCwd).isDirectory()) {
      throw helpers.invalidCwd(resolvedCwd);
    }

    return resolvedCwd;
  }

  /**
   * Execute shell command and capture output
   *
   * @param code - Shell script code to execute
   * @param cwd - Working directory
   * @param env - Environment variables
   * @param timeout - Timeout in milliseconds
   * @returns Promise resolving to shell result
   * @throws CatalystError on execution failure
   */
  private executeShell(
    code: string,
    cwd: string,
    env: NodeJS.ProcessEnv,
    timeout: number
  ): Promise<ShellResult> {
    const helpers = this.getErrorHelpers();
    const shell = this.getShellExecutable();

    return new Promise((resolve, reject) => {
      const child = exec(
        code,
        {
          cwd,
          env,
          timeout,
          shell,
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer for stdout/stderr
        },
        (error, stdout, stderr) => {
          if (error) {
            // Check error type
            if ((error as any).code === 'ENOENT') {
              reject(helpers.commandNotFound(stdout, stderr));
            } else if ((error as any).code === 'EACCES') {
              reject(helpers.permissionDenied(stdout, stderr));
            } else if (error.killed || (error as any).signal === 'SIGTERM') {
              reject(helpers.timeout(timeout));
            } else if ((error as any).code) {
              // Non-zero exit code
              const exitCode = (error as any).code || 1;
              reject(helpers.commandFailed(exitCode, stdout, stderr));
            } else {
              // Unknown error
              reject(helpers.commandFailed(1, stdout, stderr));
            }
          } else {
            // Success
            resolve({
              stdout,
              stderr,
              exitCode: 0
            });
          }
        }
      );
    });
  }
}
