import fs from 'fs';
import path from 'path';

describe('workflow-context spec.md validation', () => {
  const specPath = path.join(__dirname, '../../.xe/features/workflow-context/spec.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(specPath, 'utf-8');
  });

  it('should exist', () => {
    expect(fs.existsSync(specPath)).toBe(true);
  });

  // @req FR:workflow-context/execution-modes.interactive
  describe('FR:execution-modes.interactive: Interactive mode', () => {
    it('should require progressive collaboration with user-approved phase gates', () => {
      const fr = content.match(/FR:execution-modes\.interactive[\s\S]*?(?=- \*\*FR:|### |## )/)?.[0] || '';
      expect(fr).toMatch(/progressive/i);
      expect(fr).toMatch(/AskUserQuestion/i);
      expect(fr).toMatch(/phase gates/i);
      expect(fr).toMatch(/no state-changing git operations/i);
    });
  });

  // @req FR:workflow-context/execution-modes.checkpoint-review
  describe('FR:execution-modes.checkpoint-review: Checkpoint-review mode', () => {
    it('should require autonomous execution with phase-gate approvals and no AI git operations', () => {
      const fr = content.match(/FR:execution-modes\.checkpoint-review[\s\S]*?(?=- \*\*FR:|### |## )/)?.[0] || '';
      expect(fr).toMatch(/autonomously/i);
      expect(fr).toMatch(/checkpoints/i);
      expect(fr).toMatch(/phase gates/i);
      expect(fr).toMatch(/no state-changing git operations/i);
    });
  });

  // @req FR:workflow-context/execution-modes.autonomous-local
  describe('FR:execution-modes.autonomous-local: Autonomous-local mode', () => {
    it('should require full autonomy on current branch with auto-approved gates and no AI git operations', () => {
      const fr = content.match(/FR:execution-modes\.autonomous-local[\s\S]*?(?=- \*\*FR:|### |## )/)?.[0] || '';
      expect(fr).toMatch(/full autonomy/i);
      expect(fr).toMatch(/current branch/i);
      expect(fr).toMatch(/auto-approved/i);
      expect(fr).toMatch(/no state-changing git operations/i);
    });
  });

  // @req FR:workflow-context/execution-modes.autonomous-branch
  describe('FR:execution-modes.autonomous-branch: Autonomous-branch mode', () => {
    it('should require feature branch creation with PR and auto-approved gates', () => {
      const fr = content.match(/FR:execution-modes\.autonomous-branch[\s\S]*?(?=- \*\*FR:|### |## )/)?.[0] || '';
      expect(fr).toMatch(/feature branch/i);
      expect(fr).toMatch(/PR/);
      expect(fr).toMatch(/auto-approved/i);
      expect(fr).toMatch(/xe\/\{rollout-id\}/);
    });
  });

  describe('Spec integrity', () => {
    it('should have traceability code disabled (spec-only feature)', () => {
      expect(content).toMatch(/traceability:\s*\n\s*code:\s*disable/);
    });

    it('should declare context-storage as upstream dependency, not downstream workflows', () => {
      const frontmatter = content.match(/^---\n[\s\S]*?\n---/)?.[0] || '';
      expect(frontmatter).toMatch(/dependencies:/);
      expect(frontmatter).toMatch(/context-storage/);
      expect(frontmatter).not.toMatch(/feature-workflow/);
      expect(frontmatter).not.toMatch(/blueprint-workflow/);
    });
  });
});
