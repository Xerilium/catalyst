import { CatalystError } from './base';

export class AuthError extends CatalystError {
  constructor(message: string, guidance: string, cause?: Error) {
    // historically the code for auth failures is AUTH_FAILED
    super(message, 'AUTH_FAILED', guidance, cause);
    this.name = 'AuthError';
  }
}
