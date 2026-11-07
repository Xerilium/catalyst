/**
 * Tests for the creative director and content strategist agent templates.
 *
 * The agents are prompt templates, so these tests lock the role boundaries:
 * who decides, who writes, and which tools each role gets.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter } from '../../../scripts/generate-plugin';

const AGENTS_DIR = join(__dirname, '../../../src/resources/ai-plugin/agents');
const load = (name: string) => parseFrontmatter(readFileSync(join(AGENTS_DIR, `${name}.md`), 'utf8'));
const tools = (name: string) => (load(name).fields.get('tools') ?? '').split(',').map((t) => t.trim());

describe('creative-director agent', () => {
  const { fields, body } = load('creative-director');

  // @req FR:creative-agents/director.@ai-agent
  it('is published as the creative-director agent', () => {
    expect(fields.get('name')).toBe('creative-director');
  });

  // @req FR:creative-agents/director.owns
  it('owns design, UX, and content decisions', () => {
    expect(fields.get('description')).toMatch(/design, UX, and content/i);
    expect(body).toMatch(/You own .*design, UX, and content decisions/i);
  });

  // @req FR:creative-agents/director.end-users
  it('decides for end users', () => {
    expect(body).toMatch(/best for end users/i);
  });

  // @req FR:creative-agents/director.direction
  it('states direction as principles, UX decisions, and voice and tone', () => {
    expect(body).toMatch(/design principles/i);
    expect(body).toMatch(/UX decisions/i);
    expect(body).toMatch(/voice and tone/i);
  });

  // @req FR:creative-agents/director.review
  // @req FR:creative-agents/director.review.verdict
  // @req FR:creative-agents/director.review.findings
  it('reviews against the direction with a verdict and located findings', () => {
    expect(body).toMatch(/review/i);
    expect(body).toMatch(/Approve/);
    expect(body).toMatch(/Request changes/);
    expect(body).toMatch(/location/i);
    expect(body).toMatch(/fix/i);
  });

  // @req FR:creative-agents/director.copy
  it('routes copy writing to the content strategist', () => {
    expect(body).toMatch(/content-strategist/);
  });

  // @req FR:creative-agents/director.read-only
  it('has no file edit tools', () => {
    expect(tools('creative-director').length).toBeGreaterThan(0);
    for (const tool of ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']) {
      expect(tools('creative-director')).not.toContain(tool);
    }
  });
});

describe('content-strategist agent', () => {
  const { fields, body } = load('content-strategist');

  // @req FR:creative-agents/strategist.@ai-agent
  it('is published as the content-strategist agent', () => {
    expect(fields.get('name')).toBe('content-strategist');
  });

  // @req FR:creative-agents/strategist.owns
  it('owns website and app copy', () => {
    expect(fields.get('description')).toMatch(/website and app copy/i);
    expect(body).toMatch(/You own website and app copy/i);
  });

  // @req FR:creative-agents/strategist.write
  it('can edit the files that hold copy', () => {
    expect(tools('content-strategist')).toEqual(expect.arrayContaining(['Read', 'Edit', 'Write']));
  });

  // @req FR:creative-agents/strategist.copy-only
  it('changes only copy text', () => {
    expect(body).toMatch(/Change only copy/i);
    expect(tools('content-strategist')).not.toContain('Bash');
  });

  // @req FR:creative-agents/strategist.rules
  // @req FR:creative-agents/strategist.rules.ste
  it('follows project writing rules, including Simplified Technical English', () => {
    expect(body).toMatch(/writing rules/i);
    expect(body).toMatch(/Simplified Technical English/);
  });

  // @req FR:creative-agents/strategist.direction
  // @req FR:creative-agents/strategist.escalate
  it('follows and escalates to the creative director', () => {
    expect(body).toMatch(/creative-director/);
    expect(body).toMatch(/voice and tone/i);
  });

  // @req FR:creative-agents/strategist.output
  it('reports changed files and open questions', () => {
    expect(body).toMatch(/Changed files/i);
    expect(body).toMatch(/Open questions/i);
  });
});
