/**
 * PowerShell Action - PowerShell script execution
 *
 * Executes PowerShell scripts using child_process.exec() with pwsh shell.
 * Requires PowerShell 7+ (cross-platform).
 *
 * Template interpolation ({{variable-name}}) is handled by the template engine
 * BEFORE this action executes, so the config.code and config.env already have
 * variables replaced.
 */

import type { PowerShellConfig } from './types';
import type { PlaybookActionDependencies } from '../../types';
import { ShellActionBase } from './shell-action-base';
import { PowerShellErrors } from './errors';

/**
 * PowerShell script execution action
 *
 * Executes PowerShell scripts with environment variable support and proper
 * working directory management.
 *
 * @example
 * ```typescript
 * const action = new PowerShellAction();
 * const result = await action.execute({
 *   code: `
 *     $ErrorActionPreference = 'Stop'
 *     Write-Host "Running tests"
 *     npm test
 *   `,
 *   env: {
 *     NODE_ENV: 'test'
 *   },
 *   timeout: 60000
 * });
 * ```
 *
 * @req FR:playbook-actions-scripts/shell.powershell
 * @req FR:playbook-actions-scripts/shell.base-class
 * @req FR:playbook-actions-scripts/security.shell
 * @req NFR:playbook-actions-scripts/maintainability.shared-base
 */
export class PowerShellAction extends ShellActionBase<PowerShellConfig> {
  static readonly actionType = 'powershell';

  /**
   * External dependencies required by this action
   *
   * Requires PowerShell 7+ (pwsh), available cross-platform.
   */
  readonly dependencies: PlaybookActionDependencies = {
    cli: [{
      name: 'pwsh',
      versionCommand: 'pwsh --version',
      minVersion: '7.0.0',
      installDocs: 'https://github.com/PowerShell/PowerShell#get-powershell'
    }]
  };

  /**
   * Primary property for YAML shorthand syntax
   *
   * Enables compact YAML syntax:
   * ```yaml
   * - powershell: Write-Host "hello"
   * ```
   * Instead of:
   * ```yaml
   * - powershell:
   *     code: Write-Host "hello"
   * ```
   */
  readonly primaryProperty = 'code';

  /**
   * Get the shell executable name
   *
   * @returns 'pwsh'
   */
  protected getShellExecutable(): string {
    return 'pwsh';
  }

  /**
   * Get error helper functions for PowerShell
   *
   * @returns PowerShell error helpers
   */
  protected getErrorHelpers() {
    return PowerShellErrors;
  }
}
