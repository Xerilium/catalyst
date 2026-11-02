/**
 * Tests for architecture.md template validation
 */

import fs from 'fs';
import path from 'path';

describe('architecture.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/architecture.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:engineering-context/arch.template
  it('should exist at the template path declared by FR:arch.template', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  // @req FR:engineering-context/arch.template
  describe('FR:arch.template: Template standard compliance', () => {
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

  // @req FR:engineering-context/arch.overview
  describe('FR:arch.overview: Overview section with pointers', () => {
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

  // @req FR:engineering-context/arch.stack
  describe('FR:arch.stack: Technology Stack section structure', () => {
    it('should include Technology Stack section', () => {
      expect(content).toMatch(/^## Technology Stack/m);
    });

    // @req FR:engineering-context/arch.stack.runtime
    it('should include Runtime Technologies subsection', () => {
      expect(content).toMatch(/^### Runtime Technologies/m);
    });

    // @req FR:engineering-context/arch.stack.dev
    it('should include Development Technologies subsection', () => {
      expect(content).toMatch(/^### Development Technologies/m);
    });

    // @req FR:engineering-context/arch.stack.runtime.categories
    describe('FR:arch.stack.runtime.categories: Runtime Technologies aspects', () => {
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

    // @req FR:engineering-context/arch.stack.dev.categories
    describe('FR:arch.stack.dev.categories: Development Technologies aspects', () => {
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

  // @req FR:engineering-context/arch.structure
  describe('FR:arch.structure: Repository Structure section', () => {
    it('should include Repository Structure section', () => {
      expect(content).toMatch(/^## Repository Structure/m);
    });

    // @req FR:engineering-context/arch.structure.tree
    it('should include directory tree code block', () => {
      // Using string concatenation to avoid backticks confusing the traceability scanner
      const codeBlock = '\x60\x60\x60text';
      expect(content).toContain(codeBlock);
    });

    // @req FR:engineering-context/arch.structure.comments
    it('should have inline comments for folders', () => {
      expect(content).toMatch(/#.*Application source code/);
    });

    // @req FR:engineering-context/arch.structure.exclude
    it('should mention what NOT to include per FR:arch.structure.exclude', () => {
      const repoSection = content.split('## Repository Structure')[1]?.split('##')[0] || '';
      expect(repoSection).toMatch(/node_modules|dependencies/i);
      expect(repoSection).toMatch(/\.git|VCS/i);
    });

    // @req FR:engineering-context/arch.structure.simple
    it('should support simple root source folder structure', () => {
      const repoSection = content.split('## Repository Structure')[1]?.split('##')[0] || '';
      // Template uses placeholders like {source}/ for simple apps
      expect(repoSection).toMatch(/\{source\}\/|Source code|source code/i);
    });

    // @req FR:engineering-context/arch.structure.complex
    it('should support complex component/layer folders', () => {
      const repoSection = content.split('## Repository Structure')[1]?.split('##')[0] || '';
      // Instructions mention components/layers for complex apps/monorepos
      expect(repoSection).toMatch(/components|layers|monorepo/i);
    });
  });

  // @req FR:engineering-context/arch.patterns
  describe('FR:arch.patterns: Technical Architecture Patterns section', () => {
    it('should include Technical Architecture Patterns section', () => {
      expect(content).toMatch(/^## Technical Architecture Patterns/m);
    });

    it('should include Dependency Abstraction Pattern example', () => {
      expect(content).toMatch(/### Dependency Abstraction Pattern/);
    });

    const patternsInstructions = (): string => {
      const section = content.split('## Technical Architecture Patterns')[1] || '';
      return section.split(/\n\n(?!>)/)[0];
    };

    // @req FR:engineering-context/arch.patterns.bar
    it('should require patterns to repeat and be needed to re-implement correctly', () => {
      const instructions = patternsInstructions();
      expect(instructions).toMatch(/repeats?\b/i);
      expect(instructions).toMatch(/re-implement/i);
      expect(instructions).toMatch(/consistent/i);
    });

    // @req FR:engineering-context/arch.patterns.redirect
    it('should route non-patterns to design decisions, feature specs, and their own section', () => {
      const instructions = patternsInstructions();
      expect(instructions).toMatch(/design-decisions\.md/);
      expect(instructions).toMatch(/spec\.md/);
      expect(instructions).toMatch(/[Dd]eployment/);
    });

    // @req FR:engineering-context/arch.patterns.scope
    it('should tell authors to state where each pattern applies', () => {
      expect(patternsInstructions()).toMatch(/where each applies|where it applies|applies to/i);
    });

    // @req FR:engineering-context/arch.patterns.examples
    it('should give one qualifying and one disqualifying example', () => {
      const instructions = patternsInstructions();
      expect(instructions).toMatch(/\bYes:/);
      expect(instructions).toMatch(/\bNo:/);
    });

    // @req FR:engineering-context/arch.patterns.volume
    it('should state that few or no patterns is expected', () => {
      expect(patternsInstructions()).toMatch(/1-3|few|none/i);
    });
  });

  // @req NFR:engineering-context/cost.token-efficiency
  describe('NFR:cost.token-efficiency: Token optimization', () => {
    it('should have concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Architecture templates allow longer instructions for complex guidance (up to 600 chars);
        // the patterns section needs the bar, the redirects, and examples in one block
        expect(instruction.length).toBeLessThan(600);
      });
    });

    it('should use "Delete unused rows" instruction', () => {
      expect(content).toMatch(/Delete unused rows/);
    });
  });

  // @req NFR:engineering-context/reliability.syntax
  describe('NFR:reliability.syntax: Standard markdown syntax', () => {
    it('should use standard markdown heading syntax', () => {
      expect(content).toMatch(/^# /m);
      expect(content).toMatch(/^## /m);
      expect(content).toMatch(/^### /m);
    });

    it('should use standard markdown table syntax', () => {
      expect(content).toMatch(/\|.*\|/);
      // Table separator row: | --- | --- | (with possible spaces)
      expect(content).toMatch(/\| -+ \|/);
    });
  });

  // @req NFR:engineering-context/reliability.structure
  describe('NFR:reliability.structure: Consistent structure', () => {
    it('should have instruction blocks in consistent format', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\]/g) || [];
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should have clear hierarchy with numbered sections or consistent headings', () => {
      const h2Count = (content.match(/^## /gm) || []).length;
      const h3Count = (content.match(/^### /gm) || []).length;
      expect(h2Count).toBeGreaterThanOrEqual(4);
      expect(h3Count).toBeGreaterThanOrEqual(2);
    });
  });
});
