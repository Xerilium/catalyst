import { CatalystError } from './base';

export class ConfigError extends CatalystError {
  constructor(message: string, guidance: string, cause?: Error) {
    // code expected by tests and consumers is SCREAMING_SNAKE_CASE
    super(message, 'CONFIG_ERROR', guidance, cause);
    this.name = 'ConfigError';
  }
}
