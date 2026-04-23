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
    // @req FR:feature-workflow/scope.rollout-plan
    it('create-feature should define artifacts', async () => {
      const path = join(PLAYBOOKS_DIR, 'create-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/## Artifacts/);
      expect(content).toMatch(/spec\.md/);
      expect(content).toMatch(/rollout-.*\.md/);
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
    // @req FR:feature-workflow/scope.rollout-plan
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
    // @req FR:feature-workflow/plan.mandatory
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
    // @req FR:feature-workflow/review.closure-routing
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
        expect(content).toMatch(/Resuming from a rollout plan/);
        expect(content).toMatch(/rollout-.*\.md/);
      }
    });

    // @req FR:feature-workflow/discover.resume
    it('Implementation orchestrators must not contain skip-forward routing tables', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');

        // Old buggy pattern: "If some tasks are checked → resume at Phase 3"
        // New model: Phase 0 assesses state; no playbook-level skip-forward.
        expect(content).not.toMatch(/tasks? (?:are )?checked.*→.*Phase [1-3]/i);
        expect(content).not.toMatch(/task breakdown.*→.*Phase [1-3]/i);
        expect(content).not.toMatch(/feature sub-headings.*→.*Phase [1-2]/i);
        expect(content).not.toMatch(/overview only.*→.*Phase [1-2]/i);

        // Each playbook's resume block must defer routing to feature-scope.md
        expect(content).toMatch(/feature-scope\.md/);
      }
    });

    // @req FR:feature-workflow/discover.resume
    it('feature-scope action must own resume-state assessment and entry-phase selection', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      // Per-phase assessment on resume
      expect(content).toMatch(/resuming from an existing rollout[\s\S]*assess per-phase completeness/i);

      // Scope AUQ covers entry-phase, completed-run skip, and abandoned-closeout
      expect(content).toMatch(/resume entry phase[\s\S]*completed runs?[\s\S]*abandoned closeout/i);
    });

    // @req FR:feature-workflow/discover.resume
    it('feature-scope action must distinguish completed-phase confirmation from incomplete-phase execution and flag rollout-quality issues', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      const resumeBlock = content.slice(content.indexOf('If resuming from an existing rollout'), content.indexOf('### Step 1.5'));

      // Must distinguish behavior for completed vs incomplete phases (both terms present)
      expect(resumeBlock).toMatch(/completed/i);
      expect(resumeBlock).toMatch(/incomplete/i);

      // Must address rollout-quality concerns (gaps, contradictions, or similar)
      expect(resumeBlock).toMatch(/gap|contradiction|stale|quality|rubber-stamp/i);
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
    it('feature-scope should present all 4 execution modes', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      // All 4 execution modes must be listed
      expect(content).toMatch(/interactive/);
      expect(content).toMatch(/checkpoint-review/);
      expect(content).toMatch(/autonomous-local/);
      expect(content).toMatch(/autonomous-branch/);
    });
  });

  describe('Plan Mode Verification', () => {
    // @req FR:feature-workflow/plan.plan-mode
    it('feature-plan action should require traceability verification during planning', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-plan.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/[Tt]raceability/);
      expect(content).toMatch(/@req/);
    });

    // @req FR:feature-workflow/plan.mandatory
    it('feature-plan action should prohibit silently skipping plan mode', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-plan.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/[Dd]o NOT skip plan mode/);
    });

    // @req FR:feature-workflow/plan.design-decisions
    it('feature-plan action should reference design decisions', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-plan.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/design.decisions/i);
    });

    // @req FR:feature-workflow/implement.design-decisions
    it('feature-code action should reference design decisions for approach changes', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-code.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/design.decisions/i);
    });
  });

  describe('Traceability Sweep and TDD Gate', () => {
    // @req FR:feature-workflow/scope.traceability-sweep
    it('feature-scope should run a traceability sweep and surface same-scenario gaps', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      // Must invoke the traceability CLI to consult pre-computed data (not re-verify FRs)
      expect(content).toMatch(/catalyst traceability/);

      // Must filter to same-scenario warnings, not all warnings
      expect(content).toMatch(/same-scenario|same scenario/i);

      // Must default to deferring to keep scope tight
      expect(content).toMatch(/defer/i);
    });

    // @req FR:feature-workflow/scope.convention-check
    it('feature-scope should run a convention check before the traceability sweep', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      // Core rule: read ONE existing instance per new artifact type
      expect(content).toMatch(/Convention [Cc]heck[\s\S]*?(read|match).*ONE/i);

      // Must cite naming, placement, and ownership as the aspects to match
      expect(content).toMatch(/Convention [Cc]heck[\s\S]*?naming/i);
      expect(content).toMatch(/Convention [Cc]heck[\s\S]*?placement/i);
      expect(content).toMatch(/Convention [Cc]heck[\s\S]*?ownership/i);

      // Convention Check must come BEFORE Traceability Sweep (order matters)
      const conventionIdx = content.search(/Convention [Cc]heck/);
      const traceabilityIdx = content.search(/Traceability Sweep/);
      expect(conventionIdx).toBeGreaterThan(-1);
      expect(traceabilityIdx).toBeGreaterThan(-1);
      expect(conventionIdx).toBeLessThan(traceabilityIdx);
    });

    // @req FR:feature-workflow/implement.tdd-gate
    it('feature-test should enforce a TDD gate before Phase 3 exits', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-test.md');
      const content = await readFile(path, 'utf-8');

      // Must name the gate so future edits can't obscure its intent
      expect(content).toMatch(/TDD [Gg]ate/);

      // P1-P3 must be hard-required; P4-P5 waivers allowed but logged
      expect(content).toMatch(/P1-P3/);
      expect(content).toMatch(/P4-P5/);
      expect(content).toMatch(/waiver|waived/i);

      // Exit criteria must explicitly require gate-pass
      expect(content).toMatch(/TDD gate passed/i);
    });
  });

  describe('Active State (Context Continuity)', () => {
    const TEMPLATES_DIR = join(__dirname, '../../../src/resources/templates/specs');

    // @req FR:feature-context/rollout.active-state
    it('rollout template must place Active State at top with all 6 fields', async () => {
      const path = join(TEMPLATES_DIR, 'rollout.md');
      const content = await readFile(path, 'utf-8');

      // Active State must appear before Overview (top-of-file placement)
      const activeStateIdx = content.indexOf('## Active State');
      const overviewIdx = content.indexOf('## Overview');
      expect(activeStateIdx).toBeGreaterThan(-1);
      expect(overviewIdx).toBeGreaterThan(-1);
      expect(activeStateIdx).toBeLessThan(overviewIdx);

      // All 6 fields present within the Active State section
      const activeStateSection = content.slice(activeStateIdx, overviewIdx);
      expect(activeStateSection).toMatch(/\*\*Model\*\*/);
      expect(activeStateSection).toMatch(/\*\*Decisions\*\*/);
      expect(activeStateSection).toMatch(/\*\*Open\*\*/);
      expect(activeStateSection).toMatch(/\*\*Next\*\*/);
      expect(activeStateSection).toMatch(/\*\*Pins\*\*/);
      expect(activeStateSection).toMatch(/\*\*Assumptions\*\*/);
    });

    // @req FR:feature-context/rollout.active-state.overwrite
    it('rollout template must describe Active State as overwrite-semantics distinct from Notes append-only', async () => {
      const path = join(TEMPLATES_DIR, 'rollout.md');
      const content = await readFile(path, 'utf-8');

      // Active State instructions must describe overwrite/replace semantics
      expect(content).toMatch(/## Active State[\s\S]*?OVERWRITE/);

      // Notes section instructions must remain append-only
      expect(content).toMatch(/## Notes[\s\S]*append/i);
    });

    // @req FR:feature-workflow/continuity.ritual
    it('each orchestration playbook must reference feature-state at every STOP gate using @-prefixed path', async () => {
      const orchestrators = [
        'create-feature.md',
        'update-feature.md',
        'repair-feature.md',
        'explore-feature.md'
      ];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');

        // Count STOP gates and feature-state references — must be 1:1
        const stopGates = (content.match(/\*\*STOP HERE\*\*/g) || []).length;
        const activeStateRefs = (content.match(/feature-state\.md/g) || []).length;
        expect(stopGates).toBeGreaterThan(0);
        expect(activeStateRefs).toBeGreaterThanOrEqual(stopGates);

        // Must use @-prefixed path so the file auto-loads on read
        expect(content).toMatch(/@node_modules\/@xerilium\/catalyst\/playbooks\/actions\/feature-state\.md/);

        // Must signal non-skippability
        expect(content).toMatch(/DO NOT SKIP/);
      }
    });

    // @req FR:feature-workflow/continuity.ritual
    it('feature-state action must exist and define the 6 Active State fields', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-state.md');
      const content = await readFile(path, 'utf-8');

      // The action must enumerate all 6 fields so agents update them consistently
      expect(content).toMatch(/\*\*Model\*\*/);
      expect(content).toMatch(/\*\*Decisions\*\*/);
      expect(content).toMatch(/\*\*Open\*\*/);
      expect(content).toMatch(/\*\*Next\*\*/);
      expect(content).toMatch(/\*\*Pins\*\*/);
      expect(content).toMatch(/\*\*Assumptions\*\*/);

      // Must signal non-skippability
      expect(content).toMatch(/DO NOT SKIP/);

      // Must describe overwrite semantics
      expect(content).toMatch(/overwrite/i);
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
    it('feature-complete should present console summary then conversational review before AUQ', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-complete.md');
      const content = await readFile(path, 'utf-8');

      // Must require structured state context sections
      expect(content).toMatch(/\*\*Completed\*\*/);
      expect(content).toMatch(/\*\*Remaining\*\*/);
      expect(content).toMatch(/\*\*Findings\*\*/);

      // Console summary (1b) must come before AUQ (1d)
      const summaryPos = content.search(/Output formatted console summary/i);
      const auqPos = content.search(/When user confirms done.*AskUserQuestion/i);
      expect(summaryPos).toBeGreaterThan(-1);
      expect(auqPos).toBeGreaterThan(summaryPos);
    });

    // @req FR:feature-workflow/review.celebrate
    it('feature-complete should have a celebrate section with emoji', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-complete.md');
      const content = await readFile(path, 'utf-8');

      // Must have a Celebrate heading (structural check)
      expect(content).toMatch(/^###\s+\d+\.\s+Celebrate/m);
      // Must reference emoji
      expect(content).toMatch(/emoji/i);
    });

    // @req FR:feature-workflow/review.feature-index
    it('feature-complete should invoke catalyst index to regenerate the feature index', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-complete.md');
      const content = await readFile(path, 'utf-8');

      // Must reference the catalyst index command invocation
      expect(content).toMatch(/catalyst\s+index/i);
      // Must reference the target artifact path or purpose
      expect(content).toMatch(/feature\s*index|features\/README\.md/i);
    });

    // @req FR:feature-workflow/review.celebrate
    it('explore-feature should have a celebrate section with emoji', async () => {
      const path = join(PLAYBOOKS_DIR, 'explore-feature.md');
      const content = await readFile(path, 'utf-8');

      // Must have a Celebrate heading (structural check)
      expect(content).toMatch(/^#{3,4}\s+(Step\s+\d+:\s+)?Celebrate/m);
      // Must reference emoji
      expect(content).toMatch(/emoji/i);
    });
  });
});
