import { describe, it, expect } from '@jest/globals';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Tests for backward compatibility with start-feature.md and command routing
 */
describe('Backward Compatibility', () => {
  const PLAYBOOKS_DIR = join(__dirname, '../../../src/resources/playbooks');

  describe('start-feature.md', () => {
    it('should still exist', () => {
      const path = join(PLAYBOOKS_DIR, 'start-feature.md');
      expect(existsSync(path)).toBe(true);
    });

    it('should have deprecation notice', async () => {
      const path = join(PLAYBOOKS_DIR, 'start-feature.md');
      const content = await readFile(path, 'utf-8');

      // Should mention deprecation or redirection
      const hasDeprecation = 
        content.includes('deprecated') ||
        content.includes('redirect') ||
        content.includes('create-feature') ||
        content.includes('update-feature') ||
        content.includes('repair-feature') ||
        content.includes('explore-feature');

      expect(hasDeprecation).toBe(true);
    });

    it('should reference new orchestrators', async () => {
      const path = join(PLAYBOOKS_DIR, 'start-feature.md');
      const content = await readFile(path, 'utf-8');

      // Should reference at least one of the new orchestrators
      const hasReferences = 
        content.includes('create-feature.md') ||
        content.includes('update-feature.md') ||
        content.includes('repair-feature.md') ||
        content.includes('explore-feature.md');

      expect(hasReferences).toBe(true);
    });
  });

  describe('Command Compatibility', () => {
    const COMMANDS_DIR = join(__dirname, '../../../src/resources/ai-config/commands');

    // @req FR:feature-workflow/orchestrate.create-feature
    it('/catalyst:create command should exist', () => {
      const path = join(COMMANDS_DIR, 'create.md');
      expect(existsSync(path)).toBe(true);
    });

    // @req FR:feature-workflow/orchestrate.update-feature
    it('/catalyst:change command should exist', () => {
      const path = join(COMMANDS_DIR, 'change.md');
      expect(existsSync(path)).toBe(true);
    });

    // @req FR:feature-workflow/orchestrate.repair-feature
    it('/catalyst:fix command should exist', () => {
      const path = join(COMMANDS_DIR, 'fix.md');
      expect(existsSync(path)).toBe(true);
    });

    // @req FR:feature-workflow/orchestrate.explore-feature
    it('/catalyst:explore command should exist', () => {
      const path = join(COMMANDS_DIR, 'explore.md');
      expect(existsSync(path)).toBe(true);
    });

    // @req FR:feature-workflow/discover.resume
    it('Commands should reference correct orchestrators', async () => {
      const commands = [
        { file: 'create.md', orchestrator: 'create-feature.md' },
        { file: 'change.md', orchestrator: 'update-feature.md' },
        { file: 'fix.md', orchestrator: 'repair-feature.md' },
        { file: 'explore.md', orchestrator: 'explore-feature.md' }
      ];

      for (const { file, orchestrator } of commands) {
        const path = join(COMMANDS_DIR, file);
        const content = await readFile(path, 'utf-8');

        expect(content).toMatch(new RegExp(orchestrator.replace('.md', '')));
      }
    });
  });

  describe('Feature Workflow Integrity', () => {
    // @req FR:feature-workflow/orchestrate.create-feature
    // @req FR:feature-workflow/orchestrate.update-feature
    // @req FR:feature-workflow/orchestrate.repair-feature
    // @req FR:feature-workflow/orchestrate.explore-feature
    it('All work-types should have orchestrators', () => {
      expect(existsSync(join(PLAYBOOKS_DIR, 'create-feature.md'))).toBe(true);
      expect(existsSync(join(PLAYBOOKS_DIR, 'update-feature.md'))).toBe(true);
      expect(existsSync(join(PLAYBOOKS_DIR, 'repair-feature.md'))).toBe(true);
      expect(existsSync(join(PLAYBOOKS_DIR, 'explore-feature.md'))).toBe(true);
    });

    // @req FR:feature-workflow/orchestrate.create-feature
    // @req FR:feature-workflow/orchestrate.update-feature
    // @req FR:feature-workflow/orchestrate.repair-feature
    // @req FR:feature-workflow/orchestrate.explore-feature
    it('All work-types should have commands', () => {
      const COMMANDS_DIR = join(__dirname, '../../../src/resources/ai-config/commands');

      expect(existsSync(join(COMMANDS_DIR, 'create.md'))).toBe(true);
      expect(existsSync(join(COMMANDS_DIR, 'change.md'))).toBe(true);
      expect(existsSync(join(COMMANDS_DIR, 'fix.md'))).toBe(true);
      expect(existsSync(join(COMMANDS_DIR, 'explore.md'))).toBe(true);
    });
  });
});
