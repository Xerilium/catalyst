import fs from 'fs';
import path from 'path';

describe('tasks.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/tasks.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:feature-context/tasks.template.standard
  describe('FR:tasks.template.standard: Template standard compliance', () => {
    it('should use {placeholder-name} kebab-case format if placeholders exist', () => {
      const placeholders = content.match(/\{[^}]+\}/g) || [];
      placeholders.forEach(placeholder => {
        const inner = placeholder.slice(1, -1);
        // Skip uppercase format indicators like {TYPE} used in example syntax
        if (/^[A-Z]+$/.test(inner)) return;
        expect(inner).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });

    it('should use > [INSTRUCTIONS] prefix for guidance', () => {
      expect(content).toMatch(/> \[INSTRUCTIONS\]/);
    });

    it('should have clear heading hierarchy (H1, H2)', () => {
      expect(content).toMatch(/^# Tasks:/m);
      expect(content).toMatch(/^## Step \d+:/m);
    });
  });

  // @req FR:feature-context/tasks.template.input
  describe('FR:tasks.template.input: Input/Prerequisites section', () => {
    it('should include Input and Prerequisites information', () => {
      expect(content).toMatch(/\*\*Input\*\*:/i);
      expect(content).toMatch(/\*\*Prerequisites\*\*:/i);
    });

    it('should reference design docs', () => {
      expect(content).toMatch(/plan\.md.*required/i);
    });
  });

  // @req FR:feature-context/tasks.template.tdd
  // Note: Template structure was revised - Step 1 is now Tests First (TDD) instead of Setup
  describe('FR:tasks.template.tdd: Step 1 (Tests First/TDD) section', () => {
    it('should include Step 1: Tests First (TDD)', () => {
      expect(content).toMatch(/^## Step 1:.*Tests First.*TDD/im);
    });

    it('should have CRITICAL instruction about tests first', () => {
      // The CRITICAL instruction is right after Step 1 header
      expect(content).toMatch(/CRITICAL.*Tests MUST be written.*MUST FAIL.*before.*implementation/is);
    });

    it('should use checkbox format for tasks', () => {
      const step1Section = content.split('## Step 1:')[1]?.split('##')[0] || '';
      expect(step1Section).toMatch(/- \[ \]/);
    });
  });

  // @req FR:feature-context/tasks.template.core
  // Note: Template structure was revised - Step 2 is now Core Implementation
  describe('FR:tasks.template.core: Step 2 (Core Implementation) section', () => {
    it('should include Step 2: Core Implementation', () => {
      expect(content).toMatch(/^## Step 2:.*Core Implementation/m);
    });

    it('should use checkbox format for tasks', () => {
      const step2Section = content.split('## Step 2:')[1]?.split('##')[0] || '';
      expect(step2Section).toMatch(/- \[ \]/);
    });
  });

  // @req FR:feature-context/tasks.template.integration
  describe('FR:tasks.template.integration: Step 3 (Integration) section', () => {
    it('should include Step 3: Integration', () => {
      expect(content).toMatch(/^## Step 3:.*Integration/m);
    });
  });

  // @req FR:feature-context/tasks.template.docs
  describe('FR:tasks.template.docs: Step 4 (Documentation) section', () => {
    it('should include Step 4: Documentation', () => {
      expect(content).toMatch(/^## Step 4:.*Documentation/m);
    });
  });

  // @req FR:feature-context/tasks.template.dependencies
  describe('FR:tasks.template.dependencies: Dependencies section', () => {
    it('should include Dependencies section', () => {
      expect(content).toMatch(/^## Dependencies/m);
    });

    it('should document task dependencies', () => {
      const depsSection = content.split('## Dependencies')[1] || '';
      // Template shows task-level dependencies (T004-T007) not step-level
      expect(depsSection).toMatch(/T\d+/);
    });
  });

  // @req FR:feature-context/tasks.template.optimized
  // @req NFR:feature-context/cost.tokens
  describe('FR:tasks.template.optimized: Token optimization', () => {
    it('should have reasonably concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Main tasks instruction has comprehensive guidance with parallelization examples (up to 3200 chars)
        // Other instructions should be more concise
        const isMainInstruction = instruction.includes('Living Specification') ||
                                  instruction.includes('Task Granularity');
        const maxLength = isMainInstruction ? 3200 : 2000;
        expect(instruction.length).toBeLessThan(maxLength);
      });
    });

    it('should be reasonably concise overall', () => {
      const lines = content.split('\n').length;
      // Tasks template should be concise but comprehensive
      expect(lines).toBeLessThan(150);
    });
  });
});
