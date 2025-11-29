import { ValidatorFactory } from '../../../../src/playbooks/scripts/playbooks/types/validation';
import type {
  RegexValidationRule,
  StringLengthValidationRule,
  NumberRangeValidationRule,
  CustomValidationRule,
} from '../../../../src/playbooks/scripts/playbooks/types/validation';

describe('ValidatorFactory', () => {
  let factory: ValidatorFactory;

  beforeEach(() => {
    factory = new ValidatorFactory();
  });

  describe('Regex validation', () => {
    it('should pass for matching string', () => {
      const rule: RegexValidationRule = {
        type: 'Regex',
        pattern: '^[0-9]+$',
      };

      const result = factory.validate('12345', rule);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for non-matching string', () => {
      const rule: RegexValidationRule = {
        type: 'Regex',
        pattern: '^[0-9]+$',
        code: 'NotNumeric',
        message: 'Must contain only digits',
      };

      const result = factory.validate('abc123', rule);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('NotNumeric');
      expect(result.error?.message).toBe('Must contain only digits');
      expect(result.error?.value).toBe('abc123');
    });

    it('should fail for non-string value', () => {
      const rule: RegexValidationRule = {
        type: 'Regex',
        pattern: '^[0-9]+$',
      };

      const result = factory.validate(123, rule);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('InvalidType');
      expect(result.error?.message).toContain('string');
    });
  });

  describe('StringLength validation', () => {
    it('should pass for valid length', () => {
      const rule: StringLengthValidationRule = {
        type: 'StringLength',
        minLength: 3,
        maxLength: 10,
      };

      const result = factory.validate('hello', rule);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail when too short', () => {
      const rule: StringLengthValidationRule = {
        type: 'StringLength',
        minLength: 5,
        code: 'TooShort',
        message: 'Must be at least 5 characters',
      };

      const result = factory.validate('hi', rule);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('TooShort');
      expect(result.error?.message).toBe('Must be at least 5 characters');
    });

    it('should fail when too long', () => {
      const rule: StringLengthValidationRule = {
        type: 'StringLength',
        maxLength: 5,
      };

      const result = factory.validate('toolongstring', rule);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('TooLong');
    });

    it('should fail for non-string value', () => {
      const rule: StringLengthValidationRule = {
        type: 'StringLength',
        minLength: 1,
      };

      const result = factory.validate(123, rule);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('InvalidType');
    });
  });

  describe('NumberRange validation', () => {
    it('should pass for valid number', () => {
      const rule: NumberRangeValidationRule = {
        type: 'NumberRange',
        min: 1,
        max: 100,
      };

      const result = factory.validate(50, rule);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail when too small', () => {
      const rule: NumberRangeValidationRule = {
        type: 'NumberRange',
        min: 10,
        code: 'TooSmall',
        message: 'Must be at least 10',
      };

      const result = factory.validate(5, rule);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('TooSmall');
      expect(result.error?.message).toBe('Must be at least 10');
    });

    it('should fail when too large', () => {
      const rule: NumberRangeValidationRule = {
        type: 'NumberRange',
        max: 100,
      };

      const result = factory.validate(150, rule);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('TooLarge');
    });

    it('should fail for non-number value', () => {
      const rule: NumberRangeValidationRule = {
        type: 'NumberRange',
        min: 1,
      };

      const result = factory.validate('123', rule);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('InvalidType');
    });
  });

  describe('Custom validation', () => {
    it('should pass for valid script', () => {
      const rule: CustomValidationRule = {
        type: 'Custom',
        script: 'value.startsWith("test-")',
      };

      const result = factory.validate('test-123', rule);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail when script returns false', () => {
      const rule: CustomValidationRule = {
        type: 'Custom',
        script: 'value.length > 10',
        code: 'CustomFailed',
        message: 'Custom validation did not pass',
      };

      const result = factory.validate('short', rule);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('CustomFailed');
      expect(result.error?.message).toBe('Custom validation did not pass');
    });

    it('should fail when script throws error', () => {
      const rule: CustomValidationRule = {
        type: 'Custom',
        script: 'value.nonExistentMethod()',
      };

      const result = factory.validate('test', rule);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('CustomValidationError');
    });
  });

  describe('Multiple rules', () => {
    it('should pass when all rules pass', () => {
      const rules = [
        { type: 'Regex' as const, pattern: '^[a-z]+$' },
        { type: 'StringLength' as const, minLength: 3, maxLength: 10 },
      ];

      const result = factory.validateAll('hello', rules);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail on first failing rule', () => {
      const rules = [
        { type: 'StringLength' as const, minLength: 10, code: 'FirstRule' },
        { type: 'Regex' as const, pattern: '^[0-9]+$', code: 'SecondRule' },
      ];

      const result = factory.validateAll('short', rules);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('FirstRule'); // Should fail on first rule, not second
    });

    it('should preserve custom error codes and messages', () => {
      const rule: RegexValidationRule = {
        type: 'Regex',
        pattern: '^PRJ-[0-9]+$',
        code: 'InvalidProjectCode',
        message: 'Project code must start with PRJ- followed by numbers',
      };

      const result = factory.validate('ABC-123', rule);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('InvalidProjectCode');
      expect(result.error?.message).toBe('Project code must start with PRJ- followed by numbers');
      expect(result.error?.rule).toEqual(rule);
    });
  });
});
