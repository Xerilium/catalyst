import { describe, it, expect } from '@jest/globals';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Tests for work-type routing and orchestration behavior
 */
describe('Playbook Orchestration', () => {
  const PLAYBOOKS_DIR = join(__dirname, '../../../src/resources/playbooks');

  describe('Work-Type Orchestrators', () => {
    const workTypes = [
      { file: 'create-feature.md', type: 'create', purpose: 'new features' },
      { file: 'update-feature.md', type: 'change', purpose: 'updates' },
      { file: 'repair-feature.md', type: 'fix', purpose: 'bug fixes' },
      { file: 'explore-feature.md', type: 'explore', purpose: 'research' }
    ];

    workTypes.forEach(({ file, purpose }) => {
      // @req FR:feature-workflow/discover.parse-input
      it(`${file} should define its purpose (${purpose})`, async () => {
        const path = join(PLAYBOOKS_DIR, file);
        const content = await readFile(path, 'utf-8');

        expect(content).toMatch(/\*\*Goal\*\*/);
      });

      // @req FR:feature-workflow/discover.parse-input
      // @req FR:feature-workflow/discover.read-specs
      // @req FR:feature-workflow/discover.resume
      // @req FR:feature-workflow/discover.clarify
      it(`${file} should have inputs section`, async () => {
        const path = join(PLAYBOOKS_DIR, file);
        const content = await readFile(path, 'utf-8');

        // Should have inputs section (feature-id, issue, context-files)
        expect(content).toMatch(/## Inputs/);
        expect(content).toMatch(/feature-id/);
      });

      // @req NFR:feature-workflow/reliability.sequential-execution
      it(`${file} should have sequential phase execution`, async () => {
        const path = join(PLAYBOOKS_DIR, file);
        const content = await readFile(path, 'utf-8');

        // Should have phases section
        expect(content).toMatch(/## Phases/);

        // Should have Phase 0
        expect(content).toMatch(/### Phase 0:/);

        // Should NOT proceed without gate completion
        expect(content).toMatch(/STOP HERE.*Do NOT proceed/i);
      });
    });
  });

  describe('Phase Sequencing', () => {
    // @req FR:feature-workflow/orchestrate.create-feature
    it('create-feature should execute all phases (0-4)', async () => {
      const path = join(PLAYBOOKS_DIR, 'create-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/### Phase 0: Scope/);
      expect(content).toMatch(/### Phase 1: Spec/);
      expect(content).toMatch(/### Phase 2: Plan/);
      expect(content).toMatch(/### Phase 3: Implementation/);
      expect(content).toMatch(/### Phase 4: Review/);
    });

    // @req FR:feature-workflow/orchestrate.update-feature
    it('update-feature should execute all phases (0-4)', async () => {
      const path = join(PLAYBOOKS_DIR, 'update-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/### Phase 0: Scope/);
      expect(content).toMatch(/### Phase 1: Spec/);
      expect(content).toMatch(/### Phase 2: Plan/);
      expect(content).toMatch(/### Phase 3: Implementation/);
      expect(content).toMatch(/### Phase 4: Review/);
    });

    // @req FR:feature-workflow/orchestrate.repair-feature
    it('repair-feature should execute all phases (0-4)', async () => {
      const path = join(PLAYBOOKS_DIR, 'repair-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/### Phase 0: Scope/);
      expect(content).toMatch(/### Phase 1: Spec Validation/);
      expect(content).toMatch(/### Phase 2: Plan/);
      expect(content).toMatch(/### Phase 3: Implementation/);
      expect(content).toMatch(/### Phase 4: Review/);
    });

    // @req FR:feature-workflow/orchestrate.explore-feature
    it('explore-feature should execute limited phases (0, 1, 2)', async () => {
      const path = join(PLAYBOOKS_DIR, 'explore-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/### Phase 0: Scope/);
      expect(content).toMatch(/### Phase 1: Investigation/);
      expect(content).toMatch(/### Phase 2: Review/);

      // Should NOT have implementation phases
      expect(content).not.toMatch(/### Phase 3: Implementation/);
    });
  });

  describe('Execution Mode Support', () => {
    const orchestratorsWithFeatureScope = [
      'create-feature.md',
      'update-feature.md',
      'repair-feature.md'
      // explore-feature has custom scoping
    ];

    orchestratorsWithFeatureScope.forEach((orchestrator) => {
      // @req FR:feature-workflow/execution-modes.interactive
      // @req FR:feature-workflow/execution-modes.checkpoint-review
      // @req FR:feature-workflow/execution-modes.autonomous-local
      // @req FR:feature-workflow/execution-modes.autonomous-branch
      it(`${orchestrator} should support all execution modes via feature-scope`, async () => {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');

        // Should reference feature-scope which defines execution modes
        expect(content).toMatch(/feature-scope\.md/);
      });
    });

    it('explore-feature should define execution modes inline', async () => {
      const path = join(PLAYBOOKS_DIR, 'explore-feature.md');
      const content = await readFile(path, 'utf-8');

      // explore-feature has custom scoping, doesn't use feature-scope
      // But still needs to handle different execution modes
      expect(content).toMatch(/AskUserQuestion/i);
    });
  });

  describe('Error Handling', () => {
    const orchestrators = [
      'create-feature.md',
      'update-feature.md',
      'repair-feature.md'
    ];

    orchestrators.forEach((orchestrator) => {
      it(`${orchestrator} should define error handling`, async () => {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');

        expect(content).toMatch(/## Error handling/i);
      });

      it(`${orchestrator} should define success criteria`, async () => {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');

        expect(content).toMatch(/## Success criteria/i);
      });
    });
  });

  describe('Artifacts and Outputs', () => {
    // @req FR:feature-workflow/scope.plan-doc
    it('create-feature should define artifacts', async () => {
      const path = join(PLAYBOOKS_DIR, 'create-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/## Artifacts/);
      expect(content).toMatch(/spec\.md/);
      expect(content).toMatch(/plan-.*\.md/);
    });

    it('update-feature should define artifacts', async () => {
      const path = join(PLAYBOOKS_DIR, 'update-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/## Artifacts/);
      expect(content).toMatch(/spec\.md/);
    });

    it('explore-feature should define research artifacts', async () => {
      const path = join(PLAYBOOKS_DIR, 'explore-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/## Artifacts/);
      expect(content).toMatch(/findings/i);
    });
  });

  describe('Workflow Phases', () => {
    // @req FR:feature-workflow/scope.evaluate
    // @req FR:feature-workflow/scope.dependencies
    // @req FR:feature-workflow/scope.plan-doc
    it('All orchestrators should support Phase 0: Scope', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md', 'explore-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/### Phase 0: Scope/);
      }
    });

    // @req FR:feature-workflow/spec.interactive
    // @req FR:feature-workflow/spec.autonomous
    // @req FR:feature-workflow/spec.approval
    it('create/update orchestrators should support Phase 1: Spec', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/### Phase 1: Spec/);
      }
    });

    // @req FR:feature-workflow/plan.plan-mode
    // @req FR:feature-workflow/plan.task-breakdown
    // @req FR:feature-workflow/plan.approval
    it('All implementation orchestrators should support Phase 2: Plan', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/### Phase 2: Plan/);
      }
    });

    // @req FR:feature-workflow/implement.tdd
    // @req FR:feature-workflow/implement.code
    // @req FR:feature-workflow/implement.validate
    // @req FR:feature-workflow/implement.track-progress
    // @req FR:feature-workflow/implement.drift-protection
    it('All implementation orchestrators should support Phase 3: Implementation', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/### Phase 3: Implementation/);
      }
    });

    // @req FR:feature-workflow/review.present
    // @req FR:feature-workflow/review.external-issues
    // @req FR:feature-workflow/review.cleanup
    // @req FR:feature-workflow/review.pr-creation
    it('All orchestrators should support final review phase', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md', 'explore-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        // Last phase varies by orchestrator (Phase 4 or Phase 2)
        expect(content).toMatch(/### Phase \d: Review/);
      }
    });

    // @req FR:feature-workflow/discover.resume
    it('Implementation orchestrators should support workflow resumption', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/Resuming from a plan/);
        expect(content).toMatch(/plan-.*\.md/);
      }
    });
  });

  describe('Non-Functional Requirements', () => {
    // @req AC:feature-workflow/playbook-composition
    it('Micro-playbook decomposition should minimize token usage', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const microPlaybooks = ['feature-scope.md', 'feature-spec.md', 'feature-plan.md'];

      // Verify micro-playbooks exist and are separate files
      for (const file of microPlaybooks) {
        const path = join(ACTIONS_DIR, file);
        expect(existsSync(path)).toBe(true);
      }
    });

    // @req NFR:feature-workflow/reliability.sequential-execution
    it('File boundaries and STOP guards should prevent phase skipping', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');

        // Should use Execute pattern for micro-playbooks
        expect(content).toMatch(/Execute \x60node_modules\/@xerilium\/catalyst\/playbooks\/actions/);

        // Should have STOP HERE gates with explicit exit criteria
        expect(content).toMatch(/STOP HERE/);
        expect(content).toMatch(/Do NOT proceed/);
      }
    });

    // @req AC:feature-workflow/playbook-composition
    it('Micro-playbooks should be reusable across work types', async () => {
      const sharedMicroPlaybook = 'feature-scope.md';
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md'];

      // Verify feature-scope is referenced by all implementation orchestrators
      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(new RegExp(sharedMicroPlaybook));
      }
    });
  });

  describe('Execution Mode Selection', () => {
    // @req FR:feature-workflow/scope.mode-selection
    it('feature-scope should present all 4 execution modes with interactive recommended', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      // All 4 execution modes must be listed
      expect(content).toMatch(/interactive/);
      expect(content).toMatch(/checkpoint-review/);
      expect(content).toMatch(/autonomous-local/);
      expect(content).toMatch(/autonomous-branch/);

      // Interactive should be marked as recommended
      expect(content).toMatch(/interactive.*Recommended/i);
    });
  });

  describe('AUQ Standard Compliance', () => {
    // @req FR:feature-workflow/orchestrate.auq-usage
    it('All actions that use AskUserQuestion should reference AUQ standard', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const actionsUsingAUQ = [
        'feature-scope.md',
        'feature-spec.md',
        'feature-plan.md',
        'feature-code.md',
        'feature-complete.md',
        'feature-format.md'
      ];

      for (const action of actionsUsingAUQ) {
        const path = join(ACTIONS_DIR, action);
        const content = await readFile(path, 'utf-8');

        // Each action using AUQ must reference the standard
        expect(content).toMatch(/MUST follow.*AskUserQuestion.*patterns.*auq\.md/);
      }
    });

    // @req NFR:feature-workflow/reliability.informed-judgment
    it('feature-scope should require recommendation guidance', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      // Should have recommendation guidance
      expect(content).toMatch(/recommend.*option/i);
    });
  });

  describe('Review State Context', () => {
    // @req FR:feature-workflow/review.present
    it('feature-complete should require complete state context in review summary', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-complete.md');
      const content = await readFile(path, 'utf-8');

      // Must require structured state context
      expect(content).toMatch(/What was completed/i);
      expect(content).toMatch(/What remains/i);
      expect(content).toMatch(/Blockers or notable findings/i);
    });
  });
});
