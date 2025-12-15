/**
 * Script Execution Actions
 *
 * This module provides three script execution actions for Catalyst playbooks:
 *
 * - **script**: JavaScript execution in isolated VM context
 * - **bash**: Bash script execution (Unix/Linux/macOS)
 * - **powershell**: PowerShell script execution (cross-platform, requires pwsh)
 *
 * All actions support:
 * - Template interpolation ({{}} replacement before execution)
 * - Working directory configuration
 * - Timeout enforcement
 * - Comprehensive error handling with CatalystError codes
 *
 * @example
 * ```typescript
 * import { ScriptAction, BashAction, PowerShellAction } from './actions/scripts';
 *
 * // JavaScript execution
 * const scriptAction = new ScriptAction('/repo/root', { 'pr-number': 123 });
 * await scriptAction.execute({
 *   code: 'return get("pr-number") * 2;'
 * });
 *
 * // Bash execution
 * const bashAction = new BashAction('/repo/root');
 * await bashAction.execute({
 *   code: 'npm run build',
 *   env: { NODE_ENV: 'production' }
 * });
 *
 * // PowerShell execution
 * const pwshAction = new PowerShellAction('/repo/root');
 * await pwshAction.execute({
 *   code: 'npm test',
 *   env: { NODE_ENV: 'test' }
 * });
 * ```
 *
 * @req FR:playbook-actions-scripts/script.interface
 * @req FR:playbook-actions-scripts/shell.bash
 * @req FR:playbook-actions-scripts/shell.powershell
 * @req NFR:playbook-actions-scripts/maintainability.typescript
 */

// Export types
export type { ScriptConfig, BashConfig, PowerShellConfig, ShellResult } from './types';

// Export error codes
export { ScriptErrorCodes, BashErrorCodes, PowerShellErrorCodes } from './errors';

// Export actions
export { ScriptAction } from './script-action';
export { BashAction } from './bash-action';
export { PowerShellAction } from './powershell-action';
