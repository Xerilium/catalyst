import { CatalystError } from './base';

export class ValidationError extends CatalystError {
  constructor(message: string, guidance: string, cause?: Error) {
    // code expected by tests and consumers is SCREAMING_SNAKE_CASE
    super(message, 'VALIDATION_ERROR', guidance, cause);
    this.name = 'ValidationError';
  }
}
