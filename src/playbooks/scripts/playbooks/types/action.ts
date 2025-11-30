import type { CatalystError } from '../../errors';
import type { PlaybookActionDependencies } from './dependencies';

/**
 * Base interface for all playbook actions
 *
 * All playbook actions must implement this interface. The generic type parameter
 * TConfig enables type-safe configuration for each action implementation.
 *
 * @template TConfig - The expected configuration structure for this action
 *
 * @example
 * ```typescript
 * interface MyActionConfig {
 *   inputValue: string;
 *   options?: { flag: boolean };
 * }
 *
 * class MyAction implements PlaybookAction<MyActionConfig> {
 *   static readonly dependencies: PlaybookActionDependencies = {
 *     cli: [{
 *       name: 'my-cli-tool',
 *       versionCommand: 'my-cli-tool --version',
 *       installDocs: 'https://example.com/install'
 *     }]
 *   };
 *
 *   async execute(config: MyActionConfig): Promise<PlaybookActionResult> {
 *     const result = await doSomething(config.inputValue);
 *     return {
 *       code: 'Success',
 *       value: result,
 *       error: null
 *     };
 *   }
 * }
 * ```
 */
export interface PlaybookAction<TConfig = unknown> {
  /**
   * Execute the action with the provided configuration
   *
   * @param config - Action-specific configuration object
   * @returns Promise resolving to action result
   */
  execute(config: TConfig): Promise<PlaybookActionResult>;

  /**
   * Optional dependency metadata
   *
   * Declares external CLI tools and environment variables required by this action.
   * Used for pre-execution validation and documentation generation.
   *
   * @example
   * ```typescript
   * static readonly dependencies: PlaybookActionDependencies = {
   *   cli: [{ name: 'bash', versionCommand: 'bash --version' }],
   *   env: [{ name: 'API_KEY', required: true }]
   * };
   * ```
   */
  dependencies?: PlaybookActionDependencies;
}

/**
 * Result of a playbook action execution
 *
 * Represents the outcome of a single step execution. Success is determined
 * by error === null. If error is present, the action failed.
 *
 * @example
 * ```typescript
 * // Success result
 * const success: PlaybookActionResult = {
 *   code: 'UserCreated',
 *   message: 'Successfully created user alice@example.com',
 *   value: { userId: 123, email: 'alice@example.com' },
 *   error: null
 * };
 *
 * // Error result
 * const failure: PlaybookActionResult = {
 *   code: 'ValidationFailed',
 *   message: 'Invalid email format',
 *   error: new CatalystError('Validation failed', 'ValidationFailed')
 * };
 * ```
 */
export interface PlaybookActionResult {
  /**
   * Result or error code (optional)
   *
   * Examples: 'Success', 'FileNotFound', 'ValidationFailed', 'UserCreated'
   */
  code?: string;

  /**
   * Human-readable message for logging (optional)
   *
   * Should provide context about what happened during execution.
   */
  message?: string;

  /**
   * Action-specific output value (optional)
   *
   * This value is automatically added to variables for named steps,
   * making it available to subsequent steps via template interpolation.
   */
  value?: unknown;

  /**
   * Error details if action failed (optional)
   *
   * If null or undefined, the action succeeded.
   * If present, the action failed and error contains details.
   */
  error?: CatalystError;
}
