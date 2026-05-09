import fs from 'fs';
import path from 'path';

describe('rollout-blueprint.md template validation', () => {
  const templatePath = path.join(
    __dirname,
    '../../src/resources/templates/specs/rollout-blueprint.md',
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:blueprint-workflow/workflow.scope.rollout
  it('should exist at the required path', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  describe('Frontmatter', () => {
    it('should have frontmatter with features, status, created, last_updated', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/features:/);
      expect(frontmatter).toMatch(/status:/);
      expect(frontmatter).toMatch(/created:/);
      expect(frontmatter).toMatch(/last_updated:/);
    });
  });

  describe('Top-level structure', () => {
    it('should include H1 Rollout heading', () => {
      expect(content).toMatch(/^# Rollout: blueprint/m);
    });

    it('should include Active State, Notes, Vision Checkpoint sections', () => {
      expect(content).toMatch(/^## Active State/m);
      expect(content).toMatch(/^## Notes/m);
      expect(content).toMatch(/^## Vision Checkpoint/m);
    });

    it('should NOT include an Overview section (vision lives in product.md)', () => {
      expect(content).not.toMatch(/^## Overview/m);
    });

    it('should NOT use the generic "Final Review" framing (blueprints are never done)', () => {
      expect(content).not.toMatch(/^## Final Review/m);
    });

    it('should include a one-line purpose under the H1', () => {
      const head = content.split(/^## /m)[0];
      expect(head).toMatch(/Implement the product per/i);
    });
  });

  // @req FR:blueprint-workflow/workflow.scope.rollout
  describe('Multi-run structure', () => {
    it('should pre-shape Run 0 for blueprint creation', () => {
      expect(content).toMatch(/^## Run 0: Blueprint creation/m);
    });

    it('should include phase checklist in Run 0 (not Features-by-feature)', () => {
      const run0 = content.split(/## Run 0/)[1]?.split(/^## Run /m)[0] || '';
      expect(run0).toMatch(/Phase 0: Scope/);
      expect(run0).toMatch(/Phase 1: Plan/);
      expect(run0).toMatch(/Phase 2: Implement/);
      expect(run0).toMatch(/Phase 3: Review/);
    });

    it('should NOT have a Pre-implementation section in Run 0 (setup belongs in Run 1)', () => {
      const run0 = content.split(/## Run 0/)[1]?.split(/^## Run /m)[0] || '';
      expect(run0).not.toMatch(/^### Pre-implementation/m);
    });

    it('should provide a Pre-implementation slot in Run 1 for one-time setup work', () => {
      const run1 = content.split(/## Run 1/)[1]?.split(/^## Run /m)[0] || '';
      expect(run1).toMatch(/### Pre-implementation/);
      expect(run1).toMatch(/one-time setup/i);
    });

    it('should pre-shape Run 1+ entries with Wave H3 sub-headings', () => {
      expect(content).toMatch(/^## Run 1:/m);
      expect(content).toMatch(/^### Wave 1\.1/m);
    });

    it('should include /catalyst:create and /catalyst:change patterns in Run 1+ examples', () => {
      const run1plus = content.split(/## Run 1/)[1] || '';
      expect(run1plus).toMatch(/\/catalyst:create/);
      expect(run1plus).toMatch(/\/catalyst:change/);
    });

    it('should pass full feature context inline (purpose, scope, dependencies)', () => {
      const run1 = content.split(/## Run 1/)[1]?.split(/^## Run /m)[0] || '';
      // Tasks should include feature context: one-sentence purpose in invocation, then scope/deps as sub-bullets
      expect(run1).toMatch(/\/catalyst:(create|change) \{feature-id\}: \{one-sentence purpose\}/);
      expect(run1).toMatch(/Scope:/);
      expect(run1).toMatch(/Dependencies:/);
    });

    it('should describe parallel-within-wave / sequential-between-waves semantics', () => {
      const run1 = content.split(/## Run 1/)[1]?.split(/^## Run /m)[0] || '';
      expect(run1).toMatch(/🔀 Execute in parallel:/);
      expect(run1).toMatch(/parallel/i);
      expect(run1).toMatch(/sequential|wave N\+1.*after wave N/i);
    });

    it('should group wave tasks under `🔀 Execute in parallel:` in examples', () => {
      const run1 = content.split(/## Run 1/)[1]?.split(/^## Run /m)[0] || '';
      expect(run1).toMatch(/- 🔀 Execute in parallel:/);
    });
  });

  describe('Phase 2+ pre-steps', () => {
    it('should require re-evaluating the blueprint via /catalyst:blueprint as a pre-step', () => {
      const run2 = content.split(/## Run 2/)[1]?.split(/^## Run /m)[0] || '';
      expect(run2).toMatch(/Re-evaluate blueprint/i);
      expect(run2).toMatch(/\/catalyst:blueprint/);
    });

    it('should NOT require a manual collapse task (start-blueprint handles it)', () => {
      const run2 = content.split(/## Run 2/)[1]?.split(/^## Run /m)[0] || '';
      expect(run2).not.toMatch(/Collapse Run/);
    });

    it('should explain that start-blueprint handles collapsing in instructions', () => {
      const run2 = content.split(/## Run 2/)[1]?.split(/^## Run /m)[0] || '';
      expect(run2).toMatch(/start-blueprint.*collapse|collapse.*start-blueprint/i);
    });
  });

  describe('Vision Checkpoint (replaces Final Review)', () => {
    it('should re-run /catalyst:blueprint to evaluate state vs vision', () => {
      const checkpoint = content.split(/## Vision Checkpoint/)[1] || '';
      expect(checkpoint).toMatch(/\/catalyst:blueprint/);
      expect(checkpoint).toMatch(/vision/i);
    });

    it('should support either extension (new phases) or close-out (vision achieved or sunset)', () => {
      const checkpoint = content.split(/## Vision Checkpoint/)[1] || '';
      expect(checkpoint).toMatch(/extend|new phases/i);
      expect(checkpoint).toMatch(/close|sunset/i);
    });
  });
});
