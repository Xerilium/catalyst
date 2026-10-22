import { readFileSync } from 'fs';
import { join } from 'path';

describe('run skill', () => {
  const content = readFileSync(
    join(__dirname, '../../../src/resources/ai-plugin/skills/run.md'),
    'utf-8'
  );

  it('does not describe numbered H2 playbook steps (playbooks use phase/step sections)', () => {
    expect(content).not.toMatch(/numbered H2/i);
  });

  it('does not map to inputs no playbook declares', () => {
    expect(content).not.toContain('feature-description');
    expect(content).not.toMatch(/\(.*execution-mode.*\)/);
  });
});
