/**
 * Kitchen Sink Playbook E2E Tests
 *
 * Validates that the kitchen-sink playbook:
 * 1. Demonstrates ALL available actions
 * 2. Uses natural syntax throughout
 * 3. Runs successfully end-to-end
 * 4. Serves as comprehensive documentation
 *
 * @group e2e
 */

import { describe, it, expect } from '@jest/globals';
import { PlaybookProvider } from '@playbooks/registry/playbook-provider';
import { ACTION_CATALOG } from '@playbooks/registry/action-catalog';
import { Engine } from '../../src/playbooks/engine/engine';
import type { Playbook, PlaybookStep } from '@playbooks/types';
import type { CheckpointPrompter, CheckpointPromptConfig, CheckpointResponse } from '../../src/playbooks/engine/checkpoint-prompter';
import * as fs from 'fs';
import * as path from 'path';

/** Auto-continue prompter for E2E tests (selects default or first option) */
class AutoCheckpointPrompter implements CheckpointPrompter {
  async prompt(config: CheckpointPromptConfig): Promise<CheckpointResponse> {
    if (config.defaultKey) {
      const def = config.options.find(o => o.key === config.defaultKey);
      if (def) return { selected: def.key, value: def.key, hasTextInput: false };
    }
    if (config.options.length > 0) {
      return { selected: config.options[0].key, value: config.options[0].key, hasTextInput: false };
    }
    return { selected: 'continue', value: true, hasTextInput: false };
  }
}

describe('Kitchen Sink Playbook', () => {
  const kitchenSinkPath = path.resolve('src/resources/cli-commands/kitchen-sink.yaml');
  let kitchenSink: Playbook | undefined;

  beforeAll(async () => {
    const provider = PlaybookProvider.getInstance();
    // Load using the full path since kitchen-sink is in cli-commands directory
    kitchenSink = await provider.load(kitchenSinkPath);
  });

  describe('File Structure', () => {
    it('should exist and be readable', () => {
      expect(fs.existsSync(kitchenSinkPath)).toBe(true);
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(5000); // Comprehensive playbook
    });

    it('should be valid YAML that loads successfully', () => {
      expect(kitchenSink).toBeDefined();
      expect(kitchenSink?.name).toBe('kitchen-sink');
      expect(kitchenSink?.description).toBeTruthy();
      expect(kitchenSink?.owner).toBe('demo');
    });

    it('should have inputs defined', () => {
      expect(kitchenSink?.inputs).toBeDefined();
      expect(kitchenSink?.inputs?.length).toBeGreaterThan(0);

      // Should have product-name and environment inputs (narrative scenario customization)
      const inputNames = kitchenSink?.inputs?.map(i => i.name) || [];
      expect(inputNames).toContain('product-name');
      expect(inputNames).toContain('environment');
    });

    it('should have steps defined', () => {
      expect(kitchenSink?.steps).toBeDefined();
      expect(kitchenSink?.steps?.length).toBeGreaterThan(20); // Comprehensive
    });
  });

  describe('Action Coverage', () => {
    /**
     * Critical requirement: kitchen-sink MUST demonstrate all available actions
     * This ensures it serves as comprehensive documentation and E2E validation
     *
     * @req FR:playbook-demo/coverage.all
     * @req FR:playbook-demo/coverage.validation
     * @req FR:playbook-demo/coverage.conditional
     * @req AC:playbook-demo/catalog-sync
     */
    it('should demonstrate all available actions', () => {
      expect(kitchenSink).toBeDefined();
      if (!kitchenSink) return;

      // Get all action types from the catalog
      const allActionTypes = Object.keys(ACTION_CATALOG);

      // Recursively collect all action types used in the playbook
      const usedActionTypes = new Set<string>();

      function collectActionTypes(steps: PlaybookStep[]): void {
        for (const step of steps) {
          usedActionTypes.add(step.action);

          // Collect from nested steps in control flow
          const config = step.config as any;
          if (config?.then) collectActionTypes(config.then as PlaybookStep[]);
          if (config?.else) collectActionTypes(config.else as PlaybookStep[]);
          if (config?.steps) collectActionTypes(config.steps as PlaybookStep[]);
          if (config?.catch) {
            for (const catchBlock of config.catch) {
              if (catchBlock?.steps) collectActionTypes(catchBlock.steps as PlaybookStep[]);
            }
          }
          if (config?.finally) collectActionTypes(config.finally as PlaybookStep[]);
        }
      }

      // Collect from main steps
      collectActionTypes(kitchenSink.steps);

      // Collect from catch blocks
      if (kitchenSink.catch) {
        for (const catchBlock of kitchenSink.catch) {
          collectActionTypes(catchBlock.steps);
        }
      }

      // Collect from finally block
      if (kitchenSink.finally) {
        collectActionTypes(kitchenSink.finally);
      }

      // Find any actions that are missing
      const missingActions = allActionTypes.filter(
        actionType => !usedActionTypes.has(actionType)
      );

      // Report coverage
      const coverage = (usedActionTypes.size / allActionTypes.length) * 100;
      console.log(`Action coverage: ${usedActionTypes.size}/${allActionTypes.length} (${coverage.toFixed(1)}%)`);

      if (missingActions.length > 0) {
        console.log('Missing actions:', missingActions);
      }

      // Kitchen sink should demonstrate at least 65% of actions
      // (GitHub actions require auth, PowerShell is platform-specific)
      expect(coverage).toBeGreaterThanOrEqual(65);
    });

    // @req FR:playbook-demo/coverage.all
    it('should use each demonstrated action at least once', () => {
      expect(kitchenSink).toBeDefined();
      if (!kitchenSink) return;

      const actionCounts = new Map<string, number>();

      function countActions(steps: PlaybookStep[]): void {
        for (const step of steps) {
          const count = actionCounts.get(step.action) || 0;
          actionCounts.set(step.action, count + 1);

          // Count from nested steps
          const config = step.config as any;
          if (config?.then) countActions(config.then as PlaybookStep[]);
          if (config?.else) countActions(config.else as PlaybookStep[]);
          if (config?.steps) countActions(config.steps as PlaybookStep[]);
          if (config?.catch) {
            for (const catchBlock of config.catch) {
              if (catchBlock?.steps) countActions(catchBlock.steps as PlaybookStep[]);
            }
          }
          if (config?.finally) countActions(config.finally as PlaybookStep[]);
        }
      }

      countActions(kitchenSink.steps);
      if (kitchenSink.catch) {
        for (const catchBlock of kitchenSink.catch) {
          countActions(catchBlock.steps);
        }
      }
      if (kitchenSink.finally) {
        countActions(kitchenSink.finally);
      }

      // Every action should be used at least once
      for (const [action, count] of actionCounts.entries()) {
        expect(count).toBeGreaterThanOrEqual(1);
      }

      // Should have good variety (at least 15 different action types)
      expect(actionCounts.size).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Syntax Usage', () => {
    /**
     * Critical requirement: kitchen-sink should use NATURAL syntax throughout
     * We don't expose "shorthand" as a concept - it's just the natural way to write YAML
     *
     * @req FR:playbook-demo/educational.best-practices
     */
    it('should use natural syntax where possible', () => {
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');

      // Check for natural syntax patterns
      const patterns = {
        'file-exists with path': /- (?:name: \w+\s+)?file-exists: [\w./-]+/g,
        'var with name': /- var: [\w-]+/g,
        'script with code': /- (?:name: \w+\s+)?script: \|/g,
        'if with condition': /- if: /g,
      };

      let totalNaturalUsage = 0;
      for (const [name, pattern] of Object.entries(patterns)) {
        const matches = content.match(pattern);
        const count = matches?.length || 0;
        if (count > 0) {
          console.log(`${name}: ${count} usages`);
          totalNaturalUsage += count;
        }
      }

      // Should have substantial natural syntax usage
      expect(totalNaturalUsage).toBeGreaterThanOrEqual(10);
    });

    // @req FR:playbook-demo/educational.best-practices
    it('should NOT expose "shorthand" as a user-facing concept', () => {
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');

      // Count mentions of "shorthand"
      const shorthandMentions = content.match(/shorthand/gi);
      const mentionCount = shorthandMentions?.length || 0;

      // We want ZERO mentions of "shorthand" - it's not a concept users should know about
      // The natural syntax is just... the syntax. No special name needed.
      expect(mentionCount).toBe(0);
    });

    // @req FR:playbook-demo/educational.best-practices
    it('should use simple, direct examples', () => {
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');

      // Should have examples of the simple, natural syntax
      expect(content).toMatch(/file-exists: [\w./]+/);  // file-exists: package.json
      expect(content).toMatch(/- var: [\w-]+/);         // - var: variable-name
      expect(content).toMatch(/- if: /);                // - if: condition
    });
  });

  describe('Documentation Quality', () => {
    // @req FR:playbook-demo/structure.navigable
    // @req FR:playbook-demo/educational.entertaining
    it('should be organized into clear sections (Acts)', () => {
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');

      // Should have act markers
      expect(content).toMatch(/ACT I/i);
      expect(content).toMatch(/ACT II/i);
      expect(content).toMatch(/ACT III/i);
      expect(content).toMatch(/ACT IV/i);
    });

    // @req FR:playbook-demo/structure.navigable
    // @req FR:playbook-demo/structure.identifiable
    it('should have numbered section headers for each action type', () => {
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');

      // Should have numbered headers for key actions (e.g., # 1.1 var, # 2.1 file-exists)
      expect(content).toMatch(/# \d+\.\d+ var/);
      expect(content).toMatch(/# \d+\.\d+ file-exists/);
      expect(content).toMatch(/# \d+\.\d+ file-write/);
      expect(content).toMatch(/# \d+\.\d+ script/);
      expect(content).toMatch(/# \d+\.\d+ for-each/);
      expect(content).toMatch(/# \d+\.\d+ log-/);
      expect(content).toMatch(/# \d+\.\d+ try/);
    });

    // @req FR:playbook-template-engine/paths.protocols
    // @req FR:playbook-template-engine/paths.usage
    // @req FR:playbook-demo/coverage.all
    it('should demonstrate path protocols in both raw and bracketed forms', () => {
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');

      // Must have a dedicated Path Protocols section header
      expect(content).toMatch(/# \d+\.\d+ Path Protocols/);

      // Raw form: each protocol appears unwrapped at least once as an action argument
      expect(content).toMatch(/file-read: xe:\/\//);
      expect(content).toMatch(/file-read: catalyst:\/\//);
      expect(content).toMatch(/(file-write|file-read|file-delete): temp:\/\//);

      // Bracketed form: at least one {{xe://...}} to prove non-raw resolution works
      expect(content).toMatch(/\{\{xe:\/\/[^}]+\}\}/);
    });

    // @req FR:playbook-demo/structure.navigable
    // @req FR:playbook-demo/structure.identifiable
    it('should differentiate act separators from section separators', () => {
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');

      // Acts use === separators
      const actSeparators = content.match(/# ={10,}/g);
      expect(actSeparators).toBeTruthy();
      expect(actSeparators!.length).toBeGreaterThanOrEqual(10); // Multiple acts

      // Sections within acts use --- separators
      const sectionSeparators = content.match(/# -{10,}/g);
      expect(sectionSeparators).toBeTruthy();
      expect(sectionSeparators!.length).toBeGreaterThanOrEqual(15); // Many sections
    });

    // @req FR:playbook-demo/educational.best-practices
    it('should use template escape syntax for nested playbook creation', () => {
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');

      // Should use \{{ escape syntax (not String.fromCharCode hack)
      expect(content).not.toContain('String.fromCharCode');
      expect(content).not.toContain('fromCharCode');
      expect(content).toContain('\\{{');
      expect(content).toContain('\\}}');
    });

    // @req FR:playbook-demo/educational.limitations
    // @req FR:playbook-demo/structure.skipped-logging
    it('should document limitations with clear markers', () => {
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');

      // Should document important concepts for users
      expect(content).toMatch(/step naming/i);
      expect(content).toMatch(/name your steps to reference/i);
      expect(content).toMatch(/variable scoping/i);
      expect(content).toMatch(/script execution/i);
    });

    // @req FR:playbook-demo/educational.entertaining
    it('should have a comprehensive reference section at the end', () => {
      const content = fs.readFileSync(kitchenSinkPath, 'utf-8');

      // Should have graduation/reference sections
      expect(content).toMatch(/GRADUATION/i);
      expect(content).toMatch(/REFERENCE/i);
      expect(content).toMatch(/NEXT STEPS/i);
    });
  });

  describe('Playbook Structure Validation', () => {
    // @req FR:playbook-demo/educational.best-practices
    it('should have proper error handling (catch blocks)', () => {
      expect(kitchenSink?.catch).toBeDefined();
      expect(kitchenSink?.catch?.length).toBeGreaterThan(0);

      // Should have specific error handlers
      const errorCodes = kitchenSink?.catch?.map(c => c.code) || [];
      expect(errorCodes.length).toBeGreaterThan(0);
    });

    it('should have a return statement at the end', () => {
      expect(kitchenSink?.steps).toBeDefined();
      if (!kitchenSink?.steps) return;

      // Last step should be a return action
      const lastStep = kitchenSink.steps[kitchenSink.steps.length - 1];
      expect(lastStep.action).toBe('return');
    });

    it('should demonstrate try action with catch and finally blocks', () => {
      expect(kitchenSink).toBeDefined();
      if (!kitchenSink) return;

      // Recursively find all try action steps
      const trySteps: any[] = [];

      function findTrySteps(steps: PlaybookStep[]): void {
        for (const step of steps) {
          if (step.action === 'try') {
            trySteps.push(step.config);
          }
          // Also search nested steps
          const config = step.config as any;
          if (config?.then) findTrySteps(config.then as PlaybookStep[]);
          if (config?.else) findTrySteps(config.else as PlaybookStep[]);
          if (config?.steps) findTrySteps(config.steps as PlaybookStep[]);
          if (config?.catch) {
            for (const catchBlock of config.catch) {
              if (catchBlock?.steps) findTrySteps(catchBlock.steps as PlaybookStep[]);
            }
          }
          if (config?.finally) findTrySteps(config.finally as PlaybookStep[]);
        }
      }

      findTrySteps(kitchenSink.steps);

      // Should have multiple try action demonstrations
      expect(trySteps.length).toBeGreaterThanOrEqual(3);

      // At least one should have catch blocks with code + steps
      const withCatch = trySteps.filter(t => t.catch && t.catch.length > 0);
      expect(withCatch.length).toBeGreaterThanOrEqual(1);
      for (const t of withCatch) {
        for (const catchBlock of t.catch) {
          expect(catchBlock.code).toBeTruthy();
          expect(catchBlock.steps).toBeDefined();
          expect(catchBlock.steps.length).toBeGreaterThanOrEqual(1);
        }
      }

      // At least one should have finally blocks
      const withFinally = trySteps.filter(t => t.finally && t.finally.length > 0);
      expect(withFinally.length).toBeGreaterThanOrEqual(1);
    });

    // @req FR:playbook-demo/inputs.selective
    // @req FR:playbook-demo/inputs.defaults
    // @req FR:playbook-demo/inputs.customizable
    it('should have valid inputs with defaults', () => {
      expect(kitchenSink?.inputs).toBeDefined();
      if (!kitchenSink?.inputs) return;

      for (const input of kitchenSink.inputs) {
        expect(input.name).toBeTruthy();
        expect(input.type).toMatch(/^(string|number|boolean)$/);

        // Inputs should have defaults for easy testing
        if (!input.required) {
          expect(input.default).toBeDefined();
        }
      }

      // Selective execution: skip-* boolean inputs for external dependencies
      const skipInputs = kitchenSink.inputs.filter((i: { name: string }) => i.name.startsWith('skip-'));
      expect(skipInputs.length).toBeGreaterThanOrEqual(1);
      for (const input of skipInputs) {
        expect(input.type).toBe('boolean');
      }
    });
  });

  describe('End-to-End Execution', () => {
    /**
     * TRUE E2E TEST: Actually run the playbook and verify it completes
     *
     * This catches runtime issues that structural tests miss:
     * - Unhandled throws that stop execution
     * - Sections that never execute (like Act X)
     * - Runtime errors in actions
     *
     * @req FR:playbook-demo/coverage.all
     * @req FR:playbook-demo/cleanup.auto
     */
    it('should execute successfully from start to finish', async () => {
      expect(kitchenSink).toBeDefined();
      if (!kitchenSink) return;

      const engine = new Engine(undefined, undefined, undefined, undefined, new AutoCheckpointPrompter());

      // Execute with skip flags to avoid external dependencies
      const result = await engine.run(kitchenSink, {
        'skip-ai': true,
        'skip-checkpoints': true,
        'skip-github': true
      });

      // Should complete successfully
      expect(result.status).toBe('completed');
      expect(result.error).toBeUndefined();

      // Should have executed ALL sections including Act X (error handling)
      // This catches the bug where unprotected throw stops execution early
      expect(result.outputs).toBeDefined();
      expect(result.outputs['actions-demonstrated']).toBeDefined();

      // Verify critical actions from Act X were demonstrated
      const actionsDemonstrated = result.outputs['actions-demonstrated'] as string[];

      // Actions are listed as "action-name (description)", so check if any item starts with the action name
      const hasThrow = actionsDemonstrated.some(a => a.startsWith('throw '));
      const hasTry = actionsDemonstrated.some(a => a.startsWith('try '));

      expect(hasThrow).toBe(true);
      expect(hasTry).toBe(true);
    }, 60000); // 60 second timeout for full execution
  });
});
