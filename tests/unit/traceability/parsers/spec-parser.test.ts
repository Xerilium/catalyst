/**
 * Unit tests for SpecParser.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SpecParser } from '@traceability/parsers/spec-parser.js';

/**
 * @req FR:req-traceability/scan.features
 * @req FR:req-traceability/scan.initiatives
 * @req FR:req-traceability/state.values
 * @req FR:req-traceability/state.marker
 * @req FR:req-traceability/state.deprecated-format
 */
describe('SpecParser', () => {
  let parser: SpecParser;
  let tempDir: string;

  beforeEach(async () => {
    parser = new SpecParser();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spec-parser-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // @req FR:req-traceability/scan.features
  describe('parseFile', () => {
    it('should extract single requirement from spec', async () => {
      const specContent = `# Feature Spec

## Requirements

- **FR:auth.session**: Sessions MUST expire after 90 minutes
`;
      const specPath = path.join(tempDir, 'my-feature', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, specContent);

      const results = await parser.parseFile(specPath);

      expect(results).toHaveLength(1);
      expect(results[0].id.type).toBe('FR');
      expect(results[0].id.path).toBe('auth.session');
      expect(results[0].id.scope).toBe('my-feature');
      expect(results[0].text).toBe('Sessions MUST expire after 90 minutes');
      expect(results[0].state).toBe('active');
      expect(results[0].specFile).toBe(specPath);
      expect(results[0].specLine).toBe(5);
    });

    it('should extract multiple requirements from file', async () => {
      const specContent = `## Requirements

- **FR:auth.login**: Users MUST be able to log in
- **FR:auth.logout**: Users MUST be able to log out
- **NFR:perf.response**: Response time SHOULD be under 200ms
`;
      const specPath = path.join(tempDir, 'auth', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, specContent);

      const results = await parser.parseFile(specPath);

      expect(results).toHaveLength(3);
      expect(results[0].id.path).toBe('auth.login');
      expect(results[1].id.path).toBe('auth.logout');
      expect(results[2].id.type).toBe('NFR');
      expect(results[2].id.path).toBe('perf.response');
    });

    it('should extract nested requirements (indented bullets)', async () => {
      const specContent = `## Requirements

- **FR:auth**: Authentication requirements
  - **FR:auth.login**: Users MUST be able to log in
  - **FR:auth.session**: Session management
    - **FR:auth.session.expiry**: Sessions MUST expire
`;
      const specPath = path.join(tempDir, 'auth', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, specContent);

      const results = await parser.parseFile(specPath);

      expect(results).toHaveLength(4);
      expect(results.map((r) => r.id.path)).toEqual([
        'auth',
        'auth.login',
        'auth.session',
        'auth.session.expiry',
      ]);
    });

    // @req FR:req-traceability/state.marker
    it('should parse deferred state marker', async () => {
      const specContent = `## Requirements

- **FR:auth.oauth**: [deferred] OAuth integration for third-party login
`;
      const specPath = path.join(tempDir, 'auth', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, specContent);

      const results = await parser.parseFile(specPath);

      expect(results).toHaveLength(1);
      expect(results[0].state).toBe('deferred');
      expect(results[0].text).toBe('OAuth integration for third-party login');
    });

    // @req FR:req-traceability/state.deprecated-format
    it('should parse deprecated state with migration target', async () => {
      const specContent = `## Requirements

- ~~**FR:auth.legacy**~~: [deprecated: FR:auth.session] Old auth system
`;
      const specPath = path.join(tempDir, 'auth', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, specContent);

      const results = await parser.parseFile(specPath);

      expect(results).toHaveLength(1);
      expect(results[0].state).toBe('deprecated');
      expect(results[0].deprecatedTarget).toBe('FR:auth.session');
      expect(results[0].text).toBe('Old auth system');
    });

    // @req NFR:req-traceability/test.parser-robustness
    it('should skip malformed lines without throwing', async () => {
      const specContent = `## Requirements

- **FR:valid.req**: This is valid
- This line has no requirement ID
- **INVALID:bad.type**: Wrong type prefix
- **FR:another.valid**: This is also valid
`;
      const specPath = path.join(tempDir, 'test', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, specContent);

      const results = await parser.parseFile(specPath);

      expect(results).toHaveLength(2);
      expect(results[0].id.path).toBe('valid.req');
      expect(results[1].id.path).toBe('another.valid');
    });

    it('should derive scope from directory path', async () => {
      const specContent = `- **FR:session.expiry**: Sessions expire`;
      const specPath = path.join(tempDir, 'my-cool-feature', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, specContent);

      const results = await parser.parseFile(specPath);

      expect(results[0].id.scope).toBe('my-cool-feature');
      expect(results[0].id.qualified).toBe('FR:my-cool-feature/session.expiry');
    });

    it('should handle empty file', async () => {
      const specPath = path.join(tempDir, 'empty', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, '');

      const results = await parser.parseFile(specPath);

      expect(results).toHaveLength(0);
    });

    it('should handle file with no requirements section', async () => {
      const specContent = `# Feature

This is just documentation with no requirements.
`;
      const specPath = path.join(tempDir, 'docs', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, specContent);

      const results = await parser.parseFile(specPath);

      expect(results).toHaveLength(0);
    });
  });

  // @req FR:req-traceability/scan.features
  // @req FR:req-traceability/scan.initiatives
  describe('parseDirectory', () => {
    it('should scan all spec.md files in features directory', async () => {
      // Create feature structure
      const feature1Dir = path.join(tempDir, 'feature-a');
      const feature2Dir = path.join(tempDir, 'feature-b');
      await fs.mkdir(feature1Dir, { recursive: true });
      await fs.mkdir(feature2Dir, { recursive: true });

      await fs.writeFile(
        path.join(feature1Dir, 'spec.md'),
        '- **FR:req1**: Requirement 1'
      );
      await fs.writeFile(
        path.join(feature2Dir, 'spec.md'),
        '- **FR:req2**: Requirement 2'
      );

      const results = await parser.parseDirectory(tempDir);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id.scope).sort()).toEqual([
        'feature-a',
        'feature-b',
      ]);
    });

    it('should ignore non-spec.md files', async () => {
      const featureDir = path.join(tempDir, 'feature');
      await fs.mkdir(featureDir, { recursive: true });

      await fs.writeFile(
        path.join(featureDir, 'spec.md'),
        '- **FR:valid**: Valid'
      );
      await fs.writeFile(
        path.join(featureDir, 'plan.md'),
        '- **FR:ignored**: Should be ignored'
      );
      await fs.writeFile(
        path.join(featureDir, 'tasks.md'),
        '- **FR:also.ignored**: Also ignored'
      );

      const results = await parser.parseDirectory(tempDir);

      expect(results).toHaveLength(1);
      expect(results[0].id.path).toBe('valid');
    });

    it('should return empty array for non-existent directory', async () => {
      const results = await parser.parseDirectory('/non/existent/path');
      expect(results).toHaveLength(0);
    });

    it('should handle mixed valid and invalid specs', async () => {
      const validDir = path.join(tempDir, 'valid-feature');
      const invalidDir = path.join(tempDir, 'invalid-feature');
      await fs.mkdir(validDir, { recursive: true });
      await fs.mkdir(invalidDir, { recursive: true });

      await fs.writeFile(
        path.join(validDir, 'spec.md'),
        '- **FR:valid**: Valid requirement'
      );
      // Write malformed content
      await fs.writeFile(
        path.join(invalidDir, 'spec.md'),
        'No requirements here'
      );

      const results = await parser.parseDirectory(tempDir);

      expect(results).toHaveLength(1);
      expect(results[0].id.path).toBe('valid');
    });
  });
});
