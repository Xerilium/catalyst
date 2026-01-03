import { PlaybookActionWithSteps } from '../../types/action';
import type { PlaybookActionResult } from '../../types';
import type { IfConfig, IfResult } from './types';
import { IfErrors } from './errors';
import { validateStepArray } from './validation';

/**
 * Conditional execution action
 *
 * Evaluates condition and executes then/else branch based on result.
 * Condition is pre-interpolated by template engine before action executes.
 *
 * @example
 * ```typescript
 * const action = new IfAction(stepExecutor);
 * const result = await action.execute({
 *   condition: 'true',
 *   then: [{ action: 'bash', config: { code: 'echo "success"' } }],
 *   else: [{ action: 'bash', config: { code: 'echo "failure"' } }]
 * });
 * ```
 *
 * @req FR:playbook-actions-controls/conditional.if-action
 */
export class IfAction extends PlaybookActionWithSteps<IfConfig> {
  /** @req FR:playbook-actions-controls/metadata.primary-property */
  static readonly actionType = 'if';

  /** @req FR:playbook-actions-controls/metadata.primary-property */
  static readonly primaryProperty = 'condition';

  /**
   * Execute conditional logic
   *
   * @param config - If action configuration
   * @returns Promise resolving to action result with branch information
   *
   * @req FR:playbook-actions-controls/conditional.if-action.base-class
   * @req FR:playbook-actions-controls/conditional.if-action.branch-selection
   * @req FR:playbook-actions-controls/conditional.if-action.step-execution
   * @req FR:playbook-actions-controls/conditional.if-action.nesting
   * @req FR:playbook-actions-controls/conditional.if-action.result
   * @req FR:playbook-actions-controls/execution.nested-steps.base-class
   * @req FR:playbook-actions-controls/execution.nested-steps.mechanisms
   * @req FR:playbook-actions-controls/execution.nested-steps.state-management
   * @req FR:playbook-actions-controls/execution.nested-steps.error-policies
   * @req NFR:playbook-actions-controls/performance.variable-assignment
   */
  async execute(config: IfConfig): Promise<PlaybookActionResult> {
    // Step 1: Validate configuration
    this.validateConfig(config);

    // Step 2: Evaluate condition (uses JavaScript truthy/falsy semantics)
    // Condition has already been template-interpolated by the engine
    const conditionResult = this.evaluateCondition(config.condition);

    // Step 3: Execute appropriate branch
    let branch: 'then' | 'else' | 'none';
    let executed = 0;

    if (conditionResult) {
      // Execute then branch
      const results = await this.stepExecutor.executeSteps(config.then, undefined);
      branch = 'then';
      executed = results.length;
    } else if (config.else && config.else.length > 0) {
      // Execute else branch
      const results = await this.stepExecutor.executeSteps(config.else, undefined);
      branch = 'else';
      executed = results.length;
    } else {
      // No else branch, condition was falsy
      branch = 'none';
      executed = 0;
    }

    // Step 4: Return result
    const result: IfResult = {
      branch,
      executed
    };

    return {
      code: 'Success',
      message: `Executed ${branch} branch with ${executed} steps`,
      value: result
    };
  }

  /**
   * Validate if action configuration
   *
   * @param config - Configuration to validate
   * @throws CatalystError if configuration is invalid
   *
   * @req FR:playbook-actions-controls/conditional.if-action.validation
   * @req FR:playbook-actions-controls/conditional.if-action.error-handling
   */
  private validateConfig(config: IfConfig): void {
    // Validate condition exists and is non-empty
    if (!config.condition || typeof config.condition !== 'string') {
      throw IfErrors.configInvalid('condition property is required and must be a string');
    }

    if (config.condition.trim() === '') {
      throw IfErrors.configInvalid('condition must be a non-empty string');
    }

    // Validate then branch exists and is valid
    if (!config.then) {
      throw IfErrors.configInvalid('then property is required');
    }

    validateStepArray(config.then, 'If', 'then');

    // Validate else branch if provided
    if (config.else !== undefined) {
      if (!Array.isArray(config.else)) {
        throw IfErrors.configInvalid('else property must be an array');
      }

      if (config.else.length > 0) {
        validateStepArray(config.else, 'If', 'else');
      }
    }
  }

  /**
   * Evaluate condition using JavaScript truthy/falsy semantics
   *
   * The condition has already been template-interpolated by the engine,
   * so we just need to evaluate it as a boolean.
   *
   * @param condition - Condition string (already interpolated)
   * @returns true if condition is truthy, false otherwise
   *
   * @req FR:playbook-actions-controls/conditional.if-action.evaluation
   * @req NFR:playbook-actions-controls/performance.condition-eval
   */
  private evaluateCondition(condition: string): boolean {
    // Handle special string values that represent boolean false
    const trimmed = condition.trim().toLowerCase();

    // Explicitly falsy string values (note: "0" is NOT falsy per JavaScript string semantics)
    if (trimmed === '' || trimmed === 'false' || trimmed === 'null' || trimmed === 'undefined') {
      return false;
    }

    // Everything else is truthy (including "0")
    return true;
  }
}
