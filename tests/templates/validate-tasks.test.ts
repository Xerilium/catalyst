import fs from 'fs';
import path from 'path';

describe('tasks.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/tasks.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  describe('FR-3.1: Template standard compliance', () => {
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

  describe('FR-3.2: Input/Prerequisites section', () => {
    it('should include Input and Prerequisites information', () => {
      expect(content).toMatch(/\*\*Input\*\*:/i);
      expect(content).toMatch(/\*\*Prerequisites\*\*:/i);
    });

    it('should reference design docs', () => {
      expect(content).toMatch(/plan\.md.*required/i);
    });
  });

  describe('FR-3.3: Step 1 (Setup) section', () => {
    it('should include Step 1: Setup', () => {
      expect(content).toMatch(/^## Step 1:/m);
      expect(content).toMatch(/Setup/i);
    });
  });

  describe('FR-3.4: Step 2 (Tests First/TDD) section', () => {
    it('should include Step 2: Tests First (TDD)', () => {
      expect(content).toMatch(/^## Step 2:/m);
      expect(content).toMatch(/Tests First|TDD/i);
    });

    it('should have CRITICAL instruction about tests first', () => {
      const step2Section = content.split('## Step 2:')[1]?.split('##')[0] || '';
      expect(step2Section).toMatch(/CRITICAL/i);
      expect(step2Section).toMatch(/tests MUST be written.*MUST FAIL.*before.*implementation/i);
    });

    it('should use checkbox format for tasks', () => {
      const step2Section = content.split('## Step 2:')[1]?.split('##')[0] || '';
      expect(step2Section).toMatch(/- \[ \]/);
    });
  });

  describe('FR-3.5: Step 3 (Core Implementation) section', () => {
    it('should include Step 3: Core Implementation', () => {
      expect(content).toMatch(/^## Step 3:/m);
      expect(content).toMatch(/Core Implementation|Implementation/i);
    });

    it('should use checkbox format for tasks', () => {
      const step3Section = content.split('## Step 3:')[1]?.split('##')[0] || '';
      expect(step3Section).toMatch(/- \[ \]/);
    });
  });

  describe('FR-3.6: Step 4 (Integration) section', () => {
    it('should include Step 4: Integration', () => {
      expect(content).toMatch(/^## Step 4:/m);
      expect(content).toMatch(/Integration/i);
    });
  });

  describe('FR-3.7: Step 5 (Polish) section', () => {
    it('should include Step 5: Polish', () => {
      expect(content).toMatch(/^## Step 5:/m);
      expect(content).toMatch(/Polish/i);
    });
  });

  describe('FR-3.8: Dependencies section', () => {
    it('should include Dependencies section', () => {
      expect(content).toMatch(/^## Dependencies/m);
    });

    it('should document task dependencies', () => {
      const depsSection = content.split('## Dependencies')[1] || '';
      // Template shows task-level dependencies (T004-T007) not step-level
      expect(depsSection).toMatch(/T\d+/);
    });
  });

  describe('FR-3.9: Token optimization', () => {
    it('should have reasonably concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Main tasks instruction has comprehensive guidance with parallelization examples (up to 2500 chars)
        // Other instructions should be more concise
        const isMainInstruction = instruction.includes('Living Specification') ||
                                  instruction.includes('Task Granularity');
        const maxLength = isMainInstruction ? 2500 : 2000;
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
