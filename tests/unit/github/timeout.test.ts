/**
 * Unit tests for timeout handling
 * Test T046: Timeout protection
 */

import { withTimeout } from '../../../src/playbooks/scripts/github/timeout';

describe('Timeout Handling', () => {
  it('should complete within timeout', async () => {
    const fn = async () => 'result';
    const result = await withTimeout(fn, 1000);
    expect(result).toBe('result');
  });

  it('should throw on timeout', async () => {
    const fn = async () => new Promise(resolve => setTimeout(resolve, 1000));
    await expect(withTimeout(fn, 100)).rejects.toThrow('timeout');
  });

  it('should use default timeout', async () => {
    const fn = async () => new Promise(resolve => setTimeout(resolve, 10000));
    await expect(withTimeout(fn)).rejects.toThrow();
  });
});
