/**
 * Unit tests for GitHubAdapter issue operations
 * Tests T007-T014: All issue-related adapter methods
 */

import { GitHubAdapter } from '../../../src/playbooks/scripts/github/adapter';
import { GitHubNotFoundError, GitHubAuthError } from '../../../src/playbooks/scripts/github/types';
import { execSync } from 'child_process';

// Mock execSync
jest.mock('child_process');
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('GitHubAdapter - Issue Operations', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    adapter = new GitHubAdapter();
    jest.clearAllMocks();
  });

  describe('findIssue()', () => {
    it('should find issues by title pattern', async () => {
      const mockOutput = JSON.stringify([
        { number: 42, title: 'Test Issue', state: 'open' },
        { number: 43, title: 'Another Test', state: 'open' },
      ]);
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = await adapter.findIssue('Test');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].number).toBe(42);
    });

    it('should return empty array when no matches found', async () => {
      mockExecSync.mockReturnValue(Buffer.from('[]'));

      const result = await adapter.findIssue('NonExistent');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle auth errors', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: To get started with GitHub CLI, please run: gh auth login');
      });

      const result = await adapter.findIssue('Test');

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(GitHubAuthError);
    });
  });

  describe('getIssue()', () => {
    it('should get issue by number', async () => {
      const mockOutput = JSON.stringify({
        number: 42,
        title: 'Test Issue',
        body: 'Issue body',
        state: 'open',
        author: { login: 'testuser' },
        labels: [{ name: 'bug' }],
        assignees: [{ login: 'developer' }],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        url: 'https://github.com/owner/repo/issues/42',
      });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = await adapter.getIssue(42);

      expect(result.success).toBe(true);
      expect(result.data!.number).toBe(42);
      expect(result.data!.title).toBe('Test Issue');
      expect(result.data!.labels).toEqual(['bug']);
      expect(result.data!.assignees).toEqual(['developer']);
    });

    it('should handle not found error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('could not resolve to an Issue');
      });

      const result = await adapter.getIssue(999);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(GitHubNotFoundError);
    });
  });

  describe('getIssueWithComments()', () => {
    it('should get issue with all comments', async () => {
      const mockOutput = JSON.stringify({
        number: 42,
        title: 'Test Issue',
        body: 'Issue body',
        state: 'open',
        author: { login: 'testuser' },
        labels: [],
        assignees: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        url: 'https://github.com/owner/repo/issues/42',
        comments: {
          nodes: [
            {
              id: 1,
              author: { login: 'commenter' },
              body: 'Comment 1',
              createdAt: '2024-01-03T00:00:00Z',
              updatedAt: '2024-01-03T00:00:00Z',
              url: 'https://github.com/owner/repo/issues/42#comment-1',
            },
          ],
        },
      });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = await adapter.getIssueWithComments(42);

      expect(result.success).toBe(true);
      expect(result.data!.comments).toHaveLength(1);
      expect(result.data!.comments[0].author).toBe('commenter');
    });
  });

  describe('listIssues()', () => {
    it('should list issues with default options', async () => {
      const mockOutput = JSON.stringify([
        { number: 1, title: 'Issue 1', state: 'open' },
        { number: 2, title: 'Issue 2', state: 'open' },
      ]);
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = await adapter.listIssues();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should filter by state', async () => {
      const mockOutput = JSON.stringify([
        { number: 1, title: 'Closed Issue', state: 'closed' },
      ]);
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = await adapter.listIssues({ state: 'closed' });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--state closed'),
        expect.any(Object)
      );
    });

    it('should filter by labels', async () => {
      mockExecSync.mockReturnValue(Buffer.from('[]'));

      await adapter.listIssues({ labels: ['bug', 'urgent'] });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--label bug,urgent'),
        expect.any(Object)
      );
    });
  });

  describe('createIssue()', () => {
    it('should create issue with required fields', async () => {
      const mockOutput = JSON.stringify({
        number: 100,
        title: 'New Issue',
        body: 'Issue description',
        state: 'open',
        author: { login: 'creator' },
        labels: [],
        assignees: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        url: 'https://github.com/owner/repo/issues/100',
      });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = await adapter.createIssue({
        title: 'New Issue',
        body: 'Issue description',
      });

      expect(result.success).toBe(true);
      expect(result.data!.number).toBe(100);
      expect(result.data!.title).toBe('New Issue');
    });

    it('should create issue with labels and assignees', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({ number: 100 })));

      await adapter.createIssue({
        title: 'New Issue',
        body: 'Description',
        labels: ['bug', 'urgent'],
        assignees: ['developer1', 'developer2'],
      });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--label bug,urgent'),
        expect.any(Object)
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--assignee developer1,developer2'),
        expect.any(Object)
      );
    });
  });

  describe('updateIssue()', () => {
    it('should update issue title', async () => {
      const mockOutput = JSON.stringify({
        number: 42,
        title: 'Updated Title',
        body: 'Original body',
        state: 'open',
      });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = await adapter.updateIssue(42, { title: 'Updated Title' });

      expect(result.success).toBe(true);
      expect(result.data!.title).toBe('Updated Title');
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--title "Updated Title"'),
        expect.any(Object)
      );
    });

    it('should update issue state', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({ number: 42, state: 'closed' })));

      await adapter.updateIssue(42, { state: 'closed' });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--state closed'),
        expect.any(Object)
      );
    });
  });

  describe('addIssueComment()', () => {
    it('should add comment to issue', async () => {
      const mockOutput = JSON.stringify({
        id: 1,
        author: { login: 'commenter' },
        body: 'Test comment',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        url: 'https://github.com/owner/repo/issues/42#comment-1',
      });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = await adapter.addIssueComment(42, 'Test comment');

      expect(result.success).toBe(true);
      expect(result.data!.body).toBe('Test comment');
    });
  });

  describe('closeIssue()', () => {
    it('should close issue', async () => {
      const mockOutput = JSON.stringify({
        number: 42,
        title: 'Closed Issue',
        state: 'closed',
      });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = await adapter.closeIssue(42);

      expect(result.success).toBe(true);
      expect(result.data!.state).toBe('closed');
    });

    it('should close issue with reason', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({ number: 42, state: 'closed' })));

      await adapter.closeIssue(42, 'completed');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--reason completed'),
        expect.any(Object)
      );
    });
  });
});
