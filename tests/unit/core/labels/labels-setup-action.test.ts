/**
 * Structure tests for the AI-facing labels-setup action
 */

import * as fs from 'fs';
import * as path from 'path';

const action = fs.readFileSync(
  path.join(__dirname, '../../../../src/resources/playbooks/actions/labels-setup.md'),
  'utf8',
);

describe('labels-setup action', () => {
  // @req FR:pr-labels/ask.ai.@action
  it('lives at the documented path and is referenced by the init playbook', () => {
    const init = fs.readFileSync(
      path.join(__dirname, '../../../../src/resources/playbooks/start-initialization.md'),
      'utf8',
    );
    expect(init).toContain('playbooks/actions/labels-setup.md');
  });

  // @req FR:pr-labels/ask.ai
  it('asks through the AUQ action, then runs setup non-interactively with the choice', () => {
    expect(action).toContain('playbooks/actions/auq.md');
    expect(action).toContain('npx catalyst labels setup --non-interactive');
    expect(action).toContain('--style {choice}');
  });

  // @req FR:pr-labels/ask.ai.plan
  it('reads the plan first and asks the style only when a choice is needed', () => {
    expect(action.indexOf('labels plan --json')).toBeLessThan(action.indexOf('labels setup'));
    expect(action).toMatch(/only when `pattern\.needsChoice` is true/);
  });

  // @req FR:pr-labels/ask.ai.renames
  it('asks to approve renames and passes --rename only then', () => {
    expect(action).toMatch(/Renames\*\* — only when `plan\.renames` is non-empty/);
    expect(action).toMatch(/`--rename` when approved/);
  });
});
