import fs from 'fs';
import path from 'path';

describe('plan.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/plan.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:feature-context/plan.template
  describe('FR:plan.template: Template structure', () => {
    it('should have a top-level Plan heading with placeholder', () => {
      expect(content).toMatch(/^# Plan: \{plan-id\}/m);
    });

    it('should use > [INSTRUCTIONS] prefix for guidance', () => {
      expect(content).toMatch(/> \[INSTRUCTIONS\]/);
    });

    it('should NOT have frontmatter', () => {
      expect(content).not.toMatch(/^---$/m);
    });
  });

  // @req FR:feature-context/plan.overview
  describe('FR:plan.overview: Overview section', () => {
    it('should include Overview section', () => {
      expect(content).toMatch(/^## Overview/m);
    });
  });

  // @req FR:feature-context/plan.pre-implementation
  describe('FR:plan.pre-implementation: Pre-implementation section', () => {
    it('should include Pre-implementation section', () => {
      expect(content).toMatch(/^## Pre-implementation/m);
    });
  });

  // @req FR:feature-context/plan.features
  describe('FR:plan.features: Features section', () => {
    it('should include Features section', () => {
      expect(content).toMatch(/^## Features/m);
    });

    it('should use feature-id sub-headings for grouping', () => {
      expect(content).toMatch(/^### \{feature-id\}/m);
    });

    it('should use checkbox format for tasks', () => {
      expect(content).toMatch(/- \[ \]/);
    });
  });

  // @req FR:feature-context/plan.post-implementation
  describe('FR:plan.post-implementation: Post-implementation section', () => {
    it('should include Post-implementation section', () => {
      expect(content).toMatch(/^## Post-implementation/m);
    });

    // @req FR:feature-context/plan.post-implementation.project-tasks
    it('should mention project-specific tasks in instructions', () => {
      expect(content).toMatch(/project-specific/i);
    });

    // @req FR:feature-context/plan.post-implementation.closure
    it('should include standard closure tasks that are always required', () => {
      expect(content).toMatch(/- \[ \] Present work for review/);
      expect(content).toMatch(/- \[ \] Route external issues/);
      expect(content).toMatch(/- \[ \] Clean up temporary files/);
      expect(content).toMatch(/- \[ \] Close out/);
    });

    // @req FR:feature-context/plan.post-implementation.closure
    it('should instruct that closure tasks are standard', () => {
      expect(content).toMatch(/standard closure tasks/i);
    });
  });

  // @req FR:feature-context/plan.notes
  describe('FR:plan.notes: Notes section', () => {
    it('should include Notes section', () => {
      expect(content).toMatch(/^## Notes/m);
    });
  });

  // @req NFR:feature-context/cost.tokens
  describe('NFR:cost.tokens: Token optimization', () => {
    it('should be concise', () => {
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(50);
    });
  });
});
