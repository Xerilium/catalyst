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
  // @req FR:cli-check/spec.refs.entity-type
  it('flags an entity type note in a behavior', () => {
    const f = run('spec.refs', spec(scenario('- **FR:sync.catalog** (P1): Playbook MUST sync the standard labels (@req FR:$label)')));
    expect(f).toHaveLength(1);
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

describe('spec.instructions', () => {
  // @req FR:cli-check/spec.instructions
  it('flags a leftover instructions block', () => {
    expect(run('spec.instructions', spec(scenario('> [INSTRUCTIONS]', '> Do things')))).toHaveLength(1);
  });

  // @req FR:cli-check/spec.instructions
  it('ignores code spans and fences', () => {
    const content = spec(scenario('Rule flags `[INSTRUCTIONS]` text', '```', '[INSTRUCTIONS]', '```'));
    expect(run('spec.instructions', content)).toEqual([]);
  });
});

describe('spec.placeholder', () => {
  // @req FR:cli-check/spec.placeholder
  it('flags unfilled body placeholders', () => {
    expect(run('spec.placeholder', spec(scenario('### FR:x.a: {scenario-name}')))).toHaveLength(1);
  });

  // @req FR:cli-check/spec.placeholder
  it('flags unfilled frontmatter placeholders', () => {
    expect(run('spec.placeholder', spec(scenario(), { description: '[one-line summary]' }))).toHaveLength(1);
  });

  // @req FR:cli-check/spec.placeholder
  it('passes generic tokens and code spans', () => {
    expect(run('spec.placeholder', spec(scenario('- **FR:x.a** (P2): Prints `{feature-name}` as {value}')))).toEqual([]);
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

describe('spec.ste-sentence', () => {
  // @req FR:cli-check/spec.ste-sentence
  it('flags a requirement over 20 words', () => {
    const long = Array(21).fill('word').join(' ');
    expect(run('spec.ste-sentence', spec(scenario(`- **FR:x.a** (P2): Command MUST ${long}`)))).toHaveLength(1);
  });

  // @req FR:cli-check/spec.ste-sentence
  it('passes a short single sentence', () => {
    expect(run('spec.ste-sentence', spec(scenario('- **FR:x.a** (P2): Command MUST do a.')))).toEqual([]);
  });
});

describe('spec.ste-rationale', () => {
  // @req FR:cli-check/spec.ste-rationale
  it('flags a rationale clause', () => {
    expect(run('spec.ste-rationale', spec(scenario('- **FR:x.a** (P2): Command MUST do a because b')))).toHaveLength(1);
  });

  // @req FR:cli-check/spec.ste-rationale
  it('passes prose without rationale and ignores the scenario story', () => {
    expect(run('spec.ste-rationale', spec(scenario('- **FR:x.a** (P2): Command MUST do a')))).toEqual([]);
  });
});

describe('spec.deps-sorted', () => {
  const doc = (deps: string) =>
    ['---', 'id: x', 'description: Short.', deps, '---', '', '## Purpose', 'Mission.'].join('\n');
  const fix = (content: string) => {
    const f = getRule('spec.deps-sorted')?.fix;
    if (!f) throw new Error('spec.deps-sorted has no fix');
    return f({ path: '.xe/features/x/spec.md', content });
  };

  // @req FR:cli-check/spec.deps-sorted
  it('flags an unsorted block list at its first out-of-order entry', () => {
    const f = run('spec.deps-sorted', doc('dependencies:\n  - cli-engine\n  - ai-plugin\n  - feature-context'));
    expect(f).toEqual([{ line: 6, text: '- ai-plugin' }]);
  });

  // @req FR:cli-check/spec.deps-sorted
  it('flags an unsorted flow list', () => {
    const f = run('spec.deps-sorted', doc('dependencies: [logging, error-handling]'));
    expect(f).toHaveLength(1);
    expect(f[0].line).toBe(4);
  });

  // @req FR:cli-check/spec.deps-sorted
  it('uses plain ASCII order, not locale order', () => {
    // ASCII: '-' (0x2D) < '/' (0x2F) < letters
    expect(run('spec.deps-sorted', doc('dependencies:\n  - agents-x\n  - agents/a\n  - agentsb'))).toEqual([]);
    expect(run('spec.deps-sorted', doc('dependencies:\n  - agents/a\n  - agents-x'))).toHaveLength(1);
  });

  // @req FR:cli-check/spec.deps-sorted
  it('passes sorted, empty, and missing lists', () => {
    expect(run('spec.deps-sorted', doc('dependencies:\n  - a\n  - b'))).toEqual([]);
    expect(run('spec.deps-sorted', doc('dependencies: []'))).toEqual([]);
    expect(run('spec.deps-sorted', doc('dependencies: [a, b]'))).toEqual([]);
    expect(run('spec.deps-sorted', doc('title: X'))).toEqual([]);
  });

  // @req FR:cli-check/spec.deps-sorted
  it('ignores a dependencies key outside frontmatter', () => {
    const content = doc('dependencies: [a]') + '\n\n```yaml\ndependencies:\n  - z\n  - a\n```';
    expect(run('spec.deps-sorted', content)).toEqual([]);
  });

  // @req FR:cli-check/spec.deps-sorted.fix
  // @req FR:cli-check/registry.fix
  it('sorts a block list in place, keeping everything else', () => {
    const before = doc('dependencies:\n  - cli-engine\n  - ai-plugin # why\n  - feature-context\ntitle: X');
    const after = doc('dependencies:\n  - ai-plugin # why\n  - cli-engine\n  - feature-context\ntitle: X');
    expect(fix(before)).toBe(after);
    expect(run('spec.deps-sorted', fix(before))).toEqual([]);
  });

  // @req FR:cli-check/spec.deps-sorted.fix
  it('sorts a flow list in place', () => {
    expect(fix(doc('dependencies: [logging, error-handling]'))).toBe(doc('dependencies: [error-handling, logging]'));
  });

  // @req FR:cli-check/spec.deps-sorted.fix
  it('preserves CRLF line endings and leaves sorted content unchanged', () => {
    const crlf = doc('dependencies:\n  - b # z\n  - a').replace(/\n/g, '\r\n');
    expect(fix(crlf)).toBe(doc('dependencies:\n  - a\n  - b # z').replace(/\n/g, '\r\n'));
    const sorted = doc('dependencies:\n  - a\n  - b');
    expect(fix(sorted)).toBe(sorted);
  });

  // @req FR:cli-check/spec.deps-sorted.fix
  it('handles flow lists with quotes and a trailing comment, and is idempotent', () => {
    const before = doc("dependencies: ['b', \"a\"] # note");
    const after = fix(before);
    expect(after).toBe(doc("dependencies: [\"a\", 'b'] # note"));
    expect(run('spec.deps-sorted', before)).toHaveLength(1);
    expect(run('spec.deps-sorted', after)).toEqual([]);
    expect(fix(after)).toBe(after);
  });

  // @req FR:cli-check/spec.deps-sorted.fix
  it('keeps duplicates, empty lists, and content without frontmatter or trailing newline', () => {
    expect(fix(doc('dependencies:\n  - a\n  - a\n  - b'))).toBe(doc('dependencies:\n  - a\n  - a\n  - b'));
    expect(fix(doc('dependencies: []'))).toBe(doc('dependencies: []'));
    expect(fix('dependencies:\n  - b\n  - a')).toBe('dependencies:\n  - b\n  - a');
    expect(fix('---\ndependencies:\n  - b\n  - a\n---')).toBe('---\ndependencies:\n  - a\n  - b\n---');
  });

  // @req FR:cli-check/spec.deps-sorted
  it('ignores a dependencies line when the frontmatter never closes', () => {
    const open = '---\nid: x\n\n## Body\ndependencies:\n  - b\n  - a';
    expect(run('spec.deps-sorted', open)).toEqual([]);
    expect(fix(open)).toBe(open);
  });
});
