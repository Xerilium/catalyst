/**
 * Tests for feedback injection into the self-hosted plugin's skills
 * (scripts/inject-feedback.ts).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  FEEDBACK_PLAYBOOK,
  SELF_HOSTED_SKILLS_DIR,
  buildPreamble,
  buildTrigger,
  injectFeedback,
  insertPreamble,
} from '../../scripts/inject-feedback';

const ROOT = path.join(__dirname, '../..');

const skill = [
  '---',
  'name: create',
  'description: Create new features',
  '---',
  '',
  '> Setup: bootstrap check',
  '',
  '# Create new features',
  '',
  'Execute @node_modules/@xerilium/catalyst/playbooks/create-feature.md',
  '',
].join('\n');

let project: string;

function writeSkill(name: string, content = skill): string {
  const p = path.join(project, SELF_HOSTED_SKILLS_DIR, name, 'SKILL.md');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}

beforeEach(() => {
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-feedback-'));
});

afterEach(() => {
  fs.rmSync(project, { recursive: true, force: true });
});

describe('buildPreamble', () => {
  // @req FR:feedback-loop/inject.preamble
  it('returns HTML comments that track quality and reinforce AUQ compliance', () => {
    const preamble = buildPreamble();
    expect(preamble.split('\n').every((l) => l.startsWith('<!--') && l.endsWith('-->'))).toBe(true);
    expect(preamble).toContain('quality');
    expect(preamble).toContain('AskUserQuestion');
  });
});

describe('buildTrigger', () => {
  // @req FR:feedback-loop/inject.trigger
  it('executes the feedback playbook after the workflow', () => {
    const trigger = buildTrigger();
    expect(trigger).toContain('## After completing all steps above');
    expect(trigger).toContain(`Execute @${FEEDBACK_PLAYBOOK}`);
    expect(FEEDBACK_PLAYBOOK).toBe('node_modules/@xerilium/catalyst/playbooks/invoke-retrospective.md');
  });
});

describe('insertPreamble', () => {
  // @req FR:feedback-loop/inject.preamble
  it('inserts the preamble right after the frontmatter', () => {
    const result = insertPreamble(skill);
    expect(result.startsWith('---\nname: create\ndescription: Create new features\n---\n<!--')).toBe(true);
    expect(result).toContain('Execute @node_modules/@xerilium/catalyst/playbooks/create-feature.md');
  });

  // @req FR:feedback-loop/inject.preamble
  it('inserts at the top when there is no frontmatter', () => {
    expect(insertPreamble('# Plain\n')).toMatch(/^<!--/);
  });
});

describe('injectFeedback', () => {
  // @req FR:feedback-loop/inject.script
  // @req FR:feedback-loop/inject.plugin-skills
  it('injects the preamble and trigger into every self-hosted skill', () => {
    const files = ['create', 'fix', 'sitrep'].map((n) => writeSkill(n));
    expect(injectFeedback(project)).toEqual(files.sort());
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('[Catalyst Feedback]');
      expect(content.trimEnd().endsWith(`Execute @${FEEDBACK_PLAYBOOK}`)).toBe(true);
    }
  });

  // @req FR:feedback-loop/inject.plugin-skills
  it('ignores directories without SKILL.md', () => {
    fs.mkdirSync(path.join(project, SELF_HOSTED_SKILLS_DIR, 'empty'), { recursive: true });
    writeSkill('create');
    expect(injectFeedback(project)).toHaveLength(1);
  });

  // @req FR:feedback-loop/inject.script
  it('does nothing when the plugin is not self-hosted', () => {
    expect(injectFeedback(project)).toEqual([]);
  });

  // @req FR:feedback-loop/inject.source-safe
  it('targets only the self-hosted copy', () => {
    expect(SELF_HOSTED_SKILLS_DIR).toBe('.claude/skills/catalyst/skills');
    const template = path.join(project, 'src/resources/ai-plugin/skills/create.md');
    const packaged = path.join(project, 'node_modules/@xerilium/catalyst/skills/create/SKILL.md');
    for (const p of [template, packaged]) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, skill);
    }
    injectFeedback(project);
    expect(fs.readFileSync(template, 'utf8')).toBe(skill);
    expect(fs.readFileSync(packaged, 'utf8')).toBe(skill);
  });
});

describe('build integration', () => {
  // @req FR:feedback-loop/inject.build-integration
  it('runs after the self-hosted plugin is installed during local builds', () => {
    const build = fs.readFileSync(path.join(ROOT, 'scripts/build.ts'), 'utf8');
    const selfHost = build.indexOf('generate-plugin.ts --self-host');
    const inject = build.indexOf('inject-feedback.ts');
    expect(selfHost).toBeGreaterThan(-1);
    expect(inject).toBeGreaterThan(selfHost);
    expect(build.indexOf('skipInstall')).toBeLessThan(selfHost);
  });
});
