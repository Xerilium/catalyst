/**
 * Base interface for all validation rules
 *
 * All validation rules must extend this interface and provide a type discriminator.
 * The type property enables TypeScript discriminated unions for type-safe validation.
 *
 * @example
 * ```typescript
 * const rule: ValidationRule = {
 *   type: 'Regex',
 *   pattern: '^[0-9]+$',
 *   message: 'Must contain only digits'
 * };
 * ```
 */
export interface ValidationRule {
  /** Rule type discriminator (PascalCased) */
  type: string;

  /** Error code to return on validation failure (optional) */
  code?: string;

  /** Custom error message for validation failure (optional) */
  message?: string;
}

/**
 * Regular expression validation rule
 *
 * Validates input against a regex pattern.
 *
 * @example
 * ```typescript
 * const emailRule: RegexValidationRule = {
 *   type: 'Regex',
 *   pattern: '^[^@]+@[^@]+\\.[^@]+$',
 *   message: 'Invalid email format'
 * };
 * ```
 */
export interface RegexValidationRule extends ValidationRule {
  type: 'Regex';
  /** Regular expression pattern to match */
  pattern: string;
}

/**
 * String length validation rule
 *
 * Validates string length constraints.
 *
 * @example
 * ```typescript
 * const lengthRule: StringLengthValidationRule = {
 *   type: 'StringLength',
 *   minLength: 3,
 *   maxLength: 50,
 *   message: 'Must be between 3 and 50 characters'
 * };
 * ```
 */
export interface StringLengthValidationRule extends ValidationRule {
  type: 'StringLength';
  /** Minimum string length (inclusive, optional) */
  minLength?: number;
  /** Maximum string length (inclusive, optional) */
  maxLength?: number;
}

/**
 * Numeric range validation rule
 *
 * Validates numeric value constraints.
 *
 * @example
 * ```typescript
 * const rangeRule: NumberRangeValidationRule = {
 *   type: 'NumberRange',
 *   min: 1,
 *   max: 100,
 *   message: 'Must be between 1 and 100'
 * };
 * ```
 */
export interface NumberRangeValidationRule extends ValidationRule {
  type: 'NumberRange';
  /** Minimum value (inclusive, optional) */
  min?: number;
  /** Maximum value (inclusive, optional) */
  max?: number;
}

/**
 * Custom script validation rule
 *
 * Validates using a JavaScript expression that returns boolean.
 *
 * @example
 * ```typescript
 * const customRule: CustomValidationRule = {
 *   type: 'Custom',
 *   script: 'value.startsWith("prefix-") && value.length > 10',
 *   message: 'Must start with "prefix-" and be longer than 10 characters'
 * };
 * ```
 */
export interface CustomValidationRule extends ValidationRule {
  type: 'Custom';
  /** JavaScript expression that returns boolean (true = valid) */
  script: string;
}

/**
 * Union type of all validation rule interfaces
 *
 * This union type enables extensibility - new validation rule types can be
 * added without modifying existing code.
 *
 * @example
 * ```typescript
 * const rules: InputValidationRule[] = [
 *   { type: 'Regex', pattern: '^[0-9]+$' },
 *   { type: 'StringLength', minLength: 5, maxLength: 10 }
 * ];
 * ```
 */
export type InputValidationRule =
  | RegexValidationRule
  | StringLengthValidationRule
  | NumberRangeValidationRule
  | CustomValidationRule;

/**
 * Result of validation execution
 *
 * @example
 * ```typescript
 * const result: ValidationResult = {
 *   valid: false,
 *   error: {
 *     code: 'TooShort',
 *     message: 'Value must be at least 5 characters',
 *     rule: { type: 'StringLength', minLength: 5 },
 *     value: 'hi'
 *   }
 * };
 * ```
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error details if validation failed */
  error?: ValidationError;
}

/**
 * Details about a validation failure
 *
 * @example
 * ```typescript
 * const error: ValidationError = {
 *   code: 'RegexMismatch',
 *   message: 'Value does not match pattern: ^[0-9]+$',
 *   rule: { type: 'Regex', pattern: '^[0-9]+$' },
 *   value: 'abc123'
 * };
 * ```
 */
export interface ValidationError {
  /** Error code from rule or default validation error code */
  code: string;
  /** Error message from rule or generated message */
  message: string;
  /** The rule that failed */
  rule: InputValidationRule;
  /** The value that failed validation */
  value: unknown;
}

/**
 * Executes validation rules against values
 *
 * Uses discriminated union pattern for type-based dispatch.
 * Validates values against one or more validation rules and returns
 * detailed error information on failure.
 *
 * @example
 * ```typescript
 * const executor = new ValidationExecutor();
 * const result = executor.validate('test@example.com', [
 *   { type: 'Regex', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
 *   { type: 'StringLength', maxLength: 100 }
 * ]);
 *
 * if (!result.valid) {
 *   console.error(result.error.message);
 * }
 * ```
 */
export class ValidationExecutor {
  /**
   * Validate a value against multiple rules
   *
   * @param value - The value to validate
   * @param rules - Array of validation rules to apply
   * @returns ValidationResult with success status and optional error
   */
  validate(value: unknown, rules: InputValidationRule[]): ValidationResult {
    for (const rule of rules) {
      const result = this.validateSingleRule(value, rule);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }

  /**
   * Validate a value against a single rule using type-based dispatch
   */
  private validateSingleRule(value: unknown, rule: InputValidationRule): ValidationResult {
    switch (rule.type) {
      case 'Regex':
        return this.validateRegex(value, rule);
      case 'StringLength':
        return this.validateStringLength(value, rule);
      case 'NumberRange':
        return this.validateNumberRange(value, rule);
      case 'Custom':
        return this.validateCustom(value, rule);
      default:
        throw new Error(`Unknown validation rule type: ${(rule as any).type}`);
    }
  }

  /**
   * Validate value against regex pattern
   */
  private validateRegex(value: unknown, rule: RegexValidationRule): ValidationResult {
    if (typeof value !== 'string') {
      return {
        valid: false,
        error: {
          code: rule.code || 'InvalidType',
          message: rule.message || 'Value must be a string',
          rule,
          value,
        },
      };
    }

    const regex = new RegExp(rule.pattern);
    if (!regex.test(value)) {
      return {
        valid: false,
        error: {
          code: rule.code || 'RegexMismatch',
          message: rule.message || `Value does not match pattern: ${rule.pattern}`,
          rule,
          value,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Validate string length constraints
   */
  private validateStringLength(value: unknown, rule: StringLengthValidationRule): ValidationResult {
    if (typeof value !== 'string') {
      return {
        valid: false,
        error: {
          code: rule.code || 'InvalidType',
          message: rule.message || 'Value must be a string',
          rule,
          value,
        },
      };
    }

    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return {
        valid: false,
        error: {
          code: rule.code || 'TooShort',
          message: rule.message || `Value must be at least ${rule.minLength} characters`,
          rule,
          value,
        },
      };
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return {
        valid: false,
        error: {
          code: rule.code || 'TooLong',
          message: rule.message || `Value must be at most ${rule.maxLength} characters`,
          rule,
          value,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Validate numeric range constraints
   */
  private validateNumberRange(value: unknown, rule: NumberRangeValidationRule): ValidationResult {
    if (typeof value !== 'number') {
      return {
        valid: false,
        error: {
          code: rule.code || 'InvalidType',
          message: rule.message || 'Value must be a number',
          rule,
          value,
        },
      };
    }

    if (rule.min !== undefined && value < rule.min) {
      return {
        valid: false,
        error: {
          code: rule.code || 'TooSmall',
          message: rule.message || `Value must be at least ${rule.min}`,
          rule,
          value,
        },
      };
    }

    if (rule.max !== undefined && value > rule.max) {
      return {
        valid: false,
        error: {
          code: rule.code || 'TooLarge',
          message: rule.message || `Value must be at most ${rule.max}`,
          rule,
          value,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Validate using custom JavaScript expression
   */
  private validateCustom(value: unknown, rule: CustomValidationRule): ValidationResult {
    try {
      // Create a function from the script that has access to 'value'
      const fn = new Function('value', `return (${rule.script});`);
      const result = fn(value);

      if (typeof result !== 'boolean') {
        throw new Error('Custom validation script must return a boolean');
      }

      if (!result) {
        return {
          valid: false,
          error: {
            code: rule.code || 'CustomValidationFailed',
            message: rule.message || 'Custom validation failed',
            rule,
            value,
          },
        };
      }

      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: {
          code: rule.code || 'CustomValidationError',
          message: rule.message || `Custom validation script error: ${(err as Error).message}`,
          rule,
          value,
        },
      };
    }
  }
}
