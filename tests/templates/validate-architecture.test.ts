import fs from 'fs';
import path from 'path';

describe('architecture.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/templates/specs/architecture.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  describe('FR-1.1: Template standard compliance', () => {
    it('should use {placeholder-name} kebab-case format', () => {
      const placeholders = content.match(/\{[^}]+\}/g) || [];
      placeholders.forEach(placeholder => {
        const inner = placeholder.slice(1, -1);
        expect(inner).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });

    it('should use > [INSTRUCTIONS] prefix for guidance', () => {
      expect(content).toMatch(/> \[INSTRUCTIONS\]/);
    });

    it('should have clear heading hierarchy (H1, H2, H3)', () => {
      expect(content).toMatch(/^# System Architecture for/m);
      expect(content).toMatch(/^## Overview/m);
      expect(content).toMatch(/^### Runtime Technologies/m);
    });
  });

  describe('FR-1.2: Overview section with pointers', () => {
    it('should include Overview section', () => {
      expect(content).toMatch(/^## Overview/m);
    });

    it('should have pointer to engineering.md', () => {
      expect(content).toMatch(/engineering\.md/);
    });

    it('should have pointer to development process', () => {
      expect(content).toMatch(/development\.md/);
    });
  });

  describe('FR-1.3: Technology Stack section structure', () => {
    it('should include Technology Stack section', () => {
      expect(content).toMatch(/^## Technology Stack/m);
    });

    it('should include Runtime Technologies subsection', () => {
      expect(content).toMatch(/^### Runtime Technologies/m);
    });

    it('should include Development Technologies subsection', () => {
      expect(content).toMatch(/^### Development Technologies/m);
    });

    describe('FR-1.3.1: Runtime Technologies aspects', () => {
      const requiredAspects = [
        'Runtime Env',
        'App Platform',
        'Integration & Orchestration',
        'Data & Analytics',
        'Media & Gaming',
        'Mobile',
        'AI/ML',
        'Observability',
      ];

      requiredAspects.forEach(aspect => {
        it(`should include ${aspect} row`, () => {
          expect(content).toMatch(new RegExp(`\\| ${aspect.replace(/[&]/g, '\\$&')}`, 'm'));
        });
      });

      it('should have exactly 8 Runtime Technologies rows', () => {
        const runtimeSection = content.split('### Runtime Technologies')[1]?.split('### Development Technologies')[0] || '';
        const rows = runtimeSection.match(/^\| [^|]+\|/gm) || [];
        // Subtract 2 for header row and separator row
        expect(rows.length - 2).toBe(8);
      });
    });

    describe('FR-1.3.2: Development Technologies aspects', () => {
      const requiredAspects = [
        'Languages',
        'Dev Env',
        'AI Coding',
        'Test Framework',
        'DevOps Automation',
        'Distribution',
        'Observability',
      ];

      requiredAspects.forEach(aspect => {
        it(`should include ${aspect} row`, () => {
          expect(content).toMatch(new RegExp(`\\| ${aspect}`, 'm'));
        });
      });

      it('should have exactly 7 Development Technologies rows', () => {
        const devSection = content.split('### Development Technologies')[1]?.split('##')[0] || '';
        const rows = devSection.match(/^\| [^|]+\|/gm) || [];
        // Subtract 2 for header row and separator row
        expect(rows.length - 2).toBe(7);
      });
    });
  });

  describe('FR-1.4: Repository Structure section', () => {
    it('should include Repository Structure section', () => {
      expect(content).toMatch(/^## Repository Structure/m);
    });

    it('should include directory tree code block', () => {
      expect(content).toMatch(/```text/);
    });

    it('should have inline comments for folders', () => {
      expect(content).toMatch(/#.*Application source code/);
    });

    it('should mention what NOT to include per FR-1.4.3', () => {
      const repoSection = content.split('## Repository Structure')[1]?.split('##')[0] || '';
      expect(repoSection).toMatch(/node_modules|dependencies/i);
      expect(repoSection).toMatch(/\.git|VCS/i);
    });
  });

  describe('FR-1.5: Technical Architecture Patterns section', () => {
    it('should include Technical Architecture Patterns section', () => {
      expect(content).toMatch(/^## Technical Architecture Patterns/m);
    });

    it('should include Dependency Abstraction Pattern example', () => {
      expect(content).toMatch(/### Dependency Abstraction Pattern/);
    });
  });

  describe('FR-1.6: Token optimization', () => {
    it('should have concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Architecture templates allow longer instructions for complex guidance (up to 500 chars)
        expect(instruction.length).toBeLessThan(500);
      });
    });

    it('should use "Delete unused rows" instruction', () => {
      expect(content).toMatch(/Delete unused rows/);
    });
  });
});
