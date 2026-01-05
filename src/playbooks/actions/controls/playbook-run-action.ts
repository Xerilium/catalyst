/**
 * PlaybookRunAction - Child playbook execution action
 *
 * Executes a registered playbook by name with optional input parameters.
 * Enables playbook composition - allowing playbooks to invoke other playbooks as steps.
 *
 * Child playbook execution is isolated - the child cannot modify parent context,
 * and inputs/outputs are explicitly mapped.
 *
 * This action extends PlaybookActionWithSteps to use StepExecutor for nested execution.
 * It loads playbooks via PlaybookProvider (zero coupling to playbook-yaml).
 *
 * @req FR:playbook-actions-controls/composition.playbook-action
 * @req FR:playbook-actions-controls/composition.playbook-action.base-class
 * @req FR:playbook-actions-controls/composition.playbook-action.loading
 * @req FR:playbook-actions-controls/composition.playbook-action.execution
 * @req FR:playbook-actions-controls/composition.playbook-action.circular-detection
 * @req FR:playbook-actions-controls/composition.playbook-action.recursion-limit
 * @req FR:playbook-actions-controls/composition.playbook-action.outputs
 * @req FR:playbook-actions-controls/composition.playbook-action.validation
 * @req FR:playbook-actions-controls/execution.nested-steps.call-stack
 * @req FR:playbook-actions-controls/metadata.primary-property
 *
 * @example
 * ```yaml
 * steps:
 *   # Shorthand syntax (primary property)
 *   - playbook: child-playbook-name
 *
 *   # Full syntax with input mapping
 *   - action: playbook
 *     config:
 *       name: deploy-service
 *       inputs:
 *         service-name: my-service
 *         environment: production
 * ```
 */

import type { PlaybookActionResult, StepExecutor } from '../../types';
import { PlaybookActionWithSteps } from '../../types';
import type { Playbook } from '../../types/playbook';
import type { PlaybookRunConfig } from './types';
import { PlaybookRunErrors } from './errors';
import { PlaybookProvider } from '../../registry/playbook-provider';
import { LoggerSingleton } from '@core/logging';

export class PlaybookRunAction extends PlaybookActionWithSteps<PlaybookRunConfig> {
  /**
   * Action type identifier for registry
   */
  static readonly actionType = 'playbook';

  /**
   * Primary property for YAML shorthand syntax
   * Enables: `playbook: child-playbook-name`
   */
  readonly primaryProperty = 'name';

  /**
   * Default isolation mode for nested step execution
   * Child playbooks are isolated by default for security - they cannot modify parent context
   */
  readonly isolated = true;

  /**
   * Maximum recursion depth limit
   */
  private static readonly MAX_RECURSION_DEPTH = 10;

  /**
   * Playbook loader function
   * Provided via constructor for testability
   */
  private readonly loadPlaybook: (name: string) => Promise<Playbook | undefined>;

  /**
   * Create a new PlaybookRunAction
   *
   * @param stepExecutor - Step executor for nested execution (from base class)
   * @param loadPlaybook - Optional playbook loader (defaults to PlaybookProvider)
   */
  constructor(
    stepExecutor: StepExecutor,
    loadPlaybook?: (name: string) => Promise<Playbook | undefined>
  ) {
    super(stepExecutor);
    this.loadPlaybook = loadPlaybook || ((name: string) =>
      PlaybookProvider.getInstance().load(name)
    );
  }

  /**
   * Execute child playbook
   *
   * @param config - PlaybookRun configuration (already interpolated by Engine)
   * @returns Promise resolving to action result with child outputs
   * @throws CatalystError if playbook not found, circular reference, or exceeds depth
   */
  async execute(config: PlaybookRunConfig): Promise<PlaybookActionResult> {
    const logger = LoggerSingleton.getInstance();

    // Step 1: Validate configuration
    this.validateConfig(config);

    const { name, inputs = {} } = config;
    logger.debug('PlaybookRunAction', 'Execute', 'Executing playbook', { name, inputKeys: Object.keys(inputs) });

    // Step 2: Check for circular references
    const callStack = this.stepExecutor.getCallStack();
    if (callStack.includes(name)) {
      logger.debug('PlaybookRunAction', 'Execute', 'Circular reference detected', { name, callStack });
      throw PlaybookRunErrors.circularReference([...callStack, name]);
    }

    // Step 3: Check recursion depth limit
    if (callStack.length >= PlaybookRunAction.MAX_RECURSION_DEPTH) {
      logger.debug('PlaybookRunAction', 'Execute', 'Max depth exceeded', { depth: callStack.length, max: PlaybookRunAction.MAX_RECURSION_DEPTH });
      throw PlaybookRunErrors.maxDepthExceeded(PlaybookRunAction.MAX_RECURSION_DEPTH);
    }

    logger.trace('PlaybookRunAction', 'Execute', 'Call stack', { callStack, depth: callStack.length });

    // Step 4: Load child playbook
    const childPlaybook = await this.loadPlaybook(name);
    if (!childPlaybook) {
      try {
        const provider = PlaybookProvider.getInstance();
        const loaders = provider.getProviderNames();
        logger.debug('PlaybookRunAction', 'Execute', 'Playbook not found', { name, loaders });
        throw PlaybookRunErrors.playbookNotFound(name, loaders);
      } catch (error) {
        // If provider access fails (e.g., in tests), provide empty loader list
        if ((error as any).code === 'PlaybookNotFound') {
          throw error;
        }
        throw PlaybookRunErrors.playbookNotFound(name, []);
      }
    }

    logger.verbose('PlaybookRunAction', 'Execute', 'Playbook loaded', { name, stepCount: childPlaybook.steps.length });

    // Step 5: Execute child playbook steps using StepExecutor
    const results = await this.stepExecutor.executeSteps(childPlaybook.steps, inputs);

    // Step 6: Extract outputs from final step result
    const outputs = results.length > 0 ? results[results.length - 1].value : {};

    logger.verbose('PlaybookRunAction', 'Execute', 'Playbook completed', { name, executedSteps: results.length });
    logger.trace('PlaybookRunAction', 'Execute', 'Playbook outputs', { outputs });

    // Step 7: Return success result
    return {
      code: 'Success',
      message: `Child playbook "${name}" completed successfully`,
      value: outputs,
      error: undefined
    };
  }

  /**
   * Validate playbook action configuration
   *
   * @param config - Configuration to validate
   * @throws CatalystError if configuration is invalid
   */
  private validateConfig(config: PlaybookRunConfig): void {
    if (!config || typeof config !== 'object') {
      throw PlaybookRunErrors.configInvalid('config must be an object');
    }

    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
      throw PlaybookRunErrors.configInvalid('name property is required and must be a non-empty string');
    }
  }
}
