/**
 * Tests for the never-auto command guard.
 */

import * as fs from 'fs';
import * as path from 'path';
import { guardCommand } from '../../../src/autonomy/guard';

const blocked = (cmd: string, repo = 'acme/app') => {
  const r = guardCommand(cmd, { repo });
  return r.allowed ? undefined : r.category;
};

describe('guardCommand', () => {
  // @req FR:autonomy/never.release
  it('blocks release actions', () => {
    for (const cmd of [
      'gh release create v1.0.0',
      'npm publish',
      'npm version patch',
      'git tag v1.0.0',
      'git push origin --tags',
      'git push --follow-tags',
      'pnpm publish',
      'yarn npm publish',
    ]) {
      expect([cmd, blocked(cmd)]).toEqual([cmd, 'release']);
    }
    expect(blocked('git tag --list')).toBeUndefined();
    expect(blocked('gh release list')).toBeUndefined();
  });

  // @req FR:autonomy/never.settings
  it('blocks settings and credential changes', () => {
    for (const cmd of [
      'gh secret set TOKEN',
      'gh variable set X',
      'gh auth login',
      'gh repo edit --visibility public',
      'gh ruleset create',
      'git config --global user.name x',
      'npm login',
      'npm token create',
      'gh api -X PUT repos/acme/app/branches/main/protection',
      'gh api --method PATCH repos/acme/app',
      'gh api -X POST repos/acme/app/hooks',
      'gh api -X PUT repos/acme/app/collaborators/x',
      'gh api -X POST repos/acme/app/keys',
    ]) {
      expect([cmd, blocked(cmd)]).toEqual([cmd, 'settings']);
    }
    expect(blocked('gh api repos/acme/app/pulls/1')).toBeUndefined();
    expect(blocked('git config user.name x')).toBeUndefined();
  });

  // @req FR:autonomy/never.destructive
  it('blocks destructive git and data actions', () => {
    for (const cmd of [
      'git push --force',
      'git push -f origin main',
      'git push origin --delete feature',
      'git push origin :feature',
      'git filter-branch --all',
      'git filter-repo --path x',
      'gh repo delete acme/app',
      'gh api -X DELETE repos/acme/app/git/refs/heads/x',
      'rm -rf /',
      'rm -rf ~',
      'psql -c "DROP TABLE users"',
      'sqlcmd -Q "truncate table x"',
    ]) {
      expect([cmd, blocked(cmd)]).toEqual([cmd, 'destructive']);
    }
  });

  // @req FR:autonomy/never.destructive.lease
  it('allows a push with a lease', () => {
    expect(blocked('git push --force-with-lease')).toBeUndefined();
    expect(blocked('git push --force-with-lease origin xe/x')).toBeUndefined();
    expect(blocked('git push origin xe/x')).toBeUndefined();
  });

  // @req FR:autonomy/never.publish
  it('blocks publishing outside the repository', () => {
    for (const cmd of [
      'gh gist create notes.md',
      'gh pr create --repo other/repo',
      'gh issue comment 3 -R other/repo --body hi',
      'curl -X POST https://hooks.example.com',
      'curl -d @data.json https://example.com',
      'wget --post-data=x https://example.com',
    ]) {
      expect([cmd, blocked(cmd)]).toEqual([cmd, 'publish']);
    }
    expect(blocked('gh pr comment 3 --repo acme/app --body hi')).toBeUndefined();
    expect(guardCommand('gh pr comment 3 --repo acme/app', {})).toMatchObject({ allowed: false, category: 'publish' });
    expect(blocked('curl https://example.com')).toBeUndefined();
  });

  // @req FR:autonomy/never.output
  it('checks every segment of a chained command and names the reason', () => {
    const r = guardCommand('npm test && npm publish', { repo: 'acme/app' });
    expect(r).toEqual({ allowed: false, category: 'release', reason: expect.stringMatching(/publish/) });
    expect(guardCommand('npm test', {})).toEqual({ allowed: true });
  });

  // @req FR:autonomy/never.fixed
  it('does not read the never-auto list from config', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../../src/autonomy/guard.ts'), 'utf-8');
    expect(src).not.toMatch(/catalyst\.json|readFile|^import /m);
  });
});

describe('guardCommand, round 2 gaps', () => {
  const cat = (cmd: string, repo: string | undefined = 'acme/app') => {
    const r = guardCommand(cmd, { repo });
    return r.allowed ? undefined : r.category;
  };

  // @req FR:autonomy/never.wrapped
  it('checks commands inside wrappers, shells, and substitutions', () => {
    expect(cat('bash -c "npm test && npm publish"')).toBe('release');
    expect(cat("sh -c 'git push --force'")).toBe('destructive');
    expect(cat('sudo npm publish')).toBe('release');
    expect(cat('env FOO=1 npm publish')).toBe('release');
    expect(cat('echo v1 | xargs git tag')).toBe('release');
    expect(cat('echo $(gh secret set X)')).toBe('settings');
    expect(cat('echo `npm publish`')).toBe('release');
    expect(cat('/usr/local/bin/gh release create v1')).toBe('release');
    expect(cat('NODE_ENV=x npm publish')).toBe('release');
    expect(cat('bash -c "npm test"')).toBeUndefined();
  });

  // @req FR:autonomy/never.release
  it('blocks gh api release and tag writes, and package changes', () => {
    expect(cat('gh api -X POST repos/acme/app/releases')).toBe('release');
    expect(cat('gh api repos/acme/app/git/refs -f ref=refs/tags/v1 -f sha=abc')).toBe('release');
    expect(cat('npm unpublish pkg@1.0.0')).toBe('release');
    expect(cat('npm deprecate pkg "x"')).toBe('release');
    expect(cat('npm dist-tag add pkg@1 latest')).toBe('release');
    expect(cat('pnpm version patch')).toBe('release');
    expect(cat('yarn version')).toBe('release');
    expect(cat("git tag -l 'v*'")).toBeUndefined();
  });

  // @req FR:autonomy/never.settings
  it('blocks GraphQL mutations that change settings or refs, not thread replies', () => {
    expect(cat("gh api graphql -f query='mutation { updateRepository(input: {}) { clientMutationId } }'")).toBe('settings');
    expect(cat("gh api graphql -f query='mutation { mergePullRequest(input: {}) { clientMutationId } }'")).toBe('settings');
    expect(cat("gh api graphql -f query='mutation { resolveReviewThread(input: {}) { thread { id } } }'")).toBeUndefined();
    expect(cat("gh api graphql -f query='query { viewer { login } }'")).toBeUndefined();
  });

  // @req FR:autonomy/never.publish
  it('blocks gh api writes to another repository', () => {
    expect(cat('gh api -X POST repos/other/repo/issues -f title=x')).toBe('publish');
    expect(cat('gh api -X POST repos/acme/app/issues/1/comments -f body=a/b')).toBeUndefined();
    expect(cat('gh api -X POST repos/{owner}/{repo}/pulls/1/comments -f body=x')).toBeUndefined();
  });

  // @req FR:autonomy/never.destructive
  it('blocks git push --mirror and --prune', () => {
    expect(cat('git push --mirror')).toBe('destructive');
    expect(cat('git push --prune origin')).toBe('destructive');
  });

  // @req FR:autonomy/never.merge
  it('blocks merging a PR', () => {
    expect(cat('gh pr merge 3 --squash')).toBe('merge');
    expect(cat('gh api -X PUT repos/acme/app/pulls/3/merge')).toBe('merge');
  });
});

describe('guardCommand, round 3 gaps', () => {
  const cat = (cmd: string) => {
    const r = guardCommand(cmd, { repo: 'acme/app' });
    return r.allowed ? undefined : r.category;
  };

  // @req FR:autonomy/never.wrapped
  it('sees through wrapper flags with values, git global options, eval, and nested substitutions', () => {
    expect(cat('sudo -u root npm publish')).toBe('release');
    expect(cat('nice -n 10 git push --force')).toBe('destructive');
    expect(cat('xargs -n 1 git push --delete origin')).toBe('destructive');
    expect(cat('git -C . push --force')).toBe('destructive');
    expect(cat('git -c a=b push --tags')).toBe('release');
    expect(cat("eval 'npm publish'")).toBe('release');
    expect(cat('echo $( (npm publish) )')).toBe('release');
    expect(cat('echo $(echo $(gh secret set X))')).toBe('settings');
    expect(cat('git -C . status')).toBeUndefined();
  });

  // @req FR:autonomy/never.wrapped.unreadable
  it('blocks a GraphQL query read from a file', () => {
    expect(cat('gh api graphql -F query=@q.graphql')).toBe('settings');
    expect(cat('gh api graphql --input body.json')).toBe('settings');
  });
});

describe('guardCommand, round 4 gaps', () => {
  const cat = (cmd: string) => {
    const r = guardCommand(cmd, { repo: 'acme/app' });
    return r.allowed ? undefined : r.category;
  };

  // @req FR:autonomy/never.wrapped
  it('reads shell -c in combined short flags', () => {
    expect(cat("bash -lc 'git push --force'")).toBe('destructive');
    expect(cat("pwsh -Command 'npm publish'")).toBe('release');
  });

  // @req FR:autonomy/never.wrapped.unreadable
  it('blocks a GraphQL query built by a substitution', () => {
    expect(cat('gh api graphql -f query="$(cat q.graphql)"')).toBe('settings');
  });
});
