/**
 * Authentication/authorization failure error
 */
import { CatalystError } from './base';

export class AuthError extends CatalystError {
  constructor(message: string, guidance: string, cause?: Error) {
    super(message, 'AUTH_FAILED', guidance, cause);
    this.name = 'AuthError';
  }
}
