// @req FR:playbook-actions-data/json-read.@action
// @req FR:playbook-actions-data/json-read.input
// @req FR:playbook-actions-data/json-read.read
// @req FR:playbook-actions-data/json-read.errors
// @req FR:playbook-actions-data/json-read.output

/**
 * Unit tests for JsonReadAction
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { JsonReadAction } from '@playbooks/actions/data/json-read-action';

describe('JsonReadAction', () => {
  const testDir = path.join(process.cwd(), '.tmp-test-json-read');
  let action: JsonReadAction;

  beforeEach(async () => {
    action = new JsonReadAction();
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
  // FR:json-read.@action — interface
  // ----------------------------------------------------------------------
  describe('static properties', () => {
    // @req FR:playbook-actions-data/json-read.@action
    it('exposes actionType as "json-read"', () => {
      expect(JsonReadAction.actionType).toBe('json-read');
    });

    // @req FR:playbook-actions-data/json-read.@action
    it('exposes primaryProperty as "path" for YAML shorthand', () => {
      expect(JsonReadAction.primaryProperty).toBe('path');
    });
  });

  // ----------------------------------------------------------------------
  // FR:json-read.read — happy path; FR:json-read.output — parsed value
  // ----------------------------------------------------------------------
  describe('parsing valid JSON', () => {
    // @req FR:playbook-actions-data/json-read.read
    // @req FR:playbook-actions-data/json-read.output
    it('returns parsed object', async () => {
      const filePath = path.join(testDir, 'object.json');
      await fs.writeFile(filePath, JSON.stringify({ name: 'Catalyst', count: 3 }));

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ name: 'Catalyst', count: 3 });
      expect(result.error).toBeUndefined();
    });

    // @req FR:playbook-actions-data/json-read.output
    it('returns parsed array', async () => {
      const filePath = path.join(testDir, 'array.json');
      await fs.writeFile(filePath, JSON.stringify(['a', 'b', 'c']));

      const result = await action.execute({ path: filePath });

      expect(result.value).toEqual(['a', 'b', 'c']);
    });

    // @req FR:playbook-actions-data/json-read.output
    it('returns parsed primitive (string)', async () => {
      const filePath = path.join(testDir, 'primitive.json');
      await fs.writeFile(filePath, JSON.stringify('hello'));

      const result = await action.execute({ path: filePath });

      expect(result.value).toBe('hello');
    });

    // @req FR:playbook-actions-data/json-read.output
    it('returns parsed null', async () => {
      const filePath = path.join(testDir, 'null.json');
      await fs.writeFile(filePath, 'null');

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBeNull();
    });

    // @req FR:playbook-actions-data/json-read.output
    it('returns parsed number', async () => {
      const filePath = path.join(testDir, 'number.json');
      await fs.writeFile(filePath, '42');

      const result = await action.execute({ path: filePath });

      expect(result.value).toBe(42);
    });
  });

  // ----------------------------------------------------------------------
  // FR:json-read.input — defaults
  // ----------------------------------------------------------------------
  describe('input defaults', () => {
    // @req FR:playbook-actions-data/json-read.input
    it('defaults encoding to utf8', async () => {
      const filePath = path.join(testDir, 'utf8.json');
      await fs.writeFile(filePath, JSON.stringify({ emoji: '✨' }));

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect((result.value as { emoji: string }).emoji).toBe('✨');
    });
  });

  // ----------------------------------------------------------------------
  // FR:json-read.errors
  // ----------------------------------------------------------------------
  describe('errors', () => {
    // @req FR:playbook-actions-data/json-read.errors
    it('returns JsonParseError for malformed JSON', async () => {
      const filePath = path.join(testDir, 'bad.json');
      await fs.writeFile(filePath, '{ not valid json');

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('JsonParseError');
      expect(result.error).toBeDefined();
    });

    // @req FR:playbook-actions-data/json-read.errors
    it('JsonParseError guidance includes the file path', async () => {
      const filePath = path.join(testDir, 'bad-path.json');
      await fs.writeFile(filePath, 'not json');

      const result = await action.execute({ path: filePath });

      expect(result.error?.guidance).toContain(filePath);
    });

    // @req FR:playbook-actions-data/json-read.errors
    it('propagates FileNotFound from the underlying file read', async () => {
      const result = await action.execute({
        path: path.join(testDir, 'does-not-exist.json')
      });

      expect(result.code).toBe('FileNotFound');
      expect(result.error).toBeDefined();
    });

    // @req FR:playbook-actions-data/json-read.errors
    it('propagates FileInvalidPath for path traversal', async () => {
      const result = await action.execute({
        path: '../../../etc/passwd'
      });

      expect(result.code).toBe('FileInvalidPath');
      expect(result.error).toBeDefined();
    });

    // @req FR:playbook-actions-data/json-read.errors
    it('returns FileConfigInvalid when path is missing', async () => {
      // @ts-expect-error — testing invalid runtime input
      const result = await action.execute({});

      expect(result.code).toBe('FileConfigInvalid');
      expect(result.error).toBeDefined();
    });
  });
});
