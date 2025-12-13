import { transformPlaybook } from '@playbooks/yaml/transformer';
import type { Playbook } from '@playbooks/types';

describe('YAML Transformer', () => {
  describe('Step transformation', () => {
    it('should transform step with primitive action value (pattern 1)', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [
          {
            'github-issue-create': 'Issue Title',
            body: 'Issue body'
          }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.steps[0].action).toBe('github-issue-create');
      expect(result.steps[0].config).toEqual({
        value: 'Issue Title',
        body: 'Issue body'
      });
    });

    it('should transform step with object action value (pattern 2)', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [
          {
            'ai-prompt': {
              prompt: 'Pick a number',
              temperature: 0.7
            }
          }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.steps[0].action).toBe('ai-prompt');
      expect(result.steps[0].config).toEqual({
        prompt: 'Pick a number',
        temperature: 0.7
      });
    });

    it('should transform step with null action value (pattern 3)', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [
          {
            'github-repo-info': null
          }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.steps[0].action).toBe('github-repo-info');
      expect(result.steps[0].config).toEqual({});
    });

    it('should preserve step name and errorPolicy', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [
          {
            name: 'my-step',
            errorPolicy: 'continue',
            'custom-action': 'value'
          }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.steps[0].name).toBe('my-step');
      expect(result.steps[0].errorPolicy).toBe('continue');
      expect(result.steps[0].action).toBe('custom-action');
    });

    it('should handle additional properties merge (last-wins)', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [
          {
            'custom-action': {
              prop1: 'from-object',
              prop2: 'will-be-overridden'
            },
            prop2: 'from-additional',
            prop3: 'additional-only'
          }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.steps[0].config).toEqual({
        prop1: 'from-object',
        prop2: 'from-additional',  // Last-wins
        prop3: 'additional-only'
      });
    });
  });

  describe('Input transformation', () => {
    it('should transform input parameters with type-as-key', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }],
        inputs: [
          {
            string: 'str-param',
            description: 'A string parameter',
            required: true,
            default: 'default-value'
          },
          {
            number: 'num-param',
            default: 42
          },
          {
            boolean: 'bool-param',
            required: false
          }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.inputs).toBeDefined();
      expect(result.inputs).toHaveLength(3);

      expect(result.inputs![0]).toEqual({
        name: 'str-param',
        type: 'string',
        description: 'A string parameter',
        required: true,
        default: 'default-value'
      });

      expect(result.inputs![1]).toEqual({
        name: 'num-param',
        type: 'number',
        default: 42,
        required: false
      });

      expect(result.inputs![2]).toEqual({
        name: 'bool-param',
        type: 'boolean',
        required: false
      });
    });

    it('should transform validation rules', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }],
        inputs: [
          {
            string: 'param',
            validation: [
              {
                regex: '^[a-z]+$',
                code: 'InvalidFormat',
                message: 'Must be lowercase'
              },
              {
                minLength: 3,
                maxLength: 10
              }
            ]
          }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.inputs![0].validation).toHaveLength(2);

      expect(result.inputs![0].validation![0]).toEqual({
        type: 'Regex',
        pattern: '^[a-z]+$',
        code: 'InvalidFormat',
        message: 'Must be lowercase'
      });

      expect(result.inputs![0].validation![1]).toEqual({
        type: 'StringLength',
        minLength: 3,
        maxLength: 10
      });
    });

    it('should transform number range validation', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }],
        inputs: [
          {
            number: 'num-param',
            validation: [
              { min: 1, max: 100, code: 'OutOfRange' }
            ]
          }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.inputs![0].validation![0]).toEqual({
        type: 'NumberRange',
        min: 1,
        max: 100,
        code: 'OutOfRange'
      });
    });

    it('should transform custom script validation', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }],
        inputs: [
          {
            string: 'param',
            validation: [
              {
                script: 'value.length > 0',
                message: 'Cannot be empty'
              }
            ]
          }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.inputs![0].validation![0]).toEqual({
        type: 'Custom',
        script: 'value.length > 0',
        message: 'Cannot be empty'
      });
    });
  });

  describe('Catch and finally transformation', () => {
    it('should transform catch arrays', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }],
        catch: [
          {
            code: 'ErrorCode',
            steps: [
              { 'recovery-action': 'handle error' }
            ]
          }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.catch).toHaveLength(1);
      expect(result.catch![0].code).toBe('ErrorCode');
      expect(result.catch![0].steps).toHaveLength(1);
      expect(result.catch![0].steps[0].action).toBe('recovery-action');
      expect(result.catch![0].steps[0].config).toEqual({ value: 'handle error' });
    });

    it('should transform finally array', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }],
        finally: [
          { 'cleanup-action': null }
        ]
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.finally).toHaveLength(1);
      expect(result.finally![0].action).toBe('cleanup-action');
      expect(result.finally![0].config).toEqual({});
    });
  });

  describe('Top-level properties', () => {
    it('should preserve all top-level properties', () => {
      const yamlPlaybook = {
        name: 'test-playbook',
        description: 'Test description',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }],
        reviewers: {
          required: ['Architect'],
          optional: ['PM']
        },
        triggers: [
          {
            event: 'issues',
            action: 'opened',
            args: { label: 'bug' }
          }
        ],
        outputs: {
          'output-name': 'string'
        }
      };

      const result = transformPlaybook(yamlPlaybook);

      expect(result.name).toBe('test-playbook');
      expect(result.description).toBe('Test description');
      expect(result.owner).toBe('Engineer');
      expect(result.reviewers).toEqual({
        required: ['Architect'],
        optional: ['PM']
      });
      expect(result.triggers).toEqual([
        {
          event: 'issues',
          action: 'opened',
          args: { label: 'bug' }
        }
      ]);
      expect(result.outputs).toEqual({
        'output-name': 'string'
      });
    });
  });
});
