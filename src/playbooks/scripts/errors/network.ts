import { CatalystError } from './base';

export class NetworkError extends CatalystError {
  constructor(message: string, guidance: string, cause?: Error) {
    // code expected by tests and consumers is SCREAMING_SNAKE_CASE
    super(message, 'NETWORK_ERROR', guidance, cause);
    this.name = 'NetworkError';
  }
}
