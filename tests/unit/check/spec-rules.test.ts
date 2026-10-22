/**
 * Tests for the spec.* check rules.
 */

import { getRule } from '../../../src/check/registry';

const SECTIONS = [
  '## Purpose',
  'Mission.',
  '## Scenarios',
  '## Data Model',
  'None.',
  '## Architecture Constraints',
  'None.',
  '## External Dependencies',
  'None.',
];

function spec(scenarios: string, opts: { description?: string | null; sections?: string[] } = {}): string {
  const description = opts.description === undefined ? 'Short summary.' : opts.description;
  const fm = ['---', 'id: x', description === null ? '' : `description: ${description}`, '---', ''];
  const sections = opts.sections ?? SECTIONS;
  const idx = sections.indexOf('## Scenarios');
  const body = idx === -1 ? sections : [...sections.slice(0, idx + 1), scenarios, ...sections.slice(idx + 1)];
  return [...fm, ...body].join('\n');
}

function run(ruleId: string, content: string) {
  const rule = getRule(ruleId);
  if (!rule) throw new Error(`no rule ${ruleId}`);
  return rule.check({ path: '.xe/features/x/spec.md', content });
}

const STORY = 'Developer needs to do a thing so that value follows.';
const scenario = (...frs: string[]) => ['### FR:x: Thing', '', STORY, '', ...frs].join('\n');

describe('spec.one-req', () => {
  // @req FR:cli-check/spec.one-req
  it('flags a requirement with two normative words', () => {
    const f = run('spec.one-req', spec(scenario('- **FR:x.a** (P2): Command MUST do a and SHOULD do b')));
    expect(f).toHaveLength(1);
    expect(f[0].line).toBeGreaterThan(0);
  });

  // @req FR:cli-check/spec.one-req
  it('passes a requirement with one normative word', () => {
    expect(run('spec.one-req', spec(scenario('- **FR:x.a** (P2): Command MUST do a')))).toEqual([]);
  });

  // @req FR:cli-check/spec.one-req
  it('ignores normative words inside code spans', () => {
    expect(run('spec.one-req', spec(scenario('- **FR:x.a** (P2): Rule MUST flag `MUST` or `SHOULD`')))).toEqual([]);
  });

  // @req FR:cli-check/spec.one-req
  it('applies to NFRs', () => {
    const f = run('spec.one-req', spec(scenario('- **NFR:x.a** (P3): Command MUST be fast and MAY cache')));
    expect(f).toHaveLength(1);
  });
});

describe('spec.actor', () => {
  // @req FR:cli-check/spec.actor
  it('flags "System" as the actor', () => {
    expect(run('spec.actor', spec(scenario('- **FR:x.a** (P2): System MUST validate input')))).toHaveLength(1);
  });

  // @req FR:cli-check/spec.actor
  it('passes a named owner', () => {
    expect(run('spec.actor', spec(scenario('- **FR:x.a** (P2): Validator MUST validate input')))).toEqual([]);
  });
});

describe('spec.opener', () => {
  // @req FR:cli-check/spec.opener
  it('flags an opener that is not a needs … so story', () => {
    const content = spec('### FR:x: Thing\n\nA feature needs rows back. Covers settle and abandon.\n');
    expect(run('spec.opener', content)).toHaveLength(1);
  });

  // @req FR:cli-check/spec.opener
  it('passes a needs … so story', () => {
    expect(run('spec.opener', spec(scenario()))).toEqual([]);
  });

  // @req FR:cli-check/spec.opener
  it('skips blank lines and blockquotes after the heading', () => {
    expect(run('spec.opener', spec(`### FR:x: Thing\n\n> note\n${STORY}\n`))).toEqual([]);
  });
});

describe('spec.refs', () => {
  // @req FR:cli-check/spec.refs
  it('flags @req in requirement prose', () => {
    const f = run('spec.refs', spec(scenario('- **FR:x.a** (P2): Component MUST chart it (@req FR:chart.type)')));
    expect(f).toHaveLength(1);
  });

  // @req FR:cli-check/spec.refs
  it('flags an FR ID in scenario prose', () => {
    const content = spec('### FR:x: Thing\n\nDeveloper needs to see FR:other.thing so that value follows.\n');
    expect(run('spec.refs', content)).toHaveLength(1);
  });

  // @req FR:cli-check/spec.refs
  it('ignores references inside code spans', () => {
    expect(run('spec.refs', spec(scenario('- **FR:x.a** (P2): Rule MUST flag `@req` in prose')))).toEqual([]);
  });

  // @req FR:cli-check/spec.refs.entity-type
  it('allows the entity type note', () => {
    expect(run('spec.refs', spec(scenario('- **FR:x.output** (P2): Hub (@req FR:$hub) — the result')))).toEqual([]);
  });

  // @req FR:cli-check/spec.refs
  it('allows nested blockquote @req bullets', () => {
    expect(run('spec.refs', spec(scenario('- **FR:x.a** (P2): Command MUST run\n  > - @req FR:other/thing')))).toEqual([]);
  });
});

describe('spec.slots', () => {
  // @req FR:cli-check/spec.slots
  it.each(['@cli', 'input', 'output', 'schema'])('flags MUST on a %s slot', (slot) => {
    expect(run('spec.slots', spec(scenario(`- **FR:x.${slot}** (P2): Command MUST accept a path`)))).toHaveLength(1);
  });

  // @req FR:cli-check/spec.slots
  it('passes a slot with no normative word', () => {
    expect(run('spec.slots', spec(scenario('- **FR:x.@cli** (P2): Interface: `x`')))).toEqual([]);
  });

  // @req FR:cli-check/spec.slots
  it('does not treat a deeper behavior named schema as a slot', () => {
    expect(run('spec.slots', spec(scenario('- **FR:x.check.schema** (P2): Command MUST validate')))).toEqual([]);
  });
});

describe('spec.description', () => {
  // @req FR:cli-check/spec.description
  it('flags a missing description', () => {
    expect(run('spec.description', spec(scenario(), { description: null }))).toHaveLength(1);
  });

  // @req FR:cli-check/spec.description
  it('flags a description over 120 characters', () => {
    expect(run('spec.description', spec(scenario(), { description: 'a'.repeat(121) }))).toHaveLength(1);
  });

  // @req FR:cli-check/spec.description
  it('passes a description of exactly 120 characters', () => {
    expect(run('spec.description', spec(scenario(), { description: 'a'.repeat(120) }))).toEqual([]);
  });
});

describe('spec.sections', () => {
  // @req FR:cli-check/spec.sections
  it('flags each missing required section', () => {
    const content = spec(scenario(), { sections: ['## Purpose', 'x', '## Scenarios'] });
    const f = run('spec.sections', content);
    expect(f.map((x) => x.text)).toEqual([
      'missing ## Data Model',
      'missing ## Architecture Constraints',
      'missing ## External Dependencies',
    ]);
  });

  // @req FR:cli-check/spec.sections
  it('passes a complete spec', () => {
    expect(run('spec.sections', spec(scenario()))).toEqual([]);
  });
});

describe('document scoping', () => {
  // @req FR:cli-check/spec.fences
  it('ignores lines inside fenced code blocks', () => {
    const content = spec(scenario('```markdown', '- **FR:x.a** (P2): System MUST do a and SHOULD do b', '```'));
    for (const id of ['spec.one-req', 'spec.actor', 'spec.refs']) {
      expect(run(id, content)).toEqual([]);
    }
  });

  // @req FR:cli-check/spec.deprecated
  it('skips deprecated requirements', () => {
    const content = spec(scenario('- ~~**FR:x.a**~~: [deprecated: FR:x.b] System MUST do a and SHOULD do b'));
    for (const id of ['spec.one-req', 'spec.actor', 'spec.refs']) {
      expect(run(id, content)).toEqual([]);
    }
  });
});
