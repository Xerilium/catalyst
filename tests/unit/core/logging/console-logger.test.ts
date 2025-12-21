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

      logger.error('error message');
      logger.warning('warning message');
      logger.info('info message');

      expect(stderrOutput.some((o) => o.includes('error message'))).toBe(true);
      expect(stderrOutput.some((o) => o.includes('warning message'))).toBe(
        true
      );
      expect(stdoutOutput.some((o) => o.includes('info message'))).toBe(true);
    });

    it('should NOT output messages above current level', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      logger.verbose('verbose message');
      logger.debug('debug message');
      logger.trace('trace message');

      expect(stdoutOutput.some((o) => o.includes('verbose message'))).toBe(
        false
      );
      expect(stdoutOutput.some((o) => o.includes('debug message'))).toBe(false);
      expect(stdoutOutput.some((o) => o.includes('trace message'))).toBe(false);
    });

    it('should show all messages at trace level', () => {
      const logger = new ConsoleLogger(LogLevel.trace);

      logger.error('error');
      logger.warning('warning');
      logger.info('info');
      logger.verbose('verbose');
      logger.debug('debug');
      logger.trace('trace');

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

      logger.error('error');
      logger.warning('warning');
      logger.info('info');

      expect(stdoutOutput.length).toBe(0);
      expect(stderrOutput.length).toBe(0);
    });
  });

  describe('FR:interface.prefix - output formatting with level prefix', () => {
    it('should include level prefix in output', () => {
      const logger = new ConsoleLogger(LogLevel.trace);

      logger.error('test');
      logger.warning('test');
      logger.info('test');
      logger.verbose('test');
      logger.debug('test');
      logger.trace('test');

      const allOutput = [...stderrOutput, ...stdoutOutput].join('');
      expect(allOutput).toContain('[error]');
      expect(allOutput).toContain('[warning]');
      expect(allOutput).toContain('[info]');
      expect(allOutput).toContain('[verbose]');
      expect(allOutput).toContain('[debug]');
      expect(allOutput).toContain('[trace]');
    });
  });

  describe('FR:interface.serialization - data parameter serialization', () => {
    it('should serialize data parameter as JSON', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      logger.info('message', { key: 'value', num: 42 });

      const output = stdoutOutput.join('');
      expect(output).toContain('message');
      expect(output).toContain('"key":"value"');
      expect(output).toContain('"num":42');
    });

    it('should handle unserializable data gracefully', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      const circular: { self?: unknown } = {};
      circular.self = circular;

      expect(() => logger.info('message', circular)).not.toThrow();

      const output = stdoutOutput.join('');
      expect(output).toContain('message');
      expect(output).toContain('[unserializable]');
    });

    it('should work without data parameter', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      expect(() => logger.info('just a message')).not.toThrow();

      const output = stdoutOutput.join('');
      expect(output).toContain('just a message');
    });
  });

  describe('FR:console.streams - stderr vs stdout routing', () => {
    it('should route error to stderr', () => {
      const logger = new ConsoleLogger(LogLevel.error);

      logger.error('error message');

      expect(stderrOutput.some((o) => o.includes('error message'))).toBe(true);
      expect(stdoutOutput.some((o) => o.includes('error message'))).toBe(false);
    });

    it('should route warning to stderr', () => {
      const logger = new ConsoleLogger(LogLevel.warning);

      logger.warning('warning message');

      expect(stderrOutput.some((o) => o.includes('warning message'))).toBe(
        true
      );
      expect(stdoutOutput.some((o) => o.includes('warning message'))).toBe(
        false
      );
    });

    it('should route info to stdout', () => {
      const logger = new ConsoleLogger(LogLevel.info);

      logger.info('info message');

      expect(stdoutOutput.some((o) => o.includes('info message'))).toBe(true);
      expect(stderrOutput.some((o) => o.includes('info message'))).toBe(false);
    });

    it('should route verbose/debug/trace to stdout', () => {
      const logger = new ConsoleLogger(LogLevel.trace);

      logger.verbose('verbose message');
      logger.debug('debug message');
      logger.trace('trace message');

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

      logger.error('error msg');
      logger.warning('warning msg');
      logger.info('info msg');
      logger.verbose('verbose msg');
      logger.debug('debug msg');
      logger.trace('trace msg');

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

        logger.info('The password is secret123');

        const output = stdoutOutput.join('');
        expect(output).not.toContain('secret123');
        expect(output).toContain('***MASKED***');
      });

      it('should mask secrets in data', () => {
        const secretManager = createMockSecretManager();
        const logger = new ConsoleLogger(LogLevel.info, secretManager);

        logger.info('Data with secret', { password: 'secret123' });

        const output = stdoutOutput.join('');
        expect(output).not.toContain('secret123');
        expect(output).toContain('***MASKED***');
      });
    });

    describe('FR:secrets.fallback - works without SecretManager', () => {
      it('should output unmasked when no SecretManager provided', () => {
        const logger = new ConsoleLogger(LogLevel.info);

        logger.info('The password is secret123');

        const output = stdoutOutput.join('');
        expect(output).toContain('secret123');
      });
    });
  });
});
