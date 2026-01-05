import type { CatalystError } from '@core/errors';
import type { PlaybookActionDependencies } from './dependencies';
import type { PlaybookStep } from './playbook';

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

/**
 * Interface for executing nested steps within actions
 *
 * Enables control flow actions (if, for-each) and future actions (parallel, retry, timeout)
 * to execute nested steps while maintaining all execution rules. The engine provides this
 * interface to actions that need nested execution capability.
 *
 * **Security**: Actions receive only execution capability, not direct access to PlaybookContext.
 * This prevents actions from arbitrarily modifying execution state or violating execution rules.
 *
 * **Engine Responsibilities**: The engine implementation of this interface MUST:
 * - Apply error policies from step configuration
 * - Update state persistence after each step
 * - Track completed steps for resume capability
 * - Propagate errors according to error handling configuration
 * - Enforce all execution rules consistently
 *
 * @see {@link PlaybookActionWithSteps} Base class for actions using nested execution
 * @see research.md § Nested Step Execution Support for design rationale
 *
 * @example
 * ```typescript
 * // If action (conditional execution)
 * class IfAction extends PlaybookActionWithSteps<IfConfig> {
 *   async execute(config: IfConfig): Promise<PlaybookActionResult> {
 *     const condition = await evaluateCondition(config.condition);
 *
 *     if (condition) {
 *       // Engine enforces all rules automatically
 *       const results = await this.stepExecutor.executeSteps(config.then);
 *       return results[results.length - 1] || { code: 'Success' };
 *     }
 *
 *     return { code: 'Success' };
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // For-each action (iteration with variable injection)
 * class ForEachAction extends PlaybookActionWithSteps<ForEachConfig> {
 *   async execute(config: ForEachConfig): Promise<PlaybookActionResult> {
 *     const items = await getItems(config.items);
 *
 *     for (let i = 0; i < items.length; i++) {
 *       // Inject loop variables into execution scope
 *       await this.stepExecutor.executeSteps(config.steps, {
 *         item: items[i],
 *         index: i
 *       });
 *     }
 *
 *     return { code: 'Success' };
 *   }
 * }
 * ```
 */
export interface StepExecutor {
  /**
   * Execute an array of steps sequentially
   *
   * Steps are executed in order, following the same rules as top-level playbook steps:
   * - Error policies are applied from step configuration
   * - State is persisted after each step
   * - Completed steps are tracked for resume
   * - Errors propagate according to error handling configuration
   *
   * Variable propagation is controlled by the calling action's isolation mode:
   * - `isolated: false` (if, for-each): Variables set by nested steps propagate back to parent
   * - `isolated: true` (playbook): Variables do NOT propagate back to parent
   * - Variable overrides are always scoped regardless of isolation setting
   *
   * The engine determines isolation mode - actions cannot bypass this security boundary.
   *
   * @param steps - Array of steps to execute sequentially
   * @param variableOverrides - Optional variables to inject into execution scope (e.g., loop variables).
   *                            These are always scoped - they do not propagate back to parent regardless
   *                            of isolation setting.
   * @returns Promise resolving to array of step results in execution order
   *
   * @example
   * ```typescript
   * // Simple sequential execution
   * const results = await this.stepExecutor.executeSteps(config.steps);
   *
   * // With variable overrides (loop iteration)
   * await this.stepExecutor.executeSteps(config.steps, {
   *   item: currentItem,
   *   index: i
   * });
   * ```
   */
  executeSteps(
    steps: PlaybookStep[],
    variableOverrides?: Record<string, unknown>
  ): Promise<PlaybookActionResult[]>;

  /**
   * Get the current playbook call stack for circular reference detection
   *
   * Returns the names of playbooks currently being executed, from root to current.
   * Used by PlaybookRunAction to detect and prevent circular playbook references.
   *
   * @returns Array of playbook names in execution order (root first, current last)
   *
   * @example
   * ```typescript
   * // In PlaybookRunAction
   * const callStack = this.stepExecutor.getCallStack();
   * if (callStack.includes(playbookName)) {
   *   throw new CatalystError('Circular reference detected', 'CircularPlaybookReference');
   * }
   * ```
   */
  getCallStack(): string[];

  /**
   * Get a variable value by name
   *
   * Provides secure read-only access to playbook variables. Used by actions that
   * need to access variables at runtime (e.g., script actions with get() function).
   *
   * @param name - Variable name (kebab-case)
   * @returns Variable value, or undefined if not found
   *
   * @example
   * ```typescript
   * // In ScriptAction - provide get() to script code
   * const get = (name: string) => this.stepExecutor.getVariable(name);
   * ```
   */
  getVariable(name: string): unknown;
}

/**
 * Abstract base class for actions that execute nested steps
 *
 * Actions that need to execute nested steps (control flow, iteration, etc.) should extend
 * this class instead of implementing PlaybookAction directly. The engine provides a
 * StepExecutor implementation via the constructor.
 *
 * **Usage Pattern**:
 * - Extend this class when your action needs to execute other steps
 * - Use `this.stepExecutor.executeSteps()` to execute nested steps
 * - The engine enforces all execution rules automatically
 *
 * **Example Actions**:
 * - `if` - Conditional execution (execute then/else steps based on condition)
 * - `for-each` - Iteration (execute steps for each item in array)
 * - `parallel` - Concurrent execution (future)
 * - `retry` - Retry with backoff (future)
 * - `timeout` - Execution with timeout (future)
 *
 * @template TConfig - The expected configuration structure for this action
 *
 * @see {@link StepExecutor} Interface for executing nested steps
 * @see {@link PlaybookAction} Base action interface
 * @see plan.md § PlaybookActionWithSteps Base Class for implementation details
 *
 * @example
 * ```typescript
 * interface IfConfig {
 *   condition: string;  // Template expression
 *   then: PlaybookStep[];
 *   else?: PlaybookStep[];
 * }
 *
 * export class IfAction extends PlaybookActionWithSteps<IfConfig> {
 *   static readonly actionType = 'if';
 *
 *   async execute(config: IfConfig): Promise<PlaybookActionResult> {
 *     const condition = await evaluateTemplate(config.condition);
 *
 *     if (condition) {
 *       const results = await this.stepExecutor.executeSteps(config.then);
 *       return results[results.length - 1] || { code: 'Success' };
 *     } else if (config.else) {
 *       const results = await this.stepExecutor.executeSteps(config.else);
 *       return results[results.length - 1] || { code: 'Success' };
 *     }
 *
 *     return { code: 'Success' };
 *   }
 * }
 * ```
 */
export abstract class PlaybookActionWithSteps<TConfig> implements PlaybookAction<TConfig> {
  /**
   * Construct action with step executor callback
   *
   * The engine provides the StepExecutor implementation when instantiating
   * actions that extend this class.
   *
   * @param stepExecutor - Callback for executing nested steps
   */
  constructor(protected readonly stepExecutor: StepExecutor) {}

  /**
   * Execute the action with the provided configuration
   *
   * Subclasses must implement this method. Use `this.stepExecutor.executeSteps()`
   * to execute nested steps with full engine rule enforcement.
   *
   * @param config - Action-specific configuration object
   * @returns Promise resolving to action result
   */
  abstract execute(config: TConfig): Promise<PlaybookActionResult>;
}
