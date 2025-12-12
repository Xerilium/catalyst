import { validatePlaybook } from '../../../../src/playbooks/scripts/playbooks/yaml/validator';

describe('Schema Validator', () => {
  describe('Valid playbooks', () => {
    it('should validate minimal valid playbook', () => {
      const playbook = {
        name: 'test-playbook',
        description: 'Test description',
        owner: 'Engineer',
        steps: [
          { 'custom-action': 'test' }
        ]
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate complete playbook with all optional properties', () => {
      const playbook = {
        name: 'test-playbook',
        description: 'Test description',
        owner: 'Engineer',
        steps: [
          { 'custom-action': 'test' }
        ],
        reviewers: {
          required: ['Architect'],
          optional: ['Product Manager']
        },
        triggers: [
          {
            event: 'issues',
            action: 'opened',
            args: { label: 'bug' }
          }
        ],
        inputs: [
          {
            string: 'param-name',
            description: 'A string parameter',
            required: true,
            default: 'default-value'
          }
        ],
        outputs: {
          'output-name': 'string'
        },
        catch: [
          {
            code: 'ErrorCode',
            steps: [{ 'custom-action': 'recovery' }]
          }
        ],
        finally: [
          { 'custom-action': 'cleanup' }
        ]
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(true);
    });

    it('should validate custom-action variant', () => {
      const playbook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [
          {
            name: 'step-1',
            'custom-action': { config: 'value' },
            additionalProp: 'allowed'
          }
        ]
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(true);
    });

    it('should validate type-as-key for inputs', () => {
      const playbook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }],
        inputs: [
          { string: 'str-param' },
          { number: 'num-param', default: 42 },
          { boolean: 'bool-param', default: false }
        ]
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(true);
    });

    it('should validate validation rule properties', () => {
      const playbook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }],
        inputs: [
          {
            string: 'param',
            validation: [
              { regex: '^[a-z]+$', code: 'InvalidFormat', message: 'Must be lowercase' },
              { minLength: 3, maxLength: 10 },
              { script: 'value.length > 0' }
            ]
          },
          {
            number: 'num-param',
            validation: [
              { min: 1, max: 100 }
            ]
          }
        ]
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid playbooks', () => {
    it('should fail on missing required field: name', () => {
      const playbook = {
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }]
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('name');
    });

    it('should fail on missing required field: description', () => {
      const playbook = {
        name: 'test-playbook',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }]
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(false);
      expect(result.errors![0].message).toContain('description');
    });

    it('should fail on missing required field: owner', () => {
      const playbook = {
        name: 'test-playbook',
        description: 'Test',
        steps: [{ 'custom-action': 'test' }]
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(false);
      expect(result.errors![0].message).toContain('owner');
    });

    it('should fail on missing required field: steps', () => {
      const playbook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer'
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(false);
      expect(result.errors![0].message).toContain('steps');
    });

    it('should fail on type mismatches', () => {
      const playbook = {
        name: 123,  // Should be string
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }]
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(false);
      expect(result.errors![0].message).toContain('string');
    });

    it('should fail on invalid name pattern', () => {
      const playbook = {
        name: 'Invalid_Name',  // Should be kebab-case
        description: 'Test',
        owner: 'Engineer',
        steps: [{ 'custom-action': 'test' }]
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(false);
    });

    it('should fail on empty steps array', () => {
      const playbook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };

      const result = validatePlaybook(playbook);

      expect(result.valid).toBe(false);
    });
  });
});
