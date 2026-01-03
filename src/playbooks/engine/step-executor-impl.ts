/**
 * StepExecutor Implementation
 *
 * Provides isolated step execution capability to actions without exposing
 * the Engine or PlaybookContext. This prevents actions from casting to Engine
 * and accessing privileged context.
 *
 * Security: Actions receive only execution capability, not direct Engine access.
 */

import type { StepExecutor } from '../types/action';
import type { PlaybookStep, PlaybookActionResult } from '../types';
import type { Engine } from './engine';

/**
 * Isolated StepExecutor implementation that delegates to Engine
 * without exposing Engine internals
 *
 * @req FR:playbook-engine/step-executor.interface - StepExecutor interface implementation
 */
export class StepExecutorImpl implements StepExecutor {
  constructor(private readonly engine: Engine) {}

  /**
   * Execute steps with variable overrides
   *
   * Delegates to Engine's executeSteps method without exposing Engine instance.
   */
  async executeSteps(
    steps: PlaybookStep[],
    variableOverrides?: Record<string, unknown>
  ): Promise<PlaybookActionResult[]> {
    return this.engine.executeSteps(steps, variableOverrides);
  }

  /**
   * Get current playbook call stack
   *
   * Delegates to Engine's getCallStack method for circular reference detection.
   */
  getCallStack(): string[] {
    return this.engine.getCallStack();
  }
}
