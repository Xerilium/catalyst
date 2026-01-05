// @req FR:playbook-actions-github/common.result-structure

import type {
  IssueData,
  PRData,
  CommentData,
  RepoData,
  GitHubIssueCreateConfig,
  GitHubIssueCommentConfig,
  GitHubPRCreateConfig,
  GitHubPRCommentConfig,
  GitHubRepoConfig,
  GitHubIssueResult,
  GitHubPRResult,
  GitHubRepoResult,
} from '@playbooks/actions/github/types';

describe('Type definitions', () => {
  it('should compile IssueData with required properties', () => {
    const issue: IssueData = {
      number: 123,
      url: 'https://github.com/owner/repo/issues/123',
      title: 'Test issue',
      body: 'Issue body',
      state: 'open',
      labels: ['bug'],
      assignees: ['user1'],
    };

    expect(issue.number).toBe(123);
    expect(issue.state).toBe('open');
  });

  it('should compile PRData with required properties', () => {
    const pr: PRData = {
      number: 456,
      url: 'https://github.com/owner/repo/pull/456',
      title: 'Test PR',
      body: 'PR body',
      state: 'open',
      head: 'feature-branch',
      base: 'main',
      draft: false,
    };

    expect(pr.number).toBe(456);
    expect(pr.state).toBe('open');
  });

  it('should allow literal types for state fields', () => {
    const openState: 'open' | 'closed' | 'merged' = 'open';
    const closedState: 'open' | 'closed' | 'merged' = 'closed';
    const mergedState: 'open' | 'closed' | 'merged' = 'merged';

    expect(openState).toBe('open');
    expect(closedState).toBe('closed');
    expect(mergedState).toBe('merged');
  });

  it('should compile CommentData with required properties', () => {
    const comment: CommentData = {
      id: 789,
      url: 'https://github.com/owner/repo/issues/123#issuecomment-789',
      body: 'Comment text',
      createdAt: '2024-01-01T00:00:00Z',
    };

    expect(comment.id).toBe(789);
  });

  it('should compile RepoData with required properties', () => {
    const repo: RepoData = {
      name: 'repo-name',
      owner: 'owner-name',
      defaultBranch: 'main',
      visibility: 'public',
      url: 'https://github.com/owner/repo-name',
    };

    expect(repo.name).toBe('repo-name');
  });

  it('should compile configuration interfaces', () => {
    const issueCreateConfig: GitHubIssueCreateConfig = {
      title: 'Test',
      body: 'Body',
      labels: ['bug'],
      assignees: ['user'],
      repository: 'owner/repo',
    };

    const issueCommentConfig: GitHubIssueCommentConfig = {
      issue: 123,
      body: 'Comment',
      repository: 'owner/repo',
    };

    const prCreateConfig: GitHubPRCreateConfig = {
      title: 'Test PR',
      body: 'PR body',
      head: 'feature',
      base: 'main',
      draft: false,
      repository: 'owner/repo',
    };

    const prCommentConfig: GitHubPRCommentConfig = {
      pr: 456,
      body: 'PR comment',
      repository: 'owner/repo',
    };

    const repoConfig: GitHubRepoConfig = {
      repository: 'owner/repo',
    };

    expect(issueCreateConfig.title).toBe('Test');
    expect(issueCommentConfig.issue).toBe(123);
    expect(prCreateConfig.title).toBe('Test PR');
    expect(prCommentConfig.pr).toBe(456);
    expect(repoConfig.repository).toBe('owner/repo');
  });

  it('should compile result interfaces', () => {
    const issueResult: GitHubIssueResult = {
      number: 123,
      url: 'https://github.com/owner/repo/issues/123',
      title: 'Test',
      state: 'open',
    };

    const prResult: GitHubPRResult = {
      number: 456,
      url: 'https://github.com/owner/repo/pull/456',
      title: 'Test PR',
      state: 'open',
      head: 'feature',
      base: 'main',
    };

    const repoResult: GitHubRepoResult = {
      name: 'repo',
      owner: 'owner',
      defaultBranch: 'main',
      visibility: 'public',
      url: 'https://github.com/owner/repo',
    };

    expect(issueResult.number).toBe(123);
    expect(prResult.number).toBe(456);
    expect(repoResult.name).toBe('repo');
  });
});
