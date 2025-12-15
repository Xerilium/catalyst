/**
 * Unit tests for run command argument parsing
 * @req FR:run.execute
 * @req FR:errors.InvalidInput
 */

import { parseInputs, validatePlaybookId } from '../../../../src/cli/commands/run';
import { CatalystError } from '../../../../src/core/errors';

describe('run command', () => {
  describe('parseInputs', () => {
    // @req FR:run.execute
    it('should parse single --input key=value', () => {
      const inputs = parseInputs(['name=value']);
      expect(inputs).toEqual({ name: 'value' });
    });

    // @req FR:run.execute
    it('should parse multiple --input flags', () => {
      const inputs = parseInputs(['key1=value1', 'key2=value2', 'key3=value3']);
      expect(inputs).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      });
    });

    // @req FR:run.execute
    it('should handle values containing equals signs', () => {
      const inputs = parseInputs(['config=key=value']);
      expect(inputs).toEqual({ config: 'key=value' });
    });

    // @req FR:run.execute
    it('should handle empty value after equals', () => {
      const inputs = parseInputs(['empty=']);
      expect(inputs).toEqual({ empty: '' });
    });

    // @req FR:errors.InvalidInput
    it('should throw InvalidInput for missing equals sign', () => {
      try {
        parseInputs(['invalid']);
        fail('Expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        expect((error as CatalystError).code).toBe('InvalidInput');
      }
    });

    // @req FR:run.execute
    it('should return empty object for empty input array', () => {
      const inputs = parseInputs([]);
      expect(inputs).toEqual({});
    });

    // @req FR:run.execute
    it('should return empty object for undefined input', () => {
      const inputs = parseInputs(undefined as unknown as string[]);
      expect(inputs).toEqual({});
    });
  });

  describe('validatePlaybookId', () => {
    // @req FR:run.execute
    it('should accept valid playbook IDs', () => {
      expect(() => validatePlaybookId('start-blueprint')).not.toThrow();
      expect(() => validatePlaybookId('my-playbook')).not.toThrow();
      expect(() => validatePlaybookId('playbook123')).not.toThrow();
    });

    // @req FR:errors.MissingPlaybookId
    it('should throw MissingPlaybookId for empty string', () => {
      try {
        validatePlaybookId('');
        fail('Expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        expect((error as CatalystError).code).toBe('MissingPlaybookId');
      }
    });

    // @req FR:errors.MissingPlaybookId
    it('should throw MissingPlaybookId for undefined', () => {
      try {
        validatePlaybookId(undefined as unknown as string);
        fail('Expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        expect((error as CatalystError).code).toBe('MissingPlaybookId');
      }
    });

    // @req FR:errors.MissingPlaybookId
    it('should throw MissingPlaybookId for whitespace-only string', () => {
      try {
        validatePlaybookId('   ');
        fail('Expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        expect((error as CatalystError).code).toBe('MissingPlaybookId');
      }
    });
  });
});
