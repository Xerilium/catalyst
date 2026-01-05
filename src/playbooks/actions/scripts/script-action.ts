/**
 * Script Action - JavaScript execution in isolated VM context
 *
 * Executes JavaScript code in an isolated VM context with controlled access to:
 * - fs module for file operations
 * - path module for path manipulation
 * - console for logging
 * - get() function for accessing playbook variables (via StepExecutor)
 */

import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';
import { PlaybookActionWithSteps, type PlaybookActionResult } from '../../types/action';
import type { ScriptConfig } from './types';
import { ScriptErrors } from './errors';

/**
 * Default timeout for script execution (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * JavaScript execution action
 *
 * Executes JavaScript code in an isolated VM context with file system access
 * and playbook variable access via the get() function.
 *
 * @example
 * ```typescript
 * const action = new ScriptAction(stepExecutor);
 * const result = await action.execute({
 *   code: `
 *     const data = get('step-result');
 *     const files = fs.readdirSync('.');
 *     return { data, fileCount: files.length };
 *   `,
 *   timeout: 30000
 * });
 * ```
 *
 * @req FR:playbook-actions-scripts/script.interface
 */
export class ScriptAction extends PlaybookActionWithSteps<ScriptConfig> {
  static readonly actionType = 'script';

  readonly primaryProperty = 'code';

  /**
   * Execute JavaScript code in isolated VM context
   *
   * @param config - Script configuration
   * @returns Promise resolving to action result
   *
   * @req FR:playbook-actions-scripts/script.vm-execution
   * @req FR:playbook-actions-scripts/script.context-injection
   * @req FR:playbook-actions-scripts/script.error-handling
   * @req FR:playbook-actions-scripts/script.return-value
   * @req FR:playbook-actions-scripts/common.timeout
   * @req FR:playbook-actions-scripts/common.result-structure
   * @req FR:playbook-actions-scripts/security.script
   * @req NFR:playbook-actions-scripts/maintainability.single-responsibility
   * @req NFR:playbook-actions-scripts/performance.script-overhead
   * @req NFR:playbook-actions-scripts/reliability.memory-leaks
   */
  async execute(config: ScriptConfig): Promise<PlaybookActionResult> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Resolve working directory
      const cwd = this.resolveCwd(config.cwd);

      // Get timeout (with default)
      const timeout = config.timeout ?? DEFAULT_TIMEOUT;

      // Create get() function for variable access (via StepExecutor)
      const get = (key: string): unknown => {
        return this.stepExecutor.getVariable(key);
      };

      // Create VM context with controlled injection
      const context = vm.createContext({
        console,
        get,
        fs,
        path,
        // Add working directory to context for reference
        __dirname: cwd,
        // Explicitly block dangerous globals
        require: undefined,
        import: undefined,
        process: undefined,
        global: undefined,
        __filename: undefined
      });

      // Wrap code in async function for await support
      const wrappedCode = `(async () => { ${config.code} })()`;

      // Compile script
      let script: vm.Script;
      try {
        script = new vm.Script(wrappedCode);
      } catch (err) {
        throw ScriptErrors.syntaxError(err as Error);
      }

      // Execute script with timeout
      let result: unknown;
      try {
        result = await script.runInContext(context, { timeout });
      } catch (err) {
        // Check if timeout error (VM throws Error with message containing 'timeout' or code ETIMEDOUT)
        if (err instanceof Error) {
          const errorMessage = err.message.toLowerCase();
          const errorCode = (err as any).code;
          if (errorMessage.includes('timeout') || errorCode === 'ETIMEDOUT' || errorMessage.includes('script execution timed out')) {
            throw ScriptErrors.timeout(timeout);
          }
        }
        throw ScriptErrors.runtimeError(err as Error);
      }

      // Return success result
      return {
        code: 'Success',
        message: 'Script executed successfully',
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
      const runtimeError = ScriptErrors.runtimeError(err as Error);
      return {
        code: runtimeError.code,
        message: runtimeError.message,
        error: runtimeError
      };
    }
  }

  /**
   * Validate script configuration
   *
   * @param config - Script configuration to validate
   * @throws CatalystError if configuration is invalid
   *
   * @req FR:playbook-actions-scripts/common.validation
   */
  private validateConfig(config: ScriptConfig): void {
    if (!config.code) {
      throw ScriptErrors.configInvalid('code property is required');
    }

    if (typeof config.code !== 'string') {
      throw ScriptErrors.configInvalid('code must be a string');
    }

    if (config.timeout !== undefined && config.timeout < 0) {
      throw ScriptErrors.configInvalid('timeout must be >= 0');
    }
  }

  /**
   * Resolve working directory to absolute path
   *
   * @param cwd - Working directory from config (optional)
   * @returns Absolute path to working directory
   * @throws CatalystError if directory does not exist
   *
   * @req FR:playbook-actions-scripts/common.working-directory
   */
  private resolveCwd(cwd?: string): string {
    const repoRoot = process.cwd();

    // Default to repository root
    const resolvedCwd = cwd
      ? path.isAbsolute(cwd)
        ? cwd
        : path.join(repoRoot, cwd)
      : repoRoot;

    // Validate directory exists
    if (!fs.existsSync(resolvedCwd)) {
      throw ScriptErrors.invalidCwd(resolvedCwd);
    }

    if (!fs.statSync(resolvedCwd).isDirectory()) {
      throw ScriptErrors.invalidCwd(resolvedCwd);
    }

    return resolvedCwd;
  }
}
