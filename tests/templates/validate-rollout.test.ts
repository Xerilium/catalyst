import fs from 'fs';
import path from 'path';

describe('rollout.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/rollout.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:feature-context/rollout.@file
  it('should exist at the required output path under templates/specs/', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  // @req FR:feature-context/rollout.ephemeral
  it('should instruct cleanup of the rollout plan when complete', () => {
    expect(content).toMatch(/Clean up temporary files and this rollout plan/);
  });

  describe('FR:rollout.template: Template structure', () => {
    // @req FR:feature-context/rollout.template
    it('should have a top-level Rollout heading with placeholder', () => {
      expect(content).toMatch(/^# Rollout: \{rollout-id\}/m);
    });

    // @req FR:feature-context/rollout.template
    it('should use > [INSTRUCTIONS] prefix for guidance', () => {
      expect(content).toMatch(/> \[INSTRUCTIONS\]/);
    });

    // @req FR:feature-context/rollout.frontmatter
    it('should have frontmatter with status and feature fields', () => {
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/^features:/m);
      expect(content).toMatch(/^status:/m);
    });
  });

  describe('FR:rollout.overview: Overview section', () => {
    // @req FR:feature-context/rollout.overview
    it('should include Overview section', () => {
      expect(content).toMatch(/^## Overview/m);
    });
  });

  describe('FR:rollout.runs: Run sections', () => {
    // @req FR:feature-context/rollout.runs
    it('should include a Run section with placeholder', () => {
      expect(content).toMatch(/^## Run 1: \{name\}/m);
    });
  });

  describe('FR:rollout.pre-implementation: Pre-implementation section', () => {
    // @req FR:feature-context/rollout.pre-implementation
    it('should include Pre-implementation section within run', () => {
      expect(content).toMatch(/^### Pre-implementation/m);
    });
  });

  describe('FR:rollout.features: Features section', () => {
    // @req FR:feature-context/rollout.features
    it('should include Features section within run', () => {
      expect(content).toMatch(/^### Features/m);
    });

    // @req FR:feature-context/rollout.features
    it('should use feature-id sub-headings for grouping', () => {
      expect(content).toMatch(/^#### \{feature-id\}/m);
    });

    // @req FR:feature-context/rollout.features
    it('should use checkbox format for tasks', () => {
      expect(content).toMatch(/- \[ \]/);
    });
  });

  describe('FR:rollout.features.parallel: parallel grouping', () => {
    // @req FR:feature-context/rollout.features.parallel
    it('should describe the `🔀 Execute in parallel:` parent label convention', () => {
      expect(content).toMatch(/🔀 Execute in parallel:/);
    });

    // @req FR:feature-context/rollout.features.parallel
    it('should show parent label as a non-checkbox bullet in the example', () => {
      expect(content).toMatch(/^- 🔀 Execute in parallel:/m);
    });
  });

  describe('FR:rollout.features.sequential: sequential grouping', () => {
    // @req FR:feature-context/rollout.features.sequential
    it('should describe the `🔗 Execute in sequence:` parent label convention', () => {
      expect(content).toMatch(/🔗 Execute in sequence:/);
    });
  });

  describe('FR:rollout.post-implementation: Post-implementation section', () => {
    // @req FR:feature-context/rollout.post-implementation
    it('should include Post-implementation section within run', () => {
      expect(content).toMatch(/^### Post-implementation/m);
    });

    // @req FR:feature-context/rollout.post-implementation.tasks
    it('should include standard closure tasks', () => {
      expect(content).toMatch(/- \[ \] Present work for review/);
      expect(content).toMatch(/- \[ \] Route external issues/);
    });
  });

  describe('FR:rollout.notes: Notes section', () => {
    // @req FR:feature-context/rollout.notes
    it('should include rollout-level Notes section', () => {
      expect(content).toMatch(/^## Notes/m);
    });
  });

  describe('FR:rollout.final-review: Final Review section', () => {
    // @req FR:feature-context/rollout.final-review
    it('should include Final Review section', () => {
      expect(content).toMatch(/^## Final Review/m);
    });

    // @req FR:feature-context/rollout.final-review
    it('should include cleanup and close-out tasks', () => {
      expect(content).toMatch(/- \[ \] Confirm all runs complete/);
      expect(content).toMatch(/- \[ \] Clean up temporary files/);
      expect(content).toMatch(/- \[ \] Close out/);
    });
  });

  describe('NFR:cost.tokens: Token optimization', () => {
    // @req NFR:feature-context/cost.tokens
    // Character count correlates better with AI token cost than line count —
    // short-label lines (e.g. Active State's one-line examples) don't inflate tokens
    // the way line-count penalizes them.
    it('should be concise', () => {
      expect(content.length).toBeLessThan(3400);
    });
  });
});

