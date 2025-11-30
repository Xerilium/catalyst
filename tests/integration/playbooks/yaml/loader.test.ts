import { PlaybookLoader } from '../../../../src/playbooks/scripts/playbooks/yaml/loader';
import * as path from 'path';

describe('PlaybookLoader Integration', () => {
  let loader: PlaybookLoader;

  beforeEach(() => {
    loader = new PlaybookLoader();
  });

  describe('End-to-end loading', () => {
    it('should load valid-minimal.yaml fixture end-to-end', async () => {
      const yamlPath = path.join(__dirname, '../../../fixtures/playbooks/valid-minimal.yaml');

      const playbook = await loader.load(yamlPath);

      expect(playbook.name).toBe('valid-minimal');
      expect(playbook.description).toBeDefined();
      expect(playbook.owner).toBeDefined();
      expect(playbook.steps).toHaveLength(1);
      expect(playbook.steps[0].action).toBe('custom-action');
    });

    it('should load valid-complete.yaml fixture end-to-end', async () => {
      const yamlPath = path.join(__dirname, '../../../fixtures/playbooks/valid-complete.yaml');

      const playbook = await loader.load(yamlPath);

      expect(playbook.name).toBe('valid-complete');
      expect(playbook.reviewers).toBeDefined();
      expect(playbook.triggers).toBeDefined();
      expect(playbook.inputs).toBeDefined();
      expect(playbook.outputs).toBeDefined();
      expect(playbook.catch).toBeDefined();
      expect(playbook.finally).toBeDefined();
    });

    it('should verify transformed Playbook structure matches expected', async () => {
      const yamlPath = path.join(__dirname, '../../../fixtures/playbooks/valid-complete.yaml');

      const playbook = await loader.load(yamlPath);

      // Verify input transformation
      if (playbook.inputs && playbook.inputs.length > 0) {
        const firstInput = playbook.inputs[0];
        expect(firstInput).toHaveProperty('name');
        expect(firstInput).toHaveProperty('type');
        expect(['string', 'number', 'boolean']).toContain(firstInput.type);
      }

      // Verify step transformation
      expect(playbook.steps[0]).toHaveProperty('action');
      expect(playbook.steps[0]).toHaveProperty('config');

      // Verify validation transformation if present
      if (playbook.inputs && playbook.inputs[0].validation) {
        const firstValidation = playbook.inputs[0].validation[0];
        expect(firstValidation).toHaveProperty('type');
        expect(['Regex', 'StringLength', 'NumberRange', 'Custom']).toContain(firstValidation.type);
      }
    });
  });
});
