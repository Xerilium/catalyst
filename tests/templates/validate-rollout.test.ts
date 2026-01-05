import fs from 'fs';
import path from 'path';

describe('rollout.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/rollout.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:feature-context/rollout.template.standard
  describe('FR:rollout.template.standard: Template standard compliance', () => {
    it('should use {placeholder-name} kebab-case format if placeholders exist', () => {
      const placeholders = content.match(/\{[^}]+\}/g) || [];
      placeholders.forEach(placeholder => {
        const inner = placeholder.slice(1, -1);
        expect(inner).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });

    it('should use > [INSTRUCTIONS] prefix for guidance', () => {
      expect(content).toMatch(/> \[INSTRUCTIONS\]/);
    });

    it('should have clear heading hierarchy (H1, H2)', () => {
      expect(content).toMatch(/^# Rollout:/m);
      expect(content).toMatch(/^## /m);
    });

    it('should have frontmatter with features, status, and created fields', () => {
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/features:/);
      expect(content).toMatch(/status:/);
      expect(content).toMatch(/created:/);
    });
  });

  // @req FR:feature-context/rollout.template.context
  describe('FR:rollout.template.context: Feature Context section', () => {
    it('should reference feature files in instructions', () => {
      // Template references features in frontmatter and implementation section
      expect(content).toMatch(/features:/);
      expect(content).toMatch(/\.xe\/features/);
    });

    it('should provide scope flexibility guidance', () => {
      expect(content).toMatch(/Scope Flexibility/i);
      expect(content).toMatch(/multiple features.*single feature.*subset/i);
    });
  });

  // @req FR:feature-context/rollout.template.status
  describe('FR:rollout.template.status: Rollout Status tracking', () => {
    it('should include status field in frontmatter', () => {
      expect(content).toMatch(/status:.*planning.*pending.*in-progress/);
    });

    it('should include lifecycle guidance', () => {
      expect(content).toMatch(/Lifecycle/i);
      expect(content).toMatch(/planning phase/i);
      expect(content).toMatch(/implementation/i);
    });

    it('should include task management guidance with checkboxes', () => {
      expect(content).toMatch(/Task Management/i);
      expect(content).toMatch(/markdown checkbox/i);
      expect(content).toMatch(/- \[ \]/);
    });
  });

  // @req FR:feature-context/rollout.template.pre
  describe('FR:rollout.template.pre: Pre-Implementation Actions section', () => {
    it('should include Pre-implementation section', () => {
      expect(content).toMatch(/^## Pre-implementation/m);
    });

    it('should have guidance for one-time setup actions', () => {
      const preSection = content.split('## Pre-implementation')[1]?.split('##')[0] || '';
      expect(preSection).toMatch(/one-time actions.*BEFORE implementation/i);
      expect(preSection).toMatch(/backups.*environment setup.*prerequisites/i);
    });

    it('should use checkbox format for tasks', () => {
      const preSection = content.split('## Pre-implementation')[1]?.split('##')[0] || '';
      expect(preSection).toMatch(/- \[ \]/);
    });
  });

  // @req FR:feature-context/rollout.template.implementation
  describe('FR:rollout.template.implementation: Feature Implementation section', () => {
    it('should include Implementation section', () => {
      expect(content).toMatch(/^## Implementation/m);
    });

    it('should reference tasks.md files', () => {
      const implSection = content.split('## Implementation')[1]?.split('##')[0] || '';
      expect(implSection).toMatch(/tasks\.md/);
      expect(implSection).toMatch(/\.xe\/features/);
    });

    it('should have guidance about executing tasks', () => {
      const implSection = content.split('## Implementation')[1]?.split('##')[0] || '';
      expect(implSection).toMatch(/Execute all tasks/i);
    });

    it('should use checkbox format', () => {
      const implSection = content.split('## Implementation')[1]?.split('##')[0] || '';
      expect(implSection).toMatch(/- \[ \]/);
    });
  });

  // @req FR:feature-context/rollout.template.post
  describe('FR:rollout.template.post: Post-Implementation Actions section', () => {
    it('should include Post-implementation section', () => {
      expect(content).toMatch(/^## Post-implementation/m);
    });

    it('should have guidance for actions after implementation', () => {
      const postSection = content.split('## Post-implementation')[1]?.split('##')[0] || '';
      expect(postSection).toMatch(/one-time actions.*AFTER implementation/i);
      expect(postSection).toMatch(/migrations.*configuration.*verification/i);
    });

    it('should use checkbox format for tasks', () => {
      const postSection = content.split('## Post-implementation')[1]?.split('##')[0] || '';
      expect(postSection).toMatch(/- \[ \]/);
    });
  });

  // @req FR:feature-context/rollout.template.cleanup
  describe('FR:rollout.template.cleanup: Cleanup section', () => {
    it('should include Cleanup section', () => {
      expect(content).toMatch(/^## Cleanup/m);
    });

    it('should have guidance for cleanup actions', () => {
      const cleanupSection = content.split('## Cleanup')[1]?.split('---')[0] || '';
      expect(cleanupSection).toMatch(/Immediate cleanup actions/i);
      expect(cleanupSection).toMatch(/remove.*delete.*clean/i);
    });

    it('should use checkbox format for tasks', () => {
      const cleanupSection = content.split('## Cleanup')[1]?.split('---')[0] || '';
      expect(cleanupSection).toMatch(/- \[ \]/);
    });
  });

  // @req FR:feature-context/rollout.template.optimized
  // @req NFR:feature-context/cost.tokens
  describe('FR:rollout.template.optimized: Token optimization', () => {
    it('should have reasonably concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Rollout templates should be concise (up to 1000 chars)
        expect(instruction.length).toBeLessThan(1000);
      });
    });

    it('should be reasonably concise overall', () => {
      const lines = content.split('\n').length;
      // Rollout template should be concise yet complete
      expect(lines).toBeLessThan(100);
    });

    it('should have completion guidance at the end', () => {
      expect(content).toMatch(/When rollout is complete/i);
      expect(content).toMatch(/Delete this rollout file/i);
    });
  });
});
