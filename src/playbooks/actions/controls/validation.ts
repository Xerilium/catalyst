/**
 * Shared validation utilities for control flow actions
 */

import { CatalystError } from '@core/errors';
import type { PlaybookStep } from '../../types';

/**
 * Validates an array of steps
 *
 * @param steps - Array of steps to validate
 * @param actionName - Name of the action (for error messages)
 * @param propertyName - Name of the property containing steps (for error messages)
 * @throws CatalystError if validation fails
 */
export function validateStepArray(
  steps: unknown,
  actionName: string,
  propertyName: string
): asserts steps is PlaybookStep[] {
  // Check if steps is an array
  if (!Array.isArray(steps)) {
    throw new CatalystError(
      `${actionName} ${propertyName} must be an array`,
      `${actionName}ConfigInvalid`,
      `Provide an array of steps in ${propertyName}`
    );
  }

  // Check if array is non-empty
  if (steps.length === 0) {
    throw new CatalystError(
      `${actionName} ${propertyName} must be non-empty array`,
      `${actionName}ConfigInvalid`,
      `Provide at least one step in ${propertyName} array`
    );
  }

  // Validate each step has required properties
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if (!step || typeof step !== 'object') {
      throw new CatalystError(
        `Invalid step at index ${i} in ${actionName} ${propertyName}: must be an object`,
        `${actionName}ConfigInvalid`,
        'Each step must be an object with action property'
      );
    }

    if (!('action' in step)) {
      throw new CatalystError(
        `Invalid step at index ${i} in ${actionName} ${propertyName}: missing action property`,
        `${actionName}ConfigInvalid`,
        'Each step must have action property'
      );
    }

    if (typeof step.action !== 'string' || step.action.trim() === '') {
      throw new CatalystError(
        `Invalid step at index ${i} in ${actionName} ${propertyName}: action must be non-empty string`,
        `${actionName}ConfigInvalid`,
        'Each step action must be a non-empty string'
      );
    }
  }
}
