/**
 * Resource not found error
 */
import { CatalystError } from './base';

export class NotFoundError extends CatalystError {
  constructor(message: string, guidance: string, cause?: Error) {
    super(message, 'NOT_FOUND', guidance, cause);
    this.name = 'NotFoundError';
  }
}
