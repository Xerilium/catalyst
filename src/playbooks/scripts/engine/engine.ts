import type {
  Playbook,
  PlaybookAction,
  PlaybookContext,
  PlaybookState
} from '../playbooks/types';
import { CatalystError, ErrorAction } from '../errors';
import { TemplateEngine } from '../playbooks/template/engine';
import { StatePersistence } from '../playbooks/persistence/state-persistence';
import { ActionRegistry } from './action-registry';
import { ErrorHandler } from './error-handler';
import { PlaybookRegistry } from './playbook-registry';
import { LockManager } from './lock-manager';
import { validatePlaybookStructure, validateInputs, validateOutputs } from './validators';
import type { ExecutionOptions, ExecutionResult } from './execution-context';

/**
 * Playbook execution engine
 *
 * Orchestrates workflow execution by:
 * - Validating playbook structure and inputs
 * - Executing steps sequentially
 * - Delegating to registered actions
 * - Managing execution state
 * - Supporting pause/resume capability
 *
 * @example
 * ```typescript
 * const engine = new Engine();
 *
 * // Register actions
 * engine.registerAction('file-write', new FileWriteAction());
 *
 * // Execute playbook
 * const result = await engine.run(playbook, {
 *   'user-email': 'alice@example.com'
 * });
 *
 * console.log(result.status); // 'completed'
 * ```
 */
export class Engine {
  private readonly templateEngine: TemplateEngine;
  private readonly statePersistence: StatePersistence;
  private readonly actionRegistry: ActionRegistry;
  private readonly errorHandler: ErrorHandler;
  private readonly playbookRegistry: PlaybookRegistry;
  private readonly lockManager: LockManager;

  constructor(
    templateEngine?: TemplateEngine,
    statePersistence?: StatePersistence,
    actionRegistry?: ActionRegistry,
    errorHandler?: ErrorHandler,
    playbookRegistry?: PlaybookRegistry,
    lockManager?: LockManager
  ) {
    this.templateEngine = templateEngine ?? new TemplateEngine();
    this.statePersistence = statePersistence ?? new StatePersistence();
    this.actionRegistry = actionRegistry ?? new ActionRegistry();
    this.errorHandler = errorHandler ?? new ErrorHandler();
    this.playbookRegistry = playbookRegistry ?? new PlaybookRegistry();
    this.lockManager = lockManager ?? new LockManager();
  }

  /**
   * Register an action for use in playbooks
   *
   * @param actionName - Action type identifier in kebab-case
   * @param action - Action implementation instance
   */
  registerAction(actionName: string, action: PlaybookAction<unknown>): void {
    this.actionRegistry.register(actionName, action);
  }

  /**
   * Register a playbook for child playbook invocation
   *
   * @param name - Playbook identifier in kebab-case
   * @param playbook - Playbook definition
   */
  registerPlaybook(name: string, playbook: Playbook): void {
    this.playbookRegistry.register(name, playbook);
  }

  /**
   * Execute a playbook
   *
   * Runs all steps sequentially, validates inputs/outputs, persists state.
   *
   * @param playbook - Playbook definition to execute
   * @param inputs - Input parameter values (kebab-case keys)
   * @param options - Execution configuration
   * @returns Execution result with status, outputs, and metrics
   * @throws CatalystError if validation fails or execution errors occur
   */
  async run(
    playbook: Playbook,
    inputs: Record<string, unknown> = {},
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    // Initialize call stack for root execution
    const callStack: string[] = [];
    return this.executeInternal(playbook, inputs, options, callStack);
  }

  /**
   * Internal execution method with call stack tracking
   *
   * @param playbook - Playbook definition to execute
   * @param inputs - Input parameter values
   * @param options - Execution configuration
   * @param callStack - Call stack for circular reference detection
   * @returns Execution result
   */
  private async executeInternal(
    playbook: Playbook,
    inputs: Record<string, unknown>,
    options: ExecutionOptions,
    callStack: string[]
  ): Promise<ExecutionResult> {
    const startTime = new Date().toISOString();
    const startTimestamp = Date.now();
    const runId = this.generateRunId();

    // Check recursion depth
    const maxDepth = options.maxRecursionDepth ?? 10;
    if (callStack.length >= maxDepth) {
      const endTime = new Date().toISOString();
      return {
        runId,
        status: 'failed',
        outputs: {},
        error: new CatalystError(
          `Maximum recursion depth of ${maxDepth} exceeded. Call stack: ${callStack.join(' -> ')}`,
          'MaxRecursionDepthExceeded',
          'Reduce playbook nesting or increase maxRecursionDepth option'
        ),
        duration: Date.now() - startTimestamp,
        stepsExecuted: 0,
        startTime,
        endTime
      };
    }

    // Check for circular references
    if (callStack.includes(playbook.name)) {
      const endTime = new Date().toISOString();
      return {
        runId,
        status: 'failed',
        outputs: {},
        error: new CatalystError(
          `Circular reference detected: ${[...callStack, playbook.name].join(' -> ')}`,
          'CircularReferenceDetected',
          'Remove circular playbook invocations from your workflow'
        ),
        duration: Date.now() - startTimestamp,
        stepsExecuted: 0,
        startTime,
        endTime
      };
    }

    // Add current playbook to call stack
    const currentCallStack = [...callStack, playbook.name];

    try {
      // Step 1: Validate playbook structure
      validatePlaybookStructure(playbook);

      // Step 2: Validate inputs
      validateInputs(inputs, playbook.inputs);

      // Step 3: Acquire resource locks if specified
      if (playbook.resources && (playbook.resources.paths || playbook.resources.branches)) {
        await this.lockManager.acquire(
          runId,
          playbook.resources,
          options.actor || 'unknown',
          options.maxRecursionDepth // Use as TTL hint
        );
      }

      // Step 4: Create execution context
      const context: PlaybookContext = {
        playbook,
        playbookName: playbook.name,
        runId,
        startTime,
        status: 'running',
        inputs,
        variables: { ...inputs }, // Start with inputs in variables
        completedSteps: [],
        currentStepName: ''
      };

      // Step 5: Execute steps sequentially
      let stepsExecuted = 0;
      let executionError: CatalystError | undefined;

      try {
        stepsExecuted = await this.executeSteps(context, options, currentCallStack);
      } catch (error) {
        executionError = error instanceof CatalystError ? error : new CatalystError(
          error instanceof Error ? error.message : String(error),
          'ExecutionFailed',
          'Check error details and fix the issue'
        );

        // Execute catch blocks if defined
        if (playbook.catch) {
          try {
            await this.executeCatchBlocks(context, playbook.catch, executionError);
          } catch (catchError) {
            console.error('Error in catch block:', catchError);
          }
        }
      } finally {
        // Execute finally blocks if defined
        if (playbook.finally) {
          try {
            await this.executeFinallyBlocks(context, playbook.finally);
          } catch (finallyError) {
            console.error('Error in finally block:', finallyError);
            // Don't fail if finally fails and main execution succeeded
          }
        }

        // Release resource locks
        if (playbook.resources && (playbook.resources.paths || playbook.resources.branches)) {
          await this.lockManager.release(runId);
        }
      }

      // If there was an execution error, handle it
      if (executionError) {
        const endTime = new Date().toISOString();
        const duration = Date.now() - startTimestamp;

        // Mark as failed and archive
        context.status = 'failed';
        await this.statePersistence.save(context);
        await this.statePersistence.archive(runId);

        return {
          runId,
          status: 'failed',
          outputs: {},
          error: executionError,
          duration,
          stepsExecuted,
          startTime,
          endTime
        };
      }

      // Step 5: Validate outputs
      validateOutputs(playbook.outputs, context.variables);

      // Step 6: Extract outputs
      const outputs = this.extractOutputs(playbook.outputs, context.variables);

      // Step 7: Mark as completed and archive
      context.status = 'completed';
      await this.statePersistence.save(context);
      await this.statePersistence.archive(runId);

      // Step 8: Return success result
      const endTime = new Date().toISOString();
      const duration = Date.now() - startTimestamp;

      return {
        runId,
        status: 'completed',
        outputs,
        duration,
        stepsExecuted,
        startTime,
        endTime
      };
    } catch (error) {
      // Return error result
      const endTime = new Date().toISOString();
      const duration = Date.now() - startTimestamp;

      return {
        runId,
        status: 'failed',
        outputs: {},
        error: error instanceof CatalystError ? error : new CatalystError(
          error instanceof Error ? error.message : String(error),
          'ExecutionFailed',
          'Check error details and fix the issue'
        ),
        duration,
        stepsExecuted: 0,
        startTime,
        endTime
      };
    }
  }

  /**
   * Resume a paused playbook execution
   *
   * Loads state from disk and continues execution from the last completed step.
   * NOTE: For Phase 2, resume requires the playbook to be re-provided since
   * we don't yet have a playbook registry. Phase 3 will add full resume support.
   *
   * @param runId - Run identifier to resume
   * @param playbook - Playbook definition (temporary requirement for Phase 2)
   * @param options - Execution configuration (can override original options)
   * @returns Execution result with continuation status
   * @throws CatalystError if state cannot be loaded or is invalid
   */
  async resume(
    runId: string,
    playbook: Playbook,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTimestamp = Date.now();

    try {
      // Step 1: Load state from disk
      const state = await this.statePersistence.load(runId);

      // Step 2: Validate state structure
      if (!state.playbookName || !state.runId || !state.variables) {
        throw new CatalystError(
          `State for run ${runId} is corrupted or incomplete`,
          'StateCorrupted',
          'The state file is missing required fields. Check the state file integrity.'
        );
      }

      // Step 3: Validate playbook compatibility
      if (playbook.name !== state.playbookName) {
        throw new CatalystError(
          `Playbook name mismatch: state has "${state.playbookName}", provided "${playbook.name}"`,
          'PlaybookIncompatible',
          'Ensure you are resuming with the same playbook that was originally executed'
        );
      }

      // Step 4: Reconstruct execution context
      const context: PlaybookContext = {
        ...state,
        playbook,
        status: 'running'
      };

      // Step 5: Resume execution from next uncompleted step
      let stepsExecuted = 0;
      for (let i = 0; i < playbook.steps.length; i++) {
        const step = playbook.steps[i];
        const stepName = step.name ?? `${step.action}-${i + 1}`;

        // Skip already-completed steps
        if (context.completedSteps.includes(stepName)) {
          continue;
        }

        // Execute this step
        context.currentStepName = stepName;
        await this.statePersistence.save(context);

        const interpolatedConfig = await this.interpolateStepConfig(step.config, context.variables);

        const action = this.actionRegistry.get(step.action);
        if (!action) {
          throw new CatalystError(
            `Action "${step.action}" not found. Ensure action is registered before execution.`,
            'ActionNotFound',
            `Register the action using engine.registerAction('${step.action}', actionInstance)`
          );
        }

        const result = await action.execute(interpolatedConfig);

        if (result.error) {
          throw result.error;
        }

        context.variables[stepName] = result.value;
        context.completedSteps.push(stepName);
        stepsExecuted++;

        await this.statePersistence.save(context);
      }

      // Step 6: Validate outputs
      validateOutputs(playbook.outputs, context.variables);

      // Step 7: Extract outputs
      const outputs = this.extractOutputs(playbook.outputs, context.variables);

      // Step 8: Mark as completed and archive
      context.status = 'completed';
      await this.statePersistence.save(context);
      await this.statePersistence.archive(runId);

      // Step 9: Return success result
      const endTime = new Date().toISOString();
      const duration = Date.now() - startTimestamp;

      return {
        runId,
        status: 'completed',
        outputs,
        duration,
        stepsExecuted,
        startTime: state.startTime,
        endTime
      };

    } catch (error) {
      const endTime = new Date().toISOString();
      const duration = Date.now() - startTimestamp;

      return {
        runId,
        status: 'failed',
        outputs: {},
        error: error instanceof CatalystError ? error : new CatalystError(
          error instanceof Error ? error.message : String(error),
          'ResumeFailed',
          'Check error details and ensure the run state exists'
        ),
        duration,
        stepsExecuted: 0,
        startTime: new Date().toISOString(),
        endTime
      };
    }
  }

  /**
   * Execute all steps in the playbook sequentially
   *
   * @param context - Execution context
   * @returns Number of steps executed
   */
  private async executeSteps(
    context: PlaybookContext,
    options: ExecutionOptions,
    callStack: string[]
  ): Promise<number> {
    let stepsExecuted = 0;

    for (let i = 0; i < context.playbook.steps.length; i++) {
      const step = context.playbook.steps[i];

      // Generate step name if not specified
      const stepName = step.name ?? `${step.action}-${i + 1}`;
      context.currentStepName = stepName;

      // Save state before executing step
      await this.statePersistence.save(context);

      // Interpolate step config
      const interpolatedConfig = await this.interpolateStepConfig(step.config, context.variables);

      // Check if this is a child playbook invocation
      let resultValue: unknown;
      if (step.action === 'playbook') {
        // Execute child playbook
        resultValue = await this.executeChildPlaybook(interpolatedConfig, options, callStack);
      } else {
        // Lookup action from registry
        const action = this.actionRegistry.get(step.action);
        if (!action) {
          throw new CatalystError(
            `Action "${step.action}" not found. Ensure action is registered before execution.`,
            'ActionNotFound',
            `Register the action using engine.registerAction('${step.action}', actionInstance)`
          );
        }

        // Execute action with error handling
        const result = await this.executeStepWithRetry(action, interpolatedConfig, step.errorPolicy);

        // Check for error
        if (result.error) {
          throw result.error;
        }

        resultValue = result.value;
      }

      // Store result in variables using step name as key
      context.variables[stepName] = resultValue;

      // Mark step as completed
      context.completedSteps.push(stepName);
      stepsExecuted++;

      // Save state after step completion
      await this.statePersistence.save(context);
    }

    return stepsExecuted;
  }

  /**
   * Execute a child playbook
   *
   * @param config - Child playbook configuration (name and inputs)
   * @param options - Execution options
   * @param callStack - Current call stack
   * @returns Child playbook outputs
   */
  private async executeChildPlaybook(
    config: unknown,
    options: ExecutionOptions,
    callStack: string[]
  ): Promise<unknown> {
    // Validate config structure
    if (!config || typeof config !== 'object') {
      throw new CatalystError(
        'Playbook action requires config with "name" and optionally "inputs"',
        'InvalidPlaybookConfig',
        'Provide config like: { name: "child-playbook", inputs: { ... } }'
      );
    }

    const playbookConfig = config as Record<string, unknown>;
    const playbookName = playbookConfig.name;

    if (typeof playbookName !== 'string') {
      throw new CatalystError(
        'Playbook action config must have "name" as a string',
        'InvalidPlaybookConfig',
        'Provide config like: { name: "child-playbook", inputs: { ... } }'
      );
    }

    // Lookup child playbook
    const childPlaybook = this.playbookRegistry.get(playbookName);
    if (!childPlaybook) {
      throw new CatalystError(
        `Playbook "${playbookName}" not found. Ensure playbook is registered before execution.`,
        'PlaybookNotFound',
        `Register the playbook using engine.registerPlaybook('${playbookName}', playbookInstance)`
      );
    }

    // Extract inputs for child playbook
    const childInputs = (playbookConfig.inputs as Record<string, unknown>) || {};

    // Execute child playbook with current call stack
    const childResult = await this.executeInternal(
      childPlaybook,
      childInputs,
      options,
      callStack
    );

    // Propagate child failures
    if (childResult.status === 'failed') {
      throw childResult.error || new CatalystError(
        `Child playbook "${playbookName}" failed`,
        'ChildPlaybookFailed',
        'Check child playbook error details'
      );
    }

    // Return child outputs
    return childResult.outputs;
  }


  /**
   * Execute a step with retry logic based on error policy
   *
   * @param action - Action to execute
   * @param config - Interpolated configuration
   * @param errorPolicy - Error policy for this step
   * @returns Action result
   */
  private async executeStepWithRetry(
    action: PlaybookAction<unknown>,
    config: unknown,
    errorPolicy?: any
  ) {
    // If no error policy or no retry count, execute once
    if (!errorPolicy) {
      return await action.execute(config);
    }

    // For simple ErrorAction string, no retry
    if (typeof errorPolicy === 'string') {
      return await action.execute(config);
    }

    // Try to get retry count from policy
    // Note: We can't determine which error will occur, so we use default retry count
    const retryCount = errorPolicy.default?.retryCount || 0;

    if (retryCount === 0) {
      return await action.execute(config);
    }

    // Execute with retry
    return await this.errorHandler.retryWithBackoff(
      async () => {
        const result = await action.execute(config);
        if (result.error) {
          throw result.error;
        }
        return result;
      },
      retryCount
    );
  }

  /**
   * Execute catch blocks for error recovery
   *
   * @param context - Execution context
   * @param catchBlocks - Array of catch block definitions
   * @param error - The error that occurred
   */
  private async executeCatchBlocks(
    context: PlaybookContext,
    catchBlocks: Array<{ code: string; steps: any[] }>,
    error: CatalystError
  ): Promise<void> {
    // Find matching catch block for this error code
    const matchingBlock = catchBlocks.find(block => block.code === error.code);

    if (!matchingBlock) {
      // No specific catch block for this error code
      return;
    }

    // Execute recovery steps
    for (const step of matchingBlock.steps) {
      const stepName = step.name ?? `catch-${step.action}`;
      const interpolatedConfig = await this.interpolateStepConfig(step.config, context.variables);

      const action = this.actionRegistry.get(step.action);
      if (!action) {
        console.error(`Catch block action "${step.action}" not found`);
        continue;
      }

      const result = await action.execute(interpolatedConfig);
      if (result.value !== undefined) {
        context.variables[stepName] = result.value;
      }
    }
  }

  /**
   * Execute finally blocks for cleanup
   *
   * @param context - Execution context
   * @param finallySteps - Array of finally step definitions
   */
  private async executeFinallyBlocks(
    context: PlaybookContext,
    finallySteps: any[]
  ): Promise<void> {
    // Execute cleanup steps
    for (const step of finallySteps) {
      const stepName = step.name ?? `finally-${step.action}`;
      const interpolatedConfig = await this.interpolateStepConfig(step.config, context.variables);

      const action = this.actionRegistry.get(step.action);
      if (!action) {
        console.error(`Finally block action "${step.action}" not found`);
        continue;
      }

      const result = await action.execute(interpolatedConfig);
      if (result.value !== undefined) {
        context.variables[stepName] = result.value;
      }
    }
  }

  /**
   * Interpolate step configuration using template engine
   *
   * @param config - Step configuration object
   * @param variables - Variables map for interpolation
   * @returns Interpolated configuration
   */
  private async interpolateStepConfig(
    config: unknown,
    variables: Record<string, unknown>
  ): Promise<unknown> {
    // Only interpolate objects and strings
    if (typeof config === 'string') {
      return await this.templateEngine.interpolate(config, variables);
    }

    if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
      return await this.templateEngine.interpolateObject(
        config as Record<string, unknown>,
        variables
      );
    }

    // Return non-interpolatable values as-is
    return config;
  }

  /**
   * Extract output values from variables
   *
   * @param outputs - Output specification from playbook
   * @param variables - Variables map
   * @returns Output values
   */
  private extractOutputs(
    outputs: Record<string, string> | undefined,
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    if (!outputs) {
      return {};
    }

    const result: Record<string, unknown> = {};
    for (const outputName of Object.keys(outputs)) {
      result[outputName] = variables[outputName];
    }
    return result;
  }

  /**
   * Generate unique run identifier
   *
   * Format: YYYYMMDD-HHMMSS-nnn
   * Example: 20251201-143022-001
   *
   * @returns Run identifier
   */
  private generateRunId(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}${month}${day}-${hours}${minutes}${seconds}-${milliseconds}`;
  }
}
