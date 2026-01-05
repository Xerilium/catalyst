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
      expect(() => logger.error('Test', 'test', 'msg')).not.toThrow();
      expect(() => logger.warning('Test', 'test', 'msg')).not.toThrow();
      expect(() => logger.info('Test', 'test', 'msg')).not.toThrow();
      expect(() => logger.verbose('Test', 'test', 'msg')).not.toThrow();
      expect(() => logger.debug('Test', 'test', 'msg')).not.toThrow();
      expect(() => logger.trace('Test', 'test', 'msg')).not.toThrow();
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

      logger.error('Source', 'action', 'error msg');
      logger.warning('Source', 'action', 'warning msg');
      logger.info('Source', 'action', 'info msg');
      logger.verbose('Source', 'action', 'verbose msg');
      logger.debug('Source', 'action', 'debug msg');
      logger.trace('Source', 'action', 'trace msg');

      expect(mockLogger.error).toHaveBeenCalledWith('Source', 'action', 'error msg');
      expect(mockLogger.warning).toHaveBeenCalledWith('Source', 'action', 'warning msg');
      expect(mockLogger.info).toHaveBeenCalledWith('Source', 'action', 'info msg');
      expect(mockLogger.verbose).toHaveBeenCalledWith('Source', 'action', 'verbose msg');
      expect(mockLogger.debug).toHaveBeenCalledWith('Source', 'action', 'debug msg');
      expect(mockLogger.trace).toHaveBeenCalledWith('Source', 'action', 'trace msg');
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
      expect(() => logger.info('Test', 'test', 'msg')).not.toThrow();
    });
  });
});
