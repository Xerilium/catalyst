import { LogLevel } from '@core/logging/types';

describe('LogLevel', () => {
  describe('FR:level.values - numeric values', () => {
    it('should have silent = -1', () => {
      expect(LogLevel.silent).toBe(-1);
    });

    it('should have error = 0', () => {
      expect(LogLevel.error).toBe(0);
    });

    it('should have warning = 1', () => {
      expect(LogLevel.warning).toBe(1);
    });

    it('should have info = 1 (same as warning)', () => {
      expect(LogLevel.info).toBe(1);
    });

    it('should have verbose = 2', () => {
      expect(LogLevel.verbose).toBe(2);
    });

    it('should have debug = 3', () => {
      expect(LogLevel.debug).toBe(3);
    });

    it('should have trace = 4', () => {
      expect(LogLevel.trace).toBe(4);
    });
  });

  describe('FR:level.hierarchy - level comparison', () => {
    it('should allow numeric comparison for filtering', () => {
      // Higher levels include lower level output
      expect(LogLevel.trace > LogLevel.debug).toBe(true);
      expect(LogLevel.debug > LogLevel.verbose).toBe(true);
      expect(LogLevel.verbose > LogLevel.info).toBe(true);
      expect(LogLevel.info > LogLevel.error).toBe(true);
      expect(LogLevel.error > LogLevel.silent).toBe(true);
    });

    it('should filter correctly at debug level', () => {
      const currentLevel = LogLevel.debug;
      expect(currentLevel >= LogLevel.error).toBe(true); // Should show errors
      expect(currentLevel >= LogLevel.warning).toBe(true); // Should show warnings
      expect(currentLevel >= LogLevel.info).toBe(true); // Should show info
      expect(currentLevel >= LogLevel.verbose).toBe(true); // Should show verbose
      expect(currentLevel >= LogLevel.debug).toBe(true); // Should show debug
      expect(currentLevel >= LogLevel.trace).toBe(false); // Should NOT show trace
    });

    it('should filter correctly at info level', () => {
      const currentLevel = LogLevel.info;
      expect(currentLevel >= LogLevel.error).toBe(true); // Should show errors
      expect(currentLevel >= LogLevel.warning).toBe(true); // Should show warnings
      expect(currentLevel >= LogLevel.info).toBe(true); // Should show info
      expect(currentLevel >= LogLevel.verbose).toBe(false); // Should NOT show verbose
      expect(currentLevel >= LogLevel.debug).toBe(false); // Should NOT show debug
      expect(currentLevel >= LogLevel.trace).toBe(false); // Should NOT show trace
    });

    it('should show nothing at silent level', () => {
      const currentLevel = LogLevel.silent;
      expect(currentLevel >= LogLevel.error).toBe(false);
      expect(currentLevel >= LogLevel.warning).toBe(false);
      expect(currentLevel >= LogLevel.info).toBe(false);
    });
  });
});
