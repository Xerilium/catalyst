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

  // @req FR:workflow-context/execution-modes.enum
  // @req FR:workflow-context/$execution-mode
  describe('FR:execution-modes.enum + FR:$execution-mode: Canonical mode value set', () => {
    it('should declare the four canonical execution modes via the $execution-mode entity', () => {
      // Entity declared in Data Model
      expect(content).toMatch(/\*\*FR:\$execution-mode\*\*/);
      // All four modes enumerated as the entity's allowed values
      expect(content).toMatch(/`interactive`/);
      expect(content).toMatch(/`checkpoint-review`/);
      expect(content).toMatch(/`final-review`/);
      expect(content).toMatch(/`autonomous`/);
    });

    it('should expose the enum via FR:execution-modes.enum referencing $execution-mode', () => {
      const fr = content.match(/FR:execution-modes\.enum[\s\S]*?(?=- \*\*FR:|### |## )/)?.[0] || '';
      expect(fr).toMatch(/@req FR:\$execution-mode/);
    });
  });

  // @req FR:workflow-context/execution-modes.scope
  describe('FR:execution-modes.scope: Mode applies across all phases', () => {
    it('should declare that the selected mode applies across every workflow phase and is honored per-phase', () => {
      const fr = content.match(/FR:execution-modes\.scope[\s\S]*?(?=- \*\*FR:|### |## )/)?.[0] || '';
      expect(fr).toMatch(/every phase/i);
      expect(fr).toMatch(/honor/i);
      expect(fr).toMatch(/cadence/i);
      expect(fr).toMatch(/gate/i);
      expect(fr).toMatch(/git/i);
    });
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

  // @req FR:workflow-context/execution-modes.final-review
  describe('FR:execution-modes.final-review: Final-review mode', () => {
    it('should require autonomous execution to completion with a single end-of-run review and no AI git operations', () => {
      const fr = content.match(/FR:execution-modes\.final-review[\s\S]*?(?=- \*\*FR:|### |## )/)?.[0] || '';
      expect(fr).toMatch(/autonomously to completion/i);
      expect(fr).toMatch(/current branch/i);
      expect(fr).toMatch(/auto-approved/i);
      expect(fr).toMatch(/no state-changing git operations/i);
      expect(fr).toMatch(/human review at the end/i);
    });
  });

  // @req FR:workflow-context/execution-modes.autonomous
  describe('FR:execution-modes.autonomous: Autonomous mode', () => {
    it('should require feature branch creation with PR and auto-approved gates', () => {
      const fr = content.match(/FR:execution-modes\.autonomous[\s\S]*?(?=- \*\*FR:|### |## )/)?.[0] || '';
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

    it('should not declare downstream workflow features as dependencies (reverse dependency check)', () => {
      const frontmatter = content.match(/^---\n[\s\S]*?\n---/)?.[0] || '';
      expect(frontmatter).toMatch(/dependencies:/);
      expect(frontmatter).not.toMatch(/feature-workflow/);
      expect(frontmatter).not.toMatch(/blueprint-workflow/);
      expect(frontmatter).not.toMatch(/pull-request-workflow/);
    });
  });
});
