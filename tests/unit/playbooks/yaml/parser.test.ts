import { parseYAML } from '../../../../src/playbooks/scripts/playbooks/yaml/parser';

describe('YAML Parser', () => {
  describe('Valid YAML parsing', () => {
    it('should parse minimal valid YAML', () => {
      const yaml = `
name: test-playbook
description: Test description
owner: Engineer
steps:
  - custom-action: "test"
`;

      const result = parseYAML(yaml);

      expect(result).toBeDefined();
      expect(result.name).toBe('test-playbook');
      expect(result.description).toBe('Test description');
      expect(result.owner).toBe('Engineer');
      expect(result.steps).toHaveLength(1);
    });

    it('should parse YAML with anchors and aliases', () => {
      const yaml = `
name: test-playbook
description: Test description
owner: Engineer
steps:
  - &step1
    custom-action: "test"
  - *step1
`;

      const result = parseYAML(yaml);

      expect(result.steps).toHaveLength(2);
      expect(result.steps[0]).toEqual(result.steps[1]);
    });

    it('should handle Unicode characters', () => {
      const yaml = `
name: test-playbook
description: Test with émojis 🚀
owner: Engineer
steps:
  - custom-action: "test"
`;

      const result = parseYAML(yaml);

      expect(result.description).toBe('Test with émojis 🚀');
    });
  });

  describe('Error handling', () => {
    it('should fail on syntax errors with line and column numbers', () => {
      const yaml = `
name: test-playbook
description: Test
owner: Engineer
steps:
    - invalid: syntax
  bad-indentation: true
`;

      expect(() => parseYAML(yaml)).toThrow(/line/i);
    });

    it('should handle empty files', () => {
      const yaml = '';

      expect(() => parseYAML(yaml)).toThrow();
    });

    it('should handle files with only whitespace', () => {
      const yaml = '   \n  \n  ';

      expect(() => parseYAML(yaml)).toThrow();
    });
  });
});
