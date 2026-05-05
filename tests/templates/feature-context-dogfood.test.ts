import fs from 'fs';
import path from 'path';

describe('feature-context dogfoods its own scenario conventions', () => {
  const specPath = path.join(__dirname, '../../.xe/features/feature-context/spec.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(specPath, 'utf-8');
  });

  // @req FR:feature-context/design-decisions.markdown
  it('design-decisions scenario MUST declare a markdown interface FR', () => {
    expect(content).toMatch(/\*\*FR:design-decisions\.markdown\*\*[^:]*:.*MUST.*markdown/i);
  });

  // @req FR:feature-context/spec.markdown
  it('spec scenario MUST declare a markdown interface FR', () => {
    expect(content).toMatch(/\*\*FR:spec\.markdown\*\*[^:]*:.*MUST.*markdown/i);
  });

  // @req FR:feature-context/rollout.markdown
  it('rollout scenario MUST declare a markdown interface FR', () => {
    expect(content).toMatch(/\*\*FR:rollout\.markdown\*\*[^:]*:.*MUST.*markdown/i);
  });

  // @req FR:feature-context/feedback.markdown
  it('feedback scenario MUST declare a markdown interface FR', () => {
    expect(content).toMatch(/\*\*FR:feedback\.markdown\*\*[^:]*:.*MUST.*markdown/i);
  });

  // @req FR:feature-context/index.cli
  it('index scenario MUST declare a cli interface FR (catalyst index)', () => {
    expect(content).toMatch(/\*\*FR:index\.cli\*\*[^:]*:.*MUST.*catalyst index/);
  });

  // @req FR:feature-context/index.input
  it('index scenario MUST declare an input FR sourcing spec frontmatter', () => {
    expect(content).toMatch(/\*\*FR:index\.input\*\*[^:]*:.*MUST.*frontmatter/i);
  });

  // @req FR:feature-context/spec.location
  it('spec scenario MUST declare an output location FR pointing to .xe/features/{feature-id}/spec.md', () => {
    expect(content).toMatch(/\*\*FR:spec\.location\*\*[^:]*:.*MUST.*\.xe\/features\/\{feature-id\}\/spec\.md/);
  });
});
