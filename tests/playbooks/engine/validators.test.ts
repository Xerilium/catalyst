import { describe, it, expect } from '@jest/globals';
import type { Playbook, InputParameter } from '@playbooks/types';
import { CatalystError } from '@core/errors';
import {
  validatePlaybookStructure,
  validateInputs,
  validateOutputs,
  coerceInputTypes,
  applyInputDefaults
} from '@playbooks/engine/validators';

// Helper to assert CatalystError
function expectCatalystError(fn: () => void, expectedCode: string, expectedMessagePart?: string) {
  try {
    fn();
    throw new Error('Expected function to throw CatalystError');
  } catch (error) {
    expect(error).toBeInstanceOf(CatalystError);
    expect((error as CatalystError).code).toBe(expectedCode);
    if (expectedMessagePart) {
      expect((error as CatalystError).message).toContain(expectedMessagePart);
    }
  }
}

describe('validatePlaybookStructure', () => {
  it('should pass validation for valid playbook', () => {
    const playbook: Playbook = {
      name: 'test-playbook',
      description: 'Test description',
      owner: 'Engineer',
      steps: [
        { action: 'test-action', config: {} }
      ]
    };

    expect(() => validatePlaybookStructure(playbook)).not.toThrow();
  });

  it('should fail if name is missing', () => {
    const playbook = {
      description: 'Test description',
      owner: 'Engineer',
      steps: [{ action: 'test-action', config: {} }]
    } as unknown as Playbook;

    expectCatalystError(() => validatePlaybookStructure(playbook), 'PlaybookNotValid', 'name');
  });

  it('should fail if description is missing', () => {
    const playbook = {
      name: 'test-playbook',
      owner: 'Engineer',
      steps: [{ action: 'test-action', config: {} }]
    } as unknown as Playbook;

    expectCatalystError(() => validatePlaybookStructure(playbook), 'PlaybookNotValid', 'description');
  });

  it('should fail if owner is missing', () => {
    const playbook = {
      name: 'test-playbook',
      description: 'Test description',
      steps: [{ action: 'test-action', config: {} }]
    } as unknown as Playbook;

    expectCatalystError(() => validatePlaybookStructure(playbook), 'PlaybookNotValid', 'owner');
  });

  it('should fail if steps is empty', () => {
    const playbook: Playbook = {
      name: 'test-playbook',
      description: 'Test description',
      owner: 'Engineer',
      steps: []
    };

    expectCatalystError(() => validatePlaybookStructure(playbook), 'PlaybookNotValid', 'at least one step');
  });

  it('should fail if step is missing action', () => {
    const playbook = {
      name: 'test-playbook',
      description: 'Test description',
      owner: 'Engineer',
      steps: [{ config: {} }]
    } as unknown as Playbook;

    expectCatalystError(() => validatePlaybookStructure(playbook), 'PlaybookNotValid', 'action');
  });

  it('should fail if step is missing config', () => {
    const playbook = {
      name: 'test-playbook',
      description: 'Test description',
      owner: 'Engineer',
      steps: [{ action: 'test-action' }]
    } as unknown as Playbook;

    expectCatalystError(() => validatePlaybookStructure(playbook), 'PlaybookNotValid', 'config');
  });

  it('should provide clear error messages with multiple issues', () => {
    const playbook = {
      steps: [{ config: {} }]
    } as unknown as Playbook;

    expectCatalystError(() => validatePlaybookStructure(playbook), 'PlaybookNotValid');
  });
});

describe('validateInputs', () => {
  it('should pass validation with no input spec', () => {
    const inputs = { 'test-param': 'value' };

    expect(() => validateInputs(inputs, [])).not.toThrow();
  });

  it('should pass validation with valid inputs', () => {
    const inputs = { 'test-param': 'value' };
    const inputSpec: InputParameter[] = [
      { name: 'test-param', type: 'string', required: true }
    ];

    expect(() => validateInputs(inputs, inputSpec)).not.toThrow();
  });

  it('should fail if required parameter is missing', () => {
    const inputs = {};
    const inputSpec: InputParameter[] = [
      { name: 'required-param', type: 'string', required: true }
    ];

    expectCatalystError(() => validateInputs(inputs, inputSpec), 'InputValidationFailed', 'required-param');
  });

  it('should pass if optional parameter is missing', () => {
    const inputs = {};
    const inputSpec: InputParameter[] = [
      { name: 'optional-param', type: 'string', required: false }
    ];

    expect(() => validateInputs(inputs, inputSpec)).not.toThrow();
  });

  it('should fail if parameter type is wrong', () => {
    const inputs = { 'test-param': 123 };
    const inputSpec: InputParameter[] = [
      { name: 'test-param', type: 'string', required: true }
    ];

    expectCatalystError(() => validateInputs(inputs, inputSpec), 'InputValidationFailed', 'type');
  });

  it('should validate number types', () => {
    const inputs = { 'count': 42 };
    const inputSpec: InputParameter[] = [
      { name: 'count', type: 'number', required: true }
    ];

    expect(() => validateInputs(inputs, inputSpec)).not.toThrow();
  });

  it('should validate boolean types', () => {
    const inputs = { 'enabled': true };
    const inputSpec: InputParameter[] = [
      { name: 'enabled', type: 'boolean', required: true }
    ];

    expect(() => validateInputs(inputs, inputSpec)).not.toThrow();
  });

  it('should fail if value not in allowed list', () => {
    const inputs = { 'environment': 'invalid' };
    const inputSpec: InputParameter[] = [
      {
        name: 'environment',
        type: 'string',
        required: true,
        allowed: ['dev', 'staging', 'prod']
      }
    ];

    expectCatalystError(() => validateInputs(inputs, inputSpec), 'InputValidationFailed', 'allowed');
  });

  it('should pass if value is in allowed list', () => {
    const inputs = { 'environment': 'prod' };
    const inputSpec: InputParameter[] = [
      {
        name: 'environment',
        type: 'string',
        required: true,
        allowed: ['dev', 'staging', 'prod']
      }
    ];

    expect(() => validateInputs(inputs, inputSpec)).not.toThrow();
  });

  it('should validate regex rules', () => {
    const inputs = { 'email': 'not-an-email' };
    const inputSpec: InputParameter[] = [
      {
        name: 'email',
        type: 'string',
        required: true,
        validation: [
          {
            type: 'Regex',
            pattern: '^[^@]+@[^@]+\\.[^@]+$',
            message: 'Invalid email format'
          }
        ]
      }
    ];

    expectCatalystError(() => validateInputs(inputs, inputSpec), 'InputValidationFailed', 'validation failed');
  });

  it('should provide clear error messages with multiple issues', () => {
    const inputs = { 'wrong-type': 123 };
    const inputSpec: InputParameter[] = [
      { name: 'missing-required', type: 'string', required: true },
      { name: 'wrong-type', type: 'string', required: true }
    ];

    expectCatalystError(() => validateInputs(inputs, inputSpec), 'InputValidationFailed');
  });
});

describe('validateOutputs', () => {
  it('should pass validation with no outputs spec', () => {
    const variables = { 'result': 'value' };

    expect(() => validateOutputs(undefined, variables)).not.toThrow();
  });

  it('should pass validation with empty outputs spec', () => {
    const variables = { 'result': 'value' };

    expect(() => validateOutputs({}, variables)).not.toThrow();
  });

  it('should pass validation when outputs exist', () => {
    const outputs = { 'result': 'string' };
    const variables = { 'result': 'value' };

    expect(() => validateOutputs(outputs, variables)).not.toThrow();
  });

  it('should fail if output is missing from variables', () => {
    const outputs = { 'result': 'string' };
    const variables = {};

    expectCatalystError(() => validateOutputs(outputs, variables), 'OutputValidationFailed', 'result');
  });

  it('should fail if output type is wrong', () => {
    const outputs = { 'result': 'string' };
    const variables = { 'result': 123 };

    expectCatalystError(() => validateOutputs(outputs, variables), 'OutputValidationFailed', 'type');
  });

  it('should validate multiple outputs', () => {
    const outputs = {
      'user-id': 'number',
      'user-email': 'string'
    };
    const variables = {
      'user-id': 123,
      'user-email': 'alice@example.com'
    };

    expect(() => validateOutputs(outputs, variables)).not.toThrow();
  });

  it('should provide clear error messages with multiple issues', () => {
    const outputs = {
      'missing-output': 'string',
      'wrong-type': 'string'
    };
    const variables = { 'wrong-type': 123 };

    expectCatalystError(() => validateOutputs(outputs, variables), 'OutputValidationFailed');
  });
});

describe('coerceInputTypes', () => {
  it('should coerce "true" to boolean true', () => {
    const inputs = { 'flag': 'true' };
    const inputSpec: InputParameter[] = [
      { name: 'flag', type: 'boolean', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.flag).toBe(true);
    expect(typeof result.flag).toBe('boolean');
  });

  it('should coerce "TRUE" to boolean true (case insensitive)', () => {
    const inputs = { 'flag': 'TRUE' };
    const inputSpec: InputParameter[] = [
      { name: 'flag', type: 'boolean', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.flag).toBe(true);
  });

  it('should coerce "false" to boolean false', () => {
    const inputs = { 'flag': 'false' };
    const inputSpec: InputParameter[] = [
      { name: 'flag', type: 'boolean', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.flag).toBe(false);
    expect(typeof result.flag).toBe('boolean');
  });

  it('should coerce "1" to boolean true for boolean type', () => {
    const inputs = { 'flag': '1' };
    const inputSpec: InputParameter[] = [
      { name: 'flag', type: 'boolean', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.flag).toBe(true);
    expect(typeof result.flag).toBe('boolean');
  });

  it('should coerce "0" to boolean false for boolean type', () => {
    const inputs = { 'flag': '0' };
    const inputSpec: InputParameter[] = [
      { name: 'flag', type: 'boolean', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.flag).toBe(false);
    expect(typeof result.flag).toBe('boolean');
  });

  it('should coerce numeric strings to numbers for number type', () => {
    const inputs = { 'count': '42', 'price': '19.99', 'negative': '-5' };
    const inputSpec: InputParameter[] = [
      { name: 'count', type: 'number', required: true },
      { name: 'price', type: 'number', required: true },
      { name: 'negative', type: 'number', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.count).toBe(42);
    expect(result.price).toBe(19.99);
    expect(result.negative).toBe(-5);
    expect(typeof result.count).toBe('number');
  });

  it('should coerce "0" and "1" to numbers for number type', () => {
    const inputs = { 'zero': '0', 'one': '1' };
    const inputSpec: InputParameter[] = [
      { name: 'zero', type: 'number', required: true },
      { name: 'one', type: 'number', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.zero).toBe(0);
    expect(result.one).toBe(1);
    expect(typeof result.zero).toBe('number');
    expect(typeof result.one).toBe('number');
  });

  it('should keep strings as strings for string type', () => {
    const inputs = { 'name': 'hello', 'numstr': '42', 'boolstr': 'true' };
    const inputSpec: InputParameter[] = [
      { name: 'name', type: 'string', required: true },
      { name: 'numstr', type: 'string', required: true },
      { name: 'boolstr', type: 'string', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.name).toBe('hello');
    expect(result.numstr).toBe('42');
    expect(result.boolstr).toBe('true');
    expect(typeof result.numstr).toBe('string');
    expect(typeof result.boolstr).toBe('string');
  });

  it('should not coerce non-string values', () => {
    const inputs = { 'num': 42, 'bool': true };
    const inputSpec: InputParameter[] = [
      { name: 'num', type: 'number', required: true },
      { name: 'bool', type: 'boolean', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.num).toBe(42);
    expect(result.bool).toBe(true);
  });

  it('should handle mixed types in multiple inputs', () => {
    const inputs = { 'name': 'test', 'enabled': 'true', 'count': '5' };
    const inputSpec: InputParameter[] = [
      { name: 'name', type: 'string', required: true },
      { name: 'enabled', type: 'boolean', required: true },
      { name: 'count', type: 'number', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result).toEqual({ name: 'test', enabled: true, count: 5 });
  });

  it('should not modify inputs not in spec', () => {
    const inputs = { 'extra': 'true' };
    const inputSpec: InputParameter[] = [];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.extra).toBe('true');
    expect(typeof result.extra).toBe('string');
  });

  it('should handle undefined/null values gracefully', () => {
    const inputs = { 'missing': undefined, 'empty': null };
    const inputSpec: InputParameter[] = [
      { name: 'missing', type: 'boolean', required: false },
      { name: 'empty', type: 'number', required: false }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.missing).toBeUndefined();
    expect(result.empty).toBeNull();
  });

  it('should keep invalid values as-is (will fail validation)', () => {
    const inputs = { 'flag': 'not-a-boolean' };
    const inputSpec: InputParameter[] = [
      { name: 'flag', type: 'boolean', required: true }
    ];

    const result = coerceInputTypes(inputs, inputSpec);
    expect(result.flag).toBe('not-a-boolean');
    expect(typeof result.flag).toBe('string');
  });
});

describe('applyInputDefaults', () => {
  it('should apply explicit default values', () => {
    const inputs = {};
    const inputSpec: InputParameter[] = [
      { name: 'flag', type: 'boolean', required: false, default: true }
    ];

    const result = applyInputDefaults(inputs, inputSpec);
    expect(result.flag).toBe(true);
  });

  it('should not override provided values with defaults', () => {
    const inputs = { 'flag': false };
    const inputSpec: InputParameter[] = [
      { name: 'flag', type: 'boolean', required: false, default: true }
    ];

    const result = applyInputDefaults(inputs, inputSpec);
    expect(result.flag).toBe(false);
  });

  it('should apply type-based default for optional boolean without explicit default', () => {
    const inputs = {};
    const inputSpec: InputParameter[] = [
      { name: 'flag', type: 'boolean', required: false }
    ];

    const result = applyInputDefaults(inputs, inputSpec);
    expect(result.flag).toBe(false);
  });

  it('should apply type-based default for optional number without explicit default', () => {
    const inputs = {};
    const inputSpec: InputParameter[] = [
      { name: 'count', type: 'number', required: false }
    ];

    const result = applyInputDefaults(inputs, inputSpec);
    expect(result.count).toBe(0);
  });

  it('should apply type-based default for optional string without explicit default', () => {
    const inputs = {};
    const inputSpec: InputParameter[] = [
      { name: 'name', type: 'string', required: false }
    ];

    const result = applyInputDefaults(inputs, inputSpec);
    expect(result.name).toBe('');
  });

  it('should NOT apply type-based default for required params (let validation fail)', () => {
    const inputs = {};
    const inputSpec: InputParameter[] = [
      { name: 'required-param', type: 'string', required: true }
    ];

    const result = applyInputDefaults(inputs, inputSpec);
    expect(result['required-param']).toBeUndefined();
  });

  it('should handle mixed defaults and type-based defaults', () => {
    const inputs = { 'provided': 'value' };
    const inputSpec: InputParameter[] = [
      { name: 'provided', type: 'string', required: false },
      { name: 'explicit-default', type: 'number', required: false, default: 42 },
      { name: 'type-default-bool', type: 'boolean', required: false },
      { name: 'type-default-num', type: 'number', required: false },
      { name: 'type-default-str', type: 'string', required: false }
    ];

    const result = applyInputDefaults(inputs, inputSpec);
    expect(result).toEqual({
      'provided': 'value',
      'explicit-default': 42,
      'type-default-bool': false,
      'type-default-num': 0,
      'type-default-str': ''
    });
  });

  it('should treat null as missing value', () => {
    const inputs = { 'flag': null };
    const inputSpec: InputParameter[] = [
      { name: 'flag', type: 'boolean', required: false, default: true }
    ];

    const result = applyInputDefaults(inputs, inputSpec);
    expect(result.flag).toBe(true);
  });
});
