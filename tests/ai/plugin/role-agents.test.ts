/**
 * Tests for the role agent templates.
 *
 * The agents are prompt templates, so these tests lock each role's scope,
 * boundaries, and tools.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter } from '../../../scripts/generate-plugin';

const AGENTS_DIR = join(__dirname, '../../../src/resources/ai-plugin/agents');
const load = (name: string) => parseFrontmatter(readFileSync(join(AGENTS_DIR, `${name}.md`), 'utf8'));
const tools = (name: string) => (load(name).fields.get('tools') ?? '').split(',').map((t) => t.trim());

describe.each(['creative-director', 'content-strategist', 'product-manager', 'architect', 'engineer'])(
  '%s handoffs',
  (name) => {
    it('lists handoffs for the caller to route', () => {
      const { body } = load(name);
      expect(body).toMatch(/You do not start other agents/);
      expect(body).toMatch(/\*\*Handoffs:\*\*/);
    });
  },
);

describe('creative-director agent', () => {
  const { fields, body } = load('creative-director');

  // @req FR:agents/creative-director/agent.@ai-agent
  it('is published as the creative-director agent', () => {
    expect(fields.get('name')).toBe('creative-director');
  });

  // @req FR:agents/creative-director/agent.scope
  // @req FR:agents/creative-director/agent.scope.visual
  // @req FR:agents/creative-director/agent.scope.product
  // @req FR:agents/creative-director/agent.scope.marketing
  // @req FR:agents/creative-director/agent.scope.media
  // @req FR:agents/creative-director/agent.scope.accessibility
  // @req FR:agents/creative-director/agent.scope.voice
  // @req FR:agents/creative-director/agent.scope.system
  it('owns brand, visual, product, marketing, media, and accessibility direction', () => {
    expect(fields.get('description')).toMatch(/brand, visual design, UX, and creative direction/i);
    expect(body).toMatch(/\*\*Visual design:\*\*.*typography.*color.*motion/i);
    expect(body).toMatch(/\*\*Product design:\*\*.*screens.*flows.*interaction/i);
    expect(body).toMatch(/\*\*Marketing creative:\*\*/);
    expect(body).toMatch(/\*\*Generated media:\*\*.*images and video/i);
    expect(body).toMatch(/WCAG 2\.2 AA/);
    expect(body).toMatch(/brand voice/i);
    expect(body).toMatch(/\*\*Design system:\*\*/);
    expect(body).toMatch(/emails/);
  });

  // @req FR:agents/creative-director/agent.end-users
  it('defines the best option in end-user terms', () => {
    expect(body).toMatch(/least effort, the fewest errors, and the most trust/);
  });

  // @req FR:agents/creative-director/agent.direction
  // @req FR:agents/creative-director/agent.direction.standard
  // @req FR:agents/creative-director/agent.direction.principles
  // @req FR:agents/creative-director/agent.direction.decisions
  // @req FR:agents/creative-director/agent.direction.brief
  it('records direction where Catalyst keeps it', () => {
    expect(body).toMatch(/\.xe\/standards\/design\.md/);
    expect(body).toMatch(/Design Principles section of `\.xe\/product\.md`/);
    expect(body).toMatch(/design-decisions\.md/);
    expect(body).toMatch(/goal, audience, key message, constraints, and deliverables/);
  });

  // @req FR:agents/creative-director/agent.consistent
  // @req FR:agents/creative-director/agent.consistent.change
  // @req FR:agents/creative-director/agent.consistent.change.state
  it('changes direction only on evidence', () => {
    expect(body).toMatch(/consistent with the recorded direction/i);
    expect(body).toMatch(/only when evidence shows it fails end users/i);
    expect(body).toMatch(/Say what changes and why/);
  });

  // @req FR:agents/creative-director/agent.review
  // @req FR:agents/creative-director/agent.review.findings
  // @req FR:agents/creative-director/agent.review.verdict
  // @req FR:agents/creative-director/agent.review.visual
  // @req FR:agents/creative-director/agent.review.visual.source-only
  it('reviews with located findings and a verdict', () => {
    expect(body).toMatch(/location.*the problem, and the fix/i);
    expect(body).toMatch(/Review what end users see/);
    expect(body).toMatch(/checked only the source/);
    expect(body).toMatch(/\*\*Approve\*\* or \*\*Request changes\*\*/);
  });

  // @req FR:agents/creative-director/agent.decide
  it('gives one recommendation per decision', () => {
    expect(body).toMatch(/one recommendation for each decision/i);
  });

  // @req FR:agents/creative-director/agent.edits
  it('edits only direction files', () => {
    expect(body).toMatch(/Edit only these direction files/);
    expect(tools('creative-director')).not.toContain('Bash');
  });

  // @req FR:agents/creative-director/agent.handoff
  // @req FR:agents/creative-director/agent.handoff.output
  // @req FR:agents/creative-director/agent.output
  it('hands off scope and feasibility and leads with the decision', () => {
    expect(body).toMatch(/`product-manager`/);
    expect(body).toMatch(/`architect`/);
    expect(body).toMatch(/`content-strategist`/);
    expect(body).toMatch(/Lead with the decision or verdict/);
  });
});

describe('content-strategist agent', () => {
  const { fields, body } = load('content-strategist');

  // @req FR:agents/content-strategist/agent.@ai-agent
  it('is published as the content-strategist agent', () => {
    expect(fields.get('name')).toBe('content-strategist');
  });

  // @req FR:agents/content-strategist/agent.scope
  // @req FR:agents/content-strategist/agent.scope.ui
  // @req FR:agents/content-strategist/agent.scope.marketing
  // @req FR:agents/content-strategist/agent.scope.accessibility
  // @req FR:agents/content-strategist/agent.scope.localization
  it('owns product copy on websites and in apps', () => {
    expect(fields.get('description')).toMatch(/product copy for websites and apps/i);
    expect(body).toMatch(/You own product copy/);
    expect(body).toMatch(/\*\*Interface copy:\*\*.*errors.*empty states/i);
    expect(body).toMatch(/\*\*Marketing copy:\*\*.*ads, social posts, and campaign headlines/i);
    expect(body).toMatch(/alt text/);
    expect(body).toMatch(/translated/);
  });

  // @req FR:agents/content-strategist/agent.write
  it('can edit the files that hold copy', () => {
    expect(tools('content-strategist')).toEqual(expect.arrayContaining(['Read', 'Edit', 'Write']));
  });

  // @req FR:agents/content-strategist/agent.copy-only
  it('changes only copy text', () => {
    expect(body).toMatch(/Change only copy text/);
    expect(tools('content-strategist')).not.toContain('Bash');
  });

  // @req FR:agents/content-strategist/agent.standards
  // @req FR:agents/content-strategist/agent.standards.voice
  // @req FR:agents/content-strategist/agent.standards.terms
  // @req FR:agents/content-strategist/agent.standards.follow
  it('keeps and follows content standards with voice, tone, and glossary', () => {
    expect(body).toMatch(/`\.xe\/standards\/content\.md`/);
    expect(body).toMatch(/\*\*Voice and tone:\*\*.*one home for brand voice/);
    expect(body).toMatch(/\*\*Glossary:\*\*/);
    expect(body).toMatch(/Follow the content standards first/);
  });

  // @req FR:agents/content-strategist/agent.plain-language
  it('writes in plain language, not Simplified Technical English', () => {
    expect(body).toMatch(/plain language/);
    expect(body).not.toMatch(/Simplified Technical English/);
  });

  // @req FR:agents/content-strategist/agent.facts
  it('does not invent facts', () => {
    expect(body).toMatch(/Do not invent product facts/);
  });

  // @req FR:agents/content-strategist/agent.escalate
  // @req FR:agents/content-strategist/agent.output
  it('escalates to the creative director and reports changed files and open questions', () => {
    expect(body).toMatch(/`creative-director`/);
    expect(body).toMatch(/\*\*Changed files:\*\*/);
    expect(body).toMatch(/\*\*Open questions:\*\*/);
  });
});

describe('product-manager agent', () => {
  const { fields, body } = load('product-manager');

  // @req FR:agents/product-manager/agent.@ai-agent
  it('is published as the product-manager agent', () => {
    expect(fields.get('name')).toBe('product-manager');
  });

  // @req FR:agents/product-manager/agent.scope
  // @req FR:agents/product-manager/agent.scope.vision
  // @req FR:agents/product-manager/agent.scope.specs
  // @req FR:agents/product-manager/agent.scope.priority
  it('owns vision, specs, scope, and priority', () => {
    expect(body).toMatch(/`\.xe\/product\.md`/);
    expect(body).toMatch(/spec\.md/);
    expect(body).toMatch(/\*\*Scope and priority:\*\*/);
  });

  // @req FR:agents/product-manager/agent.problem
  // @req FR:agents/product-manager/agent.evidence
  it('starts from the user problem and evidence', () => {
    expect(body).toMatch(/State the user problem and the expected outcome before you set scope/);
    expect(body).toMatch(/evidence from users, data, or the market/);
  });

  // @req FR:agents/product-manager/agent.workflow
  it('uses Catalyst workflows', () => {
    expect(body).toMatch(/\/catalyst:create/);
    expect(body).toMatch(/\/catalyst:change/);
  });

  // @req FR:agents/product-manager/agent.handoff
  // @req FR:agents/product-manager/agent.handoff.output
  // @req FR:agents/product-manager/agent.output
  it('hands off design and technical design and leads with the decision', () => {
    expect(body).toMatch(/`creative-director`/);
    expect(body).toMatch(/`architect`/);
    expect(body).toMatch(/Lead with the decision/);
  });
});

describe('architect agent', () => {
  const { fields, body } = load('architect');

  // @req FR:agents/architect/agent.@ai-agent
  it('is published as the architect agent', () => {
    expect(fields.get('name')).toBe('architect');
  });

  // @req FR:agents/architect/agent.scope
  // @req FR:agents/architect/agent.scope.structure
  // @req FR:agents/architect/agent.scope.quality
  // @req FR:agents/architect/agent.scope.engineering
  it('owns structure, quality attributes, and the engineering docs', () => {
    expect(body).toMatch(/\*\*Structure:\*\*.*boundaries/);
    expect(body).toMatch(/security, reliability, performance, scalability, and observability/);
    expect(body).toMatch(/`\.xe\/architecture\.md` and `\.xe\/engineering\.md`/);
  });

  // @req FR:agents/architect/agent.decisions
  // @req FR:agents/architect/agent.trade-offs
  it('records decisions with rejected options and picks the simplest design', () => {
    expect(body).toMatch(/design-decisions\.md`, with the options you rejected/);
    expect(body).toMatch(/simplest design that meets the quality targets/);
  });

  // @req FR:agents/architect/agent.review
  // @req FR:agents/architect/agent.review.findings
  // @req FR:agents/architect/agent.review.verdict
  it('reviews with located findings and a verdict', () => {
    expect(body).toMatch(/location \(file and line\), the risk, and the fix/);
    expect(body).toMatch(/\*\*Approve\*\* or \*\*Request changes\*\*/);
  });

  // @req FR:agents/architect/agent.handoff
  // @req FR:agents/architect/agent.handoff.output
  // @req FR:agents/architect/agent.output
  it('hands off scope, design, and implementation', () => {
    expect(body).toMatch(/`product-manager`/);
    expect(body).toMatch(/`creative-director`/);
    expect(body).toMatch(/`engineer`/);
    expect(body).toMatch(/Lead with the decision or verdict/);
  });
});

describe('engineer agent', () => {
  const { fields, body } = load('engineer');

  // @req FR:agents/engineer/agent.@ai-agent
  // @req FR:agents/engineer/agent.scope
  it('is published as the engineer agent and owns code and tests', () => {
    expect(fields.get('name')).toBe('engineer');
    expect(body).toMatch(/\*\*Code:\*\*/);
    expect(body).toMatch(/\*\*Tests:\*\*/);
  });

  // @req FR:agents/engineer/agent.spec-first
  // @req FR:agents/engineer/agent.spec-first.update
  // @req FR:agents/engineer/agent.spec-first.scope
  // @req FR:agents/engineer/agent.process
  // @req FR:agents/engineer/agent.conventions
  it('works spec first, to the process and conventions', () => {
    expect(body).toMatch(/Read the feature spec before you change feature code/);
    expect(body).toMatch(/When an agreed change alters behavior, update the spec to match before the code/);
    expect(body).toMatch(/Send new or changed scope to the `product-manager` agent/);
    expect(body).toMatch(/`\.xe\/process\/development\.md`/);
    expect(body).toMatch(/`\.xe\/architecture\.md`, `\.xe\/engineering\.md`/);
  });

  // @req FR:agents/engineer/agent.tests
  // @req FR:agents/engineer/agent.traceability
  it('proves changes with failing-first tests and links requirements', () => {
    expect(body).toMatch(/test that fails without the change/);
    expect(body).toMatch(/`@req` links/);
  });

  // @req FR:agents/engineer/agent.handoff
  // @req FR:agents/engineer/agent.handoff.output
  // @req FR:agents/engineer/agent.output
  it('hands off scope, design, copy, and architecture', () => {
    for (const agent of ['product-manager', 'creative-director', 'content-strategist', 'architect']) {
      expect(body).toMatch(new RegExp(`\`${agent}\``));
    }
    expect(body).toMatch(/changed files, the test results, the open questions, and \*\*Handoffs:\*\*/);
  });
});
