import fs from 'fs';
import path from 'path';

describe('spec.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/spec.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:feature-context/spec.template
  describe('FR:spec.template: Template standard compliance', () => {
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
      expect(content).toMatch(/^# Feature: \{feature-name\}/m);
      expect(content).toMatch(/^## Purpose/m);
      expect(content).toMatch(/^## Scenarios/m);
    });

    // @req FR:feature-context/spec.frontmatter
    it('should have frontmatter with id, title, and dependencies', () => {
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/^id:/m);
      expect(content).toMatch(/^title:/m);
      expect(content).toMatch(/^dependencies:/m);
    });

    // @req FR:feature-context/spec.frontmatter
    it('should NOT have author, status, or description in frontmatter', () => {
      const frontmatter = content.split('---')[1] || '';
      expect(frontmatter).not.toMatch(/^author:/m);
      expect(frontmatter).not.toMatch(/^status:/m);
      expect(frontmatter).not.toMatch(/^description:/m);
    });
  });

  // @req FR:feature-context/spec.purpose
  describe('FR:spec.purpose: Purpose section', () => {
    it('should include Purpose section', () => {
      expect(content).toMatch(/^## Purpose/m);
    });

    it('should describe purpose as a mission statement', () => {
      const purposeSection = content.split('## Purpose')[1]?.split('##')[0] || '';
      expect(purposeSection).toMatch(/mission statement/i);
    });

    it('should describe scope boundaries', () => {
      const purposeSection = content.split('## Purpose')[1]?.split('##')[0] || '';
      expect(purposeSection).toMatch(/boundaries|mandate ends|charter/i);
    });
  });

  // @req FR:feature-context/spec.scenarios
  describe('FR:spec.scenarios: Scenarios section', () => {
    it('should include Scenarios section', () => {
      expect(content).toMatch(/^## Scenarios/m);
    });

    // @req FR:feature-context/spec.scenarios.personas
    it('should reference product.md personas', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/\.xe\/product\.md.*Personas/);
    });

    // @req FR:feature-context/spec.scenarios.format
    it('should define scenario format as FR with ID', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}/);
    });

    // @req FR:feature-context/spec.scenarios.format
    it('should include actor-action-value format', () => {
      expect(content).toMatch(/\{actor\} needs to \{action\} so that \{value\}/);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs
    it('should define sub-requirement nesting', () => {
      expect(content).toMatch(/FR:\{scenario-id\}\.\{sub-id\}/);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs
    it('should include MUST/SHOULD/MAY language', () => {
      expect(content).toMatch(/MUST\/SHOULD\/MAY/);
    });

    // @req FR:feature-context/spec.scenarios.priority
    it('should define priority levels P1-P5', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/P1.*Critical/);
      expect(scenarioSection).toMatch(/P2.*Important/);
      expect(scenarioSection).toMatch(/P3.*Standard/);
      expect(scenarioSection).toMatch(/P4.*Minor/);
      expect(scenarioSection).toMatch(/P5.*Informational/);
    });

    // @req FR:feature-context/spec.scenarios.io
    it('should define Input/Output as nested FRs with traceable IDs', () => {
      expect(content).toMatch(/FR:\{scenario-id\}\.\{sub-id\}\.input/);
      expect(content).toMatch(/FR:\{scenario-id\}\.\{sub-id\}\.output/);
    });
  });

  // @req FR:feature-context/spec.nfr
  describe('FR:spec.nfr: Non-functional Requirements subsection', () => {
    it('should include Non-functional Requirements subsection', () => {
      expect(content).toMatch(/^### Non-functional Requirements/m);
    });

    it('should indicate NFRs are optional', () => {
      const nfrSection = content.split('### Non-functional Requirements')[1]?.split(/^##/m)[0] || '';
      expect(nfrSection).toMatch(/delete this[\s\S]*section entirely/i);
    });

    it('should require specific measurable targets', () => {
      const nfrSection = content.split('### Non-functional Requirements')[1]?.split(/^##/m)[0] || '';
      expect(nfrSection).toMatch(/specific.*measurable/i);
    });
  });

  // @req FR:feature-context/spec.constraints
  describe('FR:spec.constraints: Architecture Constraints section', () => {
    it('should include Architecture Constraints section', () => {
      expect(content).toMatch(/^## Architecture Constraints/m);
    });

    it('should describe constraints as guardrails', () => {
      const constraintsSection = content.split('## Architecture Constraints')[1]?.split('##')[0] || '';
      expect(constraintsSection).toMatch(/[Gg]uardrails/);
    });

    it('should reference @req annotations', () => {
      const constraintsSection = content.split('## Architecture Constraints')[1]?.split('##')[0] || '';
      expect(constraintsSection).toMatch(/@req/);
    });
  });

  // @req FR:feature-context/spec.dependencies
  describe('FR:spec.dependencies: Dependencies section', () => {
    it('should include Dependencies section', () => {
      expect(content).toMatch(/^## Dependencies/m);
    });

    it('should specify upstream only', () => {
      const depsSection = content.split('## Dependencies')[1] || '';
      expect(depsSection).toMatch(/ONLY upstream/i);
      expect(depsSection).toMatch(/Never list downstream/i);
    });
  });

  describe('Removed sections should not exist', () => {
    it('should NOT have Problem section', () => {
      expect(content).not.toMatch(/^## Problem/m);
    });

    it('should NOT have Goals section', () => {
      expect(content).not.toMatch(/^## Goals/m);
    });

    it('should NOT have Success Criteria section', () => {
      expect(content).not.toMatch(/^## Success Criteria/m);
    });

    it('should NOT have Design Principles section', () => {
      expect(content).not.toMatch(/^## Design [Pp]rinciples/m);
    });

    it('should NOT have Key Entities section', () => {
      expect(content).not.toMatch(/^## Key Entities/m);
    });

    it('should NOT have System Architecture section', () => {
      expect(content).not.toMatch(/^## System Architecture/m);
    });
  });

  // @req NFR:feature-context/cost.tokens
  describe('NFR:cost.tokens: Token optimization', () => {
    it('should be reasonably concise overall', () => {
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(120);
    });
  });
});
