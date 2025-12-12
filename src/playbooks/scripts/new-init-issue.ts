#!/usr/bin/env node

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Type Definitions (Legacy - will be removed when YAML playbooks are implemented)
// ============================================================================

interface GitHubResult<T> {
  success: boolean;
  data: T | null;
  error: GitHubError | null;
}

function success<T>(data: T): GitHubResult<T> {
  return { success: true, data, error: null };
}

function failure<T>(error: GitHubError): GitHubResult<T> {
  return { success: false, data: null, error };
}

class GitHubError extends Error {
  constructor(
    message: string,
    public code: string,
    public guidance: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

interface IssueData {
  number: number;
  url: string;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
}

interface RepoData {
  name: string;
  owner: string;
}

// ============================================================================
// Legacy GitHub CLI Helpers (will be removed when YAML playbooks are implemented)
// ============================================================================

function runCommand<T>(command: string): GitHubResult<T> {
  try {
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const data = JSON.parse(output) as T;
    return success(data);
  } catch (error: any) {
    const stderr = error.stderr?.toString() || error.message || '';
    return failure(new GitHubError(stderr, 'command_failed', 'Check the error message'));
  }
}

function getRepository(repository?: string): GitHubResult<{ owner: string; name: string }> {
  if (repository) {
    const parts = repository.split('/');
    if (parts.length === 2) {
      return success({ owner: parts[0], name: parts[1] });
    }
    return failure(new GitHubError('Invalid repository format', 'invalid_repository', 'Use format: owner/repo'));
  }

  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return success({ owner: match[1], name: match[2] });
    }
    return failure(new GitHubError('Could not parse GitHub repository', 'invalid_remote', 'Provide repository parameter'));
  } catch {
    return failure(new GitHubError('Could not get repository from git remote', 'no_remote', 'Provide repository parameter'));
  }
}

async function authStatus(): Promise<GitHubResult<{ authenticated: boolean; user?: string }>> {
  try {
    execSync('gh auth status', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return success({ authenticated: true });
  } catch {
    return success({ authenticated: false });
  }
}

async function repoInfo(repository?: string): Promise<GitHubResult<RepoData>> {
  const repoResult = getRepository(repository);
  if (!repoResult.success) {
    return failure(repoResult.error!);
  }

  const command = `gh repo view ${repoResult.data!.owner}/${repoResult.data!.name} --json name,owner`;
  const result = runCommand<any>(command);

  if (!result.success) {
    return failure(result.error!);
  }

  return success({
    name: result.data.name,
    owner: result.data.owner.login,
  });
}

async function issueFind(params: {
  titlePattern: string;
  state?: 'open' | 'closed' | 'all';
  repository?: string;
}): Promise<GitHubResult<IssueData | null>> {
  const repoResult = getRepository(params.repository);
  if (!repoResult.success) {
    return failure(repoResult.error!);
  }

  const state = params.state || 'open';
  const command = `gh issue list --repo ${repoResult.data!.owner}/${repoResult.data!.name} --state ${state} --json number,url,title,body,state,labels,assignees`;
  const result = runCommand<IssueData[]>(command);

  if (!result.success) {
    return failure(result.error!);
  }

  const matchingIssue = result.data!.find(issue =>
    issue.title.includes(params.titlePattern)
  );

  return success(matchingIssue || null);
}

async function issueCreate(params: {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  repository?: string;
}): Promise<GitHubResult<IssueData>> {
  const repoResult = getRepository(params.repository);
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

  command += ' --json number,url,title,body,state,labels,assignees';

  return runCommand<IssueData>(command);
}

async function templatePrepare(params: {
  templateName: string;
  projectName: string;
  replacements?: Record<string, string>;
}): Promise<GitHubResult<string>> {
  const templatePath = path.join(__dirname, `../../templates/issues/${params.templateName}.md`);

  if (!fs.existsSync(templatePath)) {
    return failure(new GitHubError(`Template not found: ${params.templateName}`, 'not_found', 'Check template name'));
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

// ============================================================================
// Main Script Logic
// ============================================================================

// Main function to create init issue
export async function createInitIssue(force: boolean = false): Promise<void> {
  // Check if already initialized
  const productMdPath = path.join(projectRoot, '.xe/product.md');
  if (fs.existsSync(productMdPath) && !force) {
    console.log('Project already initialized. To force re-run, use --force flag.');
    return;
  }

  // Check authentication
  const authResult = await authStatus();
  if (!authResult.success || !authResult.data?.authenticated) {
    console.error('GitHub CLI (gh) is required but not authenticated.');
    console.error('Please install it from: https://cli.github.com/');
    console.error('Then authenticate with: gh auth login');
    return;
  }

  // Get project name from repository
  const repoResult = await repoInfo();
  if (!repoResult.success) {
    console.error('Could not determine project name from repository.');
    return;
  }
  const projectName = repoResult.data!.name;

  // Check if there's already an active init issue
  if (!force) {
    const searchPattern = `[Catalyst][Init] ${projectName}`;
    const findResult = await issueFind({ titlePattern: searchPattern, state: 'open' });
    if (findResult.success && findResult.data) {
      console.log('Active init issue already exists. To force creation of a new one, use --force flag.');
      return;
    }
  }

  // Prepare issue template
  const templateResult = await templatePrepare({ templateName: 'init', projectName });
  if (!templateResult.success || !templateResult.data) {
    console.error('Could not prepare issue template:', templateResult.error?.message);
    return;
  }

  // Create the issue
  const title = `[Catalyst][Init] ${projectName}`;
  const createResult = await issueCreate({ title, body: templateResult.data, assignees: [] });

  if (!createResult.success) {
    console.error('Failed to create issue:', createResult.error?.message);
    console.error('Guidance:', createResult.error?.guidance);
    return;
  }

  console.log('Issue created:', createResult.data!.url);
}

// Run when executed directly
if (require.main === module) {
  const force = process.argv.includes('--force') || process.argv.includes('-f');
  createInitIssue(force).catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
