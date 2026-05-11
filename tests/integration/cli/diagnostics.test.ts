/**
 * Integration tests for the --diagnostics global flag.
 *
 * @req FR:cli-engine/cli.global
 * @req FR:playbook-engine/execution.playbook-output
 */
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const CLI_PATH = path.join(__dirname, '../../../bin/catalyst.js');
const ROOT_DIR = path.join(__dirname, '../../..');

function runCLI(
  args: string[],
  extraEnv: Record<string, string> = {}
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args.join(' ')}`, {
      encoding: 'utf-8',
      cwd: ROOT_DIR,
      env: { ...process.env, NO_COLOR: '1', ...extraEnv },
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      exitCode: execError.status || 1,
    };
  }
}

describe('--diagnostics flag', () => {
  const cliSourceExists = fs.existsSync(path.join(ROOT_DIR, 'src/cli/index.ts'));
  const conditionalTest = cliSourceExists ? it : it.skip;

  conditionalTest('--help lists --diagnostics as a global option', () => {
    const result = runCLI(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('--diagnostics');
  });

  conditionalTest('--diagnostics is accepted without crashing', () => {
    // Run a non-existent playbook with --diagnostics; should still reach PlaybookNotFound,
    // not fail on an unknown option.
    const result = runCLI(['--diagnostics', 'run', 'non-existent-playbook']);
    expect(result.stderr).toContain('PlaybookNotFound');
    expect(result.stderr).not.toMatch(/unknown option/i);
  });

  conditionalTest('CATALYST_DIAGNOSTICS=1 is accepted without crashing', () => {
    const result = runCLI(['run', 'non-existent-playbook'], { CATALYST_DIAGNOSTICS: '1' });
    expect(result.stderr).toContain('PlaybookNotFound');
  });
});
