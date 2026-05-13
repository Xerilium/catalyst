// @req FR:playbook-actions-data/json-write.@action
// @req FR:playbook-actions-data/json-write.input
// @req FR:playbook-actions-data/json-write.write
// @req FR:playbook-actions-data/json-write.errors
// @req FR:playbook-actions-data/json-write.output

/**
 * Unit tests for JsonWriteAction
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { JsonWriteAction } from '@playbooks/actions/data/json-write-action';

describe('JsonWriteAction', () => {
  const testDir = path.join(process.cwd(), '.tmp-test-json-write');
  let action: JsonWriteAction;

  beforeEach(async () => {
    action = new JsonWriteAction();
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  // ----------------------------------------------------------------------
  // FR:json-write.@action — interface
  // ----------------------------------------------------------------------
  describe('static properties', () => {
    // @req FR:playbook-actions-data/json-write.@action
    it('exposes actionType as "json-write"', () => {
      expect(JsonWriteAction.actionType).toBe('json-write');
    });

    // @req FR:playbook-actions-data/json-write.@action
    it('exposes primaryProperty as "value" for YAML shorthand', () => {
      // value is the primary because path is required structural input;
      // value is the content the user is producing.
      expect(JsonWriteAction.primaryProperty).toBe('value');
    });
  });

  // ----------------------------------------------------------------------
  // FR:json-write.write — happy path; FR:json-write.output — return shape
  // ----------------------------------------------------------------------
  describe('writing valid JSON', () => {
    // @req FR:playbook-actions-data/json-write.write
    // @req FR:playbook-actions-data/json-write.output
    it('writes an object as JSON and returns path + bytesWritten', async () => {
      const filePath = path.join(testDir, 'obj.json');
      const value = { name: 'Catalyst', count: 3 };

      const result = await action.execute({ path: filePath, value });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({
        path: filePath,
        bytesWritten: expect.any(Number)
      });
      const written = await fs.readFile(filePath, 'utf8');
      expect(JSON.parse(written)).toEqual(value);
    });

    // @req FR:playbook-actions-data/json-write.write
    it('pretty-prints with 2-space indentation by default', async () => {
      const filePath = path.join(testDir, 'pretty.json');

      await action.execute({ path: filePath, value: { a: 1, b: 2 } });

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toContain('  "a": 1');
      expect(written).toContain('\n');
    });

    // @req FR:playbook-actions-data/json-write.write
    it('produces compact JSON when pretty is false', async () => {
      const filePath = path.join(testDir, 'compact.json');

      await action.execute({ path: filePath, value: { a: 1, b: 2 }, pretty: false });

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe('{"a":1,"b":2}');
    });

    // @req FR:playbook-actions-data/json-write.output
    it('reports correct bytesWritten', async () => {
      const filePath = path.join(testDir, 'bytes.json');
      const value = { x: 1 };

      const result = await action.execute({ path: filePath, value, pretty: false });

      const stat = await fs.stat(filePath);
      expect((result.value as { bytesWritten: number }).bytesWritten).toBe(stat.size);
    });

    // @req FR:playbook-actions-data/json-write.write
    it('writes arrays', async () => {
      const filePath = path.join(testDir, 'arr.json');

      await action.execute({ path: filePath, value: [1, 2, 3], pretty: false });

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe('[1,2,3]');
    });

    // @req FR:playbook-actions-data/json-write.write
    it('writes null', async () => {
      const filePath = path.join(testDir, 'null.json');

      const result = await action.execute({ path: filePath, value: null });

      expect(result.code).toBe('Success');
      const written = await fs.readFile(filePath, 'utf8');
      expect(written.trim()).toBe('null');
    });
  });

  // ----------------------------------------------------------------------
  // FR:json-write.errors
  // ----------------------------------------------------------------------
  describe('errors', () => {
    // @req FR:playbook-actions-data/json-write.errors
    it('returns JsonStringifyError for cyclic references', async () => {
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;

      const result = await action.execute({
        path: path.join(testDir, 'cyclic.json'),
        value: cyclic
      });

      expect(result.code).toBe('JsonStringifyError');
      expect(result.error).toBeDefined();
    });

    // @req FR:playbook-actions-data/json-write.errors
    it('JsonStringifyError guidance includes the file path', async () => {
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      const filePath = path.join(testDir, 'cyclic-path.json');

      const result = await action.execute({ path: filePath, value: cyclic });

      expect(result.error?.guidance).toContain(filePath);
    });

    // @req FR:playbook-actions-data/json-write.errors
    it('returns JsonStringifyError for BigInt values', async () => {
      const result = await action.execute({
        path: path.join(testDir, 'bigint.json'),
        value: { big: BigInt(1) }
      });

      expect(result.code).toBe('JsonStringifyError');
    });

    // @req FR:playbook-actions-data/json-write.errors
    it('propagates FileInvalidPath for path traversal', async () => {
      const result = await action.execute({
        path: '../../../etc/passwd',
        value: { x: 1 }
      });

      expect(result.code).toBe('FileInvalidPath');
      expect(result.error).toBeDefined();
    });

    // @req FR:playbook-actions-data/json-write.errors
    it('returns FileConfigInvalid when path is missing', async () => {
      // @ts-expect-error — testing invalid runtime input
      const result = await action.execute({ value: { x: 1 } });

      expect(result.code).toBe('FileConfigInvalid');
      expect(result.error).toBeDefined();
    });
  });
});
