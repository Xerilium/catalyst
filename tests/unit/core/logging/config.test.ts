/**
 * Tests for logging configuration
 * @req FR:config.levels
 * @req FR:config.options
 * @req FR:config.format
 */

import {
  LOG_LEVEL_CONFIG,
  LOG_OUTPUT_CONFIG,
  ANSI_COLORS,
  buildLogPrefix,
  getColorCode,
  getMaxTextLength,
} from '@core/logging/config';

describe('Logging Configuration', () => {
  describe('FR:config.levels - LOG_LEVEL_CONFIG', () => {
    it('should define configuration for all log levels', () => {
      const expectedLevels = ['error', 'warning', 'info', 'verbose', 'debug', 'trace'];

      for (const level of expectedLevels) {
        expect(LOG_LEVEL_CONFIG[level]).toBeDefined();
        expect(LOG_LEVEL_CONFIG[level].icon).toBeDefined();
        expect(LOG_LEVEL_CONFIG[level].text).toBeDefined();
        expect(LOG_LEVEL_CONFIG[level].color).toBeDefined();
      }
    });

    it('should have correct icons for each level', () => {
      expect(LOG_LEVEL_CONFIG.error.icon).toBe('❌');
      expect(LOG_LEVEL_CONFIG.warning.icon).toBe('⚠️');
      expect(LOG_LEVEL_CONFIG.info.icon).toBe('ℹ️');
      expect(LOG_LEVEL_CONFIG.verbose.icon).toBe('🔍');
      expect(LOG_LEVEL_CONFIG.debug.icon).toBe('🐛');
      expect(LOG_LEVEL_CONFIG.trace.icon).toBe('🧵');
    });

    it('should have correct text labels for each level', () => {
      expect(LOG_LEVEL_CONFIG.error.text).toBe('ERROR');
      expect(LOG_LEVEL_CONFIG.warning.text).toBe('WARN');
      expect(LOG_LEVEL_CONFIG.info.text).toBe('INFO');
      expect(LOG_LEVEL_CONFIG.verbose.text).toBe('VERB');
      expect(LOG_LEVEL_CONFIG.debug.text).toBe('DEBUG');
      expect(LOG_LEVEL_CONFIG.trace.text).toBe('TRACE');
    });

    it('should have correct colors for each level', () => {
      expect(LOG_LEVEL_CONFIG.error.color).toBe('red');
      expect(LOG_LEVEL_CONFIG.warning.color).toBe('yellow');
      expect(LOG_LEVEL_CONFIG.info.color).toBe('blue');
      expect(LOG_LEVEL_CONFIG.verbose.color).toBe('gray');
      expect(LOG_LEVEL_CONFIG.debug.color).toBe('magenta');
      expect(LOG_LEVEL_CONFIG.trace.color).toBe('cyan');
    });
  });

  describe('FR:config.options - LOG_OUTPUT_CONFIG defaults', () => {
    it('should have showIcon enabled by default', () => {
      expect(LOG_OUTPUT_CONFIG.showIcon).toBe(true);
    });

    it('should have showText enabled by default', () => {
      expect(LOG_OUTPUT_CONFIG.showText).toBe(true);
    });

    it('should have useColor enabled by default', () => {
      expect(LOG_OUTPUT_CONFIG.useColor).toBe(true);
    });

    it('should have fullColorThreshold set to warning by default', () => {
      expect(LOG_OUTPUT_CONFIG.fullColorThreshold).toBe(1); // LogLevel.warning
    });

    it('should have defaultColor set to gray by default', () => {
      expect(LOG_OUTPUT_CONFIG.defaultColor).toBe('gray');
    });

    it('should have alignText enabled by default', () => {
      expect(LOG_OUTPUT_CONFIG.alignText).toBe(true);
    });
  });

  describe('ANSI_COLORS', () => {
    it('should define reset code', () => {
      expect(ANSI_COLORS.reset).toBe('\x1b[0m');
    });

    it('should define all required colors', () => {
      expect(ANSI_COLORS.red).toBeDefined();
      expect(ANSI_COLORS.yellow).toBeDefined();
      expect(ANSI_COLORS.blue).toBeDefined();
      expect(ANSI_COLORS.magenta).toBeDefined();
      expect(ANSI_COLORS.cyan).toBeDefined();
      expect(ANSI_COLORS.gray).toBeDefined();
    });
  });

  describe('getMaxTextLength', () => {
    it('should return the length of the longest text label', () => {
      // "ERROR", "DEBUG", "TRACE" are all 5 chars; "WARN", "INFO", "VERB" are 4 chars
      expect(getMaxTextLength()).toBe(5);
    });
  });

  describe('getColorCode', () => {
    it('should return correct color code for each level', () => {
      expect(getColorCode('error')).toBe(ANSI_COLORS.red);
      expect(getColorCode('warning')).toBe(ANSI_COLORS.yellow);
      expect(getColorCode('info')).toBe(ANSI_COLORS.blue);
      expect(getColorCode('verbose')).toBe(ANSI_COLORS.gray);
      expect(getColorCode('debug')).toBe(ANSI_COLORS.magenta);
      expect(getColorCode('trace')).toBe(ANSI_COLORS.cyan);
    });

    it('should return empty string for unknown level', () => {
      expect(getColorCode('unknown')).toBe('');
    });
  });

  describe('FR:config.format - buildLogPrefix', () => {
    describe('with default configuration', () => {
      it('should include icon, text, padding, and separator', () => {
        const prefix = buildLogPrefix('error');
        // Format: {icon}{space}{text}{pad}{separator}
        // "❌ ERROR: " (ERROR is 5 chars, max is 5, so no extra padding)
        expect(prefix).toBe('❌ ERROR: ');
      });

      it('should pad shorter text labels for alignment', () => {
        const infoPrefix = buildLogPrefix('info');
        const errorPrefix = buildLogPrefix('error');

        // INFO is 4 chars, padded to 5
        // Both should have same length for alignment
        expect(infoPrefix).toBe('ℹ️ INFO : ');
        expect(errorPrefix).toBe('❌ ERROR: ');
      });
    });

    describe('with showIcon disabled', () => {
      it('should omit icon and space', () => {
        const prefix = buildLogPrefix('error', { ...LOG_OUTPUT_CONFIG, showIcon: false });
        expect(prefix).toBe('ERROR: ');
      });
    });

    describe('with showText disabled', () => {
      it('should show only icon without separator', () => {
        const prefix = buildLogPrefix('error', { ...LOG_OUTPUT_CONFIG, showText: false });
        expect(prefix).toBe('❌');
      });
    });

    describe('with both icon and text disabled', () => {
      it('should return empty string', () => {
        const prefix = buildLogPrefix('error', {
          ...LOG_OUTPUT_CONFIG,
          showIcon: false,
          showText: false
        });
        expect(prefix).toBe('');
      });
    });

    describe('with alignText disabled', () => {
      it('should not pad text labels', () => {
        const infoPrefix = buildLogPrefix('info', { ...LOG_OUTPUT_CONFIG, alignText: false });
        expect(infoPrefix).toBe('ℹ️ INFO: ');
      });
    });

    it('should return empty string for unknown level', () => {
      const prefix = buildLogPrefix('unknown');
      expect(prefix).toBe('');
    });
  });
});
