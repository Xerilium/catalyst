import fs from 'fs';
import path from 'path';

describe('plan.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/templates/specs/plan.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  describe('FR-2.1: Template standard compliance', () => {
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
      expect(content).toMatch(/Create.*Implement.*Build/);
    });

    it('should have clear heading hierarchy (H1, H2, H3)', () => {
      expect(content).toMatch(/^# Implementation Plan: \{feature-name\}/m);
      expect(content).toMatch(/^## Summary/m);
      expect(content).toMatch(/^### 1\./m);
    });
  });

  describe('FR-2.2: Summary section', () => {
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

  describe('FR-2.3: Technical Context section', () => {
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

  describe('FR-2.4: Project Structure section', () => {
    it('should include Project Structure section', () => {
      expect(content).toMatch(/^## Project Structure/m);
    });

    it('should have guidance for showing folder architecture', () => {
      const structureSection = content.split('## Project Structure')[1]?.split('##')[0] || '';
      expect(structureSection).toMatch(/folder architecture/i);
      expect(structureSection).toMatch(/entry point/i);
    });
  });

  describe('FR-2.5: Data Model section', () => {
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

  describe('FR-2.6: Contracts section', () => {
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

  describe('FR-2.7: Implementation Approach section with 8 subsections', () => {
    it('should include Implementation Approach section', () => {
      expect(content).toMatch(/^## Implementation Approach/m);
    });

    it('should have numbered H3 subsections format', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/^### 1\./m);
      expect(implSection).toMatch(/^### 2\./m);
    });

    it('should include Data Structures subsection (FR-2.7.2)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Data Structures/i);
    });

    it('should include Core Algorithms subsection (FR-2.7.3)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Core Algorithms/i);
    });

    it('should include Integration Points subsection (FR-2.7.4)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Integration Points/i);
    });

    it('should include Error Handling subsection (FR-2.7.5)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Error Handling/i);
    });

    it('should include Error Handling with validation guidance (FR-2.7.5 + FR-2.7.6)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      // Validation is part of Error Handling per template (combined in subsection 4)
      expect(implSection).toMatch(/### 4\. Error Handling/i);
      expect(implSection).toMatch(/validation rules/i);
    });

    it('should include Performance Considerations subsection (FR-2.7.7)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Performance Considerations/i);
    });

    it('should include Testing Strategy subsection (FR-2.7.8)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/Testing Strategy/i);
    });

    it('should have guidance for code examples (FR-2.7.9)', () => {
      const implSection = content.split('## Implementation Approach')[1]?.split(/^## [^#]/m)[0] || '';
      expect(implSection).toMatch(/pseudocode.*actual language syntax/i);
    });
  });

  describe('FR-2.8: Usage Examples section', () => {
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

  describe('FR-2.9: Token optimization', () => {
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
      expect(lines).toBeLessThan(250);
    });
  });
});
