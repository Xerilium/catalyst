/**
 * Configuration problem error
 */
import { CatalystError } from './base';

export class ConfigError extends CatalystError {
  constructor(message: string, guidance: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', guidance, cause);
    this.name = 'ConfigError';
  }
}
