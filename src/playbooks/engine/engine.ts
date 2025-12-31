import type {
  Playbook,
  PlaybookAction,
  PlaybookActionResult,
  PlaybookContext,
  PlaybookState,
  PlaybookStep,
  StepExecutor
} from '../types';
import { CatalystError, ErrorAction } from '@core/errors';
import { LoggerSingleton } from '@core/logging';
import { TemplateEngine } from '../template/engine';
import { StatePersistence } from '../persistence/state-persistence';
import { ErrorHandler } from './error-handler';
import { LockManager } from './lock-manager';
import { validatePlaybookStructure, validateInputs, validateOutputs, applyInputDefaults } from './validators';
import type { ExecutionOptions, ExecutionResult } from './execution-context';
import { VarAction } from './actions/var-action';
import { ReturnAction } from './actions/return-action';
import { StepExecutorImpl } from './step-executor-impl';
import { PlaybookProvider } from '../registry/playbook-provider';

/**
 * Playbook execution engine
 *
 * Orchestrates workflow execution by:
 * - Validating playbook structure and inputs
 * - Executing steps sequentially
 * - Delegating to registered actions
 * - Managing execution state
 * - Supporting pause/resume capability
 * - Implementing StepExecutor interface for nested step execution
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
export class Engine implements StepExecutor {
  /**
   * Hardcoded list of action constructors that receive privileged context access.
   * External actions CANNOT spoof this - constructor references are internal to playbook-engine.
   */
  private static readonly PRIVILEGED_ACTION_CLASSES = [
    VarAction,
    ReturnAction
  ];

  private readonly templateEngine: TemplateEngine;
  private readonly statePersistence: StatePersistence;
  private readonly errorHandler: ErrorHandler;
  private readonly lockManager: LockManager;
  private readonly stepExecutorImpl: StepExecutorImpl;

  /** Active execution context for built-in actions with privileged access */
  private currentContext?: PlaybookContext;

  /** Current playbook call stack for circular reference detection */
  private currentCallStack: string[] = [];

  constructor(
    templateEngine?: TemplateEngine,
    statePersistence?: StatePersistence,
    errorHandler?: ErrorHandler,
    lockManager?: LockManager
  ) {
    this.templateEngine = templateEngine ?? new TemplateEngine();
    this.statePersistence = statePersistence ?? new StatePersistence();
    this.errorHandler = errorHandler ?? new ErrorHandler();
    this.lockManager = lockManager ?? new LockManager();

    // Create isolated StepExecutor that doesn't expose Engine
    this.stepExecutorImpl = new StepExecutorImpl(this);
  }

  /**
   * Execute steps with variable overrides (StepExecutor interface implementation)
   *
   * This method implements the StepExecutor interface, enabling actions to delegate
   * nested step execution to the engine while maintaining all execution rules.
   *
   * @param steps - Array of steps to execute sequentially
   * @param variableOverrides - Optional variables to inject into execution scope
   * @returns Promise resolving to array of step results
   *
   * @example
   * ```typescript
   * // Execute nested steps with loop variables
   * const results = await engine.executeSteps(config.steps, {
   *   item: currentItem,
   *   index: i
   * });
   * ```
   */
  async executeSteps(
    steps: PlaybookStep[],
    variableOverrides?: Record<string, unknown>
  ): Promise<PlaybookActionResult[]> {
    if (!this.currentContext) {
      throw new CatalystError(
        'Cannot execute steps without active execution context',
        'NoExecutionContext',
        'This method should only be called during playbook execution'
      );
    }

    const results: PlaybookActionResult[] = [];

    // Determine effective isolation mode (FR-4.6)
    // Engine controls isolation - actions cannot bypass this security boundary
    const effectiveIsolation = this.getEffectiveIsolation();

    // Save parent variables for potential restoration (isolated mode)
    // or for identifying new variables (shared mode)
    const parentVariables = { ...this.currentContext.variables };

    // Track variable override keys so we can exclude them from propagation
    const overrideKeys = new Set(Object.keys(variableOverrides ?? {}));

    // Merge variable overrides (overrides shadow parent variables)
    if (variableOverrides) {
      for (const [key, value] of Object.entries(variableOverrides)) {
        this.currentContext.variables[key] = value;
      }
    }

    try {
      // Execute each step with full engine semantics
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepName = step.name ?? `${step.action}-${i + 1}`;

        // Interpolate step config
        const interpolatedConfig = await this.interpolateStepConfig(
          step.config,
          this.currentContext.variables
        );

        // Create fresh action instance with appropriate dependencies
        const action = this.createAction(step.action, this.currentContext);

        // Execute action
        const result = await action.execute(interpolatedConfig);
        // Action instance will be garbage collected after this

        // Check for error
        if (result.error) {
          throw result.error;
        }

        // Store result in variables
        this.currentContext.variables[stepName] = result.value;

        // Collect result
        results.push(result);
      }

      return results;
    } finally {
      if (effectiveIsolation) {
        // Isolated mode: Restore parent variables (no propagation)
        this.currentContext.variables = parentVariables;
      } else {
        // Shared mode: Propagate variables back to parent, excluding overrides
        // Overrides are always scoped regardless of isolation setting
        const newVariables = this.currentContext.variables;
        this.currentContext.variables = parentVariables;

        // Copy new/changed variables back to parent (excluding override keys)
        for (const [key, value] of Object.entries(newVariables)) {
          if (!overrideKeys.has(key)) {
            this.currentContext.variables[key] = value;
          }
        }
      }
    }
  }

  /**
   * Get effective isolation mode for current step
   *
   * Determines isolation by checking:
   * 1. Step's explicit `isolated` override (if specified)
   * 2. Action's default `isolated` from PlaybookProvider
   *
   * @returns true for isolated execution, false for shared scope
   */
  private getEffectiveIsolation(): boolean {
    if (!this.currentContext) {
      return true; // Default to isolated if no context
    }

    // Find the current step being executed
    const currentStepName = this.currentContext.currentStepName;
    const playbook = this.currentContext.playbook;

    // Find the step in the playbook
    const currentStep = playbook.steps.find(
      (step, index) => {
        const stepName = step.name ?? `${step.action}-${index + 1}`;
        return stepName === currentStepName;
      }
    );

    if (!currentStep) {
      return true; // Default to isolated if step not found
    }

    // Check for step-level override first
    if (currentStep.isolated !== undefined) {
      return currentStep.isolated;
    }

    // Fall back to action's default from PlaybookProvider
    const actionType = currentStep.action;
    const provider = PlaybookProvider.getInstance();
    const actionMetadata = provider.getActionInfo(actionType);

    if (actionMetadata?.isolated !== undefined) {
      return actionMetadata.isolated;
    }

    // Default to isolated if not specified (security-first)
    return true;
  }

  /**
   * Get the current playbook call stack
   *
   * Returns the names of playbooks currently being executed, from root to current.
   * Used by playbook invocation actions for circular reference detection.
   *
   * @returns Array of playbook names in execution order (root first, current last)
   */
  getCallStack(): string[] {
    return [...this.currentCallStack];
  }

  /**
   * Create fresh action instance for step execution
   *
   * Creates a new action instance for each step to ensure:
   * - No state leakage between steps
   * - Correct context for privileged actions (concurrency-safe)
   * - Clean execution environment
   *
   * Privileged actions (var, return) receive context via property injection.
   *
   * @param actionType - Action type identifier (kebab-case)
   * @param context - Current execution context
   * @returns Fresh action instance
   * @throws {CatalystError} If action type not found
   *
   * @example
   * ```typescript
   * const action = this.createAction('var', context);
   * await action.execute({ name: 'user-count', value: 42 });
   * ```
   */
  private createAction(actionType: string, context: PlaybookContext): PlaybookAction {
    // Create fresh action via PlaybookProvider (no caching for concurrency safety)
    const provider = PlaybookProvider.getInstance();
    const action = provider.createAction(actionType, this.stepExecutorImpl);

    // Grant privileged context access ONLY to hardcoded built-in action classes
    // Uses instanceof check - external actions cannot spoof this because
    // PRIVILEGED_ACTION_CLASSES contains internal constructor references
    if (Engine.PRIVILEGED_ACTION_CLASSES.some(PrivilegedClass => action instanceof PrivilegedClass)) {
      (action as any).__context = context; // Direct property injection
    }

    return action;
  }

  /**
   * Abandon a failed or paused run
   *
   * Archives the run state to history, removing it from active runs.
   * Use this to explicitly mark a failed/paused run as no longer needed.
   *
   * @param runId - Run identifier to abandon
   * @throws {CatalystError} If run state cannot be found
   *
   * @example
   * ```typescript
   * // After diagnosing a failed run, abandon it
   * await engine.abandon('20251202-143000-001');
   * ```
   */
  async abandon(runId: string): Promise<void> {
    // Archive the state (moves from .xe/runs/ to .xe/runs/history/)
    await this.statePersistence.archive(runId);
  }

  /**
   * Clean up stale failed or paused runs
   *
   * Archives runs older than the specified threshold. Useful for scheduled
   * cleanup of abandoned runs to prevent .xe/runs/ from accumulating old failures.
   *
   * @param options - Cleanup options
   * @param options.olderThanDays - Age threshold in days (default: 7)
   * @returns Number of runs cleaned up
   *
   * @example
   * ```typescript
   * // Archive failed/paused runs older than 7 days
   * const cleaned = await engine.cleanupStaleRuns({ olderThanDays: 7 });
   * console.log(`Cleaned up ${cleaned} stale runs`);
   * ```
   */
  async cleanupStaleRuns(options: { olderThanDays?: number } = {}): Promise<number> {
    const { olderThanDays = 7 } = options;
    const thresholdMs = olderThanDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let cleaned = 0;

    try {
      // Load all state files from the configured runs directory
      const fs = await import('fs/promises');
      const path = await import('path');
      const runsDir = (this.statePersistence as any).runsDir;

      const files = await fs.readdir(runsDir);

      for (const file of files) {
        if (!file.startsWith('run-') || !file.endsWith('.json')) {
          continue;
        }

        const filePath = path.join(runsDir, file);
        const stat = await fs.stat(filePath);
        const age = now - stat.mtimeMs;

        // Only clean up if older than threshold
        if (age < thresholdMs) {
          continue;
        }

        // Load state to check status
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const state: PlaybookState = JSON.parse(content);

          // Only archive failed/paused runs, not running ones
          if (state.status === 'failed' || state.status === 'paused') {
            await this.statePersistence.archive(state.runId);
            cleaned++;
          }
        } catch (error) {
          console.error(`Failed to process ${file}:`, error);
          // Skip corrupted files
          continue;
        }
      }

      return cleaned;
    } catch (error: any) {
      // If runs directory doesn't exist, no runs to clean
      if (error.code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
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

    // Update current call stack for StepExecutor.getCallStack()
    this.currentCallStack = currentCallStack;

    try {
      // Step 1: Validate playbook structure
      validatePlaybookStructure(playbook);

      // Step 2: Apply defaults and validate inputs
      const inputsWithDefaults = applyInputDefaults(inputs, playbook.inputs);
      validateInputs(inputsWithDefaults, playbook.inputs);

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
        inputs: inputsWithDefaults,
        variables: { ...inputsWithDefaults }, // Start with inputs (including defaults) in variables
        completedSteps: [],
        currentStepName: ''
      };

      // Set current context for StepExecutor and built-in actions
      this.currentContext = context;

      // Step 5: Execute steps sequentially
      let stepsExecuted = 0;
      let executionError: CatalystError | undefined;

      try {
        stepsExecuted = await this.executeStepsInternal(context, options, currentCallStack);
      } catch (error) {
        executionError = error instanceof CatalystError ? error : new CatalystError(
          error instanceof Error ? error.message : String(error),
          'ExecutionFailed',
          'Check error details and fix the issue'
        );

        // Execute catch blocks if defined
        // @req FR-6.3: Catch section for error recovery with error chaining
        if (playbook.catch) {
          try {
            await this.executeCatchBlocks(context, playbook.catch, executionError);
          } catch (catchError) {
            // Catch block re-threw - chain original error as cause
            // Per FR-6.3: Re-thrown errors MUST chain the original caught error as cause
            if (catchError instanceof CatalystError) {
              // If re-thrown error doesn't already have a cause, chain the original error
              if (!catchError.cause) {
                (catchError as any).cause = executionError;
              }
              executionError = catchError;
            } else {
              // Wrap non-CatalystError with original as cause
              executionError = new CatalystError(
                catchError instanceof Error ? catchError.message : String(catchError),
                'CatchBlockFailed',
                'An error occurred in the catch block',
                executionError
              );
            }
          }
        }
      } finally {
        // Execute finally blocks if defined
        if (playbook.finally) {
          try {
            await this.executeFinallyBlocks(context, playbook.finally);
          } catch (finallyError) {
            const logger = LoggerSingleton.getInstance();
            logger.warning('Engine', 'ExecuteFinally', 'Error in finally block', { error: finallyError instanceof Error ? finallyError.message : String(finallyError) });
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

        // Mark as failed but do NOT archive (keep in .xe/runs/ for retry)
        context.status = 'failed';
        await this.statePersistence.save(context);

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

      // Check for early return (set by ReturnAction)
      let outputs: Record<string, unknown>;
      if ('earlyReturn' in context && context.earlyReturn) {
        // Early return with explicit outputs
        outputs = context.earlyReturn.outputs;
      } else {
        // Normal completion - validate and extract outputs
        // Step 5: Validate outputs
        validateOutputs(playbook.outputs, context.variables);

        // Step 6: Extract outputs
        outputs = this.extractOutputs(playbook.outputs, context.variables);
      }

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

      // Set current context for StepExecutor and built-in actions
      this.currentContext = context;

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

        // Create fresh action instance with appropriate dependencies
        const action = this.createAction(step.action, context);

        const result = await action.execute(interpolatedConfig);
        // Action instance will be garbage collected after this

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
   * Execute all steps in the playbook sequentially (internal)
   *
   * @param context - Execution context
   * @param options - Execution options
   * @param callStack - Call stack for circular reference detection
   * @returns Number of steps executed
   */
  private async executeStepsInternal(
    context: PlaybookContext,
    options: ExecutionOptions,
    callStack: string[]
  ): Promise<number> {
    const logger = LoggerSingleton.getInstance();
    let stepsExecuted = 0;

    for (let i = 0; i < context.playbook.steps.length; i++) {
      const step = context.playbook.steps[i];

      // Generate step name if not specified
      const stepName = step.name ?? `${step.action}-${i + 1}`;
      context.currentStepName = stepName;

      logger.verbose('Engine', 'ExecuteStep', `Step ${i + 1}/${context.playbook.steps.length}: ${stepName}`, { action: step.action });

      // Save state before executing step
      await this.statePersistence.save(context);

      // Interpolate step config
      let interpolatedConfig: unknown;
      try {
        interpolatedConfig = await this.interpolateStepConfig(step.config, context.variables);
      } catch (error) {
        // Add step context to interpolation errors
        if (error instanceof CatalystError) {
          throw new CatalystError(
            `Step "${stepName}" (${step.action}): ${error.message}`,
            error.code,
            error.guidance,
            error
          );
        }
        throw new CatalystError(
          `Step "${stepName}" (${step.action}): ${error instanceof Error ? error.message : String(error)}`,
          'TemplateError',
          'Check the step configuration for template syntax errors',
          error instanceof Error ? error : undefined
        );
      }
      logger.debug('Engine', 'ExecuteStep', 'Step config interpolated', { stepName, config: interpolatedConfig });

      // Create fresh action instance with appropriate dependencies
      const action = this.createAction(step.action, context);

      // Execute action with error handling
      const result = await this.executeStepWithRetry(action, interpolatedConfig, step.errorPolicy);

      // Check for error
      if (result.error) {
        logger.debug('Engine', 'ExecuteStep', 'Step failed', { stepName, error: result.error.message });
        throw result.error;
      }

      // Store result in variables using step name as key
      context.variables[stepName] = result.value;
      logger.trace('Engine', 'ExecuteStep', 'Step result stored', { stepName, value: result.value });

      // Mark step as completed
      context.completedSteps.push(stepName);
      stepsExecuted++;

      // Save state after step completion
      await this.statePersistence.save(context);

      // Check for early return (set by ReturnAction)
      if ('earlyReturn' in context && context.earlyReturn) {
        // Early return requested - halt execution
        logger.verbose('Engine', 'ExecuteStep', 'Early return requested', { stepName });
        break;
      }
    }

    return stepsExecuted;
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
   * @req FR-6.3: Catch section for error recovery with error chaining
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

    // Per FR-6.3: Caught error MUST be accessible via $error variable
    // Store original variables to restore after catch block
    const originalErrorVar = context.variables['$error'];
    context.variables['$error'] = {
      code: error.code,
      message: error.message,
      guidance: error.guidance
    };

    try {
      // Execute recovery steps
      for (const step of matchingBlock.steps) {
        const stepName = step.name ?? `catch-${step.action}`;
        const interpolatedConfig = await this.interpolateStepConfig(step.config, context.variables);

        // Create fresh action instance
        const action = this.createAction(step.action, context);

        const result = await action.execute(interpolatedConfig);
        if (result.value !== undefined) {
          context.variables[stepName] = result.value;
        }
      }
    } finally {
      // Restore original $error variable (or remove if it didn't exist)
      if (originalErrorVar === undefined) {
        delete context.variables['$error'];
      } else {
        context.variables['$error'] = originalErrorVar;
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

      // Create fresh action instance
      const action = this.createAction(step.action, context);

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
