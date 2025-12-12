# Research: Playbook Actions - GitHub

## Overview

This document captures research findings, design decisions, and technical trade-offs for implementing GitHub-specific playbook actions with direct GitHub CLI execution.

## Architectural Decision: Feature Consolidation

### Consolidating github-integration into playbook-actions-github

**Decision:** Merge all GitHub functionality (direct CLI execution, error types, data types) into the playbook-actions-github feature.

**Rationale:**
- **Single consumer**: Playbook actions are the only consumer of GitHub operations in Catalyst
- **YAGNI principle**: github-integration's CLI interface (catalyst-github) was not being used and added unnecessary complexity
- **Clearer ownership**: All GitHub functionality lives in one feature with clear purpose
- **Reduced dependency complexity**: Eliminates the dependency between two features that serve a single use case
- **Simplified testing**: All GitHub-related code and tests in one location

**Design Decision:** Single consolidated feature owning all GitHub functionality

- Direct GitHub CLI execution in `GitHubActionBase` abstract class
- No intermediate abstraction layer - actions execute `gh` commands directly
- GitHub actions inherit CLI execution helpers from base class

## Action Implementation Pattern

**Decision:** Implement `GitHubActionBase` abstract class with direct CLI execution.

**Rationale:**

- Single responsibility - each action focuses on its specific GitHub operation
- DRY - common CLI execution, validation, and error mapping logic is shared
- Testability - base class provides helpers that can be tested independently
- Direct execution - no unnecessary abstraction
- Consistency - all GitHub actions follow the same pattern
- Follows the pattern established in playbook-actions-scripts (ShellActionBase)

### Error Mapping Strategy

**Design Decision:** Map CLI execution errors to GitHubError types, then to playbook-specific CatalystError codes.

**Error Code Mapping:**

| CLI Error Pattern | GitHubError Type | Playbook CatalystError Code | Handling |
|------------------|-----------------|----------------------------|----------|
| "Not logged in" | GitHubAuthError | {Action}AuthenticationFailed | Run: gh auth login |
| "not found", "could not resolve" | GitHubNotFoundError | {Action}NotFound | Check resource exists |
| "permission", "not accessible" | GitHubPermissionError | {Action}PermissionDenied | Check token scopes |
| "rate limit" | GitHubRateLimitError | {Action}RateLimitExceeded | Wait before retry |
| "timed out", ETIMEDOUT | GitHubNetworkError | {Action}NetworkError | Check network connection |
| Generic errors | GitHubError | {Action}Failed | Fallback for unmapped errors |

**Rationale:**
- Specific error codes enable playbooks to handle different failure modes with appropriate error policies (retry, continue, stop)
- Preserving actionable guidance ensures users get context-aware remediation steps
- Action-specific error codes (e.g., GitHubIssueCreateAuthenticationFailed) provide clear traceability

## Implementation Approach

### Project Structure

```
src/playbooks/scripts/playbooks/actions/github/
  ├── base.ts                   # GitHubActionBase with CLI execution
  ├── errors.ts                 # GitHubError hierarchy
  ├── types.ts                  # Data types (IssueData, PRData, etc.)
  ├── issue-create-action.ts    # Issue create action
  ├── issue-comment-action.ts   # Issue comment action
  ├── pr-create-action.ts       # PR create action
  ├── pr-comment-action.ts      # PR comment action
  ├── repo-action.ts            # Repository info action
  └── index.ts                  # Public exports

tests/playbooks/actions/github/
  ├── errors.test.ts                # Error hierarchy tests
  ├── types.test.ts                 # Type interface tests
  ├── issue-create-action.test.ts
  ├── issue-comment-action.test.ts
  ├── pr-create-action.test.ts
  ├── pr-comment-action.test.ts
  └── repo-action.test.ts
```

### Direct CLI Execution in Base Class

`GitHubActionBase` provides common CLI execution helpers that all actions inherit:

```typescript
export abstract class GitHubActionBase<TConfig, TResult>
  implements PlaybookAction<TConfig>
{
  private repositoryCache?: string;

  // Execute GitHub CLI command with timeout and error handling
  protected executeCommand(command: string): string {
    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: 5000, // 5-second timeout
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return output.trim();
    } catch (error: any) {
      throw this.mapExecutionError(error);
    }
  }

  // Map CLI errors to GitHubError types
  protected mapExecutionError(error: any): GitHubError {
    const message = error.message || String(error);

    if (message.includes('Not logged in')) {
      return new GitHubAuthError('GitHub authentication required', 'Run: gh auth login', error);
    }
    // ... other error mappings
  }

  // Parse JSON from CLI output
  protected parseJSON<T>(output: string): T {
    try {
      return JSON.parse(output) as T;
    } catch (error: any) {
      throw new GitHubError('json_parse_error', 'Failed to parse JSON response', 'Check GitHub CLI installation', error);
    }
  }

  // Get current repository context (cached)
  protected async getCurrentRepository(): Promise<string> {
    if (this.repositoryCache) {
      return this.repositoryCache;
    }
    const output = this.executeCommand('gh repo view --json nameWithOwner');
    const data = this.parseJSON<{ nameWithOwner: string }>(output);
    this.repositoryCache = data.nameWithOwner;
    return this.repositoryCache;
  }

  // Escape shell arguments for safe execution
  protected escapeShellArg(arg: string): string {
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  // Build -R flag with repository context
  protected async getRepoFlag(repository?: string): Promise<string> {
    if (repository) {
      return `-R ${this.escapeShellArg(repository)}`;
    }
    const repo = await this.getCurrentRepository();
    return `-R ${this.escapeShellArg(repo)}`;
  }
}
```

Each action implements `executeGitHubOperation()` to build and execute its specific CLI command:

```typescript
class GitHubIssueCreateAction extends GitHubActionBase<GitHubIssueCreateConfig, IssueData> {
  protected async executeGitHubOperation(config: GitHubIssueCreateConfig): Promise<IssueData> {
    const repoFlag = await this.getRepoFlag(config.repository);
    let command = `gh issue create ${repoFlag} --title ${this.escapeShellArg(config.title)}`;

    if (config.body) {
      command += ` --body ${this.escapeShellArg(config.body)}`;
    }
    if (config.labels && config.labels.length > 0) {
      command += ` --label ${config.labels.map((l) => this.escapeShellArg(l)).join(',)}`;
    }
    command += ' --json number,url,title,body,state,labels,assignees';

    const output = this.executeCommand(command);
    const rawData = this.parseJSON<any>(output);

    return {
      number: rawData.number,
      url: rawData.url || rawData.html_url,
      title: rawData.title,
      // ... other fields
    };
  }
}
```

### Template Interpolation

Template interpolation happens BEFORE action execution (handled by template engine):

```typescript
// Playbook step definition
{
  action: 'github-issue-create',
  config: {
    title: 'Feature: {{feature-name}}',
    body: '{{issue-body}}'
  }
}

// After template interpolation (what action receives)
{
  title: 'Feature: User Authentication',
  body: 'Implement OAuth2 authentication...'
}
```

Actions receive fully interpolated configuration and don't need to handle template syntax.

### Repository Context Detection

When `repository` config property is omitted, `GitHubActionBase` uses `gh repo view` to detect current repository.

**Decision:** Use `gh repo view` for consistency with GitHub CLI behavior.

**Rationale:** GitHub CLI already handles repository context resolution, including cases where user is in a subdirectory or working with multiple remotes. Reusing this logic ensures consistency.

**Implementation:**

```typescript
protected async getCurrentRepository(): Promise<string> {
  if (this.repositoryCache) {
    return this.repositoryCache;
  }

  const output = this.executeCommand('gh repo view --json nameWithOwner');
  const data = this.parseJSON<{ nameWithOwner: string }>(output);
  this.repositoryCache = data.nameWithOwner;
  return this.repositoryCache;
}
```

## Testing Strategy

### Unit Testing with Mocked execSync

Use `jest.mock('child_process')` to mock GitHub CLI execution:

```typescript
import * as childProcess from 'child_process';
jest.mock('child_process');

describe('GitHubIssueCreateAction', () => {
  let action: GitHubIssueCreateAction;
  let mockExecSync: jest.MockedFunction<typeof childProcess.execSync>;

  beforeEach(() => {
    action = new GitHubIssueCreateAction();
    mockExecSync = childProcess.execSync as jest.MockedFunction<typeof childProcess.execSync>;
    jest.clearAllMocks();
  });

  it('should create issue with all parameters', async () => {
    mockExecSync.mockImplementation(() => {
      return Buffer.from(JSON.stringify({
        number: 123,
        url: 'https://github.com/owner/repo/issues/123',
        title: 'Test Issue',
        state: 'open',
      }));
    });

    const result = await action.execute({ title: 'Test', repository: 'owner/repo' });

    expect(result.code).toBe('Success');
    expect(result.value.number).toBe(123);
  });

  it('should handle authentication error', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('gh: Not logged in');
    });

    const result = await action.execute({ title: 'Test' });

    expect(result.code).toBe('GitHubIssueCreateAuthenticationFailed');
    expect(result.error?.guidance).toContain('gh auth login');
  });
});
```

### Integration Testing

Integration tests are optional and should be limited:
- Requires authenticated GitHub CLI in test environment
- Create/delete test issues/PRs in dedicated test repository
- Clean up resources after tests
- Run in CI only, not locally

**Recommendation:** Focus on unit tests with mocked execSync. Integration tests add complexity without proportional value for this use case.

## Performance Considerations

### Action Execution Overhead

Playbook action overhead (excluding GitHub CLI execution time):
- Configuration validation: <10ms
- CLI command construction: <10ms
- Error mapping: <5ms
- Result formatting: <5ms

**Total action overhead: <50ms**

GitHub CLI execution time varies by operation and network latency (~200-600ms typical).

This is acceptable for playbook workflows which are not latency-sensitive.

### Base Class Optimizations

1. **Synchronous execution**: Use `execSync` for simpler error handling
2. **JSON parsing**: Parse CLI output once, cache results
3. **Command construction**: Build commands efficiently without string concatenation overhead
4. **Repository caching**: Cache current repository context to avoid repeated detection
5. **5-second timeout**: Prevent hanging on network issues

## Authentication

**Handled by GitHub CLI (`gh`).**

`GitHubActionBase` maps authentication errors to `GitHubAuthError`:

```typescript
protected mapExecutionError(error: any): GitHubError {
  const message = error.message || String(error);

  if (message.includes('Not logged in') || message.includes('auth login')) {
    return new GitHubAuthError(
      'GitHub authentication required',
      'Run: gh auth login',
      error
    );
  }
  // ... other error mappings
}
```

Authentication methods supported by GitHub CLI:
- `gh auth login` - Interactive browser-based login
- `GH_TOKEN` environment variable
- `GITHUB_TOKEN` environment variable (GitHub Actions)
- OAuth token in git credential storage

## Security Considerations

### Token Protection

GitHub CLI handles token management - actions never directly access tokens. Commands are executed via `execSync` without logging sensitive data:

```typescript
protected executeCommand(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'], // Capture stdout/stderr separately
    }).trim();
  } catch (error: any) {
    // Never log the command (may contain sensitive data)
    throw this.mapExecutionError(error);
  }
}
```

### Command Injection Prevention

`GitHubActionBase` escapes all shell arguments before CLI execution:

```typescript
protected escapeShellArg(arg: string): string {
  // Wrap in single quotes and escape any embedded single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}
```

Usage:
```typescript
command += ` --title ${this.escapeShellArg(config.title)}`;
command += ` --body ${this.escapeShellArg(config.body)}`;
```

### Input Validation

Playbook actions validate configuration inputs before executing CLI commands:
- Required fields present
- Field types correct
- Field formats valid (e.g., issue numbers are positive integers)

## References

- GitHub CLI Documentation: https://cli.github.com/manual/
- GitHub CLI Source Code: https://github.com/cli/cli
- GitHub REST API: https://docs.github.com/en/rest
- Node.js child_process: https://nodejs.org/api/child_process.html
- YAGNI Principle: https://en.wikipedia.org/wiki/You_aren%27t_gonna_need_it
