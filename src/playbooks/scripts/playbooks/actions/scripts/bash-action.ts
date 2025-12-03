/**
 * Bash Action - Bash script execution
 *
 * Executes Bash scripts using child_process.exec() with bash shell.
 * Available on Unix/Linux/macOS systems.
 *
 * Template interpolation ({{variable-name}}) is handled by the template engine
 * BEFORE this action executes, so the config.code and config.env already have
 * variables replaced.
 */

import type { BashConfig } from './types';
import type { PlaybookActionDependencies } from '../../types';
import { ShellActionBase } from './shell-action-base';
import { BashErrors } from './errors';

/**
 * Bash script execution action
 *
 * Executes Bash scripts with environment variable support and proper
 * working directory management.
 *
 * @example
 * ```typescript
 * const action = new BashAction('/repo/root');
 * const result = await action.execute({
 *   code: `
 *     set -e
 *     echo "Building project"
 *     npm run build
 *   `,
 *   env: {
 *     NODE_ENV: 'production'
 *   },
 *   timeout: 120000
 * });
 * ```
 */
export class BashAction extends ShellActionBase<BashConfig> {
  static readonly actionType = 'bash';

  /**
   * External dependencies required by this action
   *
   * Bash executable is required on Unix/Linux/macOS systems (native).
   * On Windows, bash is available via WSL (Windows Subsystem for Linux).
   */
  readonly dependencies: PlaybookActionDependencies = {
    cli: [
      {
        name: 'bash',
        versionCommand: 'bash --version',
        platforms: ['linux', 'darwin'],
        installDocs: 'https://www.gnu.org/software/bash/'
      },
      {
        name: 'bash',
        versionCommand: 'bash --version',
        platforms: ['win32'],
        installDocs: 'https://docs.microsoft.com/windows/wsl/install'
      }
    ]
  };

  /**
   * Primary property for YAML shorthand syntax
   *
   * Enables compact YAML syntax:
   * ```yaml
   * - bash: echo "hello"
   * ```
   * Instead of:
   * ```yaml
   * - bash:
   *     code: echo "hello"
   * ```
   */
  readonly primaryProperty = 'code';

  /**
   * Get the shell executable name
   *
   * @returns 'bash'
   */
  protected getShellExecutable(): string {
    return 'bash';
  }

  /**
   * Get error helper functions for bash
   *
   * @returns Bash error helpers
   */
  protected getErrorHelpers() {
    return BashErrors;
  }
}
