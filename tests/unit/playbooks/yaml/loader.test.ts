import { PlaybookLoader } from '../../../../src/playbooks/scripts/playbooks/yaml/loader';
import { ValidationError } from '../../../../src/playbooks/scripts/playbooks/yaml/validator';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('PlaybookLoader', () => {
  let loader: PlaybookLoader;

  beforeEach(() => {
    loader = new PlaybookLoader();
  });

  describe('load() from file', () => {
    it('should load valid YAML file successfully', async () => {
      const yamlPath = path.join(__dirname, '../../../fixtures/playbooks/valid-minimal.yaml');

      const playbook = await loader.load(yamlPath);

      expect(playbook).toBeDefined();
      expect(playbook.name).toBe('valid-minimal');
      expect(playbook.steps).toHaveLength(1);
    });

    it('should throw ValidationError on file not found', async () => {
      const yamlPath = 'nonexistent.yaml';

      await expect(loader.load(yamlPath)).rejects.toThrow();
    });

    it('should throw ValidationError on YAML syntax errors', async () => {
      const yamlPath = path.join(__dirname, '../../../fixtures/playbooks/invalid-syntax.yaml');

      await expect(loader.load(yamlPath)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError on schema violations', async () => {
      const yamlPath = path.join(__dirname, '../../../fixtures/playbooks/invalid-schema.yaml');

      await expect(loader.load(yamlPath)).rejects.toThrow(ValidationError);
    });

    it('should include file path in error messages', async () => {
      const yamlPath = path.join(__dirname, '../../../fixtures/playbooks/invalid-schema.yaml');

      try {
        await loader.load(yamlPath);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).filePath).toContain('invalid-schema.yaml');
      }
    });
  });

  describe('loadFromString()', () => {
    it('should load from string successfully', async () => {
      const yamlContent = `
name: test-playbook
description: Test description
owner: Engineer
steps:
  - custom-action: "test"
`;

      const playbook = await loader.loadFromString(yamlContent);

      expect(playbook).toBeDefined();
      expect(playbook.name).toBe('test-playbook');
    });

    it('should throw ValidationError on YAML syntax errors', async () => {
      const yamlContent = `
name: test
description: Test
owner: Engineer
steps:
    - invalid
  bad-indent: true
`;

      await expect(loader.loadFromString(yamlContent)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError on schema violations', async () => {
      const yamlContent = `
name: test
description: Test
steps: []
`;

      await expect(loader.loadFromString(yamlContent)).rejects.toThrow(ValidationError);
    });

    it('should include line numbers in error messages', async () => {
      const yamlContent = `
name: test
description: Test
owner: Engineer
steps:
    - invalid
  bad-indent: true
`;

      try {
        await loader.loadFromString(yamlContent);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationErr = err as ValidationError;
        expect(validationErr.message).toMatch(/line/i);
      }
    });
  });
});
