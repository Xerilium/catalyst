/**
 * Unit tests for TaskParser.
 * @req FR:req-traceability/scan.tasks
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TaskParser } from '@traceability/parsers/task-parser.js';

describe('TaskParser', () => {
  let parser: TaskParser;
  let tempDir: string;

  beforeEach(async () => {
    parser = new TaskParser();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-parser-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // @req FR:req-traceability/scan.tasks
  describe('parseFile', () => {
    it('should extract task with @req references', async () => {
      const content = `# Tasks

- [ ] T001: Implement session validation
  - @req FR:session.validation
  - @req FR:session.expiry
  - Validate token format
`;
      const filePath = path.join(tempDir, 'auth', 'tasks.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);

      const results = await parser.parseFile(filePath);

      expect(results).toHaveLength(1);
      expect(results[0].taskId).toBe('T001');
      expect(results[0].description).toBe('Implement session validation');
      expect(results[0].file).toBe(filePath);
      expect(results[0].requirements).toHaveLength(2);
      // Short-form IDs should be expanded with scope from directory
      expect(results[0].requirements[0].qualified).toBe('FR:auth/session.validation');
      expect(results[0].requirements[1].qualified).toBe('FR:auth/session.expiry');
    });

    it('should handle task with parallel marker [P]', async () => {
      const content = `- [ ] T002: [P] Unit tests for session
  - @req FR:session.validation
`;
      const filePath = path.join(tempDir, 'feature', 'tasks.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);

      const results = await parser.parseFile(filePath);

      expect(results).toHaveLength(1);
      expect(results[0].taskId).toBe('T002');
      expect(results[0].description).toBe('Unit tests for session');
    });

    it('should handle completed tasks', async () => {
      const content = `- [x] T003: Completed task
  - @req FR:done.task
`;
      const filePath = path.join(tempDir, 'feature', 'tasks.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);

      const results = await parser.parseFile(filePath);

      expect(results).toHaveLength(1);
      expect(results[0].taskId).toBe('T003');
    });

    it('should handle tasks without @req references', async () => {
      const content = `- [ ] T004: Setup project structure
  - Create directories
  - Initialize config
`;
      const filePath = path.join(tempDir, 'feature', 'tasks.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);

      const results = await parser.parseFile(filePath);

      expect(results).toHaveLength(1);
      expect(results[0].taskId).toBe('T004');
      expect(results[0].requirements).toHaveLength(0);
    });

    it('should extract multiple tasks from file', async () => {
      const content = `## Tasks

- [ ] T001: First task
  - @req FR:first.req

- [ ] T002: Second task
  - @req FR:second.req

- [ ] T003: Third task without refs
`;
      const filePath = path.join(tempDir, 'feature', 'tasks.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);

      const results = await parser.parseFile(filePath);

      expect(results).toHaveLength(3);
      expect(results[0].taskId).toBe('T001');
      expect(results[1].taskId).toBe('T002');
      expect(results[2].taskId).toBe('T003');
    });

    it('should handle cross-feature references with qualified IDs', async () => {
      const content = `- [ ] T005: Cross-feature task
  - @req FR:session.local
  - @req FR:other-feature/external.req
`;
      const filePath = path.join(tempDir, 'my-feature', 'tasks.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);

      const results = await parser.parseFile(filePath);

      expect(results).toHaveLength(1);
      // Short-form gets current feature scope
      expect(results[0].requirements[0].qualified).toBe('FR:my-feature/session.local');
      // Qualified form preserves its scope
      expect(results[0].requirements[1].qualified).toBe('FR:other-feature/external.req');
    });

    it('should derive scope from directory path', async () => {
      const content = `- [ ] T006: Task with scope
  - @req NFR:perf.timing
`;
      const filePath = path.join(tempDir, 'cool-feature', 'tasks.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);

      const results = await parser.parseFile(filePath);

      expect(results[0].requirements[0].scope).toBe('cool-feature');
    });

    it('should handle empty file', async () => {
      const filePath = path.join(tempDir, 'empty', 'tasks.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, '');

      const results = await parser.parseFile(filePath);

      expect(results).toHaveLength(0);
    });

    it('should ignore non-task lines', async () => {
      const content = `# Tasks

Some intro text

- [ ] T007: Real task
  - @req FR:real.req

This is not a task
- Regular bullet without task ID
`;
      const filePath = path.join(tempDir, 'feature', 'tasks.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);

      const results = await parser.parseFile(filePath);

      expect(results).toHaveLength(1);
      expect(results[0].taskId).toBe('T007');
    });

    it('should track correct line numbers', async () => {
      const content = `# Tasks

- [ ] T001: First task
  - @req FR:first.req

- [ ] T002: Second task
`;
      const filePath = path.join(tempDir, 'feature', 'tasks.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);

      const results = await parser.parseFile(filePath);

      expect(results[0].line).toBe(3);
      expect(results[1].line).toBe(6);
    });
  });

  describe('parseDirectory', () => {
    it('should scan all tasks.md files in directory', async () => {
      const feature1Dir = path.join(tempDir, 'feature-a');
      const feature2Dir = path.join(tempDir, 'feature-b');
      await fs.mkdir(feature1Dir, { recursive: true });
      await fs.mkdir(feature2Dir, { recursive: true });

      await fs.writeFile(
        path.join(feature1Dir, 'tasks.md'),
        '- [ ] T001: Task A\n  - @req FR:a.req'
      );
      await fs.writeFile(
        path.join(feature2Dir, 'tasks.md'),
        '- [ ] T002: Task B\n  - @req FR:b.req'
      );

      const results = await parser.parseDirectory(tempDir);

      expect(results).toHaveLength(2);
      expect(results.map((t) => t.taskId).sort()).toEqual(['T001', 'T002']);
    });

    it('should ignore non-tasks.md files', async () => {
      const featureDir = path.join(tempDir, 'feature');
      await fs.mkdir(featureDir, { recursive: true });

      await fs.writeFile(
        path.join(featureDir, 'tasks.md'),
        '- [ ] T001: Valid task'
      );
      await fs.writeFile(
        path.join(featureDir, 'spec.md'),
        '- [ ] T002: Should be ignored'
      );
      await fs.writeFile(
        path.join(featureDir, 'plan.md'),
        '- [ ] T003: Also ignored'
      );

      const results = await parser.parseDirectory(tempDir);

      expect(results).toHaveLength(1);
      expect(results[0].taskId).toBe('T001');
    });

    it('should return empty array for non-existent directory', async () => {
      const results = await parser.parseDirectory('/non/existent/path');
      expect(results).toHaveLength(0);
    });
  });
});
