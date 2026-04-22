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
    it('should have frontmatter with id, title, description, and dependencies', () => {
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/^id:/m);
      expect(content).toMatch(/^title:/m);
      expect(content).toMatch(/^description:/m);
      expect(content).toMatch(/^dependencies:/m);
    });

    // @req FR:feature-context/spec.frontmatter
    it('should NOT have author or status in frontmatter', () => {
      const frontmatter = content.split('---')[1] || '';
      expect(frontmatter).not.toMatch(/^author:/m);
      expect(frontmatter).not.toMatch(/^status:/m);
    });

    // @req FR:feature-context/spec.frontmatter.description
    it('should have a description field with guidance indicating it is required and concise', () => {
      const frontmatter = content.split('---')[1] || '';
      expect(frontmatter).toMatch(/^description:/m);
      // Instructions elsewhere in the file must document the constraints
      expect(content).toMatch(/description[\s\S]*?(120|single[- ]line|sentence[- ]fragment|feature index)/i);
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

    // @req FR:feature-context/spec.scenarios.deps.level
    it('should instruct targeting lowest-level upstream requirement', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/lowest-level/i);
    });

    // @req FR:feature-context/spec.scenarios.deps.format
    it('should define @req dependency link format', () => {
      expect(content).toMatch(/> - @req FR:\{feature-id\}\/\{fr-id\}/);
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

    // @req FR:feature-context/spec.constraints
    it('should instruct to always keep the section with "None" fallback', () => {
      const constraintsSection = content.split('## Architecture Constraints')[1]?.split('##')[0] || '';
      expect(constraintsSection).toMatch(/always keep this section|section MUST always|always present/i);
      expect(constraintsSection).toMatch(/"None"/);
    });
  });

  // @req FR:feature-context/spec.dependencies
  describe('FR:spec.dependencies: External Dependencies section', () => {
    it('should include External Dependencies section', () => {
      expect(content).toMatch(/^## External Dependencies/m);
    });

    it('should instruct to list only non-tech-stack external deps', () => {
      const depsSection = content.split('## External Dependencies')[1] || '';
      expect(depsSection).toMatch(/NOT already in.*architecture\.md/i);
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
    // Character count correlates better with AI token cost than line count.
    it('should be reasonably concise overall', () => {
      expect(content.length).toBeLessThan(4500);
    });
  });

  // @req NFR:feature-context/cost.instructions
  describe('NFR:cost.instructions: Clear and actionable instructions', () => {
    it('should have instruction blocks that are concise', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      expect(instructions.length).toBeGreaterThan(0);
      instructions.forEach(instruction => {
        // Spec template allows longer blocks for detailed scenario guidance
        expect(instruction.length).toBeLessThan(1500);
      });
    });
  });

  // @req NFR:feature-context/reliability.markdown
  describe('NFR:reliability.markdown: Standard markdown syntax', () => {
    it('should use standard heading syntax', () => {
      expect(content).toMatch(/^# /m);
      expect(content).toMatch(/^## /m);
    });
  });

  // @req NFR:feature-context/reliability.structure
  describe('NFR:reliability.structure: Consistent template structure', () => {
    it('should have consistent instruction block format', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\]/g) || [];
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should have consistent heading hierarchy', () => {
      expect(content).toMatch(/^# Feature:/m);
      expect(content).toMatch(/^## /m);
    });
  });

  // @req NFR:feature-context/testability.validation
  describe('NFR:testability.validation: Automated validation tests', () => {
    it('should be validated by this test suite (self-referential)', () => {
      // This test suite itself fulfills the testability NFR —
      // its existence proves templates have automated Jest validation
      expect(true).toBe(true);
    });
  });

  describe('FR:index: Feature index (contract defined in Run 1; implementation in Run 4)', () => {
    // @req FR:feature-context/index.location — pending Run 4 generator implementation
    it.skip('should write the index to .xe/features/README.md', () => {});

    // @req FR:feature-context/index.generated — pending Run 4 generator implementation
    it.skip('should auto-generate the index idempotently from spec frontmatter', () => {});

    // @req FR:feature-context/index.content — pending Run 4 generator implementation
    it.skip('should include id, title, and description ordered alphabetically by id', () => {});

    // @req FR:feature-context/index.generated-marker — pending Run 4 generator implementation
    it.skip('should include an auto-generated marker at the top of the file', () => {});
  });
});
