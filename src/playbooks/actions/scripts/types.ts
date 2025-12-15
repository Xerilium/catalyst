/**
 * Type definitions for script execution actions
 *
 * This module defines configuration interfaces and result types for the script execution actions:
 * - script: JavaScript execution in isolated VM context
 * - bash: Bash script execution via child_process
 * - powershell: PowerShell script execution via child_process
 *
 * @req FR:playbook-actions-scripts/script.interface
 * @req FR:playbook-actions-scripts/shell.bash
 * @req FR:playbook-actions-scripts/shell.powershell
 * @req FR:playbook-actions-scripts/shell.output-capture
 * @req NFR:playbook-actions-scripts/maintainability.typescript
 */

/**
 * Configuration for the script action (JavaScript execution)
 *
 * Executes JavaScript code in an isolated VM context with controlled access to:
 * - fs module for file operations
 * - path module for path manipulation
 * - console for logging
 * - get() function for accessing playbook variables
 *
 * @example
 * ```typescript
 * const config: ScriptConfig = {
 *   code: `
 *     const prNumber = get('pr-number');
 *     const files = fs.readdirSync('.');
 *     return { prNumber, fileCount: files.length };
 *   `,
 *   cwd: '/path/to/repo',
 *   timeout: 30000
 * };
 * ```
 */
export interface ScriptConfig {
  /**
   * JavaScript code to execute
   *
   * Code is wrapped in an async function and executed in an isolated VM context.
   * The return value becomes the action result value.
   */
  code: string;

  /**
   * Working directory for file operations
   *
   * @default Repository root
   */
  cwd?: string;

  /**
   * Maximum execution time in milliseconds
   *
   * @default 30000 (30 seconds)
   */
  timeout?: number;
}

/**
 * Configuration for the bash action (Bash script execution)
 *
 * Executes Bash scripts using child_process.exec() with bash shell.
 * Available on Unix/Linux/macOS systems.
 *
 * @example
 * ```typescript
 * const config: BashConfig = {
 *   code: `
 *     set -e
 *     echo "Building project"
 *     npm run build
 *   `,
 *   cwd: '/path/to/repo',
 *   env: {
 *     NODE_ENV: 'production'
 *   },
 *   timeout: 120000
 * };
 * ```
 */
export interface BashConfig {
  /**
   * Bash script to execute
   *
   * Script is executed using bash shell via child_process.exec().
   */
  code: string;

  /**
   * Working directory for script execution
   *
   * @default Repository root
   */
  cwd?: string;

  /**
   * Environment variables for script execution
   *
   * These are merged with process.env, with config values taking precedence.
   */
  env?: Record<string, string>;

  /**
   * Maximum execution time in milliseconds
   *
   * @default 60000 (60 seconds)
   */
  timeout?: number;
}

/**
 * Configuration for the powershell action (PowerShell script execution)
 *
 * Executes PowerShell scripts using child_process.exec() with pwsh shell.
 * Requires PowerShell 7+ (cross-platform).
 *
 * @example
 * ```typescript
 * const config: PowerShellConfig = {
 *   code: `
 *     $ErrorActionPreference = 'Stop'
 *     Write-Host "Running tests"
 *     npm test
 *   `,
 *   cwd: '/path/to/repo',
 *   env: {
 *     NODE_ENV: 'test'
 *   },
 *   timeout: 60000
 * };
 * ```
 */
export interface PowerShellConfig {
  /**
   * PowerShell script to execute
   *
   * Script is executed using pwsh shell via child_process.exec().
   */
  code: string;

  /**
   * Working directory for script execution
   *
   * @default Repository root
   */
  cwd?: string;

  /**
   * Environment variables for script execution
   *
   * These are merged with process.env, with config values taking precedence.
   */
  env?: Record<string, string>;

  /**
   * Maximum execution time in milliseconds
   *
   * @default 60000 (60 seconds)
   */
  timeout?: number;
}

/**
 * Result of shell script execution (bash and powershell actions)
 *
 * Contains the output streams and exit code from the shell process.
 */
export interface ShellResult {
  /**
   * Standard output from the shell process
   */
  stdout: string;

  /**
   * Standard error from the shell process
   */
  stderr: string;

  /**
   * Exit code from the shell process
   *
   * 0 indicates success, non-zero indicates failure.
   */
  exitCode: number;
}
