/**
 * Tests for check rule severity resolution and config loading.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadSeverityConfig, resolveSeverity } from '../../../src/check/severity';

describe('resolveSeverity', () => {
  // @req FR:cli-check/severity.default
  it('defaults to warning', () => {
    expect(resolveSeverity('spec.actor', {})).toBe('warning');
  });

  // @req FR:cli-check/severity.precedence
  it('prefers an exact entry over a wildcard', () => {
    expect(resolveSeverity('spec.actor', { 'spec.*': 'error', 'spec.actor': 'disable' })).toBe('disable');
  });

  // @req FR:cli-check/severity.precedence.wildcard
  it('prefers the longest wildcard prefix', () => {
    expect(resolveSeverity('spec.sub.actor', { 'spec.*': 'error', 'spec.sub.*': 'warning' })).toBe('warning');
  });

  // @req FR:cli-check/severity.input
  it('applies a wildcard when no exact entry exists', () => {
    expect(resolveSeverity('spec.refs', { 'spec.*': 'error' })).toBe('error');
  });

  // @req FR:cli-check/severity.disable
  it('reports disable for a disabled rule', () => {
    expect(resolveSeverity('spec.refs', { 'spec.refs': 'disable' })).toBe('disable');
  });
});

describe('loadSeverityConfig', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-sev-'));
    fs.mkdirSync(path.join(root, '.xe', 'config'), { recursive: true });
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const write = (json: unknown) =>
    fs.writeFileSync(path.join(root, '.xe', 'config', 'catalyst.json'), JSON.stringify(json));

  // @req FR:cli-check/severity.@json
  it('reads check.rules from catalyst.json', async () => {
    write({ check: { rules: { 'spec.actor': 'error' } } });
    expect(await loadSeverityConfig(root)).toEqual({ 'spec.actor': 'error' });
  });

  // @req FR:cli-check/severity.default
  it('returns an empty map when the file or key is absent', async () => {
    expect(await loadSeverityConfig(root)).toEqual({});
    write({ traceability: {} });
    expect(await loadSeverityConfig(root)).toEqual({});
  });

  // @req FR:cli-check/severity.invalid
  it('fails with InvalidInput naming the entry for a bad severity', async () => {
    write({ check: { rules: { 'spec.actor': 'fatal' } } });
    await expect(loadSeverityConfig(root)).rejects.toMatchObject({
      code: 'InvalidInput',
      message: expect.stringContaining('spec.actor'),
    });
  });
});
