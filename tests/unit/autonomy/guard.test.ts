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
