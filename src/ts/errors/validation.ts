/**
 * Input validation failure error
 */
import { CatalystError } from './base';

export class ValidationError extends CatalystError {
  constructor(message: string, guidance: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', guidance, cause);
    this.name = 'ValidationError';
  }
}
