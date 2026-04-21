import { LogManager } from '@core/logging/log-manager';
import type { Logger } from '@core/logging/types';

function mockLogger(): Logger {
  return {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };
}

describe('LogManager', () => {
  beforeEach(() => {
    LogManager.reset();
  });

  describe('FR:access.fallback - no-op when no default and no scope', () => {
    it('returns a no-op logger before any configuration', () => {
      const logger = LogManager.current();
      expect(() => logger.error('S', 'a', 'm')).not.toThrow();
      expect(() => logger.info('S', 'a', 'm')).not.toThrow();
    });

    it('returns the same no-op logger instance', () => {
      expect(LogManager.current()).toBe(LogManager.current());
    });
  });

  describe('FR:access.default - framework default logger', () => {
    it('returns the framework logger once set', () => {
      const framework = mockLogger();
      LogManager.setFramework(framework);
      expect(LogManager.current()).toBe(framework);
    });

    it('throws LoggerAlreadyInitialized on second setFramework', () => {
      LogManager.setFramework(mockLogger());
      expect(() => LogManager.setFramework(mockLogger())).toThrow(/already.*initialized/i);
    });
  });

  describe('FR:access.current - routes to the right logger', () => {
    it('routes calls to framework logger when no scope active', () => {
      const framework = mockLogger();
      LogManager.setFramework(framework);
      LogManager.current().info('Src', 'act', 'msg');
      expect(framework.info).toHaveBeenCalledWith('Src', 'act', 'msg');
    });
  });

  describe('FR:access.contextual - scoped substitution', () => {
    it('returns the scoped logger inside scope()', () => {
      const framework = mockLogger();
      const scoped = mockLogger();
      LogManager.setFramework(framework);

      LogManager.scope(scoped, () => {
        expect(LogManager.current()).toBe(scoped);
      });
    });

    it('reverts to framework logger after scope exits', () => {
      const framework = mockLogger();
      const scoped = mockLogger();
      LogManager.setFramework(framework);

      LogManager.scope(scoped, () => {
        /* inside scope */
      });

      expect(LogManager.current()).toBe(framework);
    });

    it('propagates through async awaits', async () => {
      const framework = mockLogger();
      const scoped = mockLogger();
      LogManager.setFramework(framework);

      await LogManager.scope(scoped, async () => {
        await Promise.resolve();
        await new Promise((resolve) => setImmediate(resolve));
        LogManager.current().info('Src', 'act', 'msg');
      });

      expect(scoped.info).toHaveBeenCalledWith('Src', 'act', 'msg');
      expect(framework.info).not.toHaveBeenCalled();
    });

    it('returns the callback result', () => {
      const scoped = mockLogger();
      const result = LogManager.scope(scoped, () => 42);
      expect(result).toBe(42);
    });

    it('returns the async callback result', async () => {
      const scoped = mockLogger();
      const result = await LogManager.scope(scoped, async () => 'ok');
      expect(result).toBe('ok');
    });

    it('innermost scope wins when nested', () => {
      const outer = mockLogger();
      const inner = mockLogger();

      LogManager.scope(outer, () => {
        expect(LogManager.current()).toBe(outer);
        LogManager.scope(inner, () => {
          expect(LogManager.current()).toBe(inner);
        });
        expect(LogManager.current()).toBe(outer);
      });
    });
  });

  describe('FR:access.isolation - concurrent operations resolve independently', () => {
    it('parallel scopes do not leak into one another', async () => {
      const a = mockLogger();
      const b = mockLogger();

      async function useScope(logger: Logger, tag: string): Promise<string> {
        return LogManager.scope(logger, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          LogManager.current().info('Src', 'act', tag);
          return tag;
        });
      }

      const [resA, resB] = await Promise.all([useScope(a, 'a'), useScope(b, 'b')]);

      expect(resA).toBe('a');
      expect(resB).toBe('b');
      expect(a.info).toHaveBeenCalledWith('Src', 'act', 'a');
      expect(a.info).not.toHaveBeenCalledWith('Src', 'act', 'b');
      expect(b.info).toHaveBeenCalledWith('Src', 'act', 'b');
      expect(b.info).not.toHaveBeenCalledWith('Src', 'act', 'a');
    });
  });

  describe('framework() - bypass active scope', () => {
    it('returns the framework logger even inside an active scope', () => {
      const framework = mockLogger();
      const scoped = mockLogger();
      LogManager.setFramework(framework);

      LogManager.scope(scoped, () => {
        expect(LogManager.current()).toBe(scoped);
        expect(LogManager.framework()).toBe(framework);
      });
    });

    it('returns the no-op logger when no framework is configured', () => {
      const fw = LogManager.framework();
      expect(() => fw.info('S', 'a', 'm')).not.toThrow();
    });
  });

  describe('FR:access.reset - test isolation', () => {
    it('allows reconfiguring framework logger', () => {
      const a = mockLogger();
      const b = mockLogger();
      LogManager.setFramework(a);
      LogManager.reset();
      LogManager.setFramework(b);
      expect(LogManager.current()).toBe(b);
    });

    it('returns no-op after reset', () => {
      LogManager.setFramework(mockLogger());
      LogManager.reset();
      const logger = LogManager.current();
      expect(() => logger.info('S', 'a', 'm')).not.toThrow();
    });
  });
});
