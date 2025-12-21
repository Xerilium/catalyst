import { LoggerSingleton } from '@core/logging/logger';
import type { Logger } from '@core/logging/types';

describe('LoggerSingleton', () => {
  beforeEach(() => {
    // Reset singleton state before each test
    LoggerSingleton.reset();
  });

  describe('FR:singleton.noOp - getInstance before initialization', () => {
    it('should return a NoOpLogger when not initialized', () => {
      const logger = LoggerSingleton.getInstance();

      // NoOpLogger should be callable without throwing
      expect(() => logger.error('test')).not.toThrow();
      expect(() => logger.warning('test')).not.toThrow();
      expect(() => logger.info('test')).not.toThrow();
      expect(() => logger.verbose('test')).not.toThrow();
      expect(() => logger.debug('test')).not.toThrow();
      expect(() => logger.trace('test')).not.toThrow();
    });

    it('should return same NoOpLogger instance on multiple calls', () => {
      const logger1 = LoggerSingleton.getInstance();
      const logger2 = LoggerSingleton.getInstance();
      expect(logger1).toBe(logger2);
    });
  });

  describe('FR:singleton.initialize - setting the logger', () => {
    it('should set the logger when initialized', () => {
      const mockLogger: Logger = {
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      };

      LoggerSingleton.initialize(mockLogger);
      const logger = LoggerSingleton.getInstance();

      expect(logger).toBe(mockLogger);
    });

    it('should use initialized logger for all log methods', () => {
      const mockLogger: Logger = {
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      };

      LoggerSingleton.initialize(mockLogger);
      const logger = LoggerSingleton.getInstance();

      logger.error('error msg');
      logger.warning('warning msg');
      logger.info('info msg');
      logger.verbose('verbose msg');
      logger.debug('debug msg');
      logger.trace('trace msg');

      expect(mockLogger.error).toHaveBeenCalledWith('error msg');
      expect(mockLogger.warning).toHaveBeenCalledWith('warning msg');
      expect(mockLogger.info).toHaveBeenCalledWith('info msg');
      expect(mockLogger.verbose).toHaveBeenCalledWith('verbose msg');
      expect(mockLogger.debug).toHaveBeenCalledWith('debug msg');
      expect(mockLogger.trace).toHaveBeenCalledWith('trace msg');
    });
  });

  describe('FR:singleton.secure - double initialization throws', () => {
    it('should throw LoggerAlreadyInitialized if called twice', () => {
      const mockLogger: Logger = {
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      };

      LoggerSingleton.initialize(mockLogger);

      expect(() => LoggerSingleton.initialize(mockLogger)).toThrow(
        /already.*initialized/i
      );
    });
  });

  describe('FR:singleton.reset - test isolation', () => {
    it('should allow re-initialization after reset', () => {
      const mockLogger1: Logger = {
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      };
      const mockLogger2: Logger = {
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      };

      LoggerSingleton.initialize(mockLogger1);
      expect(LoggerSingleton.getInstance()).toBe(mockLogger1);

      LoggerSingleton.reset();

      LoggerSingleton.initialize(mockLogger2);
      expect(LoggerSingleton.getInstance()).toBe(mockLogger2);
    });

    it('should return NoOpLogger after reset', () => {
      const mockLogger: Logger = {
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      };

      LoggerSingleton.initialize(mockLogger);
      LoggerSingleton.reset();

      const logger = LoggerSingleton.getInstance();
      // Should be NoOpLogger, not the mock
      expect(logger).not.toBe(mockLogger);

      // NoOpLogger should be silent
      expect(() => logger.info('test')).not.toThrow();
    });
  });
});
