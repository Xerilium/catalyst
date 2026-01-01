import type { Playbook, InputParameter } from '../types';
import { CatalystError } from '@core/errors';
import { ValidatorFactory } from '../types/validation';

/**
 * Validates playbook structure
 *
 * Ensures required fields are present and properly formatted.
 *
 * @param playbook - Playbook to validate
 * @throws CatalystError with code 'PlaybookNotValid' if structure invalid
 */
export function validatePlaybookStructure(playbook: Playbook): void {
  const errors: string[] = [];

  // Validate required fields
  if (!playbook.name || typeof playbook.name !== 'string') {
    errors.push('Playbook must have a non-empty "name" field');
  }

  if (!playbook.description || typeof playbook.description !== 'string') {
    errors.push('Playbook must have a non-empty "description" field');
  }

  if (!playbook.owner || typeof playbook.owner !== 'string') {
    errors.push('Playbook must have a non-empty "owner" field');
  }

  if (!Array.isArray(playbook.steps) || playbook.steps.length === 0) {
    errors.push('Playbook must have at least one step in "steps" array');
  }

  // Validate step structure
  if (Array.isArray(playbook.steps)) {
    playbook.steps.forEach((step, index) => {
      if (!step.action || typeof step.action !== 'string') {
        errors.push(`Step ${index + 1} must have a non-empty "action" field`);
      }

      if (step.config === undefined) {
        errors.push(`Step ${index + 1} must have a "config" field (can be empty object)`);
      }
    });
  }

  if (errors.length > 0) {
    throw new CatalystError(
      `Invalid playbook structure:\n${errors.map(e => `- ${e}`).join('\n')}`,
      'PlaybookNotValid',
      'Ensure playbook has required fields: name, description, owner, and at least one step'
    );
  }
}

/**
 * Coerce a string value to the expected type
 *
 * @param value - String value to coerce
 * @param targetType - Target type ('string', 'boolean', 'number')
 * @returns Coerced value or original if coercion not possible
 */
function coerceToType(value: unknown, targetType: string): unknown {
  // Only coerce string values
  if (typeof value !== 'string') {
    return value;
  }

  switch (targetType) {
    case 'boolean': {
      const lower = value.toLowerCase();
      if (lower === 'true' || value === '1') {
        return true;
      }
      if (lower === 'false' || value === '0') {
        return false;
      }
      // Can't coerce, return original string (will fail validation)
      return value;
    }

    case 'number': {
      if (value !== '' && !isNaN(Number(value))) {
        return Number(value);
      }
      // Can't coerce, return original string (will fail validation)
      return value;
    }

    case 'string':
    default:
      return value;
  }
}

/**
 * Coerce input values to their declared types
 *
 * Converts string values from CLI inputs to the types declared in the
 * playbook input specification. Supports:
 * - boolean: "true"/"false"/"1"/"0" (case insensitive)
 * - number: numeric strings
 * - string: kept as-is
 *
 * @param inputs - Input values (may be strings from CLI)
 * @param inputSpec - Input parameter specifications from playbook
 * @returns New object with coerced values
 */
export function coerceInputTypes(
  inputs: Record<string, unknown>,
  inputSpec: InputParameter[] = []
): Record<string, unknown> {
  const result = { ...inputs };

  for (const param of inputSpec) {
    const value = result[param.name];
    if (value !== undefined && value !== null) {
      result[param.name] = coerceToType(value, param.type);
    }
  }

  return result;
}

/**
 * Applies default values from input specifications to inputs
 *
 * Creates a new object with defaults applied for any missing inputs.
 * Does not mutate the original inputs object.
 *
 * @param inputs - Input values provided by caller (kebab-case keys)
 * @param inputSpec - Input parameter specifications from playbook
 * @returns New object with defaults applied
 */
export function applyInputDefaults(
  inputs: Record<string, unknown>,
  inputSpec: InputParameter[] = []
): Record<string, unknown> {
  const result = { ...inputs };

  for (const param of inputSpec) {
    // Apply default if value is missing and default is specified
    if ((result[param.name] === undefined || result[param.name] === null) && param.default !== undefined) {
      result[param.name] = param.default;
    }
  }

  return result;
}

/**
 * Validates inputs against playbook input specifications
 *
 * Checks that:
 * - All required parameters are provided
 * - Parameter types match specification
 * - Validation rules pass
 *
 * @param inputs - Input values to validate (kebab-case keys)
 * @param inputSpec - Input parameter specifications from playbook
 * @throws CatalystError with code 'InputValidationFailed' if validation fails
 */
export function validateInputs(
  inputs: Record<string, unknown>,
  inputSpec: InputParameter[] = []
): void {
  const errors: string[] = [];

  const validatorFactory = new ValidatorFactory();

  // Check required parameters
  for (const param of inputSpec) {
    const value = inputs[param.name];

    // Check if required parameter is missing
    if (param.required && (value === undefined || value === null)) {
      errors.push(`Required parameter "${param.name}" is missing`);
      continue;
    }

    // Skip validation if parameter is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Validate type
    const actualType = typeof value;
    if (actualType !== param.type) {
      errors.push(
        `Parameter "${param.name}" has type "${actualType}", expected "${param.type}"`
      );
      continue;
    }

    // Validate against allowed values
    if (param.allowed && param.allowed.length > 0) {
      if (!param.allowed.includes(value)) {
        errors.push(
          `Parameter "${param.name}" value "${value}" is not in allowed list: ${param.allowed.join(', ')}`
        );
      }
    }

    // Apply validation rules
    if (param.validation && param.validation.length > 0) {
      for (const rule of param.validation) {
        try {
          const result = validatorFactory.validate(value, rule);

          if (!result.valid) {
            errors.push(
              `Parameter "${param.name}" validation failed: ${result.error?.message || 'unknown error'}`
            );
          }
        } catch (error) {
          errors.push(
            `Parameter "${param.name}" validation rule failed: ${error instanceof Error ? error.message : 'unknown error'}`
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new CatalystError(
      `Input validation failed:\n${errors.map(e => `- ${e}`).join('\n')}`,
      'InputValidationFailed',
      'Provide all required parameters with correct types and values'
    );
  }
}

/**
 * Validates outputs exist after execution
 *
 * Checks that all declared outputs are present in variables.
 *
 * @param outputs - Output specification from playbook
 * @param variables - Variables map from execution context
 * @throws CatalystError with code 'OutputValidationFailed' if outputs missing
 */
export function validateOutputs(
  outputs: Record<string, string> | undefined,
  variables: Record<string, unknown>
): void {
  if (!outputs || Object.keys(outputs).length === 0) {
    // No outputs declared, nothing to validate
    return;
  }

  const errors: string[] = [];

  for (const [outputName, outputType] of Object.entries(outputs)) {
    const value = variables[outputName];

    if (value === undefined) {
      errors.push(`Output "${outputName}" is not defined in variables`);
      continue;
    }

    // Validate type if specified
    const actualType = typeof value;
    if (outputType && actualType !== outputType) {
      errors.push(
        `Output "${outputName}" has type "${actualType}", expected "${outputType}"`
      );
    }
  }

  if (errors.length > 0) {
    throw new CatalystError(
      `Output validation failed:\n${errors.map(e => `- ${e}`).join('\n')}`,
      'OutputValidationFailed',
      'Ensure all declared outputs are produced by playbook steps'
    );
  }
}
