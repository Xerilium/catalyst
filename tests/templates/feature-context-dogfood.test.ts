import fs from 'fs';
import path from 'path';

describe('feature-context dogfoods its own scenario conventions', () => {
  const specPath = path.join(__dirname, '../../.xe/features/feature-context/spec.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(specPath, 'utf-8');
  });

  // @req FR:feature-context/spec.scenarios.structure.interfaces.kinds
  it('interface sigil rules MUST enumerate canonical surface kinds (cli, api, file, etc.)', () => {
    // Convention text MUST list common surface kinds so AI authors don't invent ad-hoc sigils
    expect(content).toMatch(/`@cli`/);
    expect(content).toMatch(/`@api`/);
    expect(content).toMatch(/`@file`/);
    // Body MUST be the literal address (path/command/endpoint), not prose
    expect(content).toMatch(/Body MUST be the literal address/);
  });

  // @req FR:feature-context/spec.scenarios.structure.interfaces.sigil
  it('all interface FRs MUST use the @ sigil prefix on the interface token', () => {
    expect(content).toMatch(/\*\*FR:design-decisions\.@file\*\*/);
    expect(content).toMatch(/\*\*FR:spec\.@file\*\*/);
    expect(content).toMatch(/\*\*FR:rollout\.@file\*\*/);
    expect(content).toMatch(/\*\*FR:feedback\.@file\*\*/);
    expect(content).toMatch(/\*\*FR:index\.@cli\*\*/);
    expect(content).toMatch(/\*\*FR:index\.@file\*\*/);
    // Old @markdown / .location forms must be gone
    expect(content).not.toMatch(/\*\*FR:[a-z-]+\.@markdown\*\*/);
    expect(content).not.toMatch(/\*\*FR:[a-z-]+\.location\*\*/);
  });

  // @req FR:feature-context/design-decisions.@file
  it('design-decisions scenario MUST declare an @file interface FR with the file path', () => {
    expect(content).toMatch(/\*\*FR:design-decisions\.@file\*\*[^:]*:.*\.xe\/features\/\{feature-id\}\/design-decisions\.md/);
  });

  // @req FR:feature-context/spec.@file
  it('spec scenario MUST declare an @file interface FR with the file path', () => {
    expect(content).toMatch(/\*\*FR:spec\.@file\*\*[^:]*:.*\.xe\/features\/\{feature-id\}\/spec\.md/);
  });

  // @req FR:feature-context/rollout.@file
  it('rollout scenario MUST declare an @file interface FR with the file path', () => {
    expect(content).toMatch(/\*\*FR:rollout\.@file\*\*[^:]*:.*\.xe\/rollouts\/rollout-\{id\}\.md/);
  });

  // @req FR:feature-context/feedback.@file
  it('feedback scenario MUST declare an @file interface FR with the file path', () => {
    expect(content).toMatch(/\*\*FR:feedback\.@file\*\*[^:]*:.*\.xe\/features\/\{feature-id\}\/feedback\.md/);
  });

  // @req FR:feature-context/index.@cli
  it('index scenario MUST declare a @cli interface FR for the regen command', () => {
    expect(content).toMatch(/\*\*FR:index\.@cli\*\*[^:]*:.*catalyst index/);
  });

  // @req FR:feature-context/index.@file
  it('index scenario MUST declare an @file interface FR for the README path', () => {
    expect(content).toMatch(/\*\*FR:index\.@file\*\*[^:]*:.*\.xe\/features\/README\.md/);
  });

  // @req FR:feature-context/index.input
  it('index scenario MUST declare an input FR sourcing spec frontmatter', () => {
    expect(content).toMatch(/\*\*FR:index\.input\*\*[^:]*:.*MUST.*frontmatter/i);
  });
});
