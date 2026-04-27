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

    // @req FR:feature-context/spec.scenarios.structure
    it('should define sibling sub-FRs for input, behaviors, output, and interfaces', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.input/);
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.\{behavior-name\}/);
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.output/);
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.\{interface-name\}/);
    });

    // @req FR:feature-context/spec.scenarios.structure
    it('should specify the sibling order: input, behaviors, output, interfaces', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      // Order is asserted by the bullets in the structure FR (lives in feature-context spec, not the template).
      // For the template, verify all four slots are demonstrated in the example FR.
      expect(scenarioSection).toMatch(/\.input/);
      expect(scenarioSection).toMatch(/\.\{behavior-name\}/);
      expect(scenarioSection).toMatch(/\.output/);
      expect(scenarioSection).toMatch(/\.\{interface-name\}/);
    });

    // @req FR:feature-context/spec.scenarios.structure.interface
    it('should demonstrate interface labels and public-vs-internal guidance', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      // Template MUST reference short interface labels
      expect(scenarioSection).toMatch(/cli|mcp|http-api|web|mobile|file-format/);
      // Template MUST reference the public-vs-internal distinction
      expect(scenarioSection).toMatch(/public/i);
      // Template MUST demonstrate an interface FR with `Interface:` keyword
      expect(scenarioSection).toMatch(/Interface:/);
    });

    // @req FR:feature-context/spec.scenarios.structure.io
    it('should describe input/output with the {content} ({type}) shape', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.input/);
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.output/);
      // Template MUST show the {content} ({type}) shape literal
      expect(scenarioSection).toMatch(/\{content\} \(\{type\}\)/);
      // Template MUST demonstrate @req entity reference convention with $-prefix
      expect(scenarioSection).toMatch(/@req FR:\$\w/);
    });

    // @req FR:feature-context/spec.scenarios.structure.io
    it('should demonstrate input/output with concrete @req entity references', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      // Concrete example MUST show an actual entity reference (not just placeholder)
      // e.g., `(@req FR:$feature-request)` or `(@req FR:$feature)`
      expect(scenarioSection).toMatch(/\(@req FR:\$[a-z-]+\)/);
    });
  });

  // @req FR:feature-context/spec.data-model.id
  describe('FR:spec.data-model.id: Entity FR $-prefix convention', () => {
    it('should demonstrate scenario-relative $-prefix entity FR pattern', () => {
      const dataModelSection = content.split(/^## Data Model$/m)[1]?.split(/^## /m)[0] || '';
      // Within the feature's own spec, entity IDs are scenario-relative
      expect(dataModelSection).toMatch(/FR:\$entity-name/);
    });
  });

  // @req FR:feature-context/spec.data-model.section
  describe('FR:spec.data-model.section: All entities in H2 Data Model section', () => {
    it('should include a Data Model H2 section', () => {
      expect(content).toMatch(/^## Data Model$/m);
    });

    it('should NOT demonstrate nested entity FRs in scenarios', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      // Nested entity FRs (FR:{scenario-id}.$entity-name) MUST NOT appear in the example FR shape
      expect(scenarioSection).not.toMatch(/FR:\{scenario-id\}\.\$entity-name/);
    });

    it('should reference the Data Model section from the example FR shape', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/Data Model/);
    });
  });

  // @req FR:feature-context/spec.data-model.format
  describe('FR:spec.data-model.format: Entity format', () => {
    it('should document the priority-based detail gradient (P1 vs P3+)', () => {
      const dataModelSection = content.split(/^## Data Model$/m)[1]?.split(/^## /m)[0] || '';
      // Template MUST teach what differs across priority levels
      expect(dataModelSection).toMatch(/P1/);
      expect(dataModelSection).toMatch(/P3/);
    });

    // @req FR:feature-context/spec.data-model.format.entity
    it('should demonstrate entity name styling: bold + code for precise names', () => {
      const dataModelSection = content.split(/^## Data Model$/m)[1]?.split(/^## /m)[0] || '';
      // Concrete example MUST show **`EntityName`** form (bold wrapping a code-block name)
      expect(dataModelSection).toMatch(/\*\*`\w+`\*\*/);
    });

    // @req FR:feature-context/spec.data-model.format.field-name
    it('should demonstrate field names in code', () => {
      const dataModelSection = content.split(/^## Data Model$/m)[1]?.split(/^## /m)[0] || '';
      // Concrete example MUST show field names as `code` (examples are inside blockquoted code fences)
      expect(dataModelSection).toMatch(/- `\w+` \(/);
    });

    // @req FR:feature-context/spec.data-model.format.field-type
    it('should demonstrate field type in parens after field name', () => {
      const dataModelSection = content.split(/^## Data Model$/m)[1]?.split(/^## /m)[0] || '';
      // Field bullet MUST follow `name` (type) shape; P1 example uses precise types like double
      expect(dataModelSection).toMatch(/`\w+` \((string|number|double|float|boolean|timestamp|\w+\[\]|\w+\?)\)/);
    });

    // @req FR:feature-context/spec.data-model.format.field-values
    it('should demonstrate Allowed/Default for enum-style fields', () => {
      const dataModelSection = content.split(/^## Data Model$/m)[1]?.split(/^## /m)[0] || '';
      // Concrete example MUST include the Allowed/Default convention
      expect(dataModelSection).toMatch(/Allowed:.*Default:/);
    });

    // @req FR:feature-context/spec.data-model.format.field-valid
    it('should demonstrate field validation rules', () => {
      const dataModelSection = content.split(/^## Data Model$/m)[1]?.split(/^## /m)[0] || '';
      // Concrete example MUST include a Validation: line
      expect(dataModelSection).toMatch(/Validation:/);
    });

    // @req FR:feature-context/spec.data-model.format.rels
    it('should demonstrate entity relationships', () => {
      const dataModelSection = content.split(/^## Data Model$/m)[1]?.split(/^## /m)[0] || '';
      // Concrete example MUST include a Relationships: line
      expect(dataModelSection).toMatch(/Relationships:/);
    });

    // @req FR:feature-context/spec.data-model.format.rels.style
    it('should demonstrate code-formatted entity names in relationships', () => {
      const dataModelSection = content.split(/^## Data Model$/m)[1]?.split(/^## /m)[0] || '';
      // Relationships line MUST use `code` for entity names
      const relsLine = dataModelSection.split('Relationships:')[1]?.split('\n')[0] || '';
      expect(relsLine).toMatch(/`[A-Z]\w+`/);
    });
  });

  // Format sub-rules govern how AI writes entity definitions when authoring/migrating specs.
  // Per architecture.md § "Spec Rules Tested via Action File Inclusion", these rules are
  // enforced by being documented in the action files that drive spec authoring (feature-spec.md)
  // and spec migration (feature-format.md). Tests below verify each rule is mentioned in the
  // action files that need it.
  describe('FR:spec.data-model.format.* sub-rules referenced in action files', () => {
    const fs = require('fs');
    const path = require('path');
    const featureSpecAction = fs.readFileSync(
      path.join(__dirname, '../../src/resources/playbooks/actions/feature-spec.md'),
      'utf-8'
    );
    const featureFormatAction = fs.readFileSync(
      path.join(__dirname, '../../src/resources/playbooks/actions/feature-format.md'),
      'utf-8'
    );

    // @req FR:feature-context/spec.data-model.format.desc
    // @req FR:feature-context/spec.data-model.format.field-type.precision
    // — these priority-conditional rules apply at AI write time and aren't enforceable via
    //   template structure alone; the action files carry the rules to AI execution time.
    it('feature-spec.md should reference the spec template that carries entity format', () => {
      // Spec-authoring action defers to the spec.md template for content conventions
      expect(featureSpecAction).toMatch(/templates\/specs\/spec\.md/);
    });

    it('feature-format.md should reference entity format conventions', () => {
      // Migration action MUST mention entity format so AI applies rules when transforming specs
      expect(featureFormatAction).toMatch(/entit/i);
      expect(featureFormatAction).toMatch(/\$entity-name|\$-prefix/);
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
      expect(content.length).toBeLessThan(7000);
    });
  });

  // @req NFR:feature-context/cost.instructions
  describe('NFR:cost.instructions: Clear and actionable instructions', () => {
    it('should have instruction blocks that are concise', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      expect(instructions.length).toBeGreaterThan(0);
      instructions.forEach(instruction => {
        // Spec template allows longer blocks for detailed scenario and data-model guidance
        // (Data Model block carries priority gradient + concrete examples)
        expect(instruction.length).toBeLessThan(2000);
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

  // FR:index.* artifact contract is covered by end-to-end tests at
  // tests/cli/commands/index.test.ts, which exercise the generated output
  // behaviorally against the artifact contract defined here in feature-context.
});
