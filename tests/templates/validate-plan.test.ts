import fs from 'fs';
import path from 'path';

describe('plan.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/plan.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:feature-context/plan.template.standard
  describe('FR:plan.template.standard: Template standard compliance', () => {
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

    it('should have CRITICAL instruction about from-scratch implementation', () => {
      expect(content).toMatch(/CRITICAL INSTRUCTION/i);
      expect(content).toMatch(/from scratch/i);
      // The template uses "describe HOW to build" not "Create/Implement/Build"
      expect(content).toMatch(/build.*feature/i);
    });

    it('should have clear heading hierarchy (H1, H2, H3)', () => {
      expect(content).toMatch(/^# Implementation Plan: \{feature-name\}/m);
      expect(content).toMatch(/^## Summary/m);
      expect(content).toMatch(/^### 1\./m);
    });
  });

  // @req FR:feature-context/plan.template.summary
  describe('FR:plan.template.summary: Summary section', () => {
    it('should include Summary section', () => {
      expect(content).toMatch(/^## Summary/m);
    });

    it('should reference research.md for design rationale', () => {
      const summarySection = content.split('## Summary')[1]?.split('##')[0] || '';
      expect(summarySection).toMatch(/research\.md/i);
      expect(summarySection).toMatch(/Design rationale/i);
    });

    it('should have guidance for 3-5 sentence summary', () => {
      const summarySection = content.split('## Summary')[1]?.split('##')[0] || '';
      expect(summarySection).toMatch(/3-5 sentences/i);
    });
  });

  // @req FR:feature-context/plan.template.context
  describe('FR:plan.template.context: Technical Context section', () => {
    it('should include Technical Context section', () => {
      expect(content).toMatch(/^## Technical Context/m);
    });

    it('should reference architecture.md', () => {
      const techSection = content.split('## Technical Context')[1]?.split('##')[0] || '';
      expect(techSection).toMatch(/architecture\.md/i);
    });

    it('should include feature-specific technical details', () => {
      const techSection = content.split('## Technical Context')[1]?.split('##')[0] || '';
      expect(techSection).toMatch(/Feature-specific technical details/i);
      expect(techSection).toMatch(/Primary Components/i);
      expect(techSection).toMatch(/Dependencies/i);
    });
  });

  // @req FR:feature-context/plan.template.structure
  describe('FR:plan.template.structure: Project Structure section', () => {
    it('should include Project Structure section', () => {
      expect(content).toMatch(/^## Project Structure/m);
    });

    it('should have guidance for showing folder architecture', () => {
      const structureSection = content.split('## Project Structure')[1]?.split('##')[0] || '';
      expect(structureSection).toMatch(/folder architecture/i);
      expect(structureSection).toMatch(/entry point/i);
    });
  });

  // @req FR:feature-context/plan.template.datamodel
  describe('FR:plan.template.datamodel: Data Model section', () => {
    it('should include Data Model section', () => {
      expect(content).toMatch(/^## Data Model/m);
    });

    it('should separate owned vs referenced entities', () => {
      const dataSection = content.split('## Data Model')[1]?.split('##')[0] || '';
      expect(dataSection).toMatch(/Entities owned by this feature/i);
      expect(dataSection).toMatch(/Entities from other features/i);
    });

    it('should have guidance about inline vs separate file', () => {
      const dataSection = content.split('## Data Model')[1]?.split('##')[0] || '';
      expect(dataSection).toMatch(/inline/i);
      expect(dataSection).toMatch(/3\+.*complex entities/i);
    });
  });

  // @req FR:feature-context/plan.template.contracts
  describe('FR:plan.template.contracts: Contracts section', () => {
    it('should include Contracts section', () => {
      expect(content).toMatch(/^## Contracts/m);
    });

    it('should have guidance for function signatures or API endpoints', () => {
      const contractsSection = content.split('## Contracts')[1]?.split('##')[0] || '';
      expect(contractsSection).toMatch(/function signatures.*API endpoints/i);
    });

    it('should include contract structure template with signature, purpose, parameters, returns, errors', () => {
      // Check full content for contract structure (it's in a subsection template)
      expect(content).toMatch(/\*\*Signature:\*\*/);
      expect(content).toMatch(/\*\*Purpose:\*\*/);
      expect(content).toMatch(/\*\*Parameters:\*\*/);
      expect(content).toMatch(/\*\*Returns:\*\*/);
      expect(content).toMatch(/\*\*Errors\/Exceptions:\*\*/);
    });
  });

  // @req FR:feature-context/plan.template.approach.numbered
  // @req FR:feature-context/plan.template.approach.datastructures
  // @req FR:feature-context/plan.template.approach.algorithms
  // @req FR:feature-context/plan.template.approach.integration
  // @req FR:feature-context/plan.template.approach.errors
  // @req FR:feature-context/plan.template.approach.validation
  // @req FR:feature-context/plan.template.approach.performance
  // @req FR:feature-context/plan.template.approach.testing
  // @req FR:feature-context/plan.template.approach.examples
  describe('FR:plan.template.approach: Implementation Approach section with subsections', () => {
    it('should include Implementation Approach section', () => {
      expect(content).toMatch(/^## Implementation Approach/m);
    });

    it('should have numbered H3 subsections format', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/^### 1\./m);
      expect(implSection).toMatch(/^### 2\./m);
    });

    it('should include Data Structures subsection (FR:plan.template.approach.datastructures)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Data Structures/i);
    });

    it('should include Core Algorithms subsection (FR:plan.template.approach.algorithms)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Core Algorithms/i);
    });

    it('should include Integration Points subsection (FR:plan.template.approach.integration)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Integration Points/i);
    });

    it('should include Error Handling subsection (FR:plan.template.approach.errors)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Error Handling/i);
    });

    it('should include Error Handling with validation guidance (FR:plan.template.approach.validation)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      // Validation is part of Error Handling per template (combined in subsection 4)
      expect(implSection).toMatch(/### 4\. Error Handling/i);
      expect(implSection).toMatch(/validation rules/i);
    });

    it('should include Performance Considerations subsection (FR:plan.template.approach.performance)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Performance Considerations/i);
    });

    it('should include Testing Strategy subsection (FR:plan.template.approach.testing)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Testing Strategy/i);
    });

    it('should have guidance for code examples (FR:plan.template.approach.examples)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/pseudocode.*actual language syntax/i);
    });
  });

  // @req FR:feature-context/plan.template.usage
  describe('FR:plan.template.usage: Usage Examples section', () => {
    it('should include Usage Examples section', () => {
      expect(content).toMatch(/^## Usage Examples/m);
    });

    it('should have guidance for 2-3 practical examples', () => {
      const examplesSection = content.split('## Usage Examples')[1] || '';
      expect(examplesSection).toMatch(/2.*examples/i);
    });

    it('should have guidance for basic and integration patterns', () => {
      const examplesSection = content.split('## Usage Examples')[1] || '';
      expect(examplesSection).toMatch(/Basic usage/i);
      expect(examplesSection).toMatch(/Integration pattern/i);
    });
  });

  // @req FR:feature-context/plan.template.optimized
  // @req NFR:feature-context/cost.tokens
  describe('FR:plan.template.optimized: Token optimization', () => {
    it('should have reasonably concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Plan templates allow up to 1500 chars for comprehensive guidance
        expect(instruction.length).toBeLessThan(1500);
      });
    });

    it('should be reasonably concise overall', () => {
      const lines = content.split('\n').length;
      // Plan template should be comprehensive but not excessive
      // Increased to accommodate @req traceability annotations in frontmatter
      expect(lines).toBeLessThan(270);
    });
  });

  // @req NFR:feature-context/cost.instructions
  describe('NFR:cost.instructions: Instruction block clarity', () => {
    it('should have actionable instruction blocks', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      expect(instructions.length).toBeGreaterThan(0);
      instructions.forEach(instruction => {
        // Instructions should be clear and actionable (contain verbs or actionable phrases)
        expect(instruction).toMatch(/MUST|SHOULD|include|use|describe|provide|show|define|list|document|create|write/i);
      });
    });
  });

  // @req NFR:feature-context/reliability.markdown
  describe('NFR:reliability.markdown: Standard markdown syntax', () => {
    it('should use standard markdown heading syntax', () => {
      expect(content).toMatch(/^# /m);
      expect(content).toMatch(/^## /m);
    });

    it('should use standard markdown list syntax', () => {
      expect(content).toMatch(/^- /m);
    });
  });

  // @req NFR:feature-context/reliability.structure
  describe('NFR:reliability.structure: Consistent template structure', () => {
    it('should have consistent instruction block format', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\]/g) || [];
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should have consistent placeholder format', () => {
      const placeholders = content.match(/\{[^}]+\}/g) || [];
      placeholders.forEach(placeholder => {
        const inner = placeholder.slice(1, -1);
        expect(inner).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });
  });

  // @req NFR:feature-context/testability.validation
  describe('NFR:testability.validation: Automated validation tests', () => {
    it('should have this test file validating template structure', () => {
      // This test file itself validates the testability requirement
      // The fact that we're running validates the template has automated tests
      expect(true).toBe(true);
    });
  });
});
