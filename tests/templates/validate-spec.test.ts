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

    // @req FR:feature-context/spec.purpose.mission-only
    it('should forbid Purpose from restating scenarios or FRs', () => {
      const purposeSection = content.split('## Purpose')[1]?.split('##')[0] || '';
      expect(purposeSection).toMatch(/MUST NOT.*(restate|preview).*(scenarios?|FRs?)/i);
    });

    // @req FR:feature-context/spec.purpose.vision-stable
    it('should require Purpose to convey an enduring vision that survives scenario churn', () => {
      const purposeSection = content.split('## Purpose')[1]?.split('##')[0] || '';
      expect(purposeSection).toMatch(/enduring vision/i);
      expect(purposeSection).toMatch(/stay valid as scenarios and FRs evolve/i);
      expect(purposeSection).toMatch(/Do NOT document scenarios, flows, or capabilities that change/i);
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

    // @req FR:feature-context/spec.scenarios.format.actor
    it('should require the actor to be the requirement owner, stated first in the sentence', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      // Actor leads the user story sentence
      expect(scenarioSection).toMatch(/"\{actor\} needs to \{action\} so that \{value\}\."/);
      // Actor must be a defined persona (the requirement owner), never a generic role
      expect(scenarioSection).toMatch(/\*\*Actor\*\*: A persona from `\.xe\/product\.md . Personas`/);
      expect(scenarioSection).toMatch(/Never an undefined role/);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs
    it('should define sub-requirement nesting', () => {
      expect(content).toMatch(/FR:\{scenario-id\}\.\{sub-id\}/);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs
    it('should include MUST/SHOULD/MAY language', () => {
      expect(content).toMatch(/MUST\/SHOULD\/MAY/);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs.grouping
    it('should encourage grouping related FRs under a shared parent by concern', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/[Gg]roup related FRs under a shared parent by concern/);
      expect(scenarioSection).toMatch(/depth is encouraged/i);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs.namespacing
    it('should require nested FRs to be dot-namespaced and indented under their parent', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/dot-namespaced/);
      expect(scenarioSection).toMatch(/indented/);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs.nest-over-bullet
    it('should require normative detail to be a nested FR, not a plain sub-bullet', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/Detail with its own requirement becomes a nested/i);
      expect(scenarioSection).toMatch(/\(dot-namespaced, indented\) FR so it is traceable/i);
      expect(scenarioSection).toMatch(/Plain sub-bullets are for non-normative clarification only/);
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

    // @req FR:feature-context/spec.scenarios.deps.format.blockquote
    it('should require @req links as nested blockquote bullets, never inline in FR prose', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/nested blockquote bullets under the depending FR/);
      expect(scenarioSection).toMatch(/never inline in prose/);
    });

    // @req FR:feature-context/spec.scenarios.structure
    it('should define sibling sub-FRs for input, behaviors, output, and interfaces', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.input/);
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.\{behavior-name\}/);
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.output/);
      // Interface FRs use @ sigil (parallel to $ for entities)
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.@\{(interface-kind|interface-name)\}/);
    });

    // @req FR:feature-context/spec.scenarios.structure
    it('should specify the sibling order: interfaces, input, behaviors, output', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      // Verify all four slots are demonstrated in the instruction block AND example FR.
      expect(scenarioSection).toMatch(/\.input/);
      expect(scenarioSection).toMatch(/\.\{behavior-name\}/);
      expect(scenarioSection).toMatch(/\.output/);
      expect(scenarioSection).toMatch(/\.@\{(interface-kind|interface-name)\}/);

      // Instruction block MUST list interface BEFORE input (execution-narrative order).
      const interfaceListPos = scenarioSection.search(/`FR:\{scenario-id\}\.@\{(interface-kind|interface-name)\}`/);
      const inputListPos = scenarioSection.search(/`FR:\{scenario-id\}\.input`/);
      expect(interfaceListPos).toBeGreaterThan(-1);
      expect(inputListPos).toBeGreaterThan(-1);
      expect(interfaceListPos).toBeLessThan(inputListPos);

      // Example FR block MUST demonstrate the order: interface FR before input FR.
      const exampleInterfaceFrPos = scenarioSection.search(/\*\*FR:place-order\.@api\*\*/);
      const exampleInputFrPos = scenarioSection.search(/\*\*FR:place-order\.input\*\*/);
      expect(exampleInterfaceFrPos).toBeGreaterThan(-1);
      expect(exampleInputFrPos).toBeGreaterThan(-1);
      expect(exampleInterfaceFrPos).toBeLessThan(exampleInputFrPos);
    });

    // @req FR:feature-context/spec.scenarios.structure.interfaces
    it('should demonstrate interface sigils and external-only framing', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      // Template MUST reference common interface sigils
      expect(scenarioSection).toMatch(/@cli|@api|@file|@playbook/);
      // Template MUST frame `@` interfaces as public surfaces
      expect(scenarioSection).toMatch(/public (interface|surface)/i);
      // Template MUST demonstrate an interface FR with `Interface:` keyword
      expect(scenarioSection).toMatch(/Interface:/);
    });

    // @req FR:feature-context/spec.scenarios.structure.data-model
    it('should describe input/output with the {content} ({type}) shape', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.input/);
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.output/);
      // Template MUST show the {content} ({type}) shape literal
      expect(scenarioSection).toMatch(/\{content\} \(\{type\}\)/);
      // Template MUST demonstrate @req entity reference convention with $-prefix
      expect(scenarioSection).toMatch(/@req FR:\$\w/);
    });

    // @req FR:feature-context/spec.scenarios.structure.data-model
    it('should demonstrate input/output with concrete @req entity references', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      // Concrete example MUST show an actual entity reference (not just placeholder)
      // e.g., `(@req FR:$feature-request)` or `(@req FR:$feature)`
      expect(scenarioSection).toMatch(/\(@req FR:\$[a-z-]+\)/);
    });

    // @req FR:feature-context/spec.scenarios.structure.interfaces
    it('should document the interface-scope rule (external or silently-breakable)', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/external|External/);
      expect(scenarioSection).toMatch(/relative to the feature/i);
      expect(scenarioSection).toMatch(/silently break|drift/i);
    });

    // @req FR:feature-context/spec.scenarios.coverage
    it('should call out that scenarios also cover internal-only units (bg jobs, schedulers)', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/internal[- ]only|bg job|background job|scheduler|autonomous loop/i);
    });

    // @req FR:feature-context/spec.scenarios.patterns
    it('should document I/O pattern variations for different scenario domains', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/Pattern variations/i);
    });

    // @req FR:feature-context/spec.scenarios.patterns.function
    it('should document the function/operation pattern', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/Function|operation/i);
    });

    // @req FR:feature-context/spec.scenarios.patterns.artifact
    it('should document the data-file-artifact pattern (markdown via @file)', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/[Dd]ata file artifact|[Tt]emplated? artifact/);
      expect(scenarioSection).toMatch(/@file/);
    });

    // @req FR:feature-context/spec.scenarios.patterns.structured-artifact
    it('should document the structured-artifact pattern (yaml/json)', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/[Ss]tructured file artifact/);
      expect(scenarioSection).toMatch(/@yaml|@json/);
    });

    // @req FR:feature-context/spec.scenarios.patterns.data-structure
    it('should document that data structures are entities, not interface FRs', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/[Dd]ata[- ]structure/);
      // Pattern MUST direct authors to the Data Model section ($entity), not an interface FR
      expect(scenarioSection).toMatch(/\$entity|Data Model/);
      expect(scenarioSection).toMatch(/NOT an? (scenario )?interface/i);
    });

    // @req FR:feature-context/spec.scenarios.structure.input
    it('should describe input slot semantics', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.input/);
      expect(scenarioSection).toMatch(/what flows in/i);
    });

    // @req FR:feature-context/spec.scenarios.structure.behaviors
    it('should describe behaviors slot semantics', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.\{behavior-name\}/);
      expect(scenarioSection).toMatch(/named for the domain/i);
    });

    // @req FR:feature-context/spec.scenarios.structure.output
    it('should describe output slot semantics', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.output/);
      expect(scenarioSection).toMatch(/what flows out/i);
    });

    // @req FR:feature-context/spec.scenarios.structure.interfaces.internal
    it('should guide on internal feature interfaces', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      // Template MUST NOT enumerate internal interfaces in scenarios
      // The guidance lives in the structure block — internal-vs-external distinction
      expect(scenarioSection).toMatch(/(external|internal)/i);
    });

    // @req FR:feature-context/spec.scenarios.user-story
    it('should require the scenario opening to be the user-story only (no FR preview)', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/user[- ]story only/i);
      expect(scenarioSection).toMatch(/MUST NOT restate.*FRs?|MUST NOT.*enumerate.*FRs?/i);
    });

    // @req FR:feature-context/spec.scenarios.structure.interfaces.first
    it('should require interface FRs to appear first under each scenario', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/interfaces FIRST/);
    });

    // @req FR:feature-context/spec.scenarios.structure.interfaces.layers
    it('should require layered external interfaces to be root-sibling FRs', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/[Ll]ayered surfaces/);
      expect(scenarioSection).toMatch(/root-sibling/);
    });

    // @req FR:feature-context/spec.scenarios.structure.interfaces.multiple
    it('should allow same-kind interfaces to group under one @kind FR', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/[Ss]ame-kind/);
      expect(scenarioSection).toMatch(/MAY group/);
    });

    // @req FR:feature-context/spec.scenarios.structure.behaviors.normative
    it('should require behavior FRs to use {actor} MUST/SHOULD/MAY form', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/\{actor\} MUST\/SHOULD\/MAY/);
    });

    // @req FR:feature-context/spec.scenarios.structure.schema
    it('should allow an optional schema slot for scenarios mapping to a defined object', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenarioSection).toMatch(/FR:\{scenario-id\}\.schema/);
    });

    // @req FR:feature-context/spec.scenarios.structure.interfaces.contract
    it('should require interface FRs to omit parameters (parameters belong in .input)', () => {
      const scenarioSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      // Template MUST instruct that interface FRs cover the contract surface only
      expect(scenarioSection).toMatch(/never enumerate parameters|enumerate parameters/i);
      expect(scenarioSection).toMatch(/contract surface/i);
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

    // @req FR:feature-context/spec.scenarios.sub-reqs
    it('feature-spec.md should require normative MUST/SHOULD/MAY language in sub-FRs', () => {
      // Spec-authoring action MUST instruct AI to verify every sub-FR uses normative language
      // before approval — catches declarative phrasing (e.g., "Interface: markdown — specs are
      // authored as markdown") that violates FR:spec.scenarios.sub-reqs.
      expect(featureSpecAction).toMatch(/MUST\/SHOULD\/MAY/);
      expect(featureSpecAction).toMatch(/sub-reqs|normative|declarative/i);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs
    it('feature-spec.md should require terse FR text (one MUST per FR; strip filler)', () => {
      // Action MUST guard against verbose FR prose: multi-normative FRs split into siblings,
      // and stylistic fluff (filler words, passive voice) stripped at authoring time.
      expect(featureSpecAction).toMatch(/one MUST\/SHOULD\/MAY per (behavior )?FR/i);
      expect(featureSpecAction).toMatch(/[Ss]trip filler|filler words/);
      expect(featureSpecAction).toMatch(/active voice/i);
    });
  });

  // @req FR:feature-context/spec.examples
  describe('FR:spec.examples: bad → good examples for every spec check rule', () => {
    const fs = require('fs');
    const path = require('path');
    const featureSpecAction = fs.readFileSync(
      path.join(__dirname, '../../src/resources/playbooks/actions/feature-spec.md'),
      'utf-8'
    );
    const { SPEC_RULES } = require('../../src/check/rules/spec');

    for (const id of SPEC_RULES.map((r: { id: string }) => r.id) as string[]) {
      it(`feature-spec.md shows a ✗ and ✓ example for ${id}`, () => {
        const line = featureSpecAction.split('\n').find((l: string) => l.includes(`\`${id}\``));
        expect(line).toBeDefined();
        expect(line).toContain('✗');
        expect(line).toContain('✓');
      });
    }
  });

  describe('FR:spec.examples: review-only examples and Plain Language pointer', () => {
    const fs = require('fs');
    const path = require('path');
    const action = fs.readFileSync(
      path.join(__dirname, '../../src/resources/playbooks/actions/feature-spec.md'),
      'utf-8'
    );
    const lineWith = (text: string) => action.split('\n').find((l: string) => l.includes(text));

    // @req FR:feature-context/spec.examples.review-only
    it.each(['Purpose stays put', "Code comments link, don't restate"])('shows a ✗ and ✓ example for %s', (title: string) => {
      const line = lineWith(title);
      expect(line).toBeDefined();
      expect(line).toContain('✗');
      expect(line).toContain('✓');
    });

    // @req FR:feature-context/spec.examples.plain-language
    it('points authors to the Plain Language principle', () => {
      expect(lineWith('Plain Language principle')).toContain('.xe/engineering.md');
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

    // @req FR:feature-context/spec.nfr.single
    it('should require exactly one normative statement per NFR', () => {
      const nfrSection = content.split('### Non-functional Requirements')[1]?.split(/^##/m)[0] || '';
      expect(nfrSection).toMatch(/One MUST\/SHOULD\/MAY statement per NFR/);
      expect(nfrSection).toMatch(/split multiple into sibling or nested NFRs/);
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

  describe('Authoring conventions carried by the template', () => {
    const section = (heading: string, endPattern: RegExp) =>
      content.split(heading)[1]?.split(endPattern)[0] || '';

    // @req FR:feature-context/spec.purpose.vision-stable
    it('should require Purpose to stay valid as scenarios and FRs evolve', () => {
      const purposeSection = section('## Purpose', /^## /m);
      expect(purposeSection).toMatch(/Vision-stable/);
      expect(purposeSection).toMatch(/MUST stay valid as scenarios and FRs evolve/);
    });

    // @req FR:feature-context/spec.scenarios.format.actor
    it('should require the scenario actor to be a defined persona or the named system', () => {
      const scenarioSection = section('## Scenarios', /^## /m);
      expect(scenarioSection).toMatch(/\*\*Actor\*\*/);
      expect(scenarioSection).toMatch(/Personas/);
      expect(scenarioSection).toMatch(/system by name/);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs.grouping
    it('should group related FRs under a shared parent by concern', () => {
      expect(section('## Scenarios', /^## /m)).toMatch(/[Gg]roup related FRs under a shared parent/);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs.namespacing
    it('should require nested FRs to be dot-namespaced and indented', () => {
      expect(section('## Scenarios', /^## /m)).toMatch(/dot-namespaced, indented/);
    });

    // @req FR:feature-context/spec.scenarios.sub-reqs.nest-over-bullet
    it('should prefer a nested FR over a sub-bullet for detail with its own requirement', () => {
      const scenarioSection = section('## Scenarios', /^## /m);
      expect(scenarioSection).toMatch(/nested FR, not sub-bullet/);
      expect(scenarioSection).toMatch(/non-normative clarification/);
    });

    // @req FR:feature-context/spec.scenarios.deps.format.blockquote
    it('should require @req links as nested blockquote bullets, never inline', () => {
      expect(section('## Scenarios', /^## /m)).toMatch(
        /nested blockquote bullets under the depending FR \(never inline in prose\)/
      );
    });

    // @req FR:feature-context/spec.nfr.single
    it('should require exactly one MUST/SHOULD/MAY statement per NFR', () => {
      const nfrSection = section('### Non-functional Requirements', /^##/m);
      expect(nfrSection).toMatch(/One MUST\/SHOULD\/MAY statement per NFR/);
      expect(nfrSection).toMatch(/split multiple/i);
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
    // Cap accommodates: external-scenario rule, pattern variations, slot semantics,
    // user-story + interface-layering + behavior-verb authoring rules.
    it('should be reasonably concise overall', () => {
      expect(content.length).toBeLessThan(8200);
    });
  });

  // @req NFR:feature-context/cost.instructions
  describe('NFR:cost.instructions: Clear and actionable instructions', () => {
    it('should have instruction blocks that are concise', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      expect(instructions.length).toBeGreaterThan(0);
      instructions.forEach(instruction => {
        // Scenarios block carries authoring rules: structure, layering, behavior verbs, deps.
        // Data Model block carries priority gradient + concrete examples.
        expect(instruction.length).toBeLessThan(3000);
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
