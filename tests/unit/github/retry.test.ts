/**
 * Unit tests for retry logic
 * Test T045: Retry with transient errors
 */

import { retryWithBackoff } from '../../../src/playbooks/scripts/github/retry';
import { GitHubNetworkError, GitHubRateLimitError } from '../../../src/playbooks/scripts/github/types';

describe('Retry Logic', () => {
  it('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on transient errors', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new GitHubNetworkError('Network error', 'Retry'))
      .mockResolvedValue('success');
    
    const result = await retryWithBackoff(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new GitHubNetworkError('Error', 'Retry'))
      .mockRejectedValueOnce(new GitHubNetworkError('Error', 'Retry'))
      .mockResolvedValue('success');
    
    const start = Date.now();
    await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 });
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThan(30); // 10 + 20 + operation time
  });

  it('should respect max retries', async () => {
    const fn = jest.fn().mockRejectedValue(new GitHubNetworkError('Error', 'Retry'));
    
    await expect(retryWithBackoff(fn, { maxRetries: 2 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should not retry permanent errors', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Not a transient error'));
    
    await expect(retryWithBackoff(fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
