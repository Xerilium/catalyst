/**
 * Unit tests for GitHubAdapter PR operations
 * Tests T015-T025: All PR-related adapter methods
 */

import { GitHubAdapter } from '../../../src/playbooks/scripts/github/adapter';
import { execSync } from 'child_process';

jest.mock('child_process');
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('GitHubAdapter - PR Operations', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    adapter = new GitHubAdapter();
    jest.clearAllMocks();
  });

  describe('findPRs()', () => {
    it('should find PRs by search pattern', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify([
        { number: 1, title: 'Feature PR', state: 'open' },
      ])));

      const result = await adapter.findPRs('Feature');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getPR()', () => {
    it('should get PR metadata', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({
        number: 1,
        title: 'Test PR',
        body: 'PR description',
        state: 'open',
        headRefName: 'feature-branch',
        baseRefName: 'main',
      })));

      const result = await adapter.getPR(1);

      expect(result.success).toBe(true);
      expect(result.data!.headBranch).toBe('feature-branch');
    });
  });

  describe('getPRFeature()', () => {
    it('should extract feature ID from branch name', async () => {
      mockExecSync.mockReturnValueOnce(Buffer.from(JSON.stringify({
        headRefName: 'xe/github-integration',
      })));
      mockExecSync.mockReturnValueOnce(Buffer.from('true')); // file exists check

      const result = await adapter.getPRFeature(1);

      expect(result.success).toBe(true);
      expect(result.data!.featureId).toBe('github-integration');
    });
  });

  describe('listPRs()', () => {
    it('should list PRs with filters', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify([
        { number: 1, state: 'open' },
      ])));

      const result = await adapter.listPRs({ state: 'open' });

      expect(result.success).toBe(true);
    });
  });

  describe('getPRComments()', () => {
    it('should get all PR comments', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify([
        { id: 1, body: 'Comment 1' },
      ])));

      const result = await adapter.getPRComments(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('addPRComment()', () => {
    it('should add comment to PR', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({
        id: 1,
        body: 'New comment',
      })));

      const result = await adapter.addPRComment(1, 'New comment');

      expect(result.success).toBe(true);
    });
  });

  describe('findPRThreads()', () => {
    it('should find unresolved threads', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify([
        { id: 1, resolved: false, comments: [] },
      ])));

      const result = await adapter.findPRThreads(1);

      expect(result.success).toBe(true);
    });
  });

  describe('replyToThread()', () => {
    it('should reply to thread', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({
        id: 1,
        body: 'Reply',
      })));

      const result = await adapter.replyToThread(1, 123, 'Reply');

      expect(result.success).toBe(true);
    });
  });

  describe('getPRReviews()', () => {
    it('should get PR reviews', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify([
        { id: 1, state: 'APPROVED' },
      ])));

      const result = await adapter.getPRReviews(1);

      expect(result.success).toBe(true);
    });
  });

  describe('submitPRReview()', () => {
    it('should submit review', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({
        id: 1,
        state: 'APPROVED',
      })));

      const result = await adapter.submitPRReview(1, { status: 'APPROVE' });

      expect(result.success).toBe(true);
    });
  });

  describe('dismissPRReview()', () => {
    it('should dismiss review', async () => {
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      const result = await adapter.dismissPRReview(1, 999);

      expect(result.success).toBe(true);
    });
  });
});
