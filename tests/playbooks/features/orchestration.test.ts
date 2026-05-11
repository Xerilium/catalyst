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
      // @req FR:feature-workflow/workflow.discover.parse-input
      it(`${file} should define its purpose (${purpose})`, async () => {
        const path = join(PLAYBOOKS_DIR, file);
        const content = await readFile(path, 'utf-8');

        expect(content).toMatch(/\*\*Goal\*\*/);
      });

      // @req FR:feature-workflow/workflow.discover.parse-input
      // @req FR:feature-workflow/workflow.discover.read-specs
      // @req FR:feature-workflow/workflow.discover.resume
      // @req FR:feature-workflow/workflow.discover.clarify
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
    // @req FR:feature-workflow/workflow.@ai-command.create
      // @req FR:feature-workflow/workflow.@playbook.create
    it('create-feature should execute all phases (0-4)', async () => {
      const path = join(PLAYBOOKS_DIR, 'create-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/### Phase 0: Scope/);
      expect(content).toMatch(/### Phase 1: Spec/);
      expect(content).toMatch(/### Phase 2: Plan/);
      expect(content).toMatch(/### Phase 3: Implementation/);
      expect(content).toMatch(/### Phase 4: Review/);
    });

    // @req FR:feature-workflow/workflow.@ai-command.change
      // @req FR:feature-workflow/workflow.@playbook.change
    it('update-feature should execute all phases (0-4)', async () => {
      const path = join(PLAYBOOKS_DIR, 'update-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/### Phase 0: Scope/);
      expect(content).toMatch(/### Phase 1: Spec/);
      expect(content).toMatch(/### Phase 2: Plan/);
      expect(content).toMatch(/### Phase 3: Implementation/);
      expect(content).toMatch(/### Phase 4: Review/);
    });

    // @req FR:feature-workflow/workflow.@ai-command.fix
      // @req FR:feature-workflow/workflow.@playbook.fix
    it('repair-feature should execute all phases (0-4)', async () => {
      const path = join(PLAYBOOKS_DIR, 'repair-feature.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/### Phase 0: Scope/);
      expect(content).toMatch(/### Phase 1: Spec Validation/);
      expect(content).toMatch(/### Phase 2: Plan/);
      expect(content).toMatch(/### Phase 3: Implementation/);
      expect(content).toMatch(/### Phase 4: Review/);
    });

    // @req FR:feature-workflow/workflow.@ai-command.explore
      // @req FR:feature-workflow/workflow.@playbook.explore
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
      // @req FR:feature-workflow/workflow.scope.mode-selection
      it(`${orchestrator} should support all execution modes via feature-scope`, async () => {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');

        // Should reference feature-scope which composes workflow-scope (where execution modes are defined)
        expect(content).toMatch(/feature-scope\.md/);
      });
    });

    it('explore-feature should define execution modes inline', async () => {
      const path = join(PLAYBOOKS_DIR, 'explore-feature.md');
      const content = await readFile(path, 'utf-8');

      // explore-feature has custom scoping, doesn't use feature-scope
      // But still needs to handle different execution modes via the AUQ action
      expect(content).toMatch(/auq\.md/);
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
    // @req FR:feature-workflow/workflow.scope.rollout-plan
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
    // @req FR:feature-workflow/workflow.scope.evaluate
    // @req FR:feature-workflow/workflow.scope.dependencies
    // @req FR:feature-workflow/workflow.scope.rollout-plan
    it('All orchestrators should support Phase 0: Scope', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md', 'explore-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/### Phase 0: Scope/);
      }
    });

    // @req FR:feature-workflow/workflow.spec.interactive
    // @req FR:feature-workflow/workflow.spec.autonomous
    // @req FR:feature-workflow/workflow.spec.approval
    it('create/update orchestrators should support Phase 1: Spec', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/### Phase 1: Spec/);
      }
    });

    // @req FR:feature-workflow/workflow.plan.plan-mode
    // @req FR:feature-workflow/workflow.plan.mandatory
    // @req FR:feature-workflow/workflow.plan.task-breakdown
    // @req FR:feature-workflow/workflow.plan.approval
    it('All implementation orchestrators should support Phase 2: Plan', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/### Phase 2: Plan/);
      }
    });

    // @req FR:feature-workflow/workflow.implement.tdd
    // @req FR:feature-workflow/workflow.implement.code
    // @req FR:feature-workflow/workflow.implement.validate
    // @req FR:feature-workflow/workflow.implement.track-progress
    // @req FR:feature-workflow/workflow.implement.drift-protection
    it('All implementation orchestrators should support Phase 3: Implementation', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/### Phase 3: Implementation/);
      }
    });

    // @req FR:feature-workflow/workflow.review
    // @req FR:workflow-context/audit
    // @req FR:workflow-context/review
    // @req FR:workflow-context/closure
    // @req FR:workflow-context/celebrate
    it('All orchestrators should support final review phase', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md', 'explore-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        // Last phase varies by orchestrator (Phase 4 or Phase 2)
        expect(content).toMatch(/### Phase \d: Review/);
      }
    });

    // @req FR:feature-workflow/workflow.discover.resume
    it('Implementation orchestrators should support workflow resumption', async () => {
      const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md'];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');
        expect(content).toMatch(/Resuming from a rollout plan/);
        expect(content).toMatch(/rollout-.*\.md/);
      }
    });

    // @req FR:feature-workflow/workflow.discover.resume
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

        // Each playbook's resume block must defer routing to feature-scope.md (which composes workflow-scope)
        expect(content).toMatch(/feature-scope\.md/);
      }
    });

    // @req FR:feature-workflow/workflow.discover.resume
    it('feature-scope action must own resume-state assessment and entry-phase selection', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      // Per-phase assessment on resume
      expect(content).toMatch(/Resume Routing/i);
      expect(content).toMatch(/per-phase completeness/i);

      // Resume routing covers entry-phase recommendation, multi-run skip, and abandoned-closeout
      expect(content).toMatch(/resume entry phase|Recommend a resume/i);
      expect(content).toMatch(/abandoned.closeout/i);
    });

    // @req FR:feature-workflow/workflow.discover.resume
    it('feature-scope action must distinguish completed-phase confirmation from incomplete-phase execution and flag rollout-quality issues', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      const resumeBlock = content.slice(content.indexOf('Resume Routing'), content.indexOf('### Step 2'));

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
      const microPlaybooks = ['workflow-scope.md', 'feature-scope.md', 'feature-spec.md', 'feature-plan.md'];

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
    // @req FR:feature-workflow/workflow.scope.mode-selection
    // @req FR:workflow-context/scope.approve
    it('workflow-scope should present all 4 execution modes', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'workflow-scope.md');
      const content = await readFile(path, 'utf-8');

      // All 4 execution modes must be listed
      expect(content).toMatch(/interactive/);
      expect(content).toMatch(/checkpoint-review/);
      expect(content).toMatch(/final-review/);
      expect(content).toMatch(/autonomous/);
    });
  });

  describe('Plan Mode Verification', () => {
    // @req FR:feature-workflow/workflow.plan.plan-mode
    it('feature-plan action should require traceability verification during planning', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-plan.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/[Tt]raceability/);
      expect(content).toMatch(/@req/);
    });

    // @req FR:feature-workflow/workflow.plan.mandatory
    it('feature-plan action should prohibit silently skipping plan mode', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-plan.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/[Dd]o NOT skip plan mode/);
    });

    // @req FR:feature-workflow/workflow.plan.design-decisions
    it('feature-plan action should reference design decisions', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-plan.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/design.decisions/i);
    });

    // @req FR:feature-workflow/workflow.implement.design-decisions
    it('feature-code action should reference design decisions for approach changes', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-code.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/design.decisions/i);
    });

    // @req FR:feature-workflow/workflow.implement.boy-scout-log
    // @req FR:workflow-context/audit.boy-scout
    it('feature-spec and workflow-audit actions should require Boy Scout logging for mid-flight scope additions', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');

      const specContent = await readFile(join(ACTIONS_DIR, 'feature-spec.md'), 'utf-8');
      expect(specContent).toMatch(/[Bb]oy [Ss]cout/);
      expect(specContent).toMatch(/Notes/);

      // Boy Scout logging during closure now lives in workflow-audit (composed by feature-complete)
      const auditContent = await readFile(join(ACTIONS_DIR, 'workflow-audit.md'), 'utf-8');
      expect(auditContent).toMatch(/[Bb]oy [Ss]cout/);
      expect(auditContent).toMatch(/Notes/);
    });
  });

  describe('Traceability Sweep and TDD Gate', () => {
    // @req FR:feature-workflow/workflow.scope.traceability-sweep
    it('feature-scope should run a traceability check and surface same-scenario gaps', async () => {
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

    // @req FR:feature-workflow/workflow.scope.convention-check
    // @req FR:workflow-context/scope.convention-check
    it('feature-scope should run a convention check before the traceability check', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      // Core rule: read ONE existing instance per new artifact type
      expect(content).toMatch(/Convention [Cc]heck[\s\S]*?(read|match).*ONE/i);

      // Must cite naming, placement, and ownership as the aspects to match
      expect(content).toMatch(/Convention [Cc]heck[\s\S]*?naming/i);
      expect(content).toMatch(/Convention [Cc]heck[\s\S]*?placement/i);
      expect(content).toMatch(/Convention [Cc]heck[\s\S]*?ownership/i);

      // Convention Check must come BEFORE Traceability (order matters)
      const conventionIdx = content.search(/Convention [Cc]heck/);
      const traceabilityIdx = content.search(/^### Step 1\.6: Traceability/m);
      expect(conventionIdx).toBeGreaterThan(-1);
      expect(traceabilityIdx).toBeGreaterThan(-1);
      expect(conventionIdx).toBeLessThan(traceabilityIdx);
    });

    // @req FR:feature-workflow/workflow.implement.tdd-gate
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

  describe('Downstream Impact and Plan Mode Gate', () => {
    const ACTIONS_DIR = join(__dirname, '../../../src/resources/playbooks/actions');

    // @req FR:feature-workflow/workflow.scope.dependency-impact
    it('feature-scope should run a dependency-impact check for modified FRs after the traceability check', async () => {
      const path = join(ACTIONS_DIR, 'feature-scope.md');
      const content = await readFile(path, 'utf-8');

      // Names the step so future edits can't obscure intent
      expect(content).toMatch(/[Dd]ependency [Ii]mpact/);

      // Delegates to catalyst-cli deps command rather than re-deriving via grep
      expect(content).toMatch(/catalyst deps[\s\S]*?--reverse/);
      expect(content).toMatch(/downstream/i);

      // Surfaces blast radius in the effort overview (Step 2)
      expect(content).toMatch(/[Ee]ffort overview[\s\S]*?[Dd]ownstream impact|[Dd]ownstream impact[\s\S]*?[Ee]ffort overview/);

      // Ordering: Dependency Impact must come AFTER Traceability (traceability first, impact second)
      const sweepIdx = content.search(/^### Step 1\.6: Traceability/m);
      const impactIdx = content.search(/^### Step 1\.7: Dependency Impact/m);
      expect(sweepIdx).toBeGreaterThan(-1);
      expect(impactIdx).toBeGreaterThan(-1);
      expect(impactIdx).toBeGreaterThan(sweepIdx);
    });

    // @req FR:feature-workflow/workflow.spec.downstream-review
    it('feature-spec should require a downstream review with binary classification', async () => {
      const path = join(ACTIONS_DIR, 'feature-spec.md');
      const content = await readFile(path, 'utf-8');

      // Names the review so future edits can't obscure intent
      expect(content).toMatch(/downstream.review/i);

      // Binary classification: (a) no impact / (b) impact + add task
      expect(content).toMatch(/no impact/i);
      expect(content).toMatch(/add (?:an? )?(?:update )?task|update task|add task/i);

      // Exit Criterion enforces per-consumer outcome coverage
      expect(content).toMatch(/Exit Criteria[\s\S]*?(?:every|each)[\s\S]*?(?:consumer|outcome|classified)/i);
    });

    // @req FR:feature-workflow/workflow.spec.scenario-reqs
    it('feature-spec should enforce execution-narrative slot order (interfaces, input, behaviors, output)', async () => {
      const path = join(ACTIONS_DIR, 'feature-spec.md');
      const content = await readFile(path, 'utf-8');

      // Action MUST teach the four slots
      expect(content).toMatch(/\.\{interface-name\}/);
      expect(content).toMatch(/\.input/);
      expect(content).toMatch(/\.\{behavior-name\}/);
      expect(content).toMatch(/\.output/);

      // The instruction sentence MUST list interface BEFORE input (execution-narrative order)
      const interfacePos = content.search(/\.\{interface-name\}/);
      const inputPos = content.search(/\.input/);
      expect(interfacePos).toBeGreaterThan(-1);
      expect(inputPos).toBeGreaterThan(-1);
      expect(interfacePos).toBeLessThan(inputPos);

      // Action MUST mention layering for multiple interfaces (outermost-first)
      expect(content).toMatch(/outermost-first|outermost first/i);
    });

    // @req FR:feature-workflow/workflow.plan.mandatory
    it('feature-plan should require plan mode before task breakdown', async () => {
      const path = join(ACTIONS_DIR, 'feature-plan.md');
      const content = await readFile(path, 'utf-8');

      // Plan-mode entry must be a named instruction
      expect(content).toMatch(/Enter plan mode/);

      // Silent skipping must still be prohibited
      expect(content).toMatch(/[Dd]o NOT skip plan mode/);

      // Ordering: plan-mode entry must come BEFORE the "Within plan mode" working block
      const entryIdx = content.search(/Enter plan mode/);
      const workIdx = content.search(/Within plan mode/);
      expect(entryIdx).toBeGreaterThan(-1);
      expect(workIdx).toBeGreaterThan(-1);
      expect(entryIdx).toBeLessThan(workIdx);
    });

    // @req FR:feature-workflow/workflow.plan.downstream-tasks
    it('feature-plan should require explicit downstream-task coverage grouped under each affected feature ID', async () => {
      const path = join(ACTIONS_DIR, 'feature-plan.md');
      const content = await readFile(path, 'utf-8');

      // Names the requirement
      expect(content).toMatch(/downstream/i);

      // Tasks grouped under each affected downstream feature ID heading
      expect(content).toMatch(/####\s*\{downstream-feature-id\}/);

      // Task scope: @req updates, test updates, impl updates
      expect(content).toMatch(/@req/);
      expect(content).toMatch(/test/i);
      expect(content).toMatch(/(?:implementation|impl)/i);
    });
  });

  describe('Execution Quality Gates', () => {
    const ACTIONS_DIR = join(__dirname, '../../../src/resources/playbooks/actions');

    // @req FR:feature-workflow/workflow.distilled-writing
    // @req NFR:workflow-context/authoring.distilled-writing
    // @req NFR:workflow-context/authoring.distilled-writing.opt-out
    it('content-writing action playbooks should reference Distilled Excellence before Instructions', async () => {
      const files = [
        'feature-scope.md',
        'feature-spec.md',
        'feature-format.md',
        'feature-plan.md',
        'workflow-scope.md',
        'workflow-state.md',
        'workflow-audit.md',
        'workflow-review.md',
        'workflow-closure.md',
        'workflow-celebrate.md',
        'feature-complete.md',
        'feedback-write.md',
      ];

      for (const file of files) {
        const content = await readFile(join(ACTIONS_DIR, file), 'utf-8');
        expect(content).toMatch(/Distilled Excellence/);

        // Reference must appear at the top of the file (before Instructions when present)
        const refIdx = content.search(/Distilled Excellence/);
        const instructionsIdx = content.search(/## Instructions/);
        expect(refIdx).toBeGreaterThan(-1);
        if (instructionsIdx > -1) {
          expect(refIdx).toBeLessThan(instructionsIdx);
        }
      }
    });

    // @req FR:engineering-context/eng.principles — Distilled Excellence definition
    it('engineering principles should define Distilled Excellence', async () => {
      const path = join(__dirname, '../../../.xe/engineering.md');
      const content = await readFile(path, 'utf-8');
      expect(content).toMatch(/\*\*Distilled Excellence\*\*/);
    });

    // @req FR:feature-workflow/workflow.auq-self-check
    // @req FR:workflow-context/auq.action
    // @req FR:workflow-context/auq.self-check
    it('AUQ action should require a pre-submit teammate-test gate', async () => {
      const path = join(ACTIONS_DIR, 'auq.md');
      const content = await readFile(path, 'utf-8');

      // Pre-submit gate phrasing must be present (named so future edits can't soften it)
      expect(content).toMatch(/PRE-SUBMIT GATE/);

      // Teammate-test rephrased as a read-as-if-only-message action
      expect(content).toMatch(/only message/i);
      expect(content).toMatch(/teammate/i);
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

    // @req FR:feature-workflow/workflow.continuity
    // @req FR:workflow-context/state.invocation
    it('each orchestration playbook must reference workflow-state at every STOP gate using @-prefixed path', async () => {
      const orchestrators = [
        'create-feature.md',
        'update-feature.md',
        'repair-feature.md',
        'explore-feature.md'
      ];

      for (const orchestrator of orchestrators) {
        const path = join(PLAYBOOKS_DIR, orchestrator);
        const content = await readFile(path, 'utf-8');

        // Count STOP gates and workflow-state references — must be 1:1
        const stopGates = (content.match(/\*\*STOP HERE\*\*/g) || []).length;
        const activeStateRefs = (content.match(/workflow-state\.md/g) || []).length;
        expect(stopGates).toBeGreaterThan(0);
        expect(activeStateRefs).toBeGreaterThanOrEqual(stopGates);

        // Must use @-prefixed path so the file auto-loads on read
        expect(content).toMatch(/@node_modules\/@xerilium\/catalyst\/playbooks\/actions\/workflow-state\.md/);

        // Must signal non-skippability
        expect(content).toMatch(/DO NOT SKIP/);
      }
    });

    // @req FR:feature-workflow/workflow.continuity
    // @req FR:workflow-context/state.fields
    it('workflow-state action must exist and define the 6 Active State fields', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'workflow-state.md');
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
    // @req FR:feature-workflow/workflow.auq-usage
    // @req FR:workflow-context/auq.invoke
    // @req FR:workflow-context/auq.patterns
    // @req FR:workflow-context/auq.input
    // @req FR:workflow-context/auq.output
    it('All actions that use AskUserQuestion should invoke the AUQ action via Execute @...auq.md', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const actionsUsingAUQ = [
        'feature-scope.md',
        'feature-spec.md',
        'feature-plan.md',
        'feature-code.md',
        'feature-format.md',
        'workflow-scope.md',
        'workflow-closure.md',
      ];

      for (const action of actionsUsingAUQ) {
        const path = join(ACTIONS_DIR, action);
        const content = await readFile(path, 'utf-8');

        // Each AUQ call site must use the function-invocation pattern that auto-loads the checklist
        expect(content).toMatch(/Execute @[^\s]*auq\.md to /i);
        // And must NOT carry the deprecated top-of-file citation directive
        expect(content).not.toMatch(/MUST follow.*AskUserQuestion.*patterns.*auq\.md/);
      }
    });

    // @req NFR:feature-workflow/reliability.informed-judgment
    // @req FR:workflow-context/scope.approve
    it('workflow-scope should require recommendation guidance', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'workflow-scope.md');
      const content = await readFile(path, 'utf-8');

      // Should have recommendation guidance
      expect(content).toMatch(/Recommend/i);
    });
  });

  describe('Review State Context', () => {
    // @req FR:feature-workflow/workflow.review
    // @req FR:workflow-context/review.present
    it('feature-complete should compose workflow-review for the present-work step before workflow-closure', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-complete.md');
      const content = await readFile(path, 'utf-8');

      // Composer step ordering: review precedes closure
      const reviewPos = content.search(/workflow-review\.md/);
      const closurePos = content.search(/workflow-closure\.md/);
      expect(reviewPos).toBeGreaterThan(-1);
      expect(closurePos).toBeGreaterThan(reviewPos);
    });

    // @req FR:feature-workflow/workflow.review
    // @req FR:workflow-context/review.present
    it('workflow-review action should require structured Completed/Remaining/Findings sections', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'workflow-review.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/\*\*Completed\*\*/);
      expect(content).toMatch(/\*\*Remaining\*\*/);
      expect(content).toMatch(/\*\*Findings\*\*/);
    });

    // @req FR:feature-workflow/workflow.review
    // @req FR:workflow-context/celebrate.message
    it('feature-complete should compose workflow-celebrate as the final step', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-complete.md');
      const content = await readFile(path, 'utf-8');

      // Must invoke workflow-celebrate
      expect(content).toMatch(/workflow-celebrate\.md/);
    });

    // @req FR:feature-workflow/workflow.review
    it('feature-complete should invoke catalyst index to regenerate the feature index', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'feature-complete.md');
      const content = await readFile(path, 'utf-8');

      // Must reference the catalyst index command invocation
      expect(content).toMatch(/catalyst\s+index/i);
      // Must reference the target artifact path or purpose
      expect(content).toMatch(/feature\s*index|features\/README\.md/i);
    });

    // @req NFR:feature-workflow/reliability.sequential-execution
    // @req FR:workflow-context/review.loop
    it('workflow-review action must STOP after presentation gated on user-confirmed done', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'workflow-review.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/\*\*STOP HERE\*\*/);
      expect(content).toMatch(/done/i);
    });

    // @req NFR:feature-workflow/reliability.sequential-execution
    // @req FR:workflow-context/closure.action
    it('workflow-closure action must STOP gating closeout entry on user-confirmed done', async () => {
      const ACTIONS_DIR = join(PLAYBOOKS_DIR, 'actions');
      const path = join(ACTIONS_DIR, 'workflow-closure.md');
      const content = await readFile(path, 'utf-8');

      expect(content).toMatch(/\*\*STOP HERE\*\*/);
      expect(content).toMatch(/done|confirm/i);
    });

    // @req FR:feature-workflow/workflow.review
    // @req FR:workflow-context/celebrate.message
    it('explore-feature should compose workflow-celebrate as its closing step', async () => {
      const path = join(PLAYBOOKS_DIR, 'explore-feature.md');
      const content = await readFile(path, 'utf-8');

      // Must have a Celebrate heading (structural check)
      expect(content).toMatch(/^#{3,4}\s+(Step\s+\d+:\s+)?Celebrate/m);
      // Must invoke workflow-celebrate rather than duplicating the celebration logic
      expect(content).toMatch(/workflow-celebrate\.md/);
    });
  });

  describe('Workflow I/O boundaries', () => {
    const orchestrators = ['create-feature.md', 'update-feature.md', 'repair-feature.md', 'explore-feature.md'];

    // @req FR:feature-workflow/workflow.input
    orchestrators.forEach(file => {
      it(`${file} MUST accept user prompt + referenced context as input (Inputs section enumerates them)`, async () => {
        const content = await readFile(join(PLAYBOOKS_DIR, file), 'utf-8');
        expect(content).toMatch(/## Inputs/);
        // Each playbook documents the inputs it accepts (feature-id, issue, context-files, etc.)
        expect(content).toMatch(/feature-id|issue|context-files/);
      });
    });

    // @req FR:feature-workflow/workflow.output
    orchestrators.forEach(file => {
      it(`${file} MUST produce documented artifacts (Artifacts section)`, async () => {
        const content = await readFile(join(PLAYBOOKS_DIR, file), 'utf-8');
        expect(content).toMatch(/## Artifacts/);
      });
    });
  });
});
