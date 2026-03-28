import { describe, it, expect } from '@jest/globals';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Tests for playbook composition structure validation
 */
describe('Playbook Composition', () => {
  const PLAYBOOKS_DIR = join(__dirname, '../../../src/resources/playbooks');
  const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');

  describe('Orchestrator Files', () => {
    const orchestrators = [
      'create-feature.md',
      'update-feature.md',
      'repair-feature.md',
      'explore-feature.md'
    ];

    orchestrators.forEach((orchestrator) => {
      // @req FR:feature-workflow/orchestrate.create-feature
      // @req FR:feature-workflow/orchestrate.update-feature
      // @req FR:feature-workflow/orchestrate.repair-feature
      // @req FR:feature-workflow/orchestrate.explore-feature
      it(`${orchestrator} should exist`, () => {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        expect(existsSync(path)).toBe(true);
      });

      // @req FR:feature-workflow/orchestrate.create-feature
      // @req FR:feature-workflow/orchestrate.update-feature
      // @req FR:feature-workflow/orchestrate.repair-feature
      // @req FR:feature-workflow/orchestrate.explore-feature
      it(`${orchestrator} should have YAML frontmatter`, async () => {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/^---\n/);
        expect(content).toMatch(/owner:/);
        expect(content).toMatch(/reviewers:/);
      });

      // @req FR:feature-workflow/orchestrate.create-feature
      // @req FR:feature-workflow/orchestrate.update-feature
      // @req FR:feature-workflow/orchestrate.repair-feature
      // @req FR:feature-workflow/orchestrate.explore-feature
      it(`${orchestrator} should have phase structure`, async () => {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/## Phases/);
        expect(content).toMatch(/### Phase 0: Scope/);
      });

      // explore-feature has custom scoping, not using feature-scope action
      if (orchestrator !== 'explore-feature.md') {
        // @req AC:feature-workflow/playbook-composition
        it(`${orchestrator} should reference action files with Execute pattern`, async () => {
          const path = join(PLAYBOOKS_DIR, orchestrator);
          const content = await readFile(path, 'utf-8');

          // Should use Execute pattern for micro-playbooks
          const executePattern = /Execute `node_modules\/@xerilium\/catalyst\/playbooks\/actions\/[\w-]+\.md`/;
          expect(content).toMatch(executePattern);
        });
      }

      // @req NFR:feature-workflow/reliability.sequential-execution
      it(`${orchestrator} should have STOP HERE gates between phases`, async () => {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');

        // Should have at least one STOP HERE gate
        expect(content).toMatch(/\*\*STOP HERE\*\*/);
      });
    });
  });

  describe('Micro-Playbook Action Files', () => {
    const microPlaybooks = [
      'feature-scope.md',
      'feature-spec.md',
      'feature-plan.md',
      'feature-test.md',
      'feature-code.md',
      'feature-complete.md',
      'feature-format.md'
    ];

    microPlaybooks.forEach((microPlaybook) => {
      // @req AC:feature-workflow/playbook-composition
      it(`${microPlaybook} should exist`, () => {
        const path = join(ACTIONS_DIR, microPlaybook);
        expect(existsSync(path)).toBe(true);
      });

      it(`${microPlaybook} should NOT have YAML frontmatter`, async () => {
        const path = join(ACTIONS_DIR, microPlaybook);
        const content = await readFile(path, 'utf-8');

        // Micro-playbooks should NOT have frontmatter (only orchestrators do)
        const lines = content.split('\n');
        expect(lines[0]).not.toBe('---');
      });

      it(`${microPlaybook} should have Instructions section`, async () => {
        const path = join(ACTIONS_DIR, microPlaybook);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/## Instructions/);
      });

      it(`${microPlaybook} should have Exit Criteria`, async () => {
        const path = join(ACTIONS_DIR, microPlaybook);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/## Exit Criteria/);
      });
    });
  });

  describe('Reference Integrity', () => {
    // @req AC:feature-workflow/playbook-composition
    it('All orchestrator action references should point to existing files', async () => {
      const orchestrators = [
        'create-feature.md',
        'update-feature.md',
        'repair-feature.md'
        // explore-feature doesn't use feature-scope action
      ];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');

        // Extract all action references
        const actionRefs = content.match(/Execute `node_modules\/@xerilium\/catalyst\/playbooks\/actions\/([\w-]+\.md)`/g) || [];

        for (const ref of actionRefs) {
          const filename = ref.match(/actions\/([\w-]+\.md)/)?.[1];
          if (filename) {
            const actionPath = join(ACTIONS_DIR, filename);
            expect(existsSync(actionPath)).toBe(true);
          }
        }
      }
    });
  });

  describe('File Structure', () => {
    it('Orchestrators should be in playbooks root', () => {
      expect(existsSync(join(PLAYBOOKS_DIR, 'create-feature.md'))).toBe(true);
      expect(existsSync(join(PLAYBOOKS_DIR, 'update-feature.md'))).toBe(true);
      expect(existsSync(join(PLAYBOOKS_DIR, 'repair-feature.md'))).toBe(true);
      expect(existsSync(join(PLAYBOOKS_DIR, 'explore-feature.md'))).toBe(true);
    });

    it('Micro-playbooks should be in actions subdirectory', () => {
      expect(existsSync(join(ACTIONS_DIR, 'feature-scope.md'))).toBe(true);
      expect(existsSync(join(ACTIONS_DIR, 'feature-spec.md'))).toBe(true);
      expect(existsSync(join(ACTIONS_DIR, 'feature-plan.md'))).toBe(true);
      expect(existsSync(join(ACTIONS_DIR, 'feature-complete.md'))).toBe(true);
    });
  });
});
