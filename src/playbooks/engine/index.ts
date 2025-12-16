/**
 * Playbook Engine
 *
 * Workflow execution orchestration engine providing step sequencing,
 * composition, checkpoints, and resume capabilities.
 *
 * @module engine
 */

export { Engine } from './engine';
export { ErrorHandler } from './error-handler';
// TODO: PlaybookRegistry file doesn't exist - commented out pending implementation
// export { PlaybookRegistry } from './playbook-registry';
export { LockManager } from './lock-manager';
export type { ExecutionOptions, ExecutionResult } from './execution-context';
export type { RunLock, ResourceLock } from './lock-manager';
export {
  validatePlaybookStructure,
  validateInputs,
  validateOutputs,
  applyInputDefaults
} from './validators';

// Re-export PlaybookProvider for action/playbook management
export { PlaybookProvider } from '../registry/playbook-provider';
export type { ActionConstructor } from '../registry/playbook-provider';
