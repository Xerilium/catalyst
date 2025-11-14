/**
 * Network/connection failure error
 */
import { CatalystError } from './base';

export class NetworkError extends CatalystError {
  constructor(message: string, guidance: string, cause?: Error) {
    super(message, 'NETWORK_ERROR', guidance, cause);
    this.name = 'NetworkError';
  }
}
