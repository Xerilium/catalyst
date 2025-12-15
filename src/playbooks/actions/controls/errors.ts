/**
 * Error factory functions for control flow actions
 *
 * @req FR:playbook-actions-controls/conditional.if-action.validation
 * @req FR:playbook-actions-controls/iteration.for-each-action.validation
 * @req FR:playbook-actions-controls/composition.playbook-action.validation
 * @req FR:playbook-actions-controls/error-handling.throw-action.validation
 * @req NFR:playbook-actions-controls/maintainability.error-codes
 */

import { CatalystError } from '@core/errors';

/**
 * Error factories for IfAction
 */
export const IfErrors = {
  /**
   * Configuration validation error
   */
  configInvalid: (reason: string): CatalystError => {
    return new CatalystError(
      `Invalid if action configuration: ${reason}`,
      'IfConfigInvalid',
      'Check if action config: condition and then properties are required'
    );
  },

  /**
   * Condition evaluation error
   */
  conditionEvaluationFailed: (condition: string, error: Error): CatalystError => {
    return new CatalystError(
      `Failed to evaluate condition "${condition}": ${error.message}`,
      'IfConditionEvaluationFailed',
      'Check condition syntax - must be valid template expression'
    );
  }
};

/**
 * Error factories for ForEachAction
 */
export const ForEachErrors = {
  /**
   * Configuration validation error
   */
  configInvalid: (reason: string): CatalystError => {
    return new CatalystError(
      `Invalid for-each action configuration: ${reason}`,
      'ForEachConfigInvalid',
      'Check for-each action config: in and steps properties are required'
    );
  },

  /**
   * Invalid array error
   */
  invalidArray: (value: unknown): CatalystError => {
    const type = Array.isArray(value) ? 'array' : typeof value;
    return new CatalystError(
      `Invalid array for iteration: expected array, got ${type}`,
      'ForEachInvalidArray',
      'Ensure the "in" property resolves to an array'
    );
  }
};

/**
 * Error factories for PlaybookRunAction
 */
export const PlaybookRunErrors = {
  /**
   * Configuration validation error
   */
  configInvalid: (reason: string): CatalystError => {
    return new CatalystError(
      `Invalid playbook action configuration: ${reason}`,
      'PlaybookRunConfigInvalid',
      'Check playbook action config: name property is required'
    );
  },

  /**
   * Playbook not found error
   */
  playbookNotFound: (name: string, registeredProviders: string[]): CatalystError => {
    const providerList = registeredProviders.length > 0
      ? registeredProviders.join(', ')
      : 'none';
    return new CatalystError(
      `Playbook "${name}" not found`,
      'PlaybookNotFound',
      `Ensure playbook exists and is registered. Registered providers: ${providerList}`
    );
  },

  /**
   * Circular reference error
   */
  circularReference: (callStack: string[]): CatalystError => {
    return new CatalystError(
      `Circular playbook reference detected: ${callStack.join(' -> ')}`,
      'CircularPlaybookReference',
      'Refactor playbooks to avoid circular dependencies'
    );
  },

  /**
   * Recursion depth exceeded error
   */
  maxDepthExceeded: (maxDepth: number): CatalystError => {
    return new CatalystError(
      `Maximum playbook recursion depth (${maxDepth}) exceeded`,
      'MaxRecursionDepthExceeded',
      'Refactor deeply nested playbook calls or increase MAX_RECURSION_DEPTH'
    );
  }
};

/**
 * Error factories for ThrowAction
 */
export const ThrowErrors = {
  /**
   * Configuration validation error
   */
  configInvalid: (reason: string): CatalystError => {
    return new CatalystError(
      `Invalid throw action configuration: ${reason}`,
      'ThrowConfigInvalid',
      'Check throw action config: code property is required'
    );
  }
};
