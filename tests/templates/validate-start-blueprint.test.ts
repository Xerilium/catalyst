import fs from 'fs';
import path from 'path';

describe('start-blueprint.md playbook validation', () => {
  const playbookPath = path.join(__dirname, '../../src/resources/playbooks/start-blueprint.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(playbookPath, 'utf-8');
  });

  // @req FR:blueprint-workflow/workflow.playbook
  it('should exist at the required path', () => {
    expect(fs.existsSync(playbookPath)).toBe(true);
  });

  // @req FR:blueprint-workflow/workflow.playbook
  // @req FR:blueprint-workflow/workflow.ai-command
  describe('Frontmatter', () => {
    it('should declare owner as Product Manager', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/owner:\s*"?Product Manager"?/);
    });

    it('should declare Architect as required reviewer', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/required:\s*\[\s*"Architect"\s*\]/);
    });
  });

  // @req FR:blueprint-workflow/workflow (overall structure)
  // @req FR:blueprint-workflow/workflow.input
  // @req FR:blueprint-workflow/workflow.output
  // @req NFR:blueprint-workflow/reliability.sequential-execution
  // @req NFR:blueprint-workflow/reliability.informed-judgment
  describe('Playbook structure', () => {
    it('should have a Goal line', () => {
      expect(content).toMatch(/\*\*Goal\*\*:/);
    });

    it('should declare the 4 phases (no Spec phase) as H2 sections in order', () => {
      const phaseHeadings = content.match(/^## Phase \d+: \w+/gm) || [];
      expect(phaseHeadings).toEqual([
        '## Phase 0: Scope',
        '## Phase 1: Plan',
        '## Phase 2: Implement',
        '## Phase 3: Review',
      ]);
    });

    it('should include Inputs, Error handling, Success criteria sections', () => {
      expect(content).toMatch(/^## Inputs/m);
      expect(content).toMatch(/^## Error handling/m);
      expect(content).toMatch(/^## Success criteria/m);
    });
  });

  // @req FR:blueprint-workflow/workflow.scope
  // @req FR:blueprint-workflow/workflow.scope.execution-mode
  // @req FR:blueprint-workflow/workflow.scope.rollout
  // @req FR:workflow-context/scope.action
  describe('FR:workflow.scope: Scope phase', () => {
    it('should include a Scope phase invoking workflow-scope.md', () => {
      expect(content).toMatch(/## Phase 0: Scope/);
      expect(content).toMatch(/workflow-scope\.md/);
    });
  });

  // @req FR:blueprint-workflow/workflow.plan
  describe('FR:workflow.plan: Plan phase', () => {
    it('should include a Plan phase with inline blueprint drafting work', () => {
      expect(content).toMatch(/## Phase \d+: Plan/);
      const phaseSection = content.split(/## Phase \d+: Plan/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/plan mode/i);
      expect(phaseSection).toMatch(/feature decomposition|dependency graph|roadmap/i);
    });

    it('should NOT reference feature-plan.md (feature-workflow specific)', () => {
      expect(content).not.toMatch(/feature-plan\.md/);
    });
  });

  // @req FR:blueprint-workflow/workflow.implement
  describe('FR:workflow.implement: Implement phase', () => {
    it('should include an Implement phase that authors the blueprint', () => {
      expect(content).toMatch(/## Phase \d+: Implement/);
    });

    it('should reference blueprint.md output location', () => {
      const phaseSection = content.split(/## Phase \d+: Implement/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/\.xe\/features\/blueprint\.md/);
    });

    it('should reference design-decisions.md for product-architecture decisions', () => {
      const phaseSection = content.split(/## Phase \d+: Implement/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/design-decisions\.md/);
    });
  });

  // @req FR:blueprint-workflow/workflow.review
  // @req FR:workflow-context/audit
  // @req FR:workflow-context/review
  // @req FR:workflow-context/closure
  // @req FR:workflow-context/celebrate
  describe('FR:workflow.review: Review phase', () => {
    it('should include a Review phase composing the workflow-context closure actions', () => {
      expect(content).toMatch(/## Phase \d+: Review/);
      expect(content).toMatch(/workflow-audit\.md/);
      expect(content).toMatch(/workflow-review\.md/);
      expect(content).toMatch(/workflow-closure\.md/);
      expect(content).toMatch(/workflow-celebrate\.md/);
    });

    it('should pass pr-type Blueprint to workflow-closure', () => {
      expect(content).toMatch(/pr-type[:\s]+Blueprint/i);
    });
  });

  // @req FR:blueprint-workflow/workflow.continuity
  // @req FR:workflow-context/state.invocation
  describe('FR:workflow.continuity: Active State updates at every STOP gate', () => {
    it('should reference workflow-state.md at every STOP gate', () => {
      const stopGates = content.match(/\*\*STOP HERE\*\*/g) || [];
      const stateRefs = content.match(/workflow-state\.md/g) || [];
      expect(stopGates.length).toBeGreaterThan(0);
      expect(stateRefs.length).toBeGreaterThanOrEqual(stopGates.length);
    });

    it('should include DO NOT SKIP directive on state updates', () => {
      expect(content).toMatch(/workflow-state\.md.*DO NOT SKIP/);
    });
  });

  // @req FR:blueprint-workflow/workflow.auq-usage
  describe('FR:workflow.auq-usage: AUQ via action file invocation', () => {
    it('should NOT include inline AskUserQuestion directives', () => {
      expect(content).not.toMatch(/AskUserQuestion/);
    });
  });

  // Regression: legacy state-machine cruft must not return
  describe('Regression: legacy artifacts removed', () => {
    it('should NOT reference research.md / tasks.md as part of blueprint authoring (legacy multi-file format)', () => {
      // Old format detection MAY mention these as identifiers; authoring directives MUST NOT use them.
      // Use 'authors|writes|creates|appends' proximity to catch authoring usage vs detection mention.
      const authoringSuspects = content.match(/(authors?|writes?|creates?|appends?)[^\n.]*?(research|tasks)\.md/gi) || [];
      expect(authoringSuspects).toEqual([]);
    });

    it('should NOT reference the xe/blueprint-phase-{N} branch pattern', () => {
      expect(content).not.toMatch(/blueprint-phase-/);
    });

    it('should NOT include the legacy checkpoint table emojis', () => {
      expect(content).not.toMatch(/🔵.*\*\*A\*\*/);
      expect(content).not.toMatch(/🟢.*\*\*B\*\*/);
      expect(content).not.toMatch(/🟣.*\*\*Z\*\*/);
    });

    it('should NOT author into the legacy .xe/features/blueprint/ directory (single-file model now)', () => {
      // Old-format detection MAY reference the path as a marker; authoring directives MUST NOT target it.
      const authoringSuspects = content.match(/(authors?|writes?|creates?|appends?)[^\n.]*?\.xe\/features\/blueprint\/(spec|plan|tasks|research)\.md/gi) || [];
      expect(authoringSuspects).toEqual([]);
    });

    it('should NOT reference any feature-* actions (use workflow-* instead)', () => {
      expect(content).not.toMatch(/actions\/feature-[a-z]+\.md/);
    });
  });

  // @req FR:blueprint-workflow/workflow.scope.rollout
  describe('Rollout reference', () => {
    it('should reference the rollout-blueprint.md output path', () => {
      expect(content).toMatch(/rollout-blueprint\.md/);
    });

    it('should NOT pass the rollout template path explicitly (workflow-scope selects based on artifacts)', () => {
      expect(content).not.toMatch(/rollout template:/i);
      expect(content).not.toMatch(/templates\/specs\/rollout-blueprint\.md/);
    });
  });

  // @req FR:blueprint-workflow/workflow.plan.populate-runs
  describe('Run 1+ population during Phase 1', () => {
    it('should require populating Run 1+ entries from the approved Roadmap during Phase 1', () => {
      const phaseSection = content.split(/## Phase 1: Plan/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/Run 1\+/);
      expect(phaseSection).toMatch(/\/catalyst:create/);
      expect(phaseSection).toMatch(/\/catalyst:change/);
      expect(phaseSection).toMatch(/Wave/);
    });

    it('should require Run 1+ population before exiting Phase 1', () => {
      const phaseSection = content.split(/## Phase 1: Plan/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/STOP HERE.*Run 1\+/is);
    });

    it('should include Run 1+ population in success criteria', () => {
      const successSection = content.split(/## Success criteria/)[1] || '';
      expect(successSection).toMatch(/Run 1\+ entries populated/i);
    });

    it('should collapse fully-completed prior runs to a brief summary as part of Phase 1', () => {
      const phaseSection = content.split(/## Phase 1: Plan/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/Collapse fully-completed prior runs/i);
      expect(phaseSection).toMatch(/brief summary|one-line summary/i);
      expect(phaseSection).toMatch(/capabilities (were )?delivered/i);
    });
  });

  // @req FR:blueprint-workflow/workflow.plan.consistency
  describe('Consistency across artifacts', () => {
    it('should require blueprint-level changes to be applied across every affected artifact in one pass', () => {
      const phaseSection = content.split(/## Phase 1: Plan/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/one pass|single pass/i);
      expect(phaseSection).toMatch(/Partial updates are not acceptable/i);
    });

    it('should reference the affected artifacts (diagram, gantt, dependency, rollout, design-decisions)', () => {
      const phaseSection = content.split(/## Phase 1: Plan/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/diagram/i);
      expect(phaseSection).toMatch(/gantt/i);
      expect(phaseSection).toMatch(/dependency/i);
      expect(phaseSection).toMatch(/Wave checklists?/i);
      expect(phaseSection).toMatch(/design-decisions/i);
    });
  });

  // @req FR:blueprint-workflow/workflow.plan.decision-routing
  describe('Decision routing', () => {
    it('should route every Decision: note (promote / keep / delete)', () => {
      const phaseSection = content.split(/## Phase 1: Plan/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/Decision:/);
      expect(phaseSection).toMatch(/promote/i);
      expect(phaseSection).toMatch(/duplicate/i);
    });

    it('should re-validate wave/phase/feature references in existing design-decisions', () => {
      const phaseSection = content.split(/## Phase 1: Plan/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/Re-validate.*references|wave\/phase\/feature references/i);
    });
  });

  describe('Gantt → parallel-grouping translation guidance', () => {
    it('should require translating gantt `after` gates to `🔀 Execute in parallel:` groups', () => {
      const phaseSection = content.split(/## Phase 1: Plan/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/gantt `after`/i);
      expect(phaseSection).toMatch(/🔀 Execute in parallel:/);
      expect(phaseSection).toMatch(/parallel/i);
    });

    it('should warn against flattening the gantt parallelism', () => {
      const phaseSection = content.split(/## Phase 1: Plan/)[1]?.split(/^## /m)[0] || '';
      expect(phaseSection).toMatch(/do not flatten/i);
    });
  });

  // @req FR:blueprint-workflow/workflow.format
  describe('Legacy blueprint auto-migration', () => {
    it('should detect legacy .xe/features/blueprint/ structure in Phase 0', () => {
      const phase0 = content.split(/## Phase 0: Scope/)[1]?.split(/^## /m)[0] || '';
      expect(phase0).toMatch(/\.xe\/features\/blueprint\//);
      expect(phase0).toMatch(/legacy/i);
    });

    it('should invoke blueprint-format.md to migrate (not STOP)', () => {
      const phase0 = content.split(/## Phase 0: Scope/)[1]?.split(/^## /m)[0] || '';
      expect(phase0).toMatch(/blueprint-format\.md/);
      expect(phase0).toMatch(/migrate/i);
    });

    it('should NOT include the old "Old-format blueprint detected" error-handling block', () => {
      const errorSection = content.split(/## Error handling/)[1]?.split(/^## /m)[0] || '';
      expect(errorSection).not.toMatch(/Old-format blueprint detected/i);
    });

    it('should NOT include the old "Old-format detection ran" success criterion (auto-migration replaces it)', () => {
      const successSection = content.split(/## Success criteria/)[1] || '';
      expect(successSection).not.toMatch(/Old-format detection/i);
    });
  });

  // @req FR:blueprint-workflow/workflow (no internal feature-ID leaks)
  describe('No feature-ID leaks', () => {
    it('should NOT reference internal feature IDs by name', () => {
      // Catalyst feature IDs are internal; deployed playbooks read by AI in other repos shouldn't see them
      expect(content).not.toMatch(/blueprint-context/);
      expect(content).not.toMatch(/product-context/);
      expect(content).not.toMatch(/feature-context/);
      expect(content).not.toMatch(/workflow-context/);
      expect(content).not.toMatch(/engineering-context/);
    });
  });
});
