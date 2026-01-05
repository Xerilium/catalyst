import { ConsoleLogger } from '@core/logging/console-logger';
import { LogLevel } from '@core/logging/types';

describe('ConsoleLogger', () => {
  let originalStdoutWrite: typeof process.stdout.write;
  let originalStderrWrite: typeof process.stderr.write;
  let stdoutOutput: string[];
  let stderrOutput: string[];

  beforeEach(() => {
    stdoutOutput = [];
    stderrOutput = [];

    // Mock stdout.write
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = jest.fn((chunk: string | Uint8Array) => {
      stdoutOutput.push(chunk.toString());
      return true;
    }) as typeof process.stdout.write;

    // Mock stderr.write
    originalStderrWrite = process.stderr.write;
    process.stderr.write = jest.fn((chunk: string | Uint8Array) => {
      stderrOutput.push(chunk.toString());
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  describe('FR:console.level - constructor level parameter', () => {
    it('should accept level in constructor', () => {
      const logger = new ConsoleLogger(LogLevel.debug);
      expect(logger).toBeDefined();
    });
  });

  describe('FR:interface.filtering - level filtering', () => {
    it('should output messages at or below current level', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      logger.error('Test', 'test', 'error message');
      logger.warning('Test', 'test', 'warning message');
      logger.info('Test', 'test', 'info message');

      expect(stderrOutput.some((o) => o.includes('error message'))).toBe(true);
      expect(stderrOutput.some((o) => o.includes('warning message'))).toBe(
        true
      );
      expect(stdoutOutput.some((o) => o.includes('info message'))).toBe(true);
    });

    it('should NOT output messages above current level', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      logger.verbose('Test', 'test', 'verbose message');
      logger.debug('Test', 'test', 'debug message');
      logger.trace('Test', 'test', 'trace message');

      expect(stdoutOutput.some((o) => o.includes('verbose message'))).toBe(
        false
      );
      expect(stdoutOutput.some((o) => o.includes('debug message'))).toBe(false);
      expect(stdoutOutput.some((o) => o.includes('trace message'))).toBe(false);
    });

    it('should show all messages at trace level', () => {
      const logger = new ConsoleLogger(LogLevel.trace);

      logger.error('Test', 'test', 'error');
      logger.warning('Test', 'test', 'warning');
      logger.info('Test', 'test', 'info');
      logger.verbose('Test', 'test', 'verbose');
      logger.debug('Test', 'test', 'debug');
      logger.trace('Test', 'test', 'trace');

      const allOutput = [...stderrOutput, ...stdoutOutput].join('');
      expect(allOutput).toContain('error');
      expect(allOutput).toContain('warning');
      expect(allOutput).toContain('info');
      expect(allOutput).toContain('verbose');
      expect(allOutput).toContain('debug');
      expect(allOutput).toContain('trace');
    });

    it('should show nothing at silent level', () => {
      const logger = new ConsoleLogger(LogLevel.silent);

      logger.error('Test', 'test', 'error');
      logger.warning('Test', 'test', 'warning');
      logger.info('Test', 'test', 'info');

      expect(stdoutOutput.length).toBe(0);
      expect(stderrOutput.length).toBe(0);
    });
  });

  describe('FR:interface.prefix - output formatting with level prefix', () => {
    it('should include level text in output', () => {
      const logger = new ConsoleLogger(LogLevel.trace);

      logger.error('Test', 'test', 'msg');
      logger.warning('Test', 'test', 'msg');
      logger.info('Test', 'test', 'msg');
      logger.verbose('Test', 'test', 'msg');
      logger.debug('Test', 'test', 'msg');
      logger.trace('Test', 'test', 'msg');

      const allOutput = [...stderrOutput, ...stdoutOutput].join('');
      expect(allOutput).toContain('ERROR');
      expect(allOutput).toContain('WARN');
      expect(allOutput).toContain('INFO');
      expect(allOutput).toContain('VERB');
      expect(allOutput).toContain('DEBUG');
      expect(allOutput).toContain('TRACE');
    });

    it('should NOT include level icons in output by default', () => {
      const logger = new ConsoleLogger(LogLevel.trace);

      logger.error('Test', 'test', 'msg');
      logger.info('Test', 'test', 'msg');
      logger.debug('Test', 'test', 'msg');

      const allOutput = [...stderrOutput, ...stdoutOutput].join('');
      expect(allOutput).not.toContain('❌');
      expect(allOutput).not.toContain('ℹ️');
      expect(allOutput).not.toContain('🐛');
    });

    it('should include level icons when showIcon is enabled', () => {
      const logger = new ConsoleLogger(LogLevel.trace, undefined, { showIcon: true });

      logger.error('Test', 'test', 'msg');
      logger.info('Test', 'test', 'msg');
      logger.debug('Test', 'test', 'msg');

      const allOutput = [...stderrOutput, ...stdoutOutput].join('');
      expect(allOutput).toContain('❌');
      expect(allOutput).toContain('ℹ️');
      expect(allOutput).toContain('🐛');
    });
  });

  describe('FR:interface.format - source.action format', () => {
    it('should format output as source.action: message', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      logger.info('Engine', 'execute', 'Processing playbook');

      const output = stdoutOutput.join('');
      expect(output).toContain('Engine.execute: Processing playbook');
    });

    it('should include source and action in all log levels', () => {
      const logger = new ConsoleLogger(LogLevel.trace);

      logger.error('GitHub', 'auth', 'Authentication failed');
      logger.debug('Template', 'interpolate', 'Processing expression');

      const allOutput = [...stderrOutput, ...stdoutOutput].join('');
      expect(allOutput).toContain('GitHub.auth: Authentication failed');
      expect(allOutput).toContain('Template.interpolate: Processing expression');
    });
  });

  describe('FR:config - output configuration options', () => {
    it('should allow disabling icons via outputConfig', () => {
      const logger = new ConsoleLogger(LogLevel.info, undefined, { showIcon: false });

      logger.info('Test', 'test', 'test message');

      const output = stdoutOutput.join('');
      expect(output).not.toContain('ℹ️');
      expect(output).toContain('INFO');
      expect(output).toContain('test message');
    });

    it('should allow disabling text via outputConfig', () => {
      const logger = new ConsoleLogger(LogLevel.info, undefined, { showIcon: true, showText: false });

      logger.info('Test', 'test', 'test message');

      const output = stdoutOutput.join('');
      expect(output).toContain('ℹ️');
      expect(output).not.toContain('INFO');
      expect(output).toContain('test message');
    });

    it('should allow disabling alignment via outputConfig', () => {
      const logger = new ConsoleLogger(LogLevel.trace, undefined, { alignText: false });

      logger.info('Test', 'test', 'info test');
      logger.error('Test', 'test', 'error test');

      // Without alignment, INFO prefix should not be padded
      const allOutput = [...stderrOutput, ...stdoutOutput].join('');
      expect(allOutput).toContain('INFO:');
      expect(allOutput).toContain('ERROR:');
    });
  });

  describe('FR:interface.serialization - data parameter serialization', () => {
    it('should serialize data parameter as JSON', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      logger.info('Test', 'test', 'message', { key: 'value', num: 42 });

      const output = stdoutOutput.join('');
      expect(output).toContain('message');
      expect(output).toContain('"key":"value"');
      expect(output).toContain('"num":42');
    });

    it('should handle unserializable data gracefully', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      const circular: Record<string, unknown> = {};
      circular.self = circular;

      expect(() => logger.info('Test', 'test', 'message', circular)).not.toThrow();

      const output = stdoutOutput.join('');
      expect(output).toContain('message');
      expect(output).toContain('[unserializable]');
    });

    it('should work without data parameter', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      expect(() => logger.info('Test', 'test', 'just a message')).not.toThrow();

      const output = stdoutOutput.join('');
      expect(output).toContain('just a message');
    });
  });

  describe('FR:console.streams - stderr vs stdout routing', () => {
    it('should route error to stderr', () => {
      const logger = new ConsoleLogger(LogLevel.error);

      logger.error('Test', 'test', 'error message');

      expect(stderrOutput.some((o) => o.includes('error message'))).toBe(true);
      expect(stdoutOutput.some((o) => o.includes('error message'))).toBe(false);
    });

    it('should route warning to stderr', () => {
      const logger = new ConsoleLogger(LogLevel.warning);

      logger.warning('Test', 'test', 'warning message');

      expect(stderrOutput.some((o) => o.includes('warning message'))).toBe(
        true
      );
      expect(stdoutOutput.some((o) => o.includes('warning message'))).toBe(
        false
      );
    });

    it('should route info to stdout', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      logger.info('Test', 'test', 'info message');

      expect(stdoutOutput.some((o) => o.includes('info message'))).toBe(true);
      expect(stderrOutput.some((o) => o.includes('info message'))).toBe(false);
    });

    it('should route verbose/debug/trace to stdout', () => {
      const logger = new ConsoleLogger(LogLevel.trace);

      logger.verbose('Test', 'test', 'verbose message');
      logger.debug('Test', 'test', 'debug message');
      logger.trace('Test', 'test', 'trace message');

      expect(stdoutOutput.some((o) => o.includes('verbose message'))).toBe(
        true
      );
      expect(stdoutOutput.some((o) => o.includes('debug message'))).toBe(true);
      expect(stdoutOutput.some((o) => o.includes('trace message'))).toBe(true);
    });
  });

  describe('FR:console.colors - ANSI color formatting', () => {
    // Note: Colors may not be present if TTY detection fails in test environment
    // Tests verify output contains message regardless of color codes

    it('should output readable messages regardless of color support', () => {
      const logger = new ConsoleLogger(LogLevel.trace);

      logger.error('Test', 'test', 'error msg');
      logger.warning('Test', 'test', 'warning msg');
      logger.info('Test', 'test', 'info msg');
      logger.verbose('Test', 'test', 'verbose msg');
      logger.debug('Test', 'test', 'debug msg');
      logger.trace('Test', 'test', 'trace msg');

      const allOutput = [...stderrOutput, ...stdoutOutput].join('');
      expect(allOutput).toContain('error msg');
      expect(allOutput).toContain('warning msg');
      expect(allOutput).toContain('info msg');
      expect(allOutput).toContain('verbose msg');
      expect(allOutput).toContain('debug msg');
      expect(allOutput).toContain('trace msg');
    });
  });

  describe('FR:secrets - Secret masking integration', () => {
    const createMockSecretManager = () => ({
      mask: jest.fn((text: string) =>
        text.replace(/secret123/g, '***MASKED***')
      ),
    });

    describe('FR:secrets.manager - accepts optional SecretManager', () => {
      it('should accept secretManager in constructor', () => {
        const secretManager = createMockSecretManager();
        const logger = new ConsoleLogger(LogLevel.info, secretManager);
        expect(logger).toBeDefined();
      });
    });

    describe('FR:secrets.mask - masks secrets in output', () => {
      it('should mask secrets in message', () => {
        const secretManager = createMockSecretManager();
        const logger = new ConsoleLogger(LogLevel.info, secretManager);

        logger.info('Test', 'test', 'The password is secret123');

        const output = stdoutOutput.join('');
        expect(output).not.toContain('secret123');
        expect(output).toContain('***MASKED***');
      });

      it('should mask secrets in data', () => {
        const secretManager = createMockSecretManager();
        const logger = new ConsoleLogger(LogLevel.info, secretManager);

        logger.info('Test', 'test', 'Data with secret', { password: 'secret123' });

        const output = stdoutOutput.join('');
        expect(output).not.toContain('secret123');
        expect(output).toContain('***MASKED***');
      });
    });

    describe('FR:secrets.fallback - works without SecretManager', () => {
      it('should output unmasked when no SecretManager provided', () => {
        const logger = new ConsoleLogger(LogLevel.info);

        logger.info('Test', 'test', 'The password is secret123');

        const output = stdoutOutput.join('');
        expect(output).toContain('secret123');
      });
    });
  });
});
