import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation result from schema validation
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationErrorDetail[];
}

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  path: string;
  message: string;
}

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public filePath?: string,
    public line?: number,
    public column?: number,
    public errors?: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Schema validator singleton
 */
class SchemaValidator {
  private ajv: Ajv;
  private validateFn: ValidateFunction | null = null;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
  }

  /**
   * Load and compile schema
   */
  private loadSchema(): void {
    if (this.validateFn) {
      return; // Already loaded
    }

    const schemaPath = path.join(__dirname, 'schema.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);

    this.validateFn = this.ajv.compile(schema);
  }

  /**
   * Validate playbook object against schema
   *
   * @param playbook - Parsed playbook object
   * @returns ValidationResult with errors if invalid
   */
  validate(playbook: unknown): ValidationResult {
    this.loadSchema();

    const valid = this.validateFn!(playbook);

    if (valid) {
      return { valid: true };
    }

    const errors = this.formatErrors(this.validateFn!.errors || []);

    return {
      valid: false,
      errors,
    };
  }

  /**
   * Format ajv errors into readable validation error details
   */
  private formatErrors(ajvErrors: ErrorObject[]): ValidationErrorDetail[] {
    return ajvErrors.map(err => {
      const path = err.instancePath || err.schemaPath || 'root';
      let message = err.message || 'Validation failed';

      // Enhance message with parameter details
      if (err.params) {
        if (err.keyword === 'required') {
          message = `Property '${err.params.missingProperty}' is required`;
        } else if (err.keyword === 'type') {
          message = `Property should be ${err.params.type}, got ${typeof err.data}`;
        } else if (err.keyword === 'pattern') {
          message = `Property does not match pattern: ${err.params.pattern}`;
        } else if (err.keyword === 'minItems') {
          message = `Array must have at least ${err.params.limit} items`;
        }
      }

      return {
        path: path.replace(/^\//, ''),
        message,
      };
    });
  }
}

// Singleton instance
const validator = new SchemaValidator();

/**
 * Validate playbook object against JSON Schema
 *
 * @param playbook - Parsed playbook object to validate
 * @returns ValidationResult with success status and optional errors
 */
export function validatePlaybook(playbook: unknown): ValidationResult {
  return validator.validate(playbook);
}
