import { describe, it, expect } from '@jest/globals';
import type { Playbook, InputParameter } from '@playbooks/types';
import { CatalystError } from '@core/errors';
import {
  validatePlaybookStructure,
  validateInputs,
  validateOutputs
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
