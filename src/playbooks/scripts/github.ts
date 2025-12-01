import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result wrapper for GitHub operations
 * Provides consistent success/failure pattern with typed data and errors
 */
export interface GitHubResult<T> {
  success: boolean;
  data: T | null;
  error: GitHubError | null;
}

/**
 * Helper functions for creating GitHubResult instances
 */
export function success<T>(data: T): GitHubResult<T> {
  return { success: true, data, error: null };
}

export function failure<T>(error: GitHubError): GitHubResult<T> {
  return { success: false, data: null, error };
}

/**
 * Base error class for all GitHub-related errors
 */
export class GitHubError extends Error {
  constructor(
    message: string,
    public code: string,
    public guidance: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'GitHubError';
    Object.setPrototypeOf(this, GitHubError.prototype);
  }
}

/**
 * Authentication error - user is not authenticated with GitHub CLI
 */
export class GitHubAuthError extends GitHubError {
  constructor(message: string = 'Not authenticated with GitHub CLI', cause?: Error) {
    super(
      message,
      'auth_required',
      'Run: gh auth login',
      cause
    );
    this.name = 'GitHubAuthError';
    Object.setPrototypeOf(this, GitHubAuthError.prototype);
  }
}

/**
 * Not found error - requested resource does not exist
 */
export class GitHubNotFoundError extends GitHubError {
  constructor(resource: string, identifier: string, cause?: Error) {
    super(
      `${resource} not found: ${identifier}`,
      'not_found',
      `Verify the ${resource.toLowerCase()} exists and you have access`,
      cause
    );
    this.name = 'GitHubNotFoundError';
    Object.setPrototypeOf(this, GitHubNotFoundError.prototype);
  }
}

/**
 * Permission error - user lacks required permissions
 */
export class GitHubPermissionError extends GitHubError {
  constructor(action: string, resource: string, cause?: Error) {
    super(
      `Permission denied: Cannot ${action} ${resource}`,
      'permission_denied',
      'Verify you have the required repository permissions',
      cause
    );
    this.name = 'GitHubPermissionError';
    Object.setPrototypeOf(this, GitHubPermissionError.prototype);
  }
}

/**
 * Rate limit error - API rate limit exceeded
 */
export class GitHubRateLimitError extends GitHubError {
  constructor(resetTime?: string, cause?: Error) {
    const guidance = resetTime
      ? `Rate limit will reset at ${resetTime}`
      : 'Wait before making more requests';
    super(
      'GitHub API rate limit exceeded',
      'rate_limit_exceeded',
      guidance,
      cause
    );
    this.name = 'GitHubRateLimitError';
    Object.setPrototypeOf(this, GitHubRateLimitError.prototype);
  }
}

/**
 * Network error - connection or timeout issues
 */
export class GitHubNetworkError extends GitHubError {
  constructor(message: string = 'Network request failed', cause?: Error) {
    super(
      message,
      'network_error',
      'Check your internet connection and try again',
      cause
    );
    this.name = 'GitHubNetworkError';
    Object.setPrototypeOf(this, GitHubNetworkError.prototype);
  }
}

// ============================================================================
// Data Type Interfaces
// ============================================================================

/**
 * GitHub Issue data structure
 */
export interface IssueData {
  number: number;
  url: string;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * GitHub Pull Request data structure
 */
export interface PRData {
  number: number;
  url: string;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: string;
  base: string;
  draft: boolean;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * GitHub Comment data structure
 */
export interface CommentData {
  id: number;
  url: string;
  body: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * GitHub Repository data structure
 */
export interface RepoData {
  name: string;
  owner: string;
  defaultBranch: string;
  visibility: 'public' | 'private';
  url: string;
  description?: string;
}

// ============================================================================
// GitHubClient Interface
// ============================================================================

/**
 * Main interface for GitHub operations
 * Abstracts GitHub CLI interactions with consistent error handling
 */
export interface GitHubClient {
  // Issue Operations
  issueCreate(params: {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
    repository?: string;
  }): Promise<GitHubResult<IssueData>>;

  issueGet(params: {
    issue: number | string;
    repository?: string;
  }): Promise<GitHubResult<IssueData>>;

  issueGetWithComments(params: {
    issue: number | string;
    repository?: string;
  }): Promise<GitHubResult<IssueData & { comments: CommentData[] }>>;

  issueFind(params: {
    titlePattern: string;
    state?: 'open' | 'closed' | 'all';
    repository?: string;
  }): Promise<GitHubResult<IssueData | null>>;

  issueComment(params: {
    issue: number | string;
    body: string;
    repository?: string;
  }): Promise<GitHubResult<CommentData>>;

  // Pull Request Operations
  prCreate(params: {
    title: string;
    body?: string;
    head: string;
    base: string;
    draft?: boolean;
    repository?: string;
  }): Promise<GitHubResult<PRData>>;

  prGet(params: {
    pr: number | string;
    repository?: string;
  }): Promise<GitHubResult<PRData>>;

  prFind(params: {
    searchPattern: string;
    state?: 'open' | 'closed' | 'merged' | 'all';
    repository?: string;
  }): Promise<GitHubResult<PRData[]>>;

  prComment(params: {
    pr: number | string;
    body: string;
    repository?: string;
  }): Promise<GitHubResult<CommentData>>;

  prGetComments(params: {
    pr: number | string;
    repository?: string;
  }): Promise<GitHubResult<CommentData[]>>;

  prGetFeature(params: {
    pr: number | string;
    repository?: string;
  }): Promise<GitHubResult<{
    featureId: string | null;
    branchName: string;
    specExists: boolean;
    planExists: boolean;
    tasksExists: boolean;
    specPath: string | null;
    planPath: string | null;
    tasksPath: string | null;
  }>>;

  prFindThreads(params: {
    pr: number | string;
    aiPlatform?: string;
    repository?: string;
  }): Promise<GitHubResult<Array<{
    threadId: number;
    path: string;
    line: number | null;
    latestCommentId: number;
    latestUser: string;
    latestBody: string;
    createdAt: string;
    pushBackCount?: number;
    hasForceAccept?: boolean;
  }>>>;

  prGetThreadComments(params: {
    pr: number | string;
    threadId: number | string;
    repository?: string;
  }): Promise<GitHubResult<CommentData[]>>;

  prReplyToThread(params: {
    pr: number | string;
    commentId: number | string;
    body: string;
    repository?: string;
  }): Promise<GitHubResult<CommentData>>;

  // Repository Operations
  repoInfo(params?: {
    repository?: string;
  }): Promise<GitHubResult<RepoData>>;

  // Authentication Operations
  authStatus(): Promise<GitHubResult<{ authenticated: boolean; user?: string }>>;

  // Template Operations
  templatePrepare(params: {
    templateName: string;
    projectName: string;
    replacements?: Record<string, string>;
  }): Promise<GitHubResult<string>>;
}

// ============================================================================
// GitHubAdapter Implementation
// ============================================================================

/**
 * Default implementation of GitHubClient using GitHub CLI
 */
export class GitHubAdapter implements GitHubClient {
  /**
   * Execute a command and return parsed JSON result
   * Handles common error scenarios and maps to GitHubError types
   */
  private runCommand<T>(command: string, input?: string): GitHubResult<T> {
    try {
      const options: any = {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      };

      if (input) {
        options.input = input;
      }

      const output = execSync(command, options);
      const data = JSON.parse(output) as T;
      return success(data);
    } catch (error: any) {
      return failure(this.mapCommandError(error));
    }
  }

  /**
   * Execute a command without JSON parsing
   * Returns raw string output
   */
  private runCommandRaw(command: string, input?: string): GitHubResult<string> {
    try {
      const options: any = {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      };

      if (input) {
        options.input = input;
      }

      const output = execSync(command, options);
      return success(output.trim());
    } catch (error: any) {
      return failure(this.mapCommandError(error));
    }
  }

  /**
   * Map command execution errors to GitHubError types
   */
  private mapCommandError(error: any): GitHubError {
    const stderr = error.stderr?.toString() || error.message || '';
    const errorLower = stderr.toLowerCase();

    // Authentication errors
    if (errorLower.includes('not logged in') || errorLower.includes('authentication')) {
      return new GitHubAuthError('Not authenticated with GitHub CLI', error);
    }

    // Not found errors
    if (errorLower.includes('not found') || errorLower.includes('could not resolve')) {
      return new GitHubNotFoundError('Resource', 'unknown', error);
    }

    // Permission errors
    if (errorLower.includes('permission denied') || errorLower.includes('forbidden')) {
      return new GitHubPermissionError('access', 'resource', error);
    }

    // Rate limit errors
    if (errorLower.includes('rate limit') || errorLower.includes('api rate limit exceeded')) {
      return new GitHubRateLimitError(undefined, error);
    }

    // Network errors
    if (errorLower.includes('timeout') || errorLower.includes('network') || errorLower.includes('connection')) {
      return new GitHubNetworkError(stderr, error);
    }

    // Generic error
    return new GitHubError(
      stderr || 'Unknown GitHub CLI error',
      'unknown_error',
      'Check the error message for details',
      error
    );
  }

  /**
   * Get repository info from git remote or use provided repository
   */
  private getRepository(repository?: string): GitHubResult<{ owner: string; name: string }> {
    if (repository) {
      const parts = repository.split('/');
      if (parts.length === 2) {
        return success({ owner: parts[0], name: parts[1] });
      }
      return failure(new GitHubError(
        `Invalid repository format: ${repository}`,
        'invalid_repository',
        'Use format: owner/repo'
      ));
    }

    try {
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) {
        return success({ owner: match[1], name: match[2] });
      }
      return failure(new GitHubError(
        'Could not parse GitHub repository from git remote',
        'invalid_remote',
        'Provide repository parameter in format: owner/repo'
      ));
    } catch (error: any) {
      return failure(new GitHubError(
        'Could not get repository from git remote',
        'no_remote',
        'Provide repository parameter in format: owner/repo',
        error
      ));
    }
  }

  // Issue Operations
  async issueCreate(params: {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
    repository?: string;
  }): Promise<GitHubResult<IssueData>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    let command = `gh issue create --repo ${repoResult.data!.owner}/${repoResult.data!.name} --title "${params.title.replace(/"/g, '\\"')}"`;

    if (params.body) {
      command += ` --body "${params.body.replace(/"/g, '\\"')}"`;
    }

    if (params.labels && params.labels.length > 0) {
      command += ` --label "${params.labels.join(',')}"`;
    }

    if (params.assignees && params.assignees.length > 0) {
      command += ` --assignee "${params.assignees.join(',')}"`;
    }

    command += ' --json number,url,title,body,state,labels,assignees,author,createdAt,updatedAt';

    return this.runCommand<IssueData>(command);
  }

  async issueGet(params: {
    issue: number | string;
    repository?: string;
  }): Promise<GitHubResult<IssueData>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const command = `gh issue view ${params.issue} --repo ${repoResult.data!.owner}/${repoResult.data!.name} --json number,url,title,body,state,labels,assignees,author,createdAt,updatedAt`;
    return this.runCommand<IssueData>(command);
  }

  async issueGetWithComments(params: {
    issue: number | string;
    repository?: string;
  }): Promise<GitHubResult<IssueData & { comments: CommentData[] }>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const command = `gh issue view ${params.issue} --repo ${repoResult.data!.owner}/${repoResult.data!.name} --json number,url,title,body,state,labels,assignees,author,createdAt,updatedAt,comments`;
    const result = this.runCommand<any>(command);

    if (!result.success) {
      return failure(result.error!);
    }

    // Transform comments to match CommentData interface
    const comments: CommentData[] = (result.data.comments || []).map((c: any) => ({
      id: c.id || 0,
      url: c.url || '',
      body: c.body || '',
      author: c.author?.login || 'unknown',
      createdAt: c.createdAt || '',
      updatedAt: c.updatedAt,
    }));

    return success({ ...result.data, comments });
  }

  async issueFind(params: {
    titlePattern: string;
    state?: 'open' | 'closed' | 'all';
    repository?: string;
  }): Promise<GitHubResult<IssueData | null>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const state = params.state || 'open';
    const command = `gh issue list --repo ${repoResult.data!.owner}/${repoResult.data!.name} --state ${state} --json number,url,title,body,state,labels,assignees,author,createdAt,updatedAt`;
    const result = this.runCommand<IssueData[]>(command);

    if (!result.success) {
      return failure(result.error!);
    }

    const matchingIssue = result.data!.find(issue =>
      issue.title.includes(params.titlePattern)
    );

    return success(matchingIssue || null);
  }

  async issueComment(params: {
    issue: number | string;
    body: string;
    repository?: string;
  }): Promise<GitHubResult<CommentData>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const command = `gh issue comment ${params.issue} --repo ${repoResult.data!.owner}/${repoResult.data!.name} --body "${params.body.replace(/"/g, '\\"')}"`;
    const result = this.runCommandRaw(command);

    if (!result.success) {
      return failure(result.error!);
    }

    // gh issue comment doesn't return JSON, so we create a minimal CommentData
    return success({
      id: 0,
      url: result.data!,
      body: params.body,
      author: '',
      createdAt: new Date().toISOString(),
    });
  }

  // Pull Request Operations
  async prCreate(params: {
    title: string;
    body?: string;
    head: string;
    base: string;
    draft?: boolean;
    repository?: string;
  }): Promise<GitHubResult<PRData>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    let command = `gh pr create --repo ${repoResult.data!.owner}/${repoResult.data!.name} --title "${params.title.replace(/"/g, '\\"')}" --head ${params.head} --base ${params.base}`;

    if (params.body) {
      command += ` --body "${params.body.replace(/"/g, '\\"')}"`;
    }

    if (params.draft) {
      command += ' --draft';
    }

    command += ' --json number,url,title,body,state,headRefName,baseRefName,isDraft,author,createdAt,updatedAt';

    const result = this.runCommand<any>(command);

    if (!result.success) {
      return failure(result.error!);
    }

    // Map response to PRData format
    return success({
      number: result.data.number,
      url: result.data.url,
      title: result.data.title,
      body: result.data.body || '',
      state: result.data.state,
      head: result.data.headRefName,
      base: result.data.baseRefName,
      draft: result.data.isDraft,
      author: result.data.author?.login,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    });
  }

  async prGet(params: {
    pr: number | string;
    repository?: string;
  }): Promise<GitHubResult<PRData>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const command = `gh pr view ${params.pr} --repo ${repoResult.data!.owner}/${repoResult.data!.name} --json number,url,title,body,state,headRefName,baseRefName,isDraft,author,createdAt,updatedAt`;
    const result = this.runCommand<any>(command);

    if (!result.success) {
      return failure(result.error!);
    }

    return success({
      number: result.data.number,
      url: result.data.url,
      title: result.data.title,
      body: result.data.body || '',
      state: result.data.state,
      head: result.data.headRefName,
      base: result.data.baseRefName,
      draft: result.data.isDraft,
      author: result.data.author?.login,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    });
  }

  async prFind(params: {
    searchPattern: string;
    state?: 'open' | 'closed' | 'merged' | 'all';
    repository?: string;
  }): Promise<GitHubResult<PRData[]>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const state = params.state || 'open';
    const command = `gh pr list --repo ${repoResult.data!.owner}/${repoResult.data!.name} --state ${state} --search "${params.searchPattern}" --json number,url,title,body,state,headRefName,baseRefName,isDraft,author,createdAt,updatedAt`;
    const result = this.runCommand<any[]>(command);

    if (!result.success) {
      return failure(result.error!);
    }

    const prs = result.data!.map(pr => ({
      number: pr.number,
      url: pr.url,
      title: pr.title,
      body: pr.body || '',
      state: pr.state,
      head: pr.headRefName,
      base: pr.baseRefName,
      draft: pr.isDraft,
      author: pr.author?.login,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
    }));

    return success(prs);
  }

  async prComment(params: {
    pr: number | string;
    body: string;
    repository?: string;
  }): Promise<GitHubResult<CommentData>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const command = `gh pr comment ${params.pr} --repo ${repoResult.data!.owner}/${repoResult.data!.name} --body "${params.body.replace(/"/g, '\\"')}"`;
    const result = this.runCommandRaw(command);

    if (!result.success) {
      return failure(result.error!);
    }

    return success({
      id: 0,
      url: result.data!,
      body: params.body,
      author: '',
      createdAt: new Date().toISOString(),
    });
  }

  async prGetComments(params: {
    pr: number | string;
    repository?: string;
  }): Promise<GitHubResult<CommentData[]>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const command = `gh api /repos/${repoResult.data!.owner}/${repoResult.data!.name}/pulls/${params.pr}/comments --paginate`;
    const result = this.runCommand<any[]>(command);

    if (!result.success) {
      return failure(result.error!);
    }

    const comments = result.data!.map(c => ({
      id: c.id,
      url: c.url || c.html_url,
      body: c.body,
      author: c.user?.login || 'unknown',
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return success(comments);
  }

  async prGetFeature(params: {
    pr: number | string;
    repository?: string;
  }): Promise<GitHubResult<{
    featureId: string | null;
    branchName: string;
    specExists: boolean;
    planExists: boolean;
    tasksExists: boolean;
    specPath: string | null;
    planPath: string | null;
    tasksPath: string | null;
  }>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const command = `gh pr view ${params.pr} --repo ${repoResult.data!.owner}/${repoResult.data!.name} --json headRefName,body`;
    const result = this.runCommand<any>(command);

    if (!result.success) {
      return failure(result.error!);
    }

    const branchName = result.data.headRefName || '';
    const prBody = result.data.body || '';

    // Try to extract feature ID from branch name
    let featureId: string | null = null;
    const branchMatch = branchName.match(/xe\/[^\/]+\/([^\/]+)/);
    if (branchMatch) {
      featureId = branchMatch[1];
    }

    // If not found in branch, look in PR body
    if (!featureId) {
      const bodyMatch = prBody.match(/\.xe\/(?:specs|features)\/([^\/\s]+)/);
      if (bodyMatch) {
        featureId = bodyMatch[1];
      }
    }

    // Check if feature files exist
    const featureInfo = {
      featureId,
      branchName,
      specExists: false,
      planExists: false,
      tasksExists: false,
      specPath: null as string | null,
      planPath: null as string | null,
      tasksPath: null as string | null,
    };

    if (featureId) {
      const specPath = `.xe/features/${featureId}/spec.md`;
      const planPath = `.xe/features/${featureId}/plan.md`;
      const tasksPath = `.xe/features/${featureId}/tasks.md`;

      try {
        execSync(`test -f ${specPath}`, { stdio: 'ignore' });
        featureInfo.specExists = true;
        featureInfo.specPath = specPath;
      } catch {}

      try {
        execSync(`test -f ${planPath}`, { stdio: 'ignore' });
        featureInfo.planExists = true;
        featureInfo.planPath = planPath;
      } catch {}

      try {
        execSync(`test -f ${tasksPath}`, { stdio: 'ignore' });
        featureInfo.tasksExists = true;
        featureInfo.tasksPath = tasksPath;
      } catch {}
    }

    return success(featureInfo);
  }

  async prFindThreads(params: {
    pr: number | string;
    aiPlatform?: string;
    repository?: string;
  }): Promise<GitHubResult<Array<{
    threadId: number;
    path: string;
    line: number | null;
    latestCommentId: number;
    latestUser: string;
    latestBody: string;
    createdAt: string;
    pushBackCount?: number;
    hasForceAccept?: boolean;
  }>>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const aiPlatform = params.aiPlatform || 'AI';

    // Get resolved status via GraphQL
    const graphqlQuery = `{
      repository(owner: "${repoResult.data!.owner}", name: "${repoResult.data!.name}") {
        pullRequest(number: ${params.pr}) {
          reviewThreads(first: 100) {
            nodes {
              id
              isResolved
              comments(first: 100) {
                nodes {
                  databaseId
                }
              }
            }
          }
        }
      }
    }`;

    const graphqlResult = this.runCommand<any>(`gh api graphql -f query='${graphqlQuery}'`);
    if (!graphqlResult.success) {
      return failure(graphqlResult.error!);
    }

    const resolvedStatus = new Map<number, boolean>();
    const reviewThreads = graphqlResult.data?.data?.repository?.pullRequest?.reviewThreads?.nodes || [];
    for (const thread of reviewThreads) {
      const firstCommentId = thread.comments?.nodes?.[0]?.databaseId;
      if (firstCommentId) {
        resolvedStatus.set(firstCommentId, thread.isResolved);
      }
    }

    // Get all PR comments
    const commentsResult = await this.prGetComments({ pr: params.pr, repository: params.repository });
    if (!commentsResult.success) {
      return failure(commentsResult.error!);
    }

    // Group comments by thread (using in_reply_to_id if available)
    const threads = new Map<number, any[]>();
    for (const comment of commentsResult.data!) {
      const commentAny = comment as any;
      const threadId = commentAny.in_reply_to_id ?? comment.id;
      if (!threads.has(threadId)) {
        threads.set(threadId, []);
      }
      threads.get(threadId)!.push(commentAny);
    }

    // Find threads needing replies
    const aiPrefix = `[Catalyst][${aiPlatform}]`;
    const needsReply: Array<{
      threadId: number;
      path: string;
      line: number | null;
      latestCommentId: number;
      latestUser: string;
      latestBody: string;
      createdAt: string;
      pushBackCount?: number;
      hasForceAccept?: boolean;
    }> = [];

    for (const [threadId, threadComments] of threads.entries()) {
      // Skip resolved threads
      if (resolvedStatus.get(threadId) === true) {
        continue;
      }

      // Sort by creation time
      const sortedComments = [...threadComments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const latest = sortedComments[sortedComments.length - 1];
      const original = threadComments.find(c => c.in_reply_to_id === null) || sortedComments[0];

      // Skip if latest comment starts with AI prefix
      const bodyTrimmed = latest.body.trimStart();
      if (bodyTrimmed.startsWith(aiPrefix) || bodyTrimmed.startsWith(`⚛️ ${aiPrefix}`)) {
        continue;
      }

      // Count push-backs
      const pushBackRegex = /Push-back \(#(\d+)\/3\)/i;
      let maxPushBackCount = 0;
      for (const comment of sortedComments) {
        if (comment.body.includes(aiPrefix)) {
          const match = comment.body.match(pushBackRegex);
          if (match) {
            const count = parseInt(match[1], 10);
            maxPushBackCount = Math.max(maxPushBackCount, count);
          }
        }
      }

      // Check for #force-accept
      const hasForceAccept = latest.body.includes('#force-accept');

      needsReply.push({
        threadId,
        path: original.path || 'N/A',
        line: original.line || null,
        latestCommentId: latest.id,
        latestUser: latest.author,
        latestBody: latest.body.substring(0, 200),
        createdAt: latest.createdAt,
        pushBackCount: maxPushBackCount,
        hasForceAccept,
      });
    }

    return success(needsReply);
  }

  async prGetThreadComments(params: {
    pr: number | string;
    threadId: number | string;
    repository?: string;
  }): Promise<GitHubResult<CommentData[]>> {
    const commentsResult = await this.prGetComments({ pr: params.pr, repository: params.repository });
    if (!commentsResult.success) {
      return failure(commentsResult.error!);
    }

    const threadIdNum = typeof params.threadId === 'string' ? parseInt(params.threadId, 10) : params.threadId;
    const threadComments = commentsResult.data!.filter((c: any) =>
      c.id === threadIdNum || c.in_reply_to_id === threadIdNum
    );

    // Sort by creation time
    threadComments.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return success(threadComments);
  }

  async prReplyToThread(params: {
    pr: number | string;
    commentId: number | string;
    body: string;
    repository?: string;
  }): Promise<GitHubResult<CommentData>> {
    const repoResult = this.getRepository(params.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const command = `gh api --method POST -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" /repos/${repoResult.data!.owner}/${repoResult.data!.name}/pulls/${params.pr}/comments/${params.commentId}/replies --input -`;
    const result = this.runCommand<any>(command, JSON.stringify({ body: params.body }));

    if (!result.success) {
      return failure(result.error!);
    }

    return success({
      id: result.data.id,
      url: result.data.url || result.data.html_url,
      body: result.data.body,
      author: result.data.user?.login || '',
      createdAt: result.data.created_at,
      updatedAt: result.data.updated_at,
    });
  }

  // Repository Operations
  async repoInfo(params?: {
    repository?: string;
  }): Promise<GitHubResult<RepoData>> {
    const repoResult = this.getRepository(params?.repository);
    if (!repoResult.success) {
      return failure(repoResult.error!);
    }

    const command = `gh repo view ${repoResult.data!.owner}/${repoResult.data!.name} --json name,owner,defaultBranchRef,visibility,url,description`;
    const result = this.runCommand<any>(command);

    if (!result.success) {
      return failure(result.error!);
    }

    return success({
      name: result.data.name,
      owner: result.data.owner.login,
      defaultBranch: result.data.defaultBranchRef.name,
      visibility: result.data.visibility.toLowerCase(),
      url: result.data.url,
      description: result.data.description,
    });
  }

  // Authentication Operations
  async authStatus(): Promise<GitHubResult<{ authenticated: boolean; user?: string }>> {
    try {
      const output = execSync('gh auth status', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const match = output.match(/Logged in to github\.com as ([^\s]+)/);
      return success({
        authenticated: true,
        user: match ? match[1] : undefined,
      });
    } catch {
      return success({ authenticated: false });
    }
  }

  // Template Operations
  async templatePrepare(params: {
    templateName: string;
    projectName: string;
    replacements?: Record<string, string>;
  }): Promise<GitHubResult<string>> {
    const templatePath = path.join(__dirname, `../../templates/issues/${params.templateName}.md`);

    if (!fs.existsSync(templatePath)) {
      return failure(new GitHubNotFoundError('Template', params.templateName));
    }

    let template = fs.readFileSync(templatePath, 'utf8');

    // Strip front matter
    const frontMatterEnd = template.indexOf('---', 4);
    if (frontMatterEnd !== -1) {
      template = template.substring(frontMatterEnd + 3).trim();
    }

    // Replace project name placeholder
    template = template.replace(/{project-name}/g, params.projectName);

    // Apply additional replacements
    if (params.replacements) {
      for (const [key, value] of Object.entries(params.replacements)) {
        template = template.replace(new RegExp(`{${key}}`, 'g'), value);
      }
    }

    return success(template);
  }
}

/**
 * Default GitHubClient instance using GitHubAdapter
 */
let defaultClient: GitHubClient | null = null;

/**
 * Get or create the default GitHubClient instance
 */
export function getDefaultGitHubClient(): GitHubClient {
  if (!defaultClient) {
    defaultClient = new GitHubAdapter();
  }
  return defaultClient;
}

/**
 * Set a custom default GitHubClient (useful for testing)
 */
export function setDefaultGitHubClient(client: GitHubClient): void {
  defaultClient = client;
}

/**
 * @deprecated All legacy utility functions have been replaced by GitHubAdapter.
 * Use getDefaultGitHubClient() to access the new interface:
 *
 * const client = getDefaultGitHubClient();
 * const result = await client.issueGet({ issue: '123' });
 * if (result.success) {
 *   console.log(result.data);
 * }
 *
 * See GitHubClient interface and GitHubAdapter class above for all available methods.
 */
