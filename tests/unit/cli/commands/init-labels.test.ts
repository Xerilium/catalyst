/**
 * Structure tests for label setup wiring in init
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const root = path.join(__dirname, '../../../..');

describe('init label setup', () => {
  const init = yaml.load(
    fs.readFileSync(path.join(root, 'src/resources/cli-commands/init.yaml'), 'utf8'),
  ) as { steps: Array<Record<string, any>> };
  const index = (pred: (s: Record<string, any>) => boolean) => init.steps.findIndex(pred);

  // @req FR:cli-init/init.labels
  it('runs label setup after platform setup and before the handoff, never failing init', () => {
    const labels = index(s => s.name === 'labels-result');
    expect(labels).toBeGreaterThan(index(s => 'for-each' in s));
    expect(labels).toBeLessThan(
      index(s => typeof s.display === 'string' && s.display.includes('Catalyst initialized')),
    );
    expect(init.steps[labels].bash).toContain('catalyst labels setup');
    expect(init.steps[labels].bash.trim().endsWith('|| true')).toBe(true);
    expect(init.steps[labels].cwd).toBeUndefined(); // runs in the project the CLI was invoked from
  });

  // @req FR:init-workflow/workflow.implement.labels
  it('has the AI init playbook set up labels after rendering artifacts', () => {
    const playbook = fs.readFileSync(
      path.join(root, 'src/resources/playbooks/start-initialization.md'),
      'utf8',
    );
    expect(playbook.indexOf('actions/init-render.md')).toBeLessThan(
      playbook.indexOf('actions/labels-setup.md'),
    );
  });
});
