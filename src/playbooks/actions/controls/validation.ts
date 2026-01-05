/**
 * Shared validation utilities for control flow actions
 */

import { CatalystError } from '@core/errors';
import type { PlaybookStep } from '../../types';

/**
 * Validates an array of steps
 *
 * @req NFR:playbook-actions-controls/maintainability.shared-utilities
 * @req NFR:playbook-actions-controls/reliability.validation
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
      // Provide helpful diagnostic showing what properties were found
      const foundProps = Object.keys(step).slice(0, 5).join(', ');
      const propsHint = foundProps ? ` (found: ${foundProps})` : '';
      throw new CatalystError(
        `Invalid step at index ${i} in ${actionName} ${propertyName}: missing action property${propsHint}`,
        `${actionName}ConfigInvalid`,
        'Each step must specify an action type. Check that the playbook syntax is correct.'
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
