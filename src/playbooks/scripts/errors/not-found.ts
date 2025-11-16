import { CatalystError } from './base';

export class NotFoundError extends CatalystError {
  constructor(message: string, guidance: string, cause?: Error) {
    // code expected by tests and consumers is SCREAMING_SNAKE_CASE
    super(message, 'NOT_FOUND', guidance, cause);
    this.name = 'NotFoundError';
  }
}
