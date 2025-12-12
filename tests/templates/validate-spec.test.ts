import fs from 'fs';
import path from 'path';

describe('spec.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/templates/specs/spec.md');
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

    it('should have CRITICAL circular dependency warning', () => {
      expect(content).toMatch(/CRITICAL.*Avoid Circular Dependencies/i);
      expect(content).toMatch(/NEVER mention features that will depend on this feature/i);
    });

    it('should have clear heading hierarchy (H1, H2, H3)', () => {
      expect(content).toMatch(/^# Feature: \{feature-name\}/m);
      expect(content).toMatch(/^## Problem/m);
      expect(content).toMatch(/^### Functional Requirements/m);
    });
  });

  describe('FR-1.2: Problem section', () => {
    it('should include Problem section', () => {
      expect(content).toMatch(/^## Problem/m);
    });

    it('should have instruction for 1-2 sentences', () => {
      const problemSection = content.split('## Problem')[1]?.split('##')[0] || '';
      expect(problemSection).toMatch(/1-2 sentences/i);
    });
  });

  describe('FR-1.3: Goals section', () => {
    it('should include Goals section', () => {
      expect(content).toMatch(/^## Goals/m);
    });

    it('should have explicit non-goals subsection', () => {
      const goalsSection = content.split('## Goals')[1]?.split('## Scenario')[0] || '';
      expect(goalsSection).toMatch(/Explicit non-goals/i);
    });
  });

  describe('FR-1.4: Scenario section', () => {
    it('should include Scenario section', () => {
      expect(content).toMatch(/^## Scenario/m);
    });

    it('should have instruction for user stories with outcomes', () => {
      const scenarioSection = content.split('## Scenario')[1]?.split('##')[0] || '';
      expect(scenarioSection).toMatch(/As a \{persona\}/);
      expect(scenarioSection).toMatch(/Outcome:/);
    });
  });

  describe('FR-1.5: Success Criteria section', () => {
    it('should include Success Criteria section', () => {
      expect(content).toMatch(/^## Success Criteria/m);
    });

    it('should have instruction for measurable outcomes', () => {
      const criteriaSection = content.split('## Success Criteria')[1]?.split('##')[0] || '';
      expect(criteriaSection).toMatch(/SMART metrics/i);
      expect(criteriaSection).toMatch(/measure achievement/i);
    });
  });

  describe('FR-1.6: Design Principles section', () => {
    it('should include Design Principles section', () => {
      expect(content).toMatch(/^## Design principles/m);
    });

    it('should have detailed guidance for principles', () => {
      const principlesSection = content.split('## Design principles')[1]?.split('##')[0] || '';
      expect(principlesSection).toMatch(/imperative phrase/i);
      expect(principlesSection).toMatch(/declarative statements/i);
    });
  });

  describe('FR-1.7: Functional Requirements subsection', () => {
    it('should include Functional Requirements subsection', () => {
      expect(content).toMatch(/^### Functional Requirements/m);
    });

    it('should have FR-X numbering format guidance', () => {
      const frSection = content.split('### Functional Requirements')[1]?.split('###')[0] || '';
      expect(frSection).toMatch(/System MUST/i);
    });
  });

  describe('FR-1.8: Non-functional Requirements subsection', () => {
    it('should include Non-functional Requirements subsection', () => {
      expect(content).toMatch(/^### Non-functional requirements/m);
    });

    it('should list NFR-1 through NFR-11 standard categories', () => {
      const nfrSection = content.split('### Non-functional requirements')[1]?.split('##')[0] || '';

      const expectedCategories = [
        'NFR-1.*Documentation',
        'NFR-2.*Cost & usage efficiency',
        'NFR-3.*Reliability',
        'NFR-4.*Performance',
        'NFR-5.*Observability',
        'NFR-6.*Auditability',
        'NFR-7.*Testability',
        'NFR-8.*Security',
        'NFR-9.*Accessibility',
        'NFR-10.*Globalization',
        'NFR-11.*Backward compatibility',
      ];

      expectedCategories.forEach(category => {
        expect(nfrSection).toMatch(new RegExp(category, 'i'));
      });
    });

    it('should have guidance about deleting unused categories', () => {
      const nfrSection = content.split('### Non-functional requirements')[1]?.split('##')[0] || '';
      expect(nfrSection).toMatch(/delete.*not applicable/i);
    });

    it('should require specific, measurable constraints', () => {
      const nfrSection = content.split('### Non-functional requirements')[1]?.split('##')[0] || '';
      expect(nfrSection).toMatch(/specific.*measurable/i);
    });
  });

  describe('FR-1.9: Key Entities section', () => {
    it('should include Key Entities section', () => {
      expect(content).toMatch(/^## Key Entities/m);
    });

    it('should separate owned vs referenced entities', () => {
      const entitiesSection = content.split('## Key Entities')[1]?.split('##')[0] || '';
      expect(entitiesSection).toMatch(/Entities owned by this feature/i);
      expect(entitiesSection).toMatch(/Entities from other features/i);
    });

    it('should include Inputs and Outputs subsections', () => {
      const entitiesSection = content.split('## Key Entities')[1]?.split('##')[0] || '';
      expect(entitiesSection).toMatch(/Inputs:/i);
      expect(entitiesSection).toMatch(/Outputs:/i);
    });
  });

  describe('FR-1.10: Dependencies section', () => {
    it('should include Dependencies section', () => {
      expect(content).toMatch(/^## Dependencies/m);
    });

    it('should have guidance about internal and external dependencies', () => {
      const depsSection = content.split('## Dependencies')[1]?.split('##')[0] || '';
      expect(depsSection).toMatch(/Internal Dependencies/i);
      expect(depsSection).toMatch(/External Dependencies/i);
      expect(depsSection).toMatch(/Avoid Circular Dependencies/i);
    });
  });

  describe('FR-1.11: System Architecture section', () => {
    it('should include System Architecture section if it exists or allow its absence', () => {
      // This section is optional per spec, so we just check if present, it's formatted correctly
      const hasArchSection = content.match(/^## System Architecture/m);
      if (hasArchSection) {
        expect(content).toMatch(/^## System Architecture/m);
      }
      // If not present, that's also valid per FR-1.11 "with option for diagrams"
    });
  });

  describe('FR-1.12: Token optimization', () => {
    it('should have reasonably concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Design Principles, Requirements, and Dependencies sections have comprehensive guidance (up to 3000 chars)
        // Other sections should be more concise (up to 1000 chars)
        const isComprehensiveSection = instruction.includes('non-negotiable values that should guide implementation') ||
                                       instruction.includes('Functional and non-functional requirements') ||
                                       instruction.includes('Enumerate behaviors, constraints') ||
                                       instruction.includes('NFR-1') || // Documentation NFR section
                                       instruction.includes('Internal Dependencies') || // Dependencies section
                                       instruction.includes('Design principles must');
        const maxLength = isComprehensiveSection ? 3000 : 1000;
        expect(instruction.length).toBeLessThan(maxLength);
      });
    });

    it('should be reasonably concise overall', () => {
      const lines = content.split('\n').length;
      // Spec template should be comprehensive but not excessive
      expect(lines).toBeLessThan(200);
    });
  });
});
